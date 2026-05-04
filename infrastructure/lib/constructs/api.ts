import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as authorizers from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import * as rds from "aws-cdk-lib/aws-rds";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";
import * as path from "path";

interface ApiConstructProps {
  dbSecret: secretsmanager.ISecret;
  dbProxy: rds.DatabaseProxy;
  vpc: ec2.Vpc;
  lambdaSecurityGroup: ec2.SecurityGroup;
  userPoolId: string;
  userPoolClientId: string;
  mediaBucket: s3.Bucket;
  resumeBucket: s3.Bucket;
  /** CloudFront domain for the media/resume CDN (e.g. "https://abc.cloudfront.net"). Used to build public URLs for presigned uploads and to lock CORS origins. If omitted, CORS defaults to "*". */
  cdnDomain?: string;
  /** Additional origins to allow in CORS (e.g. the frontend CloudFront domain). */
  corsOrigins?: string[];
}

export class ApiConstruct extends Construct {
  public readonly httpApi: apigatewayv2.HttpApi;

  constructor(scope: Construct, id: string, props: ApiConstructProps) {
    super(scope, id);

    const {
      dbSecret, dbProxy, vpc, lambdaSecurityGroup,
      userPoolId, userPoolClientId, mediaBucket, resumeBucket, cdnDomain, corsOrigins = [],
    } = props;

    // Shared Lambda environment variables
    const sharedEnv: Record<string, string> = {
      DB_SECRET_ARN: dbSecret.secretArn,
      DB_PROXY_ENDPOINT: dbProxy.endpoint,
      DB_NAME: "portfolio",
      COGNITO_USER_POOL_ID: userPoolId,
      COGNITO_CLIENT_ID: userPoolClientId,
      MEDIA_BUCKET: mediaBucket.bucketName,
      RESUME_BUCKET: resumeBucket.bucketName,
      NODE_OPTIONS: "--enable-source-maps",
    };

    // Shared Lambda configuration
    const sharedLambdaConfig: Omit<lambdaNodejs.NodejsFunctionProps, "entry"> = {
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64, // Graviton2 = faster + 20% cheaper
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [lambdaSecurityGroup],
      environment: sharedEnv,
      timeout: cdk.Duration.seconds(15),
      memorySize: 256,
      bundling: {
        minify: true,
        sourceMap: true,
        // @aws-sdk/* is pre-installed in the Lambda Node.js 22 runtime.
        // pg-native is an optional native addon for pg — exclude it so pg uses its pure-JS fallback.
        externalModules: ["@aws-sdk/*", "pg-native"],
        // Use local esbuild instead of Docker — avoids ARM64/x86 mismatch on CI runners.
        forceDockerBundling: false,
      },
    };

    const lambdaDir = path.join(__dirname, "../../lambda");

    // ── Helper: create a NodejsFunction ────────────────────────────────────
    const fn = (name: string, relPath: string, extraEnv?: Record<string, string>) => {
      const f = new lambdaNodejs.NodejsFunction(this, name, {
        ...sharedLambdaConfig,
        functionName: `portfolio-${name.toLowerCase()}`,
        entry: path.join(lambdaDir, relPath),
        environment: { ...sharedEnv, ...(extraEnv ?? {}) },
      });
      dbSecret.grantRead(f);
      dbProxy.grantConnect(f);
      return f;
    };

    // ── Public Lambda functions ─────────────────────────────────────────────
    const getProfile      = fn("GetProfile",      "public/get-profile/index.ts");
    const getProjects     = fn("GetProjects",     "public/get-projects/index.ts");
    const getProject      = fn("GetProject",      "public/get-project/index.ts");
    const getProjectMedia = fn("GetProjectMedia", "public/get-project-media/index.ts");
    const getTimeline     = fn("GetTimeline",     "public/get-timeline/index.ts");

    const resendApiSecret = secretsmanager.Secret.fromSecretNameV2(
      this, "ResendSecret", "/portfolio/resend-api-key"
    );
    const submitContact = fn("SubmitContact", "public/submit-contact/index.ts", {
      RESEND_SECRET_ARN: resendApiSecret.secretArn,
    });
    resendApiSecret.grantRead(submitContact);

    // ── Admin Lambda functions ─────────────────────────────────────────────
    const me              = fn("Me",              "admin/me/index.ts");
    const getMessages     = fn("GetMessages",     "admin/get-messages/index.ts");
    const markMessageRead = fn("MarkMessageRead", "admin/mark-message-read/index.ts");
    const manageProfile   = fn("ManageProfile",   "admin/manage-profile/index.ts");
    const manageProjects  = fn("ManageProjects",  "admin/manage-projects/index.ts");
    const manageTimeline  = fn("ManageTimeline",  "admin/manage-timeline/index.ts");

    // getUploadUrl only needs S3 access — no DB reads, so create it without the shared DB grants
    const getUploadUrl = new lambdaNodejs.NodejsFunction(this, "GetUploadUrl", {
      ...sharedLambdaConfig,
      functionName: "portfolio-getuploadurl",
      entry: path.join(lambdaDir, "admin/get-upload-url/index.ts"),
      environment: { ...sharedEnv, ...(cdnDomain ? { CDN_URL: cdnDomain } : {}) },
    });
    mediaBucket.grantPut(getUploadUrl);
    resumeBucket.grantPut(getUploadUrl);
    // Also grant delete for media cleanup
    mediaBucket.grantDelete(manageProjects);
    resumeBucket.grantDelete(manageProfile);

    // ── HTTP API (API Gateway v2) ───────────────────────────────────────────
    this.httpApi = new apigatewayv2.HttpApi(this, "HttpApi", {
      apiName: "portfolio-api",
      corsPreflight: {
        allowHeaders: ["Content-Type", "Authorization"],
        allowMethods: [
          apigatewayv2.CorsHttpMethod.GET,
          apigatewayv2.CorsHttpMethod.POST,
          apigatewayv2.CorsHttpMethod.PUT,
          apigatewayv2.CorsHttpMethod.PATCH,
          apigatewayv2.CorsHttpMethod.DELETE,
          apigatewayv2.CorsHttpMethod.OPTIONS,
        ],
        allowOrigins: cdnDomain ? [cdnDomain, ...corsOrigins] : ["*"],
        maxAge: cdk.Duration.days(1),
      },
    });

    // Cognito JWT authorizer for admin routes
    const cognitoAuthorizer = new authorizers.HttpJwtAuthorizer(
      "CognitoAuthorizer",
      `https://cognito-idp.${cdk.Stack.of(this).region}.amazonaws.com/${userPoolId}`,
      {
        jwtAudience: [userPoolClientId],
        identitySource: ["$request.header.Authorization"],
      }
    );

    // Create one named integration per Lambda function (CDK requires non-empty IDs)
    const intGetProfile      = new integrations.HttpLambdaIntegration("IntGetProfile",      getProfile);
    const intGetProjects     = new integrations.HttpLambdaIntegration("IntGetProjects",     getProjects);
    const intGetProject      = new integrations.HttpLambdaIntegration("IntGetProject",      getProject);
    const intGetProjectMedia = new integrations.HttpLambdaIntegration("IntGetProjectMedia", getProjectMedia);
    const intGetTimeline     = new integrations.HttpLambdaIntegration("IntGetTimeline",     getTimeline);
    const intSubmitContact   = new integrations.HttpLambdaIntegration("IntSubmitContact",   submitContact);
    const intMe              = new integrations.HttpLambdaIntegration("IntMe",              me);
    const intGetMessages     = new integrations.HttpLambdaIntegration("IntGetMessages",     getMessages);
    const intMarkMessageRead = new integrations.HttpLambdaIntegration("IntMarkMessageRead", markMessageRead);
    const intManageProfile   = new integrations.HttpLambdaIntegration("IntManageProfile",   manageProfile);
    const intManageProjects  = new integrations.HttpLambdaIntegration("IntManageProjects",  manageProjects);
    const intManageTimeline  = new integrations.HttpLambdaIntegration("IntManageTimeline",  manageTimeline);
    const intGetUploadUrl    = new integrations.HttpLambdaIntegration("IntGetUploadUrl",    getUploadUrl);

    // ── Public routes ───────────────────────────────────────────────────────
    this.httpApi.addRoutes({ path: "/profile",             methods: [apigatewayv2.HttpMethod.GET],                                          integration: intGetProfile });
    this.httpApi.addRoutes({ path: "/projects",            methods: [apigatewayv2.HttpMethod.GET],                                          integration: intGetProjects });
    this.httpApi.addRoutes({ path: "/projects/{id}",       methods: [apigatewayv2.HttpMethod.GET],                                          integration: intGetProject });
    this.httpApi.addRoutes({ path: "/projects/{id}/media", methods: [apigatewayv2.HttpMethod.GET],                                          integration: intGetProjectMedia });
    this.httpApi.addRoutes({ path: "/timeline",            methods: [apigatewayv2.HttpMethod.GET],                                          integration: intGetTimeline });
    this.httpApi.addRoutes({ path: "/contact",             methods: [apigatewayv2.HttpMethod.POST],                                         integration: intSubmitContact });

    // ── Admin routes (JWT required) ─────────────────────────────────────────
    const adminOpts = { authorizer: cognitoAuthorizer };

    this.httpApi.addRoutes({ path: "/admin/me",                  methods: [apigatewayv2.HttpMethod.GET],                                     integration: intMe,              ...adminOpts });
    this.httpApi.addRoutes({ path: "/admin/messages",           methods: [apigatewayv2.HttpMethod.GET],                                     integration: intGetMessages,     ...adminOpts });
    this.httpApi.addRoutes({ path: "/admin/messages/{id}/read", methods: [apigatewayv2.HttpMethod.PUT],                                     integration: intMarkMessageRead, ...adminOpts });
    this.httpApi.addRoutes({ path: "/admin/profile",            methods: [apigatewayv2.HttpMethod.GET, apigatewayv2.HttpMethod.PUT],         integration: intManageProfile,   ...adminOpts });
    this.httpApi.addRoutes({ path: "/admin/projects",           methods: [apigatewayv2.HttpMethod.GET, apigatewayv2.HttpMethod.POST],        integration: intManageProjects,  ...adminOpts });
    this.httpApi.addRoutes({ path: "/admin/projects/{id}",      methods: [apigatewayv2.HttpMethod.PUT, apigatewayv2.HttpMethod.DELETE],      integration: intManageProjects,  ...adminOpts });
    this.httpApi.addRoutes({ path: "/admin/timeline",           methods: [apigatewayv2.HttpMethod.GET, apigatewayv2.HttpMethod.POST],        integration: intManageTimeline,  ...adminOpts });
    this.httpApi.addRoutes({ path: "/admin/timeline/{id}",      methods: [apigatewayv2.HttpMethod.PUT, apigatewayv2.HttpMethod.DELETE],      integration: intManageTimeline,  ...adminOpts });
    this.httpApi.addRoutes({ path: "/admin/upload-url",         methods: [apigatewayv2.HttpMethod.POST],                                    integration: intGetUploadUrl,    ...adminOpts });
  }
}

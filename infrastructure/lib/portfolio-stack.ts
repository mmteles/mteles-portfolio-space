import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as ses from "aws-cdk-lib/aws-ses";
import { Construct } from "constructs";
import { DatabaseConstruct } from "./constructs/database";
import { CognitoConstruct } from "./constructs/cognito";
import { StorageConstruct } from "./constructs/storage";
import { ApiConstruct } from "./constructs/api";
import { GitHubOidcConstruct } from "./constructs/github-oidc";
import { FrontendHostingConstruct } from "./constructs/frontend-hosting";

export class PortfolioStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ── Domain config ────────────────────────────────────────────────────────
    // Set these in cdk.json "context" or pass via CLI:
    //   npx cdk deploy --context cloudfrontCertArn=arn:aws:acm:us-east-1:...
    //                  --context apiCertArn=arn:aws:acm:us-west-2:...
    //
    // cloudfrontCertArn MUST be in us-east-1 (CloudFront requirement).
    // apiCertArn        MUST be in the stack region (us-west-2).
    // Both cover: mteles.com, www.mteles.com, api.mteles.com
    const cloudfrontCertArn = this.node.tryGetContext("cloudfrontCertArn") as string | undefined;
    const apiCertArn        = this.node.tryGetContext("apiCertArn")        as string | undefined;

    // ── Database ─────────────────────────────────────────────────────────────
    const db = new DatabaseConstruct(this, "Database");

    // ── Auth ─────────────────────────────────────────────────────────────────
    const auth = new CognitoConstruct(this, "Auth");

    // ── Storage (project-media + resume) ─────────────────────────────────────
    const storage = new StorageConstruct(this, "Storage");

    // ── Step 3: Frontend hosting on www.mteles.com ───────────────────────────
    const frontend = new FrontendHostingConstruct(this, "Frontend", {
      customDomains: ["www.mteles.com", "mteles.com"],
      certificateArn: cloudfrontCertArn,
    });

    // ── API (Lambda + API Gateway) ────────────────────────────────────────────
    const api = new ApiConstruct(this, "Api", {
      dbSecret: db.secret,
      dbProxy: db.proxy,
      vpc: db.vpc,
      lambdaSecurityGroup: db.lambdaSecurityGroup,
      userPoolId: auth.userPool.userPoolId,
      userPoolClientId: auth.userPoolClient.userPoolClientId,
      mediaBucket: storage.mediaBucket,
      resumeBucket: storage.resumeBucket,
      cdnDomain: `https://${storage.distribution.distributionDomainName}`,
      corsOrigins: [
        `https://${frontend.distribution.distributionDomainName}`,
        "https://www.mteles.com",
        "https://mteles.com",
      ],
    });

    // ── Step 4: API Gateway custom domain → api.mteles.com ───────────────────
    // Requires apiCertArn to be set in CDK context (cert in stack region).
    if (apiCertArn) {
      const apiCustomCert = acm.Certificate.fromCertificateArn(this, "ApiCert", apiCertArn);

      const apiDomainName = new apigatewayv2.DomainName(this, "ApiDomainName", {
        domainName: "api.mteles.com",
        certificate: apiCustomCert,
      });

      new apigatewayv2.ApiMapping(this, "ApiMapping", {
        api: api.httpApi,
        domainName: apiDomainName,
      });

      new cdk.CfnOutput(this, "ApiCustomDomainTarget", {
        value: apiDomainName.regionalDomainName,
        description:
          "Squarespace DNS: add CNAME record — Host: api, Points To: this value",
      });
    }

    // ── SES domain identity for sending contact emails ────────────────────────
    // After deploy, add the DNS records output below to Squarespace to verify.
    new ses.EmailIdentity(this, "SesEmailIdentity", {
      identity: ses.Identity.domain("mteles.com"),
    });

    // ── GitHub Actions OIDC (keyless AWS auth for CI/CD) ─────────────────────
    new GitHubOidcConstruct(this, "GithubOidc", {
      githubOwner: "mmteles",
      githubRepo: "mteles-portfolio-space",
      branch: "main",
    });

    // ── Stack Outputs ─────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.httpApi.url ?? "",
      description: "Default API Gateway URL (use api.mteles.com once Step 4 is done)",
    });

    new cdk.CfnOutput(this, "CognitoUserPoolId", {
      value: auth.userPool.userPoolId,
      description: "Set as VITE_COGNITO_USER_POOL_ID in GitHub Secrets",
    });

    new cdk.CfnOutput(this, "CognitoClientId", {
      value: auth.userPoolClient.userPoolClientId,
      description: "Set as VITE_COGNITO_CLIENT_ID in GitHub Secrets",
    });

    new cdk.CfnOutput(this, "MediaCdnUrl", {
      value: `https://${storage.distribution.distributionDomainName}`,
      description: "CloudFront media CDN URL - set as VITE_STORAGE_BASE_URL in GitHub Secrets",
    });

    new cdk.CfnOutput(this, "FrontendBucketName", {
      value: frontend.bucket.bucketName,
      description: "Set as AWS_FRONTEND_BUCKET in GitHub Secrets",
    });

    new cdk.CfnOutput(this, "FrontendDistributionId", {
      value: frontend.distribution.distributionId,
      description: "Set as AWS_CF_DISTRIBUTION_ID in GitHub Secrets",
    });

    new cdk.CfnOutput(this, "FrontendCdnDomain", {
      value: frontend.distribution.distributionDomainName,
      description:
        cloudfrontCertArn
          ? "Squarespace DNS: add CNAME record — Host: www, Points To: this value"
          : "CloudFront domain (no custom domain yet — pass cloudfrontCertArn context to enable www.mteles.com)",
    });

    new cdk.CfnOutput(this, "DbSecretArn", {
      value: db.secret.secretArn,
      description: "Secrets Manager ARN for DB credentials",
    });
  }
}

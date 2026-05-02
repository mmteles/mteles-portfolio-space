import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import { Construct } from "constructs";

export class CognitoConstruct extends Construct {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.userPool = new cognito.UserPool(this, "UserPool", {
      userPoolName: "portfolio-users",
      selfSignUpEnabled: false, // only admin can create accounts via console
      signInAliases: { email: true },
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 12,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      email: cognito.UserPoolEmail.withCognito(), // use Cognito's built-in email for password reset
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      // Standard attributes
      standardAttributes: {
        email: { required: true, mutable: true },
      },
    });

    // Admin group — Lambda checks cognito:groups claim from JWT
    const adminGroup = new cognito.CfnUserPoolGroup(this, "AdminGroup", {
      userPoolId: this.userPool.userPoolId,
      groupName: "admin",
      description: "Portfolio admin users",
    });

    // SPA client — no client secret (public client for browser use)
    this.userPoolClient = new cognito.UserPoolClient(this, "SpaClient", {
      userPool: this.userPool,
      userPoolClientName: "portfolio-spa",
      generateSecret: false, // must be false for browser/SPA
      authFlows: {
        userPassword: true, // EMAIL + PASSWORD sign-in
        userSrp: true,      // more secure SRP-based flow (recommended for production)
      },
      // No oAuth block — email/password only, no social login or hosted UI needed
      disableOAuth: true,
      // Token validity
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      refreshTokenValidity: cdk.Duration.days(30),
      preventUserExistenceErrors: true, // security: don't leak whether email exists
    });
  }
}

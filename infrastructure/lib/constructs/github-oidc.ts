/**
 * GitHubOidcConstruct
 *
 * Creates an IAM OIDC identity provider for GitHub Actions and a deployment
 * role that GitHub Actions workflows can assume — no long-lived AWS keys
 * are ever stored in GitHub Secrets.
 *
 * How it works:
 *   1. GitHub presents a short-lived OIDC token when a workflow runs.
 *   2. AWS validates the token against the GitHub OIDC provider.
 *   3. The workflow assumes the DeployRole and gets temporary credentials.
 *
 * Usage in a workflow:
 *   permissions:
 *     id-token: write   # required for OIDC
 *     contents: read
 *
 *   - uses: aws-actions/configure-aws-credentials@v4
 *     with:
 *       role-to-assume: arn:aws:iam::ACCOUNT_ID:role/portfolio-github-deploy
 *       aws-region: us-east-1
 */
import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

interface GitHubOidcProps {
  /** GitHub owner (user or org). e.g. "mmteles" */
  githubOwner: string;
  /** GitHub repository name. e.g. "mteles-portfolio-space" */
  githubRepo: string;
  /** Restrict to a specific branch, or "*" for any branch. Default: "main" */
  branch?: string;
}

export class GitHubOidcConstruct extends Construct {
  public readonly deployRole: iam.Role;

  constructor(scope: Construct, id: string, props: GitHubOidcProps) {
    super(scope, id);

    const { githubOwner, githubRepo, branch = "main" } = props;

    // GitHub OIDC provider — one per AWS account.
    // Pass the existing ARN via CDK context ("githubOidcProviderArn") to avoid
    // a deployment error if the provider was already created in a prior stack.
    const existingProviderArn = this.node.tryGetContext("githubOidcProviderArn") as string | undefined;
    const provider = existingProviderArn
      ? iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(this, "GitHubOidcProvider", existingProviderArn)
      : new iam.OpenIdConnectProvider(this, "GitHubOidcProvider", {
          url: "https://token.actions.githubusercontent.com",
          clientIds: ["sts.amazonaws.com"],
          thumbprints: ["6938fd4d98bab03faadb97b34396831e3780aea1"],
        });

    // IAM role assumed by GitHub Actions
    this.deployRole = new iam.Role(this, "DeployRole", {
      roleName: "portfolio-github-deploy",
      assumedBy: new iam.WebIdentityPrincipal(provider.openIdConnectProviderArn, {
        StringEquals: {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
        },
        StringLike: {
          // Allow any workflow in this repo on the specified branch
          "token.actions.githubusercontent.com:sub":
            `repo:${githubOwner}/${githubRepo}:ref:refs/heads/${branch}`,
        },
      }),
      description: "Role assumed by GitHub Actions for portfolio deployment",
      maxSessionDuration: cdk.Duration.hours(1),
    });

    // ── Permissions the deploy role needs ─────────────────────────────────

    // CDK deploy needs broad CloudFormation + resource provisioning access.
    // For a personal project, AdministratorAccess is pragmatic.
    // For production, replace with a scoped policy covering only the services used.
    this.deployRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("AdministratorAccess")
    );

    new cdk.CfnOutput(this, "DeployRoleArn", {
      value: this.deployRole.roleArn,
      description: "Set as AWS_DEPLOY_ROLE_ARN in GitHub repository secrets",
    });
  }
}

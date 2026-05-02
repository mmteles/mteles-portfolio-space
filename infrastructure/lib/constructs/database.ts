import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

export class DatabaseConstruct extends Construct {
  public readonly vpc: ec2.Vpc;
  public readonly secret: secretsmanager.ISecret;
  public readonly proxy: rds.DatabaseProxy;
  public readonly lambdaSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // VPC: 2 AZs, 1 NAT gateway so Lambda in private subnet can reach Secrets Manager & SES
    this.vpc = new ec2.Vpc(this, "Vpc", {
      maxAzs: 2,
      natGateways: 1, // 1 NAT gateway so Lambda in private subnet can reach Secrets Manager & SES
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "Public",
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: "Private",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 28,
          name: "Isolated",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    // Three separate security groups: Lambda → Proxy → RDS
    // Merging proxy + RDS into one SG with allowAllOutbound:false breaks the
    // proxy's outbound TCP connection to port 5432, and a self-referencing
    // ingress rule would let Lambda bypass the proxy entirely.
    this.lambdaSecurityGroup = new ec2.SecurityGroup(this, "LambdaSg", {
      vpc: this.vpc,
      description: "Lambda functions security group",
      allowAllOutbound: true,
    });

    const proxySg = new ec2.SecurityGroup(this, "ProxySg", {
      vpc: this.vpc,
      description: "RDS Proxy security group",
      allowAllOutbound: true,
    });

    const dbSecurityGroup = new ec2.SecurityGroup(this, "DbSg", {
      vpc: this.vpc,
      description: "RDS instance — only proxy may connect",
      allowAllOutbound: false,
    });

    // Lambda → Proxy
    proxySg.addIngressRule(this.lambdaSecurityGroup, ec2.Port.tcp(5432), "Lambda to Proxy");
    // Proxy → RDS
    dbSecurityGroup.addIngressRule(proxySg, ec2.Port.tcp(5432), "Proxy to RDS");

    // RDS PostgreSQL db.t4g.micro (cheapest ARM instance, ~$13/month)
    const dbInstance = new rds.DatabaseInstance(this, "Postgres", {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T4G,
        ec2.InstanceSize.MICRO
      ),
      vpc: this.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [dbSecurityGroup],
      databaseName: "portfolio",
      credentials: rds.Credentials.fromGeneratedSecret("portfolio_admin", {
        secretName: "/portfolio/db-credentials",
      }),
      multiAz: false, // single-AZ for cost — acceptable for a portfolio
      allocatedStorage: 20,
      storageType: rds.StorageType.GP2,
      deletionProtection: true,
      backupRetention: cdk.Duration.days(7),
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    this.secret = dbInstance.secret!;

    // RDS Proxy: manages connection pooling for Lambda cold starts
    this.proxy = new rds.DatabaseProxy(this, "Proxy", {
      proxyTarget: rds.ProxyTarget.fromInstance(dbInstance),
      secrets: [this.secret],
      vpc: this.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [proxySg],
      requireTLS: true,
      iamAuth: false, // use password auth via Secrets Manager for simplicity
      idleClientTimeout: cdk.Duration.minutes(10),
      debugLogging: false,
    });

    // Per-function grants are applied in ApiConstruct (dbProxy.grantConnect(fn))
    // so no account-root grant is needed here.

    new cdk.CfnOutput(this, "ProxyEndpoint", {
      value: this.proxy.endpoint,
      description: "RDS Proxy endpoint",
    });
  }
}

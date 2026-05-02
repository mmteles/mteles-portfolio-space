import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import { Construct } from "constructs";

export class StorageConstruct extends Construct {
  public readonly mediaBucket: s3.Bucket;
  public readonly resumeBucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Single bucket with prefixes: /project-media/ and /resume/
    // (mirrors the two Supabase storage buckets)
    this.mediaBucket = new s3.Bucket(this, "MediaBucket", {
      bucketName: `portfolio-media-${cdk.Stack.of(this).account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL, // CloudFront OAC handles public access
      encryption: s3.BucketEncryption.S3_MANAGED,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
          allowedOrigins: ["*"], // tighten to your domain after setup
          allowedHeaders: ["*"],
          maxAge: 3000,
        },
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      versioned: false,
      lifecycleRules: [
        {
          id: "expire-multipart-uploads",
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(1),
        },
      ],
    });

    // Resume bucket is kept separate so permissions can differ
    this.resumeBucket = new s3.Bucket(this, "ResumeBucket", {
      bucketName: `portfolio-resume-${cdk.Stack.of(this).account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
          allowedOrigins: ["*"],
          allowedHeaders: ["*"],
          maxAge: 3000,
        },
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Origin Access Control for CloudFront → S3 (modern replacement for OAI)
    const oac = new cloudfront.S3OriginAccessControl(this, "OAC", {
      description: "Portfolio media OAC",
    });

    // CloudFront distribution serving both buckets via path-based behaviours
    this.distribution = new cloudfront.Distribution(this, "Cdn", {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(
          this.mediaBucket,
          { originAccessControl: oac }
        ),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        compress: true,
      },
      additionalBehaviors: {
        "/resume/*": {
          origin: origins.S3BucketOrigin.withOriginAccessControl(
            this.resumeBucket,
            { originAccessControl: oac }
          ),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED, // always serve latest resume
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        },
      },
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // US + EU only (cheapest)
    });

    // Grant CloudFront read access to both buckets
    this.mediaBucket.addToResourcePolicy(
      new cdk.aws_iam.PolicyStatement({
        actions: ["s3:GetObject"],
        principals: [new cdk.aws_iam.ServicePrincipal("cloudfront.amazonaws.com")],
        resources: [`${this.mediaBucket.bucketArn}/*`],
        conditions: {
          StringEquals: {
            "AWS:SourceArn": `arn:aws:cloudfront::${cdk.Stack.of(this).account}:distribution/${this.distribution.distributionId}`,
          },
        },
      })
    );

    this.resumeBucket.addToResourcePolicy(
      new cdk.aws_iam.PolicyStatement({
        actions: ["s3:GetObject"],
        principals: [new cdk.aws_iam.ServicePrincipal("cloudfront.amazonaws.com")],
        resources: [`${this.resumeBucket.bucketArn}/*`],
        conditions: {
          StringEquals: {
            "AWS:SourceArn": `arn:aws:cloudfront::${cdk.Stack.of(this).account}:distribution/${this.distribution.distributionId}`,
          },
        },
      })
    );

    new cdk.CfnOutput(this, "MediaBucketName", { value: this.mediaBucket.bucketName });
    new cdk.CfnOutput(this, "ResumeBucketName", { value: this.resumeBucket.bucketName });
    new cdk.CfnOutput(this, "CdnDomain", { value: this.distribution.distributionDomainName });
  }
}

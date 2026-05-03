/**
 * FrontendHostingConstruct
 *
 * S3 bucket + CloudFront distribution for hosting the built React/Vite app.
 * This is OPTIONAL — only needed if you leave Lovable.dev and self-host.
 *
 * Supports a custom domain (e.g. mteles.com) via ACM certificate.
 * The ACM certificate MUST be in us-east-1 regardless of your stack region.
 *
 * If you pass customDomain, you get:
 *   - A CloudFront distribution with your domain as an alias
 *   - CfnOutput with the CNAME value to add to Squarespace DNS
 *
 * If you don't pass customDomain, CloudFront serves on *.cloudfront.net.
 */
import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import { Construct } from "constructs";

interface FrontendHostingProps {
  /**
   * Optional custom domain, e.g. "mteles.com" or "www.mteles.com".
   * If provided, also pass certificateArn.
   */
  customDomain?: string;
  /**
   * ARN of an ACM certificate covering customDomain.
   * Must be in us-east-1 (CloudFront requirement).
   * Create via: aws acm request-certificate --region us-east-1 ...
   */
  certificateArn?: string;
}

export class FrontendHostingConstruct extends Construct {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: FrontendHostingProps = {}) {
    super(scope, id);

    const { customDomain, certificateArn } = props;

    // S3 bucket — no public access, served exclusively via CloudFront OAC
    this.bucket = new s3.Bucket(this, "FrontendBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      versioned: false,
    });

    const oac = new cloudfront.S3OriginAccessControl(this, "FrontendOAC", {
      description: "Portfolio frontend OAC",
    });

    // Certificate (only if custom domain is provided)
    const certificate =
      customDomain && certificateArn
        ? acm.Certificate.fromCertificateArn(this, "Cert", certificateArn)
        : undefined;

    // CloudFront distribution
    this.distribution = new cloudfront.Distribution(this, "FrontendCdn", {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.bucket, {
          originAccessControl: oac,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
      },
      // SPA routing: return index.html for all 404s so React Router handles navigation
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: cdk.Duration.seconds(0),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: cdk.Duration.seconds(0),
        },
      ],
      defaultRootObject: "index.html",
      domainNames: customDomain ? [customDomain] : undefined,
      certificate,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
    });

    // Grant CloudFront read access to the bucket
    this.bucket.addToResourcePolicy(
      new cdk.aws_iam.PolicyStatement({
        actions: ["s3:GetObject"],
        principals: [new cdk.aws_iam.ServicePrincipal("cloudfront.amazonaws.com")],
        resources: [`${this.bucket.bucketArn}/*`],
        conditions: {
          StringEquals: {
            "AWS:SourceArn": `arn:aws:cloudfront::${cdk.Stack.of(this).account}:distribution/${this.distribution.distributionId}`,
          },
        },
      })
    );

    // Outputs
    new cdk.CfnOutput(this, "FrontendBucketName", {
      value: this.bucket.bucketName,
      description: "Set as AWS_FRONTEND_BUCKET in GitHub Secrets",
    });

    new cdk.CfnOutput(this, "FrontendCdnDomain", {
      value: this.distribution.distributionDomainName,
      description: customDomain
        ? "Squarespace DNS: add CNAME record — Host: www, Points To: see Value field above"
        : "Frontend CloudFront domain (no custom domain configured)",
    });

    new cdk.CfnOutput(this, "FrontendDistributionId", {
      value: this.distribution.distributionId,
      description: "Set as AWS_CF_DISTRIBUTION_ID in GitHub Secrets",
    });

    if (customDomain) {
      new cdk.CfnOutput(this, "SquarespaceCnameTarget", {
        value: this.distribution.distributionDomainName,
        description: `Squarespace DNS: add CNAME record - Host: www, Points To: this value`,
      });
    }
  }
}

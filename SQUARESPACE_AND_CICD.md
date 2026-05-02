# Squarespace Domain + GitHub Actions CI/CD Guide

---

## Part 1: Connecting a Squarespace Domain to AWS

Squarespace lets you manage DNS records directly from your Domains dashboard.
You do **not** need to transfer your domain away from Squarespace — just add
a few records pointing to your CloudFront distribution.

### What you're connecting

| Traffic | Goes to | DNS record needed |
|---|---|---|
| Website visitors (`www.mteles.com`) | CloudFront (frontend) | `CNAME` (see Step 2b — Squarespace does not support apex ALIAS; use `www` as primary and redirect root → www) |
| API calls (`api.mteles.com`) | API Gateway custom domain | `CNAME` |

---

### Step 1: Request an ACM Certificate (us-east-1)

CloudFront requires your SSL certificate to live in **us-east-1**, regardless
of where your other AWS resources are.

```bash
# Request a cert covering both root domain and www subdomain (for CloudFront)
aws acm request-certificate \
  --domain-name "mteles.com" \
  --subject-alternative-names "www.mteles.com" \
  --validation-method DNS \
  --region us-east-1

# The output gives you a CertificateArn like:
# arn:aws:acm:us-east-1:123456789012:certificate/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Request a separate cert for the API custom domain (REGIONAL endpoint requires same-region cert)
aws acm request-certificate \
  --domain-name "api.mteles.com" \
  --validation-method DNS \
  --region us-west-2
```

AWS will give you CNAME records to prove domain ownership. Add them in
Squarespace (Step 2), wait a few minutes, then the cert status turns "Issued".

---

### Step 2: Add DNS records in Squarespace

1. Log in to **Squarespace** → **Domains** → click your domain
2. Click **DNS Settings** → **Custom Records**
3. Add the following records:

#### 2a. ACM certificate validation records (temporary — for cert issuance)

AWS gives you one or two CNAME records. They look like:

| Type | Host | Data |
|---|---|---|
| CNAME | `_xxxxxxxxxxxx.mteles.com` | `_yyyyyyyy.acm-validations.aws.` |
| CNAME | `_xxxxxxxxxxxx.www.mteles.com` | `_zzzzzzzz.acm-validations.aws.` |

Get the exact values from the AWS Console:
**ACM → Certificates → your cert → Domains → "CNAME name" + "CNAME value"**

Add these in Squarespace. Once the cert shows "Issued", you can remove them
(or leave them — they're harmless).

#### 2b. Frontend records (point your domain to CloudFront)

Squarespace does not support ALIAS/ANAME records for the root domain,
so use `www` as your primary domain (redirect root → www from Squarespace panel).

| Type | Host | Data | TTL |
|---|---|---|---|
| CNAME | `www` | `dXXXXXXXXXXXX.cloudfront.net` | 3600 |

> **Get the CloudFront domain** from CDK output `FrontendCdnDomain` after deploying,
> or from the AWS Console: **CloudFront → Distributions → your distribution → Domain name**

To also redirect the root (`mteles.com`) to `www`:
- In Squarespace Domains → **URL Redirects** → add: `mteles.com` → `https://www.mteles.com` (301 permanent)

#### 2c. API subdomain record (added after Step 4 when custom domain is created)

See Step 4 for instructions on creating the API Gateway custom domain and obtaining
the correct CNAME target (`DomainNameConfigurations[0].ApiGatewayDomainName`).

---

### Step 3: Add custom domain to CloudFront

Enable the `FrontendHostingConstruct` in your stack with your domain and cert:

```typescript
// In infrastructure/lib/portfolio-stack.ts, add:
import { FrontendHostingConstruct } from "./constructs/frontend-hosting";

const frontend = new FrontendHostingConstruct(this, "Frontend", {
  customDomain: "www.mteles.com",
  certificateArn: "arn:aws:acm:us-east-1:YOUR_ACCOUNT:certificate/YOUR_CERT_ID",
});
```

Then redeploy:
```bash
cd infrastructure && npx cdk deploy MtelesPortfolioStack
```

---

### Step 4: Add custom domain to API Gateway (optional)

```bash
# Get your cert ARN (from the us-west-2 certificate requested in Step 1)
CERT_ARN=$(aws acm list-certificates --region us-west-2 \
  --query "CertificateSummaryList[?DomainName=='api.mteles.com'].CertificateArn" \
  --output text)

# Get your API ID
API_ID=$(aws apigatewayv2 get-apis \
  --query "Items[?Name=='portfolio-api'].ApiId" \
  --output text)

# Create custom domain (using the us-west-2 certificate for REGIONAL endpoint)
aws apigatewayv2 create-domain-name \
  --domain-name "api.mteles.com" \
  --domain-name-configurations \
    CertificateArn=$CERT_ARN,EndpointType=REGIONAL

# Map the domain to your API
aws apigatewayv2 create-api-mapping \
  --domain-name "api.mteles.com" \
  --api-id $API_ID \
  --stage '$default'

# Get the target value for your DNS CNAME
API_GATEWAY_DOMAIN=$(aws apigatewayv2 get-domain-name \
  --domain-name "api.mteles.com" \
  --query "DomainNameConfigurations[0].ApiGatewayDomainName" \
  --output text)

echo "Add this CNAME in Squarespace:"
echo "Type: CNAME | Host: api | Data: $API_GATEWAY_DOMAIN | TTL: 3600"
```

Add the returned `ApiGatewayDomainName` (d-xxxx.execute-api.us-west-2.amazonaws.com) as a CNAME for `api` in Squarespace.

Then update `VITE_API_URL` in your GitHub Secrets to `https://api.mteles.com`.

---

### Full DNS records summary

| Type | Host | Points to | Purpose |
|---|---|---|---|
| CNAME | `www` | `dXXXX.cloudfront.net` | Frontend website |
| CNAME | `api` | `d-xxxx.execute-api.us-west-2.amazonaws.com` | API Gateway |
| CNAME | `_validation1` | `_xxxxx.acm-validations.aws.` | SSL cert validation |
| Redirect | `mteles.com` | `https://www.mteles.com` | Root → www |

---

## Part 2: GitHub Actions CI/CD

**Yes — once your code is on GitHub, it deploys automatically to AWS.**
No Lovable.dev, no manual steps.

The two workflows in `.github/workflows/` handle everything:

| Workflow | Triggers when | What it does |
|---|---|---|
| `deploy-infra.yml` | `infrastructure/` files change | `cdk deploy` — provisions/updates all AWS resources |
| `deploy-frontend.yml` | `src/`, `public/`, `index.html` change | Build React app → S3 sync → CloudFront cache invalidation |

Both use **GitHub OIDC** — your AWS credentials are never stored anywhere. GitHub
generates a short-lived token at runtime that AWS validates and exchanges for
temporary credentials.

---

### One-time setup: Bootstrap the OIDC trust

Before the workflows can run, you need to deploy the OIDC role once manually:

```bash
# 1. Configure your AWS CLI
aws configure
# Enter your Access Key, Secret Key, region (us-west-2)

# 2. Bootstrap CDK (one-time per AWS account)
cd infrastructure
npm install
npx cdk bootstrap aws://YOUR_ACCOUNT_ID/us-west-2

# If you manage CloudFront certificates via CDK, also bootstrap us-east-1:
npx cdk bootstrap aws://YOUR_ACCOUNT_ID/us-east-1

# 3. Deploy the stack — this creates the GitHub OIDC role
npx cdk deploy MtelesPortfolioStack --require-approval never
```

After this first deploy, CDK outputs will show `DeployRoleArn`. All future
deploys happen automatically via GitHub Actions using that role.

---

### GitHub Secrets to configure

Go to: **GitHub → your repo → Settings → Secrets and variables → Actions → New repository secret**

Add these secrets (values come from CDK stack outputs after the first deploy):

| Secret name | Where to get the value |
|---|---|
| `AWS_DEPLOY_ROLE_ARN` | CDK output `GithubOidcDeployRoleArn` |
| `VITE_API_URL` | CDK output `ApiUrl` |
| `VITE_COGNITO_USER_POOL_ID` | CDK output `CognitoUserPoolId` |
| `VITE_COGNITO_CLIENT_ID` | CDK output `CognitoClientId` |
| `VITE_STORAGE_BASE_URL` | CDK output `MediaCdnUrl` |
| `AWS_FRONTEND_BUCKET` | CDK output `FrontendBucketName` (after adding FrontendHostingConstruct) |
| `AWS_CF_DISTRIBUTION_ID` | CDK output `FrontendDistributionId` |

```bash
# Shortcut: read all outputs at once after deployment
aws cloudformation describe-stacks \
  --stack-name MtelesPortfolioStack \
  --query "Stacks[0].Outputs[*].[OutputKey,OutputValue]" \
  --output table
```

---

### How the full deploy flow works

```text
git push origin main
        │
        ├─ files in infrastructure/ changed?
        │         │
        │         └─► deploy-infra.yml
        │               1. Checkout code
        │               2. Assume AWS role via OIDC (no keys)
        │               3. npm ci (CDK deps)
        │               4. cdk diff (logged)
        │               5. cdk deploy → AWS updates Lambda/RDS/Cognito/etc.
        │
        └─ files in src/ changed?
                  │
                  └─► deploy-frontend.yml
                        1. Checkout code
                        2. Assume AWS role via OIDC
                        3. npm ci
                        4. npm run build (injects VITE_ secrets)
                        5. aws s3 sync dist/ → S3 bucket
                           - Hashed assets: cache 1 year
                           - index.html: no-cache
                        6. CloudFront invalidation (/* )
                           → users get new version within ~30 seconds
```

---

### Verify a deployment

```bash
# Watch the workflow run in real time
gh run watch

# Or list recent runs
gh run list --workflow=deploy-frontend.yml

# Check CloudFront invalidation status
aws cloudfront list-invalidations \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --query "InvalidationList.Items[0].{Id:Id,Status:Status}"
```

---

### Lovable.dev vs self-hosted: which to use?

| | Lovable.dev (current) | S3 + CloudFront + GitHub Actions |
|---|---|---|
| Setup effort | Zero | ~1 hour |
| Cost | Free (for public repos) | ~$1/mo (S3 + CF) |
| Custom domain | Via Lovable dashboard | Via CloudFront + Squarespace DNS |
| Deploy speed | ~2-3 min | ~2-3 min |
| Control | Limited | Full |
| Recommendation | Keep it if you're happy | Switch if you want your domain + full AWS |

**Simplest path**: keep Lovable.dev for hosting, disable `deploy-frontend.yml`,
and only use `deploy-infra.yml` for the backend. Your custom domain can still
point to Lovable.dev's provided URL (they support custom domains in the Share menu).

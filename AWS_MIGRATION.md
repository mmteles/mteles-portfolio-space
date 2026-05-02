# AWS Migration Guide — Supabase → AWS

Complete guide to migrate the mteles portfolio backend from Supabase to AWS.

---

## Architecture Overview

```
Browser
  │
  ├── Static Assets → Lovable.dev (keep as-is) or S3 + CloudFront
  │
  ├── API calls ──────────────────────── API Gateway (HTTP API)
  │                                             │
  │                                    Lambda (Node.js 22, ARM64)
  │                                             │
  │                              ┌──────────────┴──────────────┐
  │                              │                             │
  │                           RDS Proxy                  Secrets Manager
  │                              │                       (DB creds, Resend key)
  │                         RDS PostgreSQL 16
  │                         (db.t4g.micro, private subnet)
  │
  ├── Auth ──────────────────── Cognito User Pool
  │                             (email+password, JWT, password reset)
  │
  └── File uploads ────────── S3 (presigned PUT URLs)
                              ↑
                         CloudFront CDN (public read)
```

### Service Mapping

| Supabase | AWS | Notes |
|---|---|---|
| PostgreSQL + RLS | RDS PostgreSQL 16 | Same schema, no RLS — API layer enforces auth |
| Supabase Auth | Cognito User Pool | Email/password, JWT, password reset via code |
| Storage (project-media) | S3 + CloudFront | Public CDN read, admin presigned PUT |
| Storage (resume) | S3 + CloudFront | Separate prefix, same distribution |
| Edge Functions (Deno) | Lambda (Node.js 22) | TypeScript, same Resend API |
| PostgREST (auto REST) | API Gateway + Lambda | Explicit route handlers |

---

## Prerequisites

```bash
# Install required tools
brew install awscli node
npm install -g aws-cdk typescript ts-node

# Configure AWS credentials
aws configure
# → Enter: Access Key ID, Secret Access Key, Region (us-east-1), output format (json)

# Verify
aws sts get-caller-identity
```

---

## Phase 1: Bootstrap Infrastructure (Day 1–2)

### 1.1 Store the Resend API key in Secrets Manager

```bash
aws secretsmanager create-secret \
  --name "/portfolio/resend-api-key" \
  --secret-string "re_YOUR_RESEND_API_KEY_HERE" \
  --region us-east-1
```

### 1.2 Install CDK dependencies and bootstrap

```bash
cd infrastructure
npm install

# Bootstrap CDK in your account/region (one-time per account)
npx cdk bootstrap aws://YOUR_ACCOUNT_ID/us-east-1
```

### 1.3 Preview what will be created

```bash
npx cdk synth    # generates CloudFormation without deploying
npx cdk diff     # shows what will change
```

### 1.4 Deploy the full stack

```bash
npx cdk deploy MtelesPortfolioStack --require-approval never
```

Deployment takes ~10 minutes (RDS provisioning is the slowest step).

**Save the outputs** — you'll need them for environment variables:

```
MtelesPortfolioStack.ApiUrl            = https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com
MtelesPortfolioStack.CognitoUserPoolId = us-east-1_XXXXXXXXX
MtelesPortfolioStack.CognitoClientId   = xxxxxxxxxxxxxxxxxxxxxxxxxx
MtelesPortfolioStack.MediaCdnUrl       = https://dXXXXXXXXXXXX.cloudfront.net
MtelesPortfolioStack.DbSecretArn       = arn:aws:secretsmanager:...
```

---

## Phase 2: Database Setup (Day 2)

### 2.1 Apply schema to RDS

The RDS instance is in a private subnet with no public access. Connect via:

**Option A — Temporary EC2 Bastion (recommended)**
```bash
# Launch a t3.nano in the same VPC public subnet
# (use the Console: EC2 → Launch Instance → select the portfolio VPC + public subnet)
# SSH into it, install psql, then run:
psql -h YOUR_RDS_PROXY_ENDPOINT -U portfolio_admin -d portfolio

# Paste schema.sql contents or use \i schema.sql
```

**Option B — AWS Cloud Shell + SSM**
```bash
# In AWS CloudShell, use the migrate.sh script
cd infrastructure
./db/migrate.sh
```

**Option C — RDS Query Editor (Console)**
- RDS → Databases → portfolio → Query Editor
- Paste schema.sql contents

### 2.2 Export data from Supabase

In the Supabase Dashboard → SQL Editor, run exports for each table:

```sql
-- Run each query, download as CSV
SELECT * FROM profiles;
SELECT * FROM projects;
SELECT * FROM project_media;
SELECT * FROM timeline_entries;
SELECT * FROM contact_messages;
```

### 2.3 Import data into RDS

```bash
# For each table
psql -h YOUR_RDS_PROXY -U portfolio_admin -d portfolio \
  -c "\COPY profiles FROM 'profiles.csv' CSV HEADER"

psql -h YOUR_RDS_PROXY -U portfolio_admin -d portfolio \
  -c "\COPY projects FROM 'projects.csv' CSV HEADER"

# etc.
```

---

## Phase 3: Cognito Admin User (Day 2)

### 3.1 Create your admin user

```bash
# Create user (replace with your email)
aws cognito-idp admin-create-user \
  --user-pool-id us-east-1_XXXXXXXXX \
  --username mauricio.mteles@gmail.com \
  --user-attributes Name=email,Value=mauricio.mteles@gmail.com Name=email_verified,Value=true \
  --temporary-password "Temp@Password123!" \
  --region us-east-1

# Set permanent password
aws cognito-idp admin-set-user-password \
  --user-pool-id us-east-1_XXXXXXXXX \
  --username mauricio.mteles@gmail.com \
  --password "YourSecurePassword123!" \
  --permanent \
  --region us-east-1

# Add to admin group
aws cognito-idp admin-add-user-to-group \
  --user-pool-id us-east-1_XXXXXXXXX \
  --username mauricio.mteles@gmail.com \
  --group-name admin \
  --region us-east-1
```

---

## Phase 4: Migrate S3 Assets (Day 3)

### 4.1 Download from Supabase Storage

```bash
# Use Supabase CLI to download bucket contents
npx supabase storage ls --project-ref jkjcdmolpwanozmzxqcz project-media
# Then download each file manually or use the Supabase REST API

# Example with curl for each file:
# curl "https://jkjcdmolpwanozmzxqcz.supabase.co/storage/v1/object/public/project-media/FILENAME" \
#   -o local/FILENAME
```

### 4.2 Upload to S3

```bash
MEDIA_BUCKET=$(aws cloudformation describe-stacks \
  --stack-name MtelesPortfolioStack \
  --query "Stacks[0].Outputs[?OutputKey=='MediaBucketName'].OutputValue" \
  --output text)

aws s3 sync ./local-media/ s3://$MEDIA_BUCKET/ --acl private

RESUME_BUCKET=$(aws cloudformation describe-stacks \
  --stack-name MtelesPortfolioStack \
  --query "Stacks[0].Outputs[?OutputKey=='ResumeBucketName'].OutputValue" \
  --output text)

aws s3 sync ./local-resume/ s3://$RESUME_BUCKET/ --acl private
```

### 4.3 Update media URLs in the database

After uploading, update URLs in `projects` and `project_media` tables from
`https://jkjcdmolpwanozmzxqcz.supabase.co/storage/v1/object/public/project-media/`
to `https://YOUR_CDN_DOMAIN/`:

```sql
UPDATE projects
SET thumbnail_url = REPLACE(thumbnail_url,
  'https://jkjcdmolpwanozmzxqcz.supabase.co/storage/v1/object/public/project-media/',
  'https://dXXXXXXXXXXXX.cloudfront.net/'
)
WHERE thumbnail_url LIKE '%supabase.co%';

UPDATE project_media
SET url = REPLACE(url,
  'https://jkjcdmolpwanozmzxqcz.supabase.co/storage/v1/object/public/project-media/',
  'https://dXXXXXXXXXXXX.cloudfront.net/'
)
WHERE url LIKE '%supabase.co%';
```

---

## Phase 5: Frontend Refactoring

### 5.1 Install Cognito SDK

```bash
cd .. # back to project root
npm install amazon-cognito-identity-js @aws-sdk/client-cognito-identity-provider
npm remove @supabase/supabase-js
```

### 5.2 Update environment variables

Replace `.env` contents:

```env
# Remove old Supabase vars
# VITE_SUPABASE_URL=...
# VITE_SUPABASE_PUBLISHABLE_KEY=...
# VITE_SUPABASE_PROJECT_ID=...

# Add AWS vars
VITE_API_URL=https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com
VITE_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_STORAGE_BASE_URL=https://dXXXXXXXXXXXX.cloudfront.net
```

### 5.3 Create AWS client wrapper

Create `src/integrations/aws/client.ts`:

```typescript
const API_URL = import.meta.env.VITE_API_URL as string;

async function getAuthHeader(): Promise<HeadersInit> {
  // Get token from Cognito session (see auth.ts below)
  const { getCognitoToken } = await import("./auth");
  const token = await getCognitoToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function authGet<T>(path: string): Promise<T> {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_URL}${path}`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function authPost<T>(path: string, body: unknown): Promise<T> {
  const headers = { ...(await getAuthHeader()), "Content-Type": "application/json" };
  const res = await fetch(`${API_URL}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function authPut<T>(path: string, body: unknown): Promise<T> {
  const headers = { ...(await getAuthHeader()), "Content-Type": "application/json" };
  const res = await fetch(`${API_URL}${path}`, { method: "PUT", headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function authDelete(path: string): Promise<void> {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_URL}${path}`, { method: "DELETE", headers });
  if (!res.ok) throw new Error(await res.text());
}
```

### 5.4 Create auth wrapper

Create `src/integrations/aws/auth.ts`:

```typescript
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession,
} from "amazon-cognito-identity-js";

const pool = new CognitoUserPool({
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
});

export function getCognitoToken(): Promise<string | null> {
  return new Promise((resolve) => {
    const user = pool.getCurrentUser();
    if (!user) return resolve(null);
    user.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session?.isValid()) return resolve(null);
      resolve(session.getIdToken().getJwtToken());
    });
  });
}

export function signIn(email: string, password: string): Promise<CognitoUserSession> {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: pool });
    const authDetails = new AuthenticationDetails({ Username: email, Password: password });
    user.authenticateUser(authDetails, {
      onSuccess: resolve,
      onFailure: reject,
      newPasswordRequired: () => reject(new Error("Password change required — use AWS Console")),
    });
  });
}

export function signOut(): void {
  pool.getCurrentUser()?.signOut();
}

export function forgotPassword(email: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: pool });
    user.forgotPassword({ onSuccess: () => resolve(), onFailure: reject });
  });
}

export function confirmPassword(email: string, code: string, newPassword: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: pool });
    user.confirmPassword(code, newPassword, { onSuccess: () => resolve(), onFailure: reject });
  });
}

export async function isAdmin(): Promise<boolean> {
  const token = await getCognitoToken();
  if (!token) return false;
  const payload = JSON.parse(atob(token.split(".")[1]));
  const groups: string[] = payload["cognito:groups"] ?? [];
  return groups.includes("admin");
}
```

### 5.5 Rewrite `src/hooks/useAuth.ts`

Replace the entire hook — the public interface stays identical:

```typescript
import { useState, useEffect, useCallback } from "react";
import {
  signIn as cognitoSignIn, signOut as cognitoSignOut,
  forgotPassword, getCognitoToken, isAdmin as checkAdmin,
} from "@/integrations/aws/auth";

export function useAuth() {
  const [session, setSession] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminStatus, setAdminStatus] = useState(false);

  const refresh = useCallback(async () => {
    const token = await getCognitoToken();
    setSession(token);
    setAdminStatus(token ? await checkAdmin() : false);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const signIn = async (email: string, password: string) => {
    await cognitoSignIn(email, password);
    await refresh();
  };

  const signOut = () => {
    cognitoSignOut();
    setSession(null);
    setAdminStatus(false);
  };

  const resetPasswordForEmail = (email: string) => forgotPassword(email);

  return {
    session,
    user: session ? { email: "" } : null, // expand if needed
    isAdmin: adminStatus,
    loading,
    signIn,
    signOut,
    resetPasswordForEmail,
  };
}
```

### 5.6 Update data hooks (minimal changes)

`src/hooks/useProfile.ts`:
```typescript
// Before: supabase.from("profiles_public").select("*").single()
// After:
import { apiGet } from "@/integrations/aws/client";
const queryFn = () => apiGet("/profile");
```

`src/hooks/useProjects.ts`:
```typescript
// Before: supabase.from("projects").select("*").eq("published", true)
// After:
const queryFn = () => apiGet("/projects");
const queryFnById = (id: string) => apiGet(`/projects/${id}`);
```

`src/hooks/useTimeline.ts`:
```typescript
// After:
const queryFn = () => apiGet("/timeline");
```

### 5.7 Update Contact.tsx

The two separate Supabase calls (insert + functions.invoke) become one:

```typescript
// Before (2 calls):
await supabase.from("contact_messages").insert({...})
await supabase.functions.invoke("send-contact-email", {...})

// After (1 call):
await fetch(`${API_URL}/contact`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name, email, subject, message }),
});
```

### 5.8 Update ResumeManager.tsx upload flow

```typescript
// Before: supabase.storage.from("resume").upload(path, file)
// After:
async function uploadResume(file: File) {
  // Step 1: get presigned URL
  const { uploadUrl, publicUrl } = await authPost<{uploadUrl: string; publicUrl: string}>(
    "/admin/upload-url",
    { bucket: "resume", filename: file.name, contentType: file.type }
  );

  // Step 2: PUT directly to S3 (no Lambda involved in the upload)
  await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });

  return publicUrl; // use this as the resume download URL
}
```

### 5.9 Update ResetPassword.tsx

Cognito sends a 6-digit code (not a magic link). The page needs a two-step UI:
1. Enter email → calls `forgotPassword(email)` → Cognito sends code
2. Enter code + new password → calls `confirmPassword(email, code, newPassword)`

```typescript
import { forgotPassword, confirmPassword } from "@/integrations/aws/auth";
```

---

## Phase 6: Testing & Cutover (Day 8–9)

### 6.1 Test the API manually

```bash
API_URL="https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com"

# Public endpoints
curl "$API_URL/profile"
curl "$API_URL/projects"
curl "$API_URL/timeline"
curl -X POST "$API_URL/contact" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","subject":"Test","message":"Hello from AWS"}'

# Admin endpoints (get token first by signing in via Cognito)
TOKEN="eyJ..." # from Cognito sign-in
curl "$API_URL/admin/messages" -H "Authorization: Bearer $TOKEN"
```

### 6.2 Verify CORS

```bash
curl -v -X OPTIONS "$API_URL/profile" \
  -H "Origin: http://localhost:8080" \
  -H "Access-Control-Request-Method: GET"
# Should return 200 with Access-Control-Allow-Origin header
```

### 6.3 Cutover

1. Update `.env` in Lovable.dev project settings with AWS values
2. Trigger a new deploy in Lovable.dev
3. Smoke test all pages and admin flows
4. Keep Supabase project running for 2 weeks as rollback option
5. After validation: pause or delete Supabase project

---

## Cost Estimate

| Service | Config | $/month |
|---|---|---|
| RDS PostgreSQL | db.t4g.micro, 20GB, single-AZ | ~$15 |
| API Gateway | HTTP API, ~1k req/mo | < $0.01 |
| Lambda | ARM64, 12 functions, ~1k invocations | Free tier |
| S3 | ~1GB storage | ~$0.02 |
| CloudFront | ~1GB/mo transfer | Free tier |
| Cognito | < 50k MAU | Free tier |
| RDS Proxy | (included with db.t4g.micro pricing) | ~$0 |
| Secrets Manager | 2 secrets | ~$0.80 |
| NAT Gateway | 1x (Lambda VPC egress) | ~$33 |
| **Total** | | **~$49/mo** |

**Cost optimization**: The NAT Gateway (~$33/mo) is the biggest cost driver.
To eliminate it:
- Use VPC Endpoints for Secrets Manager and S3 (Interface Endpoints: ~$7.30/mo each)
- Or move Lambda to a public subnet with a security group restricting DB access
- Or replace RDS with **Neon.tech** (serverless PostgreSQL, free tier, Lambda-compatible) and remove VPC entirely, reducing cost to ~$1-2/mo

---

## Rollback Plan

- Supabase project remains active throughout migration
- At any point, revert `.env` to Supabase values and redeploy
- No data loss risk: RDS is a copy, not a replacement, until you delete Supabase

---

## Useful Commands

```bash
# View Lambda logs
aws logs tail /aws/lambda/portfolio-submitcontact --follow

# Check API Gateway routes
aws apigatewayv2 get-routes --api-id YOUR_API_ID

# Get DB secret
aws secretsmanager get-secret-value --secret-id /portfolio/db-credentials

# Redeploy after Lambda code changes
cd infrastructure && npx cdk deploy MtelesPortfolioStack

# Destroy everything (CAUTION: RDS has deletionProtection=true, disable first)
npx cdk destroy MtelesPortfolioStack
```

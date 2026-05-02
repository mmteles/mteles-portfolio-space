/**
 * Shared database connection pool for all Lambda functions.
 * Uses RDS Proxy for connection pooling — Lambda functions share connections.
 * Credentials are fetched from Secrets Manager on cold start and cached.
 */
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import { Pool, PoolClient } from "pg";

let pool: Pool | null = null;

interface DbSecret {
  username: string;
  password: string;
  host: string;
  port: number;
  dbname: string;
}

async function getSecret(): Promise<DbSecret> {
  const secretArn = process.env.DB_SECRET_ARN;
  if (!secretArn) throw new Error("DB_SECRET_ARN environment variable is not set");
  const client = new SecretsManagerClient({});
  const response = await client.send(
    new GetSecretValueCommand({ SecretId: secretArn })
  );
  if (!response.SecretString) throw new Error("DB secret is not a string value");
  return JSON.parse(response.SecretString);
}

export async function getPool(): Promise<Pool> {
  if (pool) return pool;

  const secret = await getSecret();

  pool = new Pool({
    host: process.env.DB_PROXY_ENDPOINT ?? secret.host,
    port: secret.port ?? 5432,
    database: process.env.DB_NAME ?? secret.dbname,
    user: secret.username,
    password: secret.password,
    max: 5,          // RDS Proxy reuses connections; keep Lambda-side pool small
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
    ssl: { rejectUnauthorized: true }, // Lambda runtime includes Amazon root CAs
  });

  return pool;
}

/** Run a query and return rows — convenience wrapper. */
export async function query<T extends object = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const db = await getPool();
  const result = await db.query<T>(sql, params);
  return result.rows;
}

/** Run multiple statements in a single transaction. */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const db = await getPool();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    const originalErr = err;
    try {
      await client.query("ROLLBACK");
    } catch (rollbackErr) {
      console.error("ROLLBACK failed:", rollbackErr instanceof Error ? rollbackErr.message : rollbackErr);
    }
    throw originalErr;
  } finally {
    client.release();
  }
}

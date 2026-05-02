import { getCognitoToken } from "@/integrations/aws/auth";

const API_URL = ((import.meta.env.VITE_API_URL as string) ?? "").replace(/\/$/, "");

async function authHeaders(): Promise<HeadersInit> {
  const token = await getCognitoToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "Request failed");
    throw new Error(text);
  }
  return res.json() as Promise<T>;
}

/** Public GET — no auth header */
export async function apiGet<T = unknown>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  return handleResponse<T>(res);
}

/** Authenticated GET */
export async function authGet<T = unknown>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { headers: await authHeaders() });
  return handleResponse<T>(res);
}

/** Authenticated POST */
export async function authPost<T = unknown>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { ...(await authHeaders()), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

/** Public POST (contact form — no auth) */
export async function apiPost<T = unknown>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

/** Authenticated PUT */
export async function authPut<T = unknown>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "PUT",
    headers: { ...(await authHeaders()), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

/** Authenticated DELETE */
export async function authDelete(path: string): Promise<void> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "Delete failed");
    throw new Error(text);
  }
}

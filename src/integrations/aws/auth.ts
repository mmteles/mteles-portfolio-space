import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession,
} from "amazon-cognito-identity-js";

const pool = new CognitoUserPool({
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID as string,
  ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID as string,
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
    const user = new CognitoUser({ Username: email.toLowerCase(), Pool: pool });
    const authDetails = new AuthenticationDetails({
      Username: email.toLowerCase(),
      Password: password,
    });
    user.authenticateUser(authDetails, {
      onSuccess: resolve,
      onFailure: reject,
      newPasswordRequired: () =>
        reject(new Error("Password change required. Please contact the administrator.")),
    });
  });
}

export function signOut(): void {
  pool.getCurrentUser()?.signOut();
}

export function forgotPassword(email: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email.toLowerCase(), Pool: pool });
    user.forgotPassword({ onSuccess: () => resolve(), onFailure: reject });
  });
}

export function confirmNewPassword(email: string, code: string, newPassword: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email.toLowerCase(), Pool: pool });
    user.confirmPassword(code, newPassword, { onSuccess: () => resolve(), onFailure: reject });
  });
}

export async function getAdminStatus(): Promise<boolean> {
  const token = await getCognitoToken();
  if (!token) return false;
  try {
    const apiUrl = ((import.meta.env.VITE_API_URL as string) ?? "").replace(/\/$/, "");
    const res = await fetch(`${apiUrl}/admin/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return false;
    const data = await res.json() as { isAdmin: boolean };
    return data.isAdmin === true;
  } catch {
    return false;
  }
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const base64url = token.split(".")[1];
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(atob(base64));
}

export function getUserFromToken(token: string | null): { id: string; email: string } | null {
  if (!token) return null;
  try {
    const payload = decodeJwtPayload(token);
    return { id: payload.sub as string, email: (payload.email as string) ?? "" };
  } catch {
    return null;
  }
}

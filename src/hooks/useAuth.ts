import { useState, useEffect, useCallback } from "react";
import {
  getCognitoToken,
  signIn as cognitoSignIn,
  signOut as cognitoSignOut,
  getAdminStatus,
  getUserFromToken,
} from "@/integrations/aws/auth";

export function useAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const t = await getCognitoToken();
    setToken(t);
    setIsAdmin(t ? await getAdminStatus() : false);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const signIn = async (email: string, password: string) => {
    try {
      await cognitoSignIn(email, password);
      await refresh();
      return { error: null };
    } catch (err: unknown) {
      return { error: err };
    }
  };

  const signOut = async () => {
    cognitoSignOut();
    setToken(null);
    setIsAdmin(false);
  };

  const user = getUserFromToken(token);

  return {
    session: token ? { access_token: token } : null,
    user,
    isAdmin,
    loading,
    signIn,
    signOut,
  };
}

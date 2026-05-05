import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import {
  getCognitoToken,
  signIn as cognitoSignIn,
  signOut as cognitoSignOut,
  isAdminToken,
  getUserFromToken,
} from "@/integrations/aws/auth";

interface AuthState {
  token: string | null;
  isAdmin: boolean;
  loading: boolean;
  user: { id: string; email: string } | null;
  session: { access_token: string } | null;
  signIn: (email: string, password: string) => Promise<{ error: unknown | null }>;
  signOut: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const t = await getCognitoToken();
    setToken(t);
    setIsAdmin(t ? isAdminToken(t) : false);
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

  const signOut = () => {
    cognitoSignOut();
    setToken(null);
    setIsAdmin(false);
  };

  const user = getUserFromToken(token);

  return (
    <AuthContext.Provider value={{
      token,
      isAdmin,
      loading,
      user,
      session: token ? { access_token: token } : null,
      signIn,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}

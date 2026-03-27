import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, Lock, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type Mode = "signin" | "forgot" | "forgot-sent";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("signin");

  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get("next") || "/admin";

  // ── Sign In ────────────────────────────────────────────────────
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await signIn(email, password);
    if (error) {
      setError("Invalid email or password. Please try again.");
    } else {
      navigate(next, { replace: true });
    }
    setLoading(false);
  };

  // ── Forgot password ────────────────────────────────────────────
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
      setError(error.message);
    } else {
      setMode("forgot-sent");
    }
    setLoading(false);
  };

  const switchToForgot = () => {
    setError(null);
    setPassword("");
    setMode("forgot");
  };

  const switchToSignIn = () => {
    setError(null);
    setMode("signin");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm">
        {/* Back to portfolio */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to portfolio
        </Link>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">

          {/* ── Sign In ── */}
          {mode === "signin" && (
            <>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center">
                  <Lock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h1 className="text-xl font-serif font-bold text-foreground leading-tight">
                    Admin Sign In
                  </h1>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Portfolio management
                  </p>
                </div>
              </div>

              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    autoFocus
                    className="mt-1.5 h-10"
                    placeholder="admin@example.com"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                    <button
                      type="button"
                      onClick={switchToForgot}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="h-10"
                    placeholder="••••••••"
                  />
                </div>

                {error && (
                  <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Signing in…
                    </span>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </>
          )}

          {/* ── Forgot Password ── */}
          {mode === "forgot" && (
            <>
              <div className="mb-8">
                <h1 className="text-xl font-serif font-bold text-foreground leading-tight">
                  Reset Password
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Enter your email and we'll send a reset link.
                </p>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <Label htmlFor="reset-email" className="text-sm font-medium">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    autoFocus
                    className="mt-1.5 h-10"
                    placeholder="admin@example.com"
                  />
                </div>

                {error && (
                  <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Sending…
                    </span>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
              </form>

              <button
                type="button"
                onClick={switchToSignIn}
                className="mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back to sign in
              </button>
            </>
          )}

          {/* ── Reset Link Sent ── */}
          {mode === "forgot-sent" && (
            <div className="text-center py-2">
              <div className="flex justify-center mb-4">
                <CheckCircle className="h-12 w-12 text-emerald-500" />
              </div>
              <h2 className="text-lg font-serif font-bold text-foreground mb-2">
                Check your inbox
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                A password reset link has been sent to{" "}
                <span className="font-medium text-foreground">{email}</span>.
                The link expires in 1 hour.
              </p>
              <button
                type="button"
                onClick={switchToSignIn}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                ← Back to sign in
              </button>
            </div>
          )}
        </div>

        <p className="text-xs text-center text-muted-foreground mt-5">
          Sessions expire after{" "}
          <span className="font-medium text-foreground">5 minutes</span> of
          inactivity
        </p>
      </div>
    </div>
  );
}

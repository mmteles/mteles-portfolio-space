import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, KeyRound, CheckCircle, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type PageState = "loading" | "ready" | "saving" | "success" | "invalid";

export default function ResetPassword() {
  const [pageState, setPageState] = useState<PageState>("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Supabase processes the recovery token from the URL hash automatically
  // and fires PASSWORD_RECOVERY when the session is established.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "PASSWORD_RECOVERY") {
          setPageState("ready");
        }
      }
    );

    // Give Supabase a moment to process the URL hash; if no event fires,
    // the link is invalid or expired.
    const timeout = setTimeout(() => {
      setPageState((prev) => (prev === "loading" ? "invalid" : prev));
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setPageState("saving");
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setPageState("ready");
    } else {
      // Sign out so the user logs in fresh with the new password
      await supabase.auth.signOut();
      setPageState("success");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">

          {/* Loading — processing token */}
          {pageState === "loading" && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Verifying reset link…</p>
            </div>
          )}

          {/* Invalid / expired link */}
          {pageState === "invalid" && (
            <div className="text-center py-2">
              <div className="flex justify-center mb-4">
                <AlertCircle className="h-12 w-12 text-destructive" />
              </div>
              <h2 className="text-lg font-serif font-bold text-foreground mb-2">
                Link invalid or expired
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                This reset link has expired or already been used. Please request
                a new one.
              </p>
              <Link
                to="/login"
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Request a new link
              </Link>
            </div>
          )}

          {/* Set new password form */}
          {(pageState === "ready" || pageState === "saving") && (
            <>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center">
                  <KeyRound className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h1 className="text-xl font-serif font-bold text-foreground leading-tight">
                    Set New Password
                  </h1>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Choose a strong password
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="new-password" className="text-sm font-medium">
                    New password
                  </Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoFocus
                    autoComplete="new-password"
                    className="mt-1.5 h-10"
                    placeholder="Minimum 6 characters"
                  />
                </div>

                <div>
                  <Label htmlFor="confirm-password" className="text-sm font-medium">
                    Confirm password
                  </Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="mt-1.5 h-10"
                    placeholder="Repeat password"
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
                  disabled={pageState === "saving"}
                >
                  {pageState === "saving" ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Updating…
                    </span>
                  ) : (
                    "Update Password"
                  )}
                </Button>
              </form>
            </>
          )}

          {/* Success */}
          {pageState === "success" && (
            <div className="text-center py-2">
              <div className="flex justify-center mb-4">
                <CheckCircle className="h-12 w-12 text-emerald-500" />
              </div>
              <h2 className="text-lg font-serif font-bold text-foreground mb-2">
                Password updated
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Your password has been changed. Please sign in with your new
                password.
              </p>
              <Button
                className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={() => navigate("/login")}
              >
                Go to Sign In
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, KeyRound, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { confirmNewPassword } from "@/integrations/aws/auth";

// Cognito sends a 6-digit code to the user's email (not a magic link).
// The user enters their email, the code, and a new password here.

type PageState = "ready" | "saving" | "success";

export default function ResetPassword() {
  const [pageState, setPageState] = useState<PageState>("ready");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 12) {
      setError("Password must be at least 12 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setPageState("saving");
    try {
      await confirmNewPassword(email, code.trim(), password);
      setPageState("success");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid code or the code has expired.");
      setPageState("ready");
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
                    Enter the code sent to your email
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
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

                <div>
                  <Label htmlFor="reset-code" className="text-sm font-medium">Reset Code</Label>
                  <Input
                    id="reset-code"
                    type="text"
                    inputMode="numeric"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    className="mt-1.5 h-10 tracking-widest"
                    placeholder="123456"
                    maxLength={6}
                  />
                </div>

                <div>
                  <Label htmlFor="new-password" className="text-sm font-medium">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={12}
                    autoComplete="new-password"
                    className="mt-1.5 h-10"
                    placeholder="Minimum 12 characters"
                  />
                </div>

                <div>
                  <Label htmlFor="confirm-password" className="text-sm font-medium">Confirm Password</Label>
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
                Your password has been changed. Please sign in with your new password.
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

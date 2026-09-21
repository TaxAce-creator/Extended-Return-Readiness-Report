// =============================================================================
// TaxAce — Reset Password Page
// Accessed via the email reset link: /reset-password?token=<hex>
// =============================================================================

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation, useSearch } from "wouter";
import { PasswordInput, PasswordPolicyHint } from "@/components/PasswordControls";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const token = new URLSearchParams(search).get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const resetMutation = trpc.localAuth.resetPassword.useMutation({
    onSuccess: () => setDone(true),
    onError: (err) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 12) {
      setError("Password must contain at least 12 characters.");
      return;
    }
    resetMutation.mutate({ token, newPassword: password });
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: "linear-gradient(135deg, oklch(0.16 0.06 155) 0%, oklch(0.20 0.07 155) 100%)",
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: "oklch(1 0 0)",
          boxShadow: "0 25px 60px oklch(0.10 0.06 155 / 0.5)",
        }}
      >
        <div
          className="px-8 py-6"
          style={{ background: "linear-gradient(135deg, oklch(0.22 0.07 155), oklch(0.18 0.06 155))" }}
        >
          <p style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: "1.2rem", color: "oklch(0.97 0.008 85)" }}>
            TaxAce Group — Password Reset
          </p>
        </div>

        <div className="px-8 py-8">
          {!token ? (
            <p style={{ color: "oklch(0.45 0.12 25)", fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem" }}>
              Invalid reset link. Please request a new one from the login page.
            </p>
          ) : done ? (
            <div className="text-center">
              <p
                className="mb-4"
                style={{ color: "oklch(0.30 0.08 155)", fontFamily: "'DM Sans', sans-serif", fontSize: "0.95rem" }}
              >
                Your password has been updated. You can now sign in.
              </p>
              <button
                onClick={() => setLocation("/login")}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold"
                style={{
                  background: "linear-gradient(135deg, oklch(0.28 0.09 155), oklch(0.22 0.07 155))",
                  color: "oklch(0.97 0.008 85)",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Go to Sign In
              </button>
            </div>
          ) : (
            <>
              {error && (
                <div
                  className="mb-4 px-4 py-3 rounded-lg text-sm"
                  style={{
                    background: "oklch(0.97 0.02 25)",
                    border: "1px solid oklch(0.85 0.06 25)",
                    color: "oklch(0.45 0.12 25)",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <PasswordInput id="reset-password" label="New password" value={password} onChange={setPassword} autoComplete="new-password" />
                <PasswordPolicyHint password={password} />
                <PasswordInput id="reset-confirm-password" label="Confirm new password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
                <button
                  type="submit"
                  disabled={resetMutation.isPending}
                  className="w-full py-3 rounded-xl text-sm font-semibold"
                  style={{
                    background: "linear-gradient(135deg, oklch(0.28 0.09 155), oklch(0.22 0.07 155))",
                    color: "oklch(0.97 0.008 85)",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {resetMutation.isPending ? "Saving…" : "Set New Password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// TaxAce — Change Password Page
// Shown when mustChangePassword = true after first login.
// =============================================================================

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { PasswordInput, PasswordPolicyHint } from "@/components/PasswordControls";

export default function ChangePassword() {
  const [, setLocation] = useLocation();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const changeMutation = trpc.localAuth.changePassword.useMutation({
    onSuccess: () => setLocation("/"),
    onError: (err) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (next !== confirm) {
      setError("New passwords do not match.");
      return;
    }
    if (next.length < 12) {
      setError("Password must contain at least 12 characters.");
      return;
    }
    changeMutation.mutate({ currentPassword: current, newPassword: next });
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
            Set your new password
          </p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", color: "oklch(0.65 0.05 155)", marginTop: 4 }}>
            You are required to change your temporary password before continuing.
          </p>
        </div>

        <div className="px-8 py-8">
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
            <PasswordInput id="current-password" label="Current password" value={current} onChange={setCurrent} autoComplete="current-password" />
            <PasswordInput id="new-password" label="New password" value={next} onChange={setNext} autoComplete="new-password" />
            <PasswordPolicyHint password={next} />
            <PasswordInput id="confirm-password" label="Confirm new password" value={confirm} onChange={setConfirm} autoComplete="new-password" />

            <button
              type="submit"
              disabled={changeMutation.isPending}
              className="w-full py-3 rounded-xl text-sm font-semibold mt-2"
              style={{
                background: "linear-gradient(135deg, oklch(0.28 0.09 155), oklch(0.22 0.07 155))",
                color: "oklch(0.97 0.008 85)",
                fontFamily: "'DM Sans', sans-serif",
                cursor: changeMutation.isPending ? "not-allowed" : "pointer",
              }}
            >
              {changeMutation.isPending ? "Saving…" : "Set New Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

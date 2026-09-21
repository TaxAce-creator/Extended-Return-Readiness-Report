import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export default function MfaLogin() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [code, setCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const completeLogin = trpc.mfa.completeLogin.useMutation({
    onSuccess: async () => {
      await utils.localAuth.me.invalidate();
      setLocation("/");
    },
    onError: (err) => setError(err.message),
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    completeLogin.mutate({ code: code.trim() });
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(135deg, oklch(0.16 0.06 155), oklch(0.20 0.07 155))" }}>
      <main className="w-full max-w-md rounded-2xl overflow-hidden bg-white" style={{ boxShadow: "0 25px 60px oklch(0.10 0.06 155 / 0.5)" }}>
        <header className="px-8 py-7" style={{ background: "linear-gradient(135deg, oklch(0.22 0.07 155), oklch(0.18 0.06 155))" }}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, oklch(0.75 0.14 75), oklch(0.65 0.12 75))" }}>
              <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, color: "oklch(0.18 0.06 155)" }}>TA</span>
            </div>
            <div>
              <p style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, color: "oklch(0.97 0.008 85)" }}>TaxAce Group</p>
              <p className="text-xs mt-1" style={{ color: "oklch(0.70 0.05 155)" }}>Secure sign-in verification</p>
            </div>
          </div>
        </header>
        <section className="px-8 py-8">
          <h1 className="text-xl font-semibold" style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.22 0.07 155)" }}>Two-factor authentication</h1>
          <p className="mt-2 text-sm leading-6" style={{ color: "oklch(0.50 0.04 155)" }}>
            {useBackupCode ? "Enter one of your single-use backup codes." : "Enter the six-digit code from your authenticator app."}
          </p>
          {error && <p role="alert" className="mt-4 rounded-lg px-4 py-3 text-sm" style={{ background: "oklch(0.97 0.02 25)", color: "oklch(0.45 0.12 25)" }}>{error}</p>}
          <form className="mt-6 space-y-4" onSubmit={submit}>
            <label className="block text-sm font-medium" style={{ color: "oklch(0.30 0.06 155)" }}>
              {useBackupCode ? "Backup code" : "Authentication code"}
              <input
                aria-label={useBackupCode ? "Backup code" : "Six digit authentication code"}
                autoComplete="one-time-code"
                inputMode={useBackupCode ? "text" : "numeric"}
                maxLength={useBackupCode ? 20 : 6}
                pattern={useBackupCode ? undefined : "[0-9]{6}"}
                required
                value={code}
                onChange={(event) => setCode(event.target.value)}
                className="mt-1.5 w-full rounded-xl px-4 py-3 text-center text-lg tracking-[0.3em] outline-none"
                style={{ border: "1.5px solid oklch(0.88 0.02 155)", background: "oklch(0.98 0.005 155)", color: "oklch(0.20 0.06 155)" }}
              />
            </label>
            <button type="submit" disabled={completeLogin.isPending} className="w-full rounded-xl py-3 text-sm font-semibold" style={{ background: "linear-gradient(135deg, oklch(0.28 0.09 155), oklch(0.22 0.07 155))", color: "oklch(0.97 0.008 85)" }}>
              {completeLogin.isPending ? "Verifying…" : "Verify and sign in"}
            </button>
          </form>
          <button type="button" onClick={() => { setUseBackupCode(!useBackupCode); setCode(""); setError(null); }} className="mt-5 w-full text-center text-sm" style={{ color: "oklch(0.42 0.08 155)" }}>
            {useBackupCode ? "Use an authenticator code instead" : "Use a backup code instead"}
          </button>
          <button type="button" onClick={() => setLocation("/login")} className="mt-3 w-full text-center text-sm" style={{ color: "oklch(0.52 0.04 155)" }}>
            Back to sign in
          </button>
        </section>
      </main>
    </div>
  );
}

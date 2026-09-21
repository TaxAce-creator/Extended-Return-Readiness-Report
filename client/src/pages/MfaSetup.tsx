import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export default function MfaSetup() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [setup, setSetup] = useState<{ secret: string; qrCodeDataUrl: string } | null>(null);
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setupMutation = trpc.mfa.setup.useMutation({
    onSuccess: (data) => { setSetup(data); setError(null); },
    onError: (err) => setError(err.message),
  });
  const verifyMutation = trpc.mfa.verify.useMutation({
    onSuccess: (data) => { setBackupCodes(data.backupCodes); setError(null); },
    onError: (err) => setError(err.message),
  });

  const enableMfa = () => setupMutation.mutate();
  const verify = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    verifyMutation.mutate({ code: code.trim() });
  };
  const finish = async () => {
    await utils.localAuth.me.invalidate();
    setLocation("/");
  };
  const copyCodes = async () => {
    if (!backupCodes) return;
    await navigator.clipboard.writeText(backupCodes.join("\n"));
    setCopied(true);
  };

  return (
    <div className="min-h-screen bg-[#f9f6ef] flex items-center justify-center p-4">
      <main className="w-full max-w-2xl rounded-2xl bg-white shadow-xl overflow-hidden">
        <header className="px-8 py-6" style={{ background: "linear-gradient(135deg, oklch(0.22 0.07 155), oklch(0.18 0.06 155))" }}>
          <p className="text-xs uppercase tracking-[0.16em]" style={{ color: "oklch(0.70 0.05 155)" }}>TaxAce Group · Security</p>
          <h1 className="mt-1 text-2xl font-semibold" style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.97 0.008 85)" }}>Protect your administrator account</h1>
          <p className="mt-2 text-sm" style={{ color: "oklch(0.82 0.03 155)" }}>Two-factor authentication is required before administrator access is enabled.</p>
        </header>
        <section className="px-8 py-7">
          {error && <p role="alert" className="mb-5 rounded-lg px-4 py-3 text-sm" style={{ background: "oklch(0.97 0.02 25)", color: "oklch(0.45 0.12 25)" }}>{error}</p>}
          {!setup && !backupCodes && (
            <div>
              <h2 className="text-lg font-semibold text-[#1d4632]">Set up your authenticator</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Use Google Authenticator, Authy, 1Password, or another compatible app. Your authenticator generates a different code every 30 seconds.</p>
              <button onClick={enableMfa} disabled={setupMutation.isPending} className="mt-6 rounded-xl px-5 py-3 text-sm font-semibold" style={{ background: "#1d4632", color: "#f9f6ef" }}>
                {setupMutation.isPending ? "Preparing secure setup…" : "Generate setup code"}
              </button>
            </div>
          )}
          {setup && !backupCodes && (
            <div className="grid gap-7 md:grid-cols-[200px_1fr] items-start">
              <div className="rounded-xl border border-[#d9e5dc] bg-[#f7fbf8] p-4">
                <img src={setup.qrCodeDataUrl} alt="QR code for TaxAce Group two-factor authentication" className="mx-auto h-40 w-40" />
                <p className="mt-3 text-center text-xs text-slate-500">Scan with your authenticator app.</p>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#1d4632]">Verify the setup</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">If you cannot scan the code, enter this setup key in your app:</p>
                <code className="mt-3 block break-all rounded-lg bg-slate-100 p-3 text-sm text-slate-800">{setup.secret}</code>
                <form onSubmit={verify} className="mt-5">
                  <label className="text-sm font-medium text-[#254b39]">Six-digit verification code
                    <input aria-label="Six digit verification code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(event) => setCode(event.target.value)} className="mt-1.5 block w-full rounded-xl border border-[#b8cdbd] px-4 py-3 text-center text-lg tracking-[0.25em] outline-none" />
                  </label>
                  <button type="submit" disabled={verifyMutation.isPending} className="mt-4 rounded-xl px-5 py-3 text-sm font-semibold" style={{ background: "#1d4632", color: "#f9f6ef" }}>
                    {verifyMutation.isPending ? "Verifying…" : "Verify and enable"}
                  </button>
                </form>
              </div>
            </div>
          )}
          {backupCodes && (
            <div>
              <h2 className="text-lg font-semibold text-[#1d4632]">Save your backup codes</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Each code works once if your authenticator is unavailable. Store them in an approved password manager; they will not be shown again.</p>
              <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 font-mono text-sm text-slate-800 sm:grid-cols-5">
                {backupCodes.map((backupCode) => <span key={backupCode}>{backupCode}</span>)}
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <button onClick={copyCodes} className="rounded-xl border border-[#1d4632] px-4 py-2.5 text-sm font-semibold text-[#1d4632]">{copied ? "Copied" : "Copy codes"}</button>
                <button onClick={finish} className="rounded-xl px-4 py-2.5 text-sm font-semibold" style={{ background: "#1d4632", color: "#f9f6ef" }}>I saved my codes — continue</button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

import { useState } from "react";

export function PasswordInput({
  id,
  label,
  value,
  onChange,
  autoComplete,
  placeholder = "••••••••••••",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="block mb-1.5 text-sm font-medium" style={{ color: "oklch(0.30 0.06 155)", fontFamily: "'DM Sans', sans-serif" }}>{label}</label>
      <div className="relative">
        <input id={id} type={visible ? "text" : "password"} value={value} onChange={(event) => onChange(event.target.value)} required autoComplete={autoComplete} placeholder={placeholder} className="w-full rounded-xl px-4 py-3 pr-16 text-sm outline-none" style={{ border: "1.5px solid oklch(0.88 0.02 155)", background: "oklch(0.98 0.005 155)", color: "oklch(0.20 0.06 155)", fontFamily: "'DM Sans', sans-serif" }} />
        <button type="button" aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} onClick={() => setVisible(!visible)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold" style={{ color: "oklch(0.42 0.08 155)" }}>{visible ? "Hide" : "Show"}</button>
      </div>
    </div>
  );
}

export function PasswordPolicyHint({ password }: { password: string }) {
  const rules = [
    ["12+ characters", password.length >= 12],
    ["Uppercase letter", /[A-Z]/.test(password)],
    ["Lowercase letter", /[a-z]/.test(password)],
    ["Number", /\d/.test(password)],
    ["Special character", /[^A-Za-z0-9]/.test(password)],
  ];
  const met = rules.filter(([, passes]) => passes).length;
  const label = met === 5 ? "Strong" : met >= 3 ? "Getting there" : "Needs strengthening";
  return (
    <div className="rounded-xl px-3 py-3" style={{ background: "oklch(0.97 0.008 85)" }} aria-live="polite">
      <div className="flex items-center justify-between text-xs"><span className="font-semibold text-[#254b39]">Password strength</span><span style={{ color: met === 5 ? "oklch(0.40 0.12 142)" : "oklch(0.55 0.1 75)" }}>{label}</span></div>
      <div className="mt-2 flex gap-1" aria-hidden="true">{rules.map(([, passes], index) => <span key={index} className="h-1.5 flex-1 rounded-full" style={{ background: passes ? "oklch(0.52 0.16 142)" : "oklch(0.87 0.02 85)" }} />)}</div>
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-600">{rules.map(([rule, passes]) => <span key={String(rule)}>{passes ? "✓" : "○"} {rule}</span>)}</div>
    </div>
  );
}

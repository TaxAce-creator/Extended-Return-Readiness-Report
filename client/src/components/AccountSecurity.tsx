import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { KeyRound, ShieldCheck } from "lucide-react";

export function AccountSecurity() {
  const utils = trpc.useUtils();
  const { data: sessions = [] } = trpc.localAuth.listActiveSessions.useQuery();
  const { data: passwordStatus } = trpc.localAuth.getPasswordStatus.useQuery();
  const revokeSession = trpc.localAuth.revokeSession.useMutation({
    onSuccess: () => { toast.success("Session revoked"); utils.localAuth.listActiveSessions.invalidate(); },
    onError: (error) => toast.error(error.message),
  });
  const revokeOthers = trpc.localAuth.revokeAllOtherSessions.useMutation({
    onSuccess: ({ count }) => { toast.success(`${count} other session${count === 1 ? "" : "s"} revoked`); utils.localAuth.listActiveSessions.invalidate(); },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="space-y-5 fade-in-up">
      <section className="rounded-2xl p-5" style={{ background: "linear-gradient(135deg, oklch(0.22 0.07 155), oklch(0.28 0.07 155))" }}>
        <p className="text-xs uppercase tracking-[0.15em]" style={{ color: "oklch(0.70 0.05 155)" }}>TaxAce account</p>
        <h2 className="mt-1 text-xl font-semibold" style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.97 0.008 85)" }}>Account security</h2>
        <p className="mt-1 text-sm" style={{ color: "oklch(0.78 0.04 155)" }}>Review signed-in devices and keep access to client data under your control.</p>
      </section>
      <section className="rounded-2xl p-5" style={{ background: "white", border: "1px solid oklch(0.88 0.02 85)" }}>
        <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 text-[#286443]" size={19} /><div><h3 className="font-semibold text-[#1d4632]">Password rotation</h3><p className="mt-1 text-sm text-slate-600">{passwordStatus?.daysRemaining === null ? "Your password rotation date will be set the next time your password is changed." : passwordStatus?.isExpired ? "Your password has expired. Change it now to continue securely." : `Your password expires in ${passwordStatus?.daysRemaining ?? "—"} days.`}</p></div></div>
      </section>
      <section className="rounded-2xl p-5" style={{ background: "white", border: "1px solid oklch(0.88 0.02 85)" }}>
        <div className="flex items-center justify-between gap-3"><div className="flex items-start gap-3"><KeyRound className="mt-0.5 text-[#286443]" size={19} /><div><h3 className="font-semibold text-[#1d4632]">Active sessions</h3><p className="mt-1 text-sm text-slate-600">Sessions close after 30 minutes of inactivity. Revoke unfamiliar devices immediately.</p></div></div>{sessions.some((session) => !session.isCurrent) && <button onClick={() => revokeOthers.mutate()} disabled={revokeOthers.isPending} className="shrink-0 rounded-lg border border-[#3a7555] px-3 py-2 text-xs font-semibold text-[#24583d]">{revokeOthers.isPending ? "Revoking…" : "Revoke others"}</button>}</div>
        <div className="mt-5 space-y-2">{sessions.length === 0 ? <p className="text-sm text-slate-500">No active sessions found.</p> : sessions.map((session) => <div key={session.id} className="flex items-center gap-3 rounded-xl bg-[#f8faf8] px-3 py-3"><KeyRound size={15} className={session.isCurrent ? "text-[#286443]" : "text-slate-400"} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[#254b39]">{session.isCurrent ? "This device" : session.userAgent || "Unknown device"}</p><p className="truncate text-xs text-slate-500">{session.ipAddress || "IP unavailable"} · Last active {new Date(session.lastActiveAt).toLocaleString()}</p></div>{!session.isCurrent && <button onClick={() => revokeSession.mutate({ sessionId: session.id })} className="text-xs font-semibold text-rose-700" disabled={revokeSession.isPending}>Revoke</button>}</div>)}</div>
      </section>
    </div>
  );
}

// =============================================================================
// SettingsPage — Dashboard Configuration
// Tabs: Billing Rates | Team Members | Audit Log
// Design: "Executive Clarity" — warm cream, forest green, amber accents
// =============================================================================

import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  DollarSign, Users, Shield, Plus, Trash2, Edit3, Check, X,
  ChevronDown, ChevronUp, AlertTriangle, Lock, ShieldCheck, Wifi, KeyRound,
  ToggleLeft, ToggleRight, UserX, RefreshCw, QrCode,
} from "lucide-react";

type SettingsTab = "billing" | "team" | "audit" | "security";

// Default billing rates — used when no DB value exists yet
const DEFAULT_RATES: { key: string; label: string; returnType: string; rate: number }[] = [
  { key: "billing_rate_1040",    label: "1040 Individual",       returnType: "1040",    rate: 450  },
  { key: "billing_rate_1040s",   label: "1040 with Schedule C",  returnType: "1040S",   rate: 650  },
  { key: "billing_rate_1120s",   label: "1120S S-Corp",          returnType: "1120S",   rate: 1200 },
  { key: "billing_rate_1065",    label: "1065 Partnership",      returnType: "1065",    rate: 1100 },
  { key: "billing_rate_1120",    label: "1120 C-Corp",           returnType: "1120",    rate: 1400 },
  { key: "billing_rate_990",     label: "990 Non-Profit",        returnType: "990",     rate: 900  },
  { key: "billing_rate_1041",    label: "1041 Trust/Estate",     returnType: "1041",    rate: 800  },
  { key: "billing_rate_amended", label: "Amended Return",        returnType: "Amended", rate: 350  },
  { key: "billing_rate_ext",     label: "Extension Only",        returnType: "Ext",     rate: 150  },
];

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        backgroundColor: "oklch(1 0 0)",
        border: "1px solid oklch(0.91 0.012 85)",
        boxShadow: "0 2px 12px oklch(0.28 0.07 155 / 0.06)",
      }}
    >
      <div
        className="px-5 py-3.5"
        style={{ borderBottom: "1px solid oklch(0.91 0.012 85)", backgroundColor: "oklch(0.975 0.008 85)" }}
      >
        <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: "0.9rem", color: "oklch(0.22 0.07 155)" }}>
          {title}
        </h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── Billing Rates Tab ────────────────────────────────────────────────────────

function BillingRatesTab({ isAdmin }: { isAdmin: boolean }) {
  const { data: allSettings, refetch } = trpc.settings.getAll.useQuery();
  const upsertMutation = trpc.settings.upsert.useMutation({
    onSuccess: () => { refetch(); toast.success("Billing rate saved"); },
    onError: (e) => toast.error(e.message),
  });

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // Merge DB values with defaults
  const rates = DEFAULT_RATES.map((r) => {
    const dbVal = allSettings?.find((s) => s.key === r.key);
    return { ...r, rate: dbVal ? parseFloat(dbVal.value) : r.rate, fromDb: !!dbVal };
  });

  const handleSave = (key: string, label: string) => {
    const val = parseFloat(editValue);
    if (isNaN(val) || val < 0) { toast.error("Enter a valid dollar amount"); return; }
    upsertMutation.mutate({ key, value: String(val), label, category: "billing" });
    setEditingKey(null);
  };

  return (
    <div className="space-y-5">
      <SectionCard title="Return Type Billing Rates">
        {!isAdmin && (
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-xl mb-4"
            style={{ backgroundColor: "oklch(0.97 0.04 75 / 0.2)", border: "1px solid oklch(0.85 0.08 75 / 0.4)" }}
          >
            <Lock size={14} style={{ color: "oklch(0.55 0.12 75)" }} />
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.82rem", color: "oklch(0.45 0.10 75)" }}>
              Admin access required to edit billing rates. Contact your administrator.
            </p>
          </div>
        )}
        <div className="space-y-2">
          {rates.map((r) => (
            <div
              key={r.key}
              className="flex items-center justify-between px-4 py-3 rounded-xl transition-colors"
              style={{
                backgroundColor: editingKey === r.key ? "oklch(0.28 0.07 155 / 0.05)" : "oklch(0.975 0.008 85)",
                border: `1px solid ${editingKey === r.key ? "oklch(0.28 0.07 155 / 0.2)" : "oklch(0.91 0.012 85)"}`,
              }}
            >
              <div>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "0.875rem", color: "oklch(0.22 0.07 155)" }}>
                  {r.label}
                </p>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.7rem", color: "oklch(0.55 0.04 155)" }}>
                  {r.returnType}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {editingKey === r.key ? (
                  <>
                    <div className="flex items-center gap-1">
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem", color: "oklch(0.45 0.06 155)" }}>$</span>
                      <input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-24 px-2 py-1 rounded-lg text-right"
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "0.9rem",
                          border: "1px solid oklch(0.28 0.07 155 / 0.3)",
                          backgroundColor: "oklch(1 0 0)",
                          color: "oklch(0.22 0.07 155)",
                          outline: "none",
                        }}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSave(r.key, r.label);
                          if (e.key === "Escape") setEditingKey(null);
                        }}
                      />
                    </div>
                    <button
                      onClick={() => handleSave(r.key, r.label)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: "oklch(0.55 0.12 145 / 0.2)", color: "oklch(0.40 0.10 145)" }}
                    >
                      <Check size={13} />
                    </button>
                    <button
                      onClick={() => setEditingKey(null)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: "oklch(0.92 0.04 25 / 0.2)", color: "oklch(0.50 0.12 25)" }}
                    >
                      <X size={13} />
                    </button>
                  </>
                ) : (
                  <>
                    <span
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontWeight: 700,
                        fontSize: "1rem",
                        color: "oklch(0.28 0.07 155)",
                      }}
                    >
                      ${r.rate.toLocaleString()}
                    </span>
                    {isAdmin && (
                      <button
                        onClick={() => { setEditingKey(r.key); setEditValue(String(r.rate)); }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                        style={{ backgroundColor: "transparent", color: "oklch(0.55 0.04 155)" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "oklch(0.28 0.07 155 / 0.08)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}
                      >
                        <Edit3 size={13} />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

// ── Team Members Tab ─────────────────────────────────────────────────────────

function TeamMembersTab({ isAdmin }: { isAdmin: boolean }) {
  const { data: members, refetch } = trpc.settings.getTeamMembers.useQuery();
  const upsertMutation = trpc.settings.upsertTeamMember.useMutation({
    onSuccess: () => { refetch(); toast.success("Team member saved"); setShowForm(false); setEditing(null); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.settings.deleteTeamMember.useMutation({
    onSuccess: () => { refetch(); toast.success("Team member removed"); },
    onError: (e) => toast.error(e.message),
  });

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", role: "", location: "hq" as "hq" | "remote", capacity: 30, canopyName: "" });

  const handleEdit = (m: NonNullable<typeof members>[0]) => {
    setEditing(m.id);
    setForm({ name: m.name, role: m.role ?? "", location: m.location, capacity: m.capacity, canopyName: m.canopyName ?? "" });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    upsertMutation.mutate({
      id: editing ?? undefined,
      name: form.name,
      role: form.role || undefined,
      location: form.location,
      capacity: form.capacity,
      canopyName: form.canopyName || undefined,
      isActive: true,
    });
  };

  const hqMembers = members?.filter((m) => m.location === "hq" && m.isActive) ?? [];
  const remoteMembers = members?.filter((m) => m.location === "remote" && m.isActive) ?? [];

  return (
    <div className="space-y-5">
      {isAdmin && (
        <div className="flex justify-end">
          <button
            onClick={() => { setShowForm(!showForm); setEditing(null); setForm({ name: "", role: "", location: "hq", capacity: 30, canopyName: "" }); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all"
            style={{
              background: "linear-gradient(135deg, oklch(0.28 0.07 155), oklch(0.22 0.07 155))",
              color: "oklch(0.97 0.008 85)",
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 600,
              fontSize: "0.82rem",
              boxShadow: "0 2px 8px oklch(0.28 0.07 155 / 0.3)",
            }}
          >
            <Plus size={14} />
            {showForm ? "Cancel" : "Add Member"}
          </button>
        </div>
      )}

      {showForm && isAdmin && (
        <SectionCard title={editing ? "Edit Team Member" : "Add Team Member"}>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Full Name *", key: "name", type: "text", placeholder: "e.g. Maria Garcia" },
              { label: "Role / Title", key: "role", type: "text", placeholder: "e.g. Tax Preparer" },
              { label: "Canopy Display Name", key: "canopyName", type: "text", placeholder: "Name as shown in Canopy CSV" },
            ].map((f) => (
              <div key={f.key} className={f.key === "name" ? "col-span-2" : ""}>
                <label style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", fontWeight: 600, color: "oklch(0.40 0.05 155)", display: "block", marginBottom: "0.3rem" }}>
                  {f.label}
                </label>
                <input
                  type={f.type}
                  value={(form as Record<string, string | number>)[f.key] as string}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                  className="w-full px-3 py-2 rounded-xl"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "0.875rem",
                    border: "1px solid oklch(0.88 0.02 85)",
                    backgroundColor: "oklch(0.975 0.008 85)",
                    color: "oklch(0.22 0.07 155)",
                    outline: "none",
                  }}
                />
              </div>
            ))}
            <div>
              <label style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", fontWeight: 600, color: "oklch(0.40 0.05 155)", display: "block", marginBottom: "0.3rem" }}>
                Location
              </label>
              <select
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value as "hq" | "remote" })}
                className="w-full px-3 py-2 rounded-xl"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "0.875rem",
                  border: "1px solid oklch(0.88 0.02 85)",
                  backgroundColor: "oklch(0.975 0.008 85)",
                  color: "oklch(0.22 0.07 155)",
                  outline: "none",
                }}
              >
                <option value="hq">HQ (In-Office)</option>
                <option value="remote">Remote</option>
              </select>
            </div>
            <div>
              <label style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", fontWeight: 600, color: "oklch(0.40 0.05 155)", display: "block", marginBottom: "0.3rem" }}>
                Capacity (tasks/month)
              </label>
              <input
                type="number"
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 30 })}
                className="w-full px-3 py-2 rounded-xl"
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "0.875rem",
                  border: "1px solid oklch(0.88 0.02 85)",
                  backgroundColor: "oklch(0.975 0.008 85)",
                  color: "oklch(0.22 0.07 155)",
                  outline: "none",
                }}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => { setShowForm(false); setEditing(null); }}
              className="px-4 py-2 rounded-xl"
              style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.82rem", border: "1px solid oklch(0.88 0.02 85)", color: "oklch(0.45 0.04 155)" }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={upsertMutation.isPending}
              className="px-5 py-2 rounded-xl"
              style={{
                background: "linear-gradient(135deg, oklch(0.28 0.07 155), oklch(0.22 0.07 155))",
                color: "oklch(0.97 0.008 85)",
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                fontSize: "0.82rem",
                opacity: upsertMutation.isPending ? 0.7 : 1,
              }}
            >
              {upsertMutation.isPending ? "Saving…" : "Save Member"}
            </button>
          </div>
        </SectionCard>
      )}

      {members?.length === 0 && (
        <div className="text-center py-12">
          <Users size={36} style={{ color: "oklch(0.72 0.04 155)", margin: "0 auto 0.75rem" }} />
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.875rem", color: "oklch(0.52 0.04 155)" }}>
            No team members configured yet.
          </p>
          {isAdmin && (
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.8rem", color: "oklch(0.62 0.04 155)", marginTop: "0.25rem" }}>
              Add team members to enable dynamic team tracking instead of the hardcoded list.
            </p>
          )}
        </div>
      )}

      {[{ label: "HQ Team", members: hqMembers }, { label: "Remote Team", members: remoteMembers }].map(({ label, members: list }) =>
        list.length > 0 ? (
          <SectionCard key={label} title={label}>
            <div className="space-y-2">
              {list.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between px-4 py-3 rounded-xl"
                  style={{ backgroundColor: "oklch(0.975 0.008 85)", border: "1px solid oklch(0.91 0.012 85)" }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg, oklch(0.28 0.07 155), oklch(0.35 0.08 155))" }}
                    >
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: "0.72rem", color: "oklch(0.75 0.14 75)" }}>
                        {m.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "0.875rem", color: "oklch(0.22 0.07 155)" }}>
                        {m.name}
                      </p>
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.75rem", color: "oklch(0.55 0.04 155)" }}>
                        {m.role ?? "Tax Preparer"} · Cap: {m.capacity}/mo
                        {m.canopyName && m.canopyName !== m.name && (
                          <span style={{ color: "oklch(0.65 0.04 155)" }}> · Canopy: {m.canopyName}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(m)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: "oklch(0.28 0.07 155 / 0.08)", color: "oklch(0.45 0.06 155)" }}
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        onClick={() => { if (confirm(`Remove ${m.name}?`)) deleteMutation.mutate({ id: m.id }); }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: "oklch(0.92 0.04 25 / 0.15)", color: "oklch(0.50 0.12 25)" }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>
        ) : null
      )}
    </div>
  );
}

// ── Audit Log Tab ────────────────────────────────────────────────────────────

function AuditLogTab({ isAdmin }: { isAdmin: boolean }) {
  const [action, setAction] = useState("");
  const [userOpenId, setUserOpenId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const filters = useMemo(() => ({
    limit: 100,
    action: action || undefined,
    userOpenId: userOpenId || undefined,
    startAt: startDate ? new Date(`${startDate}T00:00:00`) : undefined,
    endAt: endDate ? new Date(`${endDate}T23:59:59.999`) : undefined,
  }), [action, userOpenId, startDate, endDate]);
  const { data: logs } = trpc.settings.getAuditLog.useQuery(
    filters,
    { enabled: isAdmin }
  );
  const exportAuditLog = trpc.settings.exportAuditLog.useMutation({
    onSuccess: ({ csv }) => {
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `taxace-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("Audit log exported and recorded.");
    },
    onError: (error) => toast.error(error.message),
  });

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Lock size={36} style={{ color: "oklch(0.72 0.04 155)", marginBottom: "0.75rem" }} />
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "0.9rem", color: "oklch(0.35 0.06 155)" }}>
          Admin access required
        </p>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.82rem", color: "oklch(0.55 0.04 155)", marginTop: "0.25rem" }}>
          The audit log is only visible to administrators.
        </p>
      </div>
    );
  }

  const ACTION_COLORS: Record<string, string> = {
    upload: "oklch(0.55 0.12 145)",
    login: "oklch(0.50 0.10 220)",
    logout: "oklch(0.55 0.04 155)",
    settings_change: "oklch(0.55 0.12 75)",
    team_member_added: "oklch(0.50 0.10 145)",
    team_member_updated: "oklch(0.50 0.08 155)",
    view: "oklch(0.60 0.04 155)",
  };

  return (
    <SectionCard title={`Audit Log (${logs?.length ?? 0} entries)`}>
      <div className="mb-4 grid gap-2 md:grid-cols-[1fr_1fr_150px_150px_auto]">
        <input aria-label="Filter audit log by action" value={action} onChange={(event) => setAction(event.target.value)} placeholder="Action (e.g. user.login)" className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: "oklch(0.85 0.02 85)" }} />
        <input aria-label="Filter audit log by user ID" value={userOpenId} onChange={(event) => setUserOpenId(event.target.value)} placeholder="User ID" className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: "oklch(0.85 0.02 85)" }} />
        <input aria-label="Filter audit log from date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: "oklch(0.85 0.02 85)" }} />
        <input aria-label="Filter audit log through date" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: "oklch(0.85 0.02 85)" }} />
        <button aria-label="Export filtered audit log as CSV" onClick={() => exportAuditLog.mutate({ action: filters.action, userOpenId: filters.userOpenId, startAt: filters.startAt, endAt: filters.endAt })} disabled={exportAuditLog.isPending} className="rounded-lg px-3 py-2 text-xs font-semibold" style={{ background: "oklch(0.28 0.07 155)", color: "oklch(0.97 0.008 85)" }}>{exportAuditLog.isPending ? "Exporting…" : "Export CSV"}</button>
      </div>
      {!logs || logs.length === 0 ? (
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.875rem", color: "oklch(0.55 0.04 155)", textAlign: "center", padding: "2rem 0" }}>
          No audit events recorded yet.
        </p>
      ) : (
        <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
          {logs.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-3 px-3 py-2.5 rounded-xl"
              style={{ backgroundColor: "oklch(0.975 0.008 85)", border: "1px solid oklch(0.91 0.012 85)" }}
            >
              <div
                className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                style={{ backgroundColor: ACTION_COLORS[entry.action] ?? "oklch(0.65 0.04 155)" }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "0.8rem", color: "oklch(0.28 0.07 155)" }}>
                    {entry.userName ?? "Unknown"}
                  </span>
                  <span
                    className="px-2 py-0.5 rounded-md"
                    style={{
                      backgroundColor: `${ACTION_COLORS[entry.action] ?? "oklch(0.65 0.04 155)"} / 0.15`,
                      color: ACTION_COLORS[entry.action] ?? "oklch(0.50 0.04 155)",
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                    }}
                  >
                    {entry.action.replace(/_/g, " ")}
                  </span>
                  {entry.resource && (
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.72rem", color: "oklch(0.55 0.04 155)" }}>
                      {entry.resource}
                    </span>
                  )}
                </div>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.68rem", color: "oklch(0.65 0.03 155)", marginTop: "0.15rem" }}>
                  {new Date(entry.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

// ── Security Tab ────────────────────────────────────────────────────────────

function SecurityTab({ isAdmin }: { isAdmin: boolean }) {
  const utils = trpc.useUtils();

  // IP Allowlist
  const { data: ipList = [], isLoading: ipLoading } = trpc.security.listIpAllowlist.useQuery();
  const { data: ipBlockingEnabled } = trpc.security.getIpBlockingEnabled.useQuery();
  const { data: myIp } = trpc.security.getMyIp.useQuery();
  const [newIpLabel, setNewIpLabel] = useState("");
  const [newIpAddress, setNewIpAddress] = useState("");
  const [showAddIp, setShowAddIp] = useState(false);

  const addIp = trpc.security.addIpAllowlist.useMutation({
    onSuccess: () => {
      toast.success("IP address added to allowlist");
      setNewIpLabel(""); setNewIpAddress(""); setShowAddIp(false);
      utils.security.listIpAllowlist.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleIp = trpc.security.toggleIpAllowlist.useMutation({
    onSuccess: () => utils.security.listIpAllowlist.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  const deleteIp = trpc.security.deleteIpAllowlist.useMutation({
    onSuccess: () => { toast.success("IP removed"); utils.security.listIpAllowlist.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const setIpBlocking = trpc.security.setIpBlockingEnabled.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.enabled ? "IP blocking enabled" : "IP blocking disabled");
      utils.security.getIpBlockingEnabled.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  // Team accounts with lockout status
  const { data: userList = [], isLoading: usersLoading } = trpc.localAuth.listUsers.useQuery();
  const unlockAccount = trpc.localAuth.unlockAccount.useMutation({
    onSuccess: () => { toast.success("Account unlocked"); utils.localAuth.listUsers.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const lockedUsers = userList.filter(u => u.lockedUntil && new Date(u.lockedUntil) > new Date());

  // Active sessions for the signed-in administrator (tokens are never returned).
  const { data: activeSessions = [] } = trpc.localAuth.listActiveSessions.useQuery(undefined, { enabled: isAdmin });
  const revokeSession = trpc.localAuth.revokeSession.useMutation({
    onSuccess: () => { toast.success("Session revoked"); utils.localAuth.listActiveSessions.invalidate(); },
    onError: (error) => toast.error(error.message),
  });
  const revokeOtherSessions = trpc.localAuth.revokeAllOtherSessions.useMutation({
    onSuccess: ({ count }) => { toast.success(`${count} other session${count === 1 ? "" : "s"} revoked`); utils.localAuth.listActiveSessions.invalidate(); },
    onError: (error) => toast.error(error.message),
  });

  const cardStyle = {
    background: "oklch(1 0 0)",
    border: "1px solid oklch(0.88 0.02 85)",
    borderRadius: "1rem",
    padding: "1.25rem",
    marginBottom: "1rem",
  };

  const labelStyle = {
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 600,
    fontSize: "0.75rem",
    color: "oklch(0.45 0.05 155)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    marginBottom: "0.75rem",
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
  };

  if (!isAdmin) {
    return (
      <div style={cardStyle}>
        <p style={{ fontFamily: "'DM Sans', sans-serif", color: "oklch(0.55 0.05 155)", fontSize: "0.875rem" }}>
          Security settings are only accessible to administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 fade-in-up">

      {/* ── IP Allowlist ── */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div style={labelStyle}><Wifi size={13} /> IP Allowlist</div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.8rem", color: "oklch(0.55 0.05 155)" }}>
              IP Blocking: {ipBlockingEnabled ? <span style={{ color: "oklch(0.52 0.18 142)" }}>Enabled</span> : <span style={{ color: "oklch(0.65 0.03 155)" }}>Disabled</span>}
            </span>
            <button
              onClick={() => setIpBlocking.mutate({ enabled: !ipBlockingEnabled })}
              style={{ background: "none", border: "none", cursor: "pointer", color: ipBlockingEnabled ? "oklch(0.52 0.18 142)" : "oklch(0.65 0.03 155)" }}
              title={ipBlockingEnabled ? "Click to disable IP blocking" : "Click to enable IP blocking"}
            >
              {ipBlockingEnabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
            </button>
          </div>
        </div>

        {myIp && (
          <div style={{ background: "oklch(0.97 0.008 85)", borderRadius: "0.5rem", padding: "0.6rem 0.75rem", marginBottom: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.78rem", color: "oklch(0.45 0.05 155)" }}>
              Your current IP: <strong>{myIp.ip}</strong>
            </span>
            <button
              onClick={() => { setNewIpAddress(myIp.ip); setNewIpLabel("My Device"); setShowAddIp(true); }}
              style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.75rem", color: "oklch(0.42 0.12 155)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
            >
              + Add this IP
            </button>
          </div>
        )}

        {!ipBlockingEnabled && (
          <div style={{ background: "oklch(0.98 0.04 75 / 0.4)", border: "1px solid oklch(0.85 0.08 75)", borderRadius: "0.5rem", padding: "0.6rem 0.75rem", marginBottom: "0.75rem" }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", color: "oklch(0.55 0.1 75)" }}>
              <AlertTriangle size={12} style={{ display: "inline", marginRight: "0.3rem" }} />
              IP blocking is currently <strong>disabled</strong>. Add your team IPs below before enabling to avoid locking anyone out.
            </p>
          </div>
        )}

        {ipLoading ? (
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.82rem", color: "oklch(0.65 0.03 155)" }}>Loading...</p>
        ) : ipList.length === 0 ? (
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.82rem", color: "oklch(0.65 0.03 155)" }}>No IPs on the allowlist yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {ipList.map((entry) => (
              <div key={entry.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem 0.75rem", background: "oklch(0.97 0.008 85)", borderRadius: "0.5rem" }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "0.82rem", color: "oklch(0.28 0.07 155)" }}>{entry.label}</p>
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.72rem", color: "oklch(0.55 0.05 155)" }}>{entry.ipAddress}</p>
                </div>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.7rem", padding: "0.2rem 0.5rem", borderRadius: "999px", background: entry.isActive ? "oklch(0.92 0.08 142)" : "oklch(0.92 0.02 85)", color: entry.isActive ? "oklch(0.35 0.12 142)" : "oklch(0.55 0.03 85)" }}>
                  {entry.isActive ? "Active" : "Disabled"}
                </span>
                <button onClick={() => toggleIp.mutate({ id: entry.id, isActive: !entry.isActive })} style={{ background: "none", border: "none", cursor: "pointer", color: "oklch(0.55 0.05 155)" }} title={entry.isActive ? "Disable" : "Enable"}>
                  {entry.isActive ? <ToggleRight size={18} style={{ color: "oklch(0.52 0.18 142)" }} /> : <ToggleLeft size={18} />}
                </button>
                <button onClick={() => deleteIp.mutate({ id: entry.id })} style={{ background: "none", border: "none", cursor: "pointer", color: "oklch(0.65 0.18 25)" }} title="Remove IP">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: "0.75rem" }}>
          {!showAddIp ? (
            <button
              onClick={() => setShowAddIp(true)}
              style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontFamily: "'DM Sans', sans-serif", fontSize: "0.82rem", color: "oklch(0.42 0.12 155)", background: "none", border: "1px dashed oklch(0.75 0.08 155)", borderRadius: "0.5rem", padding: "0.5rem 0.75rem", cursor: "pointer", width: "100%", justifyContent: "center" }}
            >
              <Plus size={13} /> Add IP Address
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <input
                placeholder="Label (e.g. Office Desktop, NZ iPhone)"
                value={newIpLabel}
                onChange={e => setNewIpLabel(e.target.value)}
                style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.82rem", padding: "0.5rem 0.75rem", border: "1px solid oklch(0.85 0.02 85)", borderRadius: "0.5rem", outline: "none" }}
              />
              <input
                placeholder="IP Address (e.g. 192.168.1.1)"
                value={newIpAddress}
                onChange={e => setNewIpAddress(e.target.value)}
                style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.82rem", padding: "0.5rem 0.75rem", border: "1px solid oklch(0.85 0.02 85)", borderRadius: "0.5rem", outline: "none" }}
              />
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={() => addIp.mutate({ label: newIpLabel, ipAddress: newIpAddress })}
                  disabled={!newIpLabel || !newIpAddress || addIp.isPending}
                  style={{ flex: 1, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "0.82rem", padding: "0.5rem", background: "oklch(0.28 0.07 155)", color: "oklch(0.97 0.008 85)", border: "none", borderRadius: "0.5rem", cursor: "pointer" }}
                >
                  {addIp.isPending ? "Adding..." : "Add IP"}
                </button>
                <button onClick={() => setShowAddIp(false)} style={{ padding: "0.5rem 0.75rem", background: "oklch(0.95 0.01 85)", border: "1px solid oklch(0.85 0.02 85)", borderRadius: "0.5rem", cursor: "pointer" }}>
                  <X size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Locked Accounts ── */}
      <div style={cardStyle}>
        <div style={labelStyle}><UserX size={13} /> Locked Accounts</div>
        {usersLoading ? (
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.82rem", color: "oklch(0.65 0.03 155)" }}>Loading...</p>
        ) : lockedUsers.length === 0 ? (
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.82rem", color: "oklch(0.52 0.18 142)" }}>
            <Check size={13} style={{ display: "inline", marginRight: "0.3rem" }} /> No accounts are currently locked.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {lockedUsers.map((u) => (
              <div key={u.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem 0.75rem", background: "oklch(0.98 0.04 25 / 0.3)", border: "1px solid oklch(0.88 0.08 25)", borderRadius: "0.5rem" }}>
                <Lock size={14} style={{ color: "oklch(0.6 0.18 25)" }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "0.82rem", color: "oklch(0.28 0.07 155)" }}>{u.name ?? u.email}</p>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.72rem", color: "oklch(0.6 0.18 25)" }}>
                    Locked until {u.lockedUntil ? new Date(u.lockedUntil).toLocaleTimeString() : "unknown"} · {u.failedLoginAttempts} failed attempts
                  </p>
                </div>
                <button
                  onClick={() => unlockAccount.mutate({ userId: u.id })}
                  style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "0.75rem", padding: "0.35rem 0.75rem", background: "oklch(0.28 0.07 155)", color: "oklch(0.97 0.008 85)", border: "none", borderRadius: "0.5rem", cursor: "pointer" }}
                >
                  <RefreshCw size={12} /> Unlock
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── MFA Status ── */}
      <div style={cardStyle}>
        <div style={labelStyle}><QrCode size={13} /> Two-Factor Authentication (MFA)</div>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.82rem", color: "oklch(0.45 0.05 155)", marginBottom: "0.75rem" }}>
          MFA adds a second layer of protection using an authenticator app (Google Authenticator, Authy, etc.).
          MFA is required for all owner and administrator accounts before dashboard access is granted.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          {userList.filter(u => ["admin", "owner"].includes(u.role)).map((u) => (
            <div key={u.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.4rem 0.75rem", background: "oklch(0.97 0.008 85)", borderRadius: "0.5rem" }}>
              <KeyRound size={13} style={{ color: u.mfaEnabled ? "oklch(0.52 0.18 142)" : "oklch(0.75 0.08 75)" }} />
              <span style={{ flex: 1, fontFamily: "'DM Sans', sans-serif", fontSize: "0.82rem", color: "oklch(0.35 0.07 155)" }}>{u.name ?? u.email}</span>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.72rem", padding: "0.2rem 0.5rem", borderRadius: "999px", background: u.mfaEnabled ? "oklch(0.92 0.08 142)" : "oklch(0.95 0.06 75)", color: u.mfaEnabled ? "oklch(0.35 0.12 142)" : "oklch(0.55 0.1 75)" }}>
                {u.mfaEnabled ? "MFA On" : "MFA Off"}
              </span>
            </div>
          ))}
        </div>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.75rem", color: "oklch(0.65 0.03 155)", marginTop: "0.75rem" }}>
          Your own MFA enrollment is enforced during sign-in whenever it is not configured.
        </p>
      </div>

      {/* ── Active Sessions ── */}
      <div style={cardStyle}>
        <div style={labelStyle}><KeyRound size={13} /> Active Sessions</div>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.82rem", color: "oklch(0.45 0.05 155)", marginBottom: "0.75rem" }}>
          Sessions close automatically after 30 minutes of inactivity. Administrator sessions also expire after four hours.
        </p>
        {activeSessions.length === 0 ? (
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.82rem", color: "oklch(0.65 0.03 155)" }}>No active sessions found.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {activeSessions.map((session) => (
              <div key={session.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.65rem 0.75rem", background: "oklch(0.97 0.008 85)", borderRadius: "0.5rem" }}>
                <KeyRound size={14} style={{ color: session.isCurrent ? "oklch(0.52 0.18 142)" : "oklch(0.55 0.05 155)" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "0.8rem", color: "oklch(0.28 0.07 155)" }}>{session.isCurrent ? "This device" : session.userAgent || "Unknown device"}</p>
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.67rem", color: "oklch(0.55 0.04 155)" }}>{session.ipAddress || "IP unavailable"} · Last active {new Date(session.lastActiveAt).toLocaleString()}</p>
                </div>
                {!session.isCurrent && <button onClick={() => revokeSession.mutate({ sessionId: session.id })} disabled={revokeSession.isPending} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.74rem", color: "oklch(0.55 0.12 25)", background: "none", border: "none", cursor: "pointer" }}>Revoke</button>}
              </div>
            ))}
          </div>
        )}
        {activeSessions.some((session) => !session.isCurrent) && <button onClick={() => revokeOtherSessions.mutate()} disabled={revokeOtherSessions.isPending} style={{ marginTop: "0.75rem", fontFamily: "'DM Sans', sans-serif", fontSize: "0.76rem", color: "oklch(0.45 0.08 155)", background: "none", border: "1px solid oklch(0.72 0.08 155)", borderRadius: "0.5rem", padding: "0.4rem 0.65rem", cursor: "pointer" }}>{revokeOtherSessions.isPending ? "Revoking…" : "Revoke all other sessions"}</button>}
      </div>

    </div>
  );
}

// ── Main SettingsPage ────────────────────────────────────────────────────────

export function SettingsPage() {
  const { user } = useAuth();
  const isAdmin = ["admin", "owner"].includes(user?.role ?? "");
  const [activeTab, setActiveTab] = useState<SettingsTab>("billing");

  const TABS: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: "billing", label: "Billing Rates",  icon: <DollarSign size={15} /> },
    { id: "team",    label: "Team Members",   icon: <Users size={15} /> },
    { id: "audit",    label: "Audit Log",    icon: <Shield size={15} /> },
    { id: "security", label: "Security",      icon: <ShieldCheck size={15} /> },
  ];

  return (
    <div className="space-y-5 fade-in-up">
      {/* Header */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: "linear-gradient(135deg, oklch(0.22 0.07 155) 0%, oklch(0.28 0.07 155) 100%)",
          boxShadow: "0 4px 20px oklch(0.22 0.07 155 / 0.25)",
        }}
      >
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: "1.25rem", color: "oklch(0.97 0.008 85)" }}>
          Dashboard Settings
        </h2>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.82rem", color: "oklch(0.72 0.04 155)", marginTop: "0.25rem" }}>
          Configure billing rates, manage team members, and review the audit log.
          {!isAdmin && <span style={{ color: "oklch(0.75 0.14 75)" }}> — Read-only mode (admin required for edits)</span>}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: activeTab === tab.id ? 600 : 400,
              fontSize: "0.875rem",
              backgroundColor: activeTab === tab.id ? "oklch(0.28 0.07 155)" : "oklch(1 0 0)",
              color: activeTab === tab.id ? "oklch(0.97 0.008 85)" : "oklch(0.45 0.05 155)",
              border: `1px solid ${activeTab === tab.id ? "oklch(0.28 0.07 155)" : "oklch(0.88 0.02 85)"}`,
              boxShadow: activeTab === tab.id ? "0 2px 8px oklch(0.28 0.07 155 / 0.25)" : "none",
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "billing" && <BillingRatesTab isAdmin={isAdmin} />}
      {activeTab === "team"    && <TeamMembersTab isAdmin={isAdmin} />}
      {activeTab === "audit"    && <AuditLogTab isAdmin={isAdmin} />}
      {activeTab === "security" && <SecurityTab isAdmin={isAdmin} />}
    </div>
  );
}

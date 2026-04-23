"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Panel } from "@/components/primitives";

export type AdminInvite = {
  id: string;
  code: string;
  role: string;
  note: string | null;
  createdByEmail: string | null;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
  usedByEmail: string | null;
  revokedAt: string | null;
};

type Status =
  | { kind: "pending" }
  | { kind: "used"; by: string | null; at: string }
  | { kind: "revoked"; at: string }
  | { kind: "expired"; at: string };

function statusOf(inv: AdminInvite): Status {
  if (inv.revokedAt) return { kind: "revoked", at: inv.revokedAt };
  if (inv.usedAt) return { kind: "used", by: inv.usedByEmail, at: inv.usedAt };
  if (new Date(inv.expiresAt) < new Date()) return { kind: "expired", at: inv.expiresAt };
  return { kind: "pending" };
}

function statusLabel(s: Status): string {
  switch (s.kind) {
    case "pending":
      return "pending";
    case "used":
      return `used by ${s.by ?? "?"} · ${s.at.slice(0, 10)}`;
    case "revoked":
      return `revoked · ${s.at.slice(0, 10)}`;
    case "expired":
      return `expired · ${s.at.slice(0, 10)}`;
  }
}

function statusColor(s: Status): string {
  switch (s.kind) {
    case "pending":
      return "var(--ok)";
    case "used":
      return "var(--ink-mute)";
    case "revoked":
      return "var(--err)";
    case "expired":
      return "var(--ink-mute)";
  }
}

function inviteUrl(code: string): string {
  if (typeof window === "undefined") return `/signup?code=${code}`;
  return `${window.location.origin}/signup?code=${code}`;
}

export function InvitesAdmin({ initialInvites }: { initialInvites: AdminInvite[] }) {
  const router = useRouter();
  const [invites, setInvites] = useState(initialInvites);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // Generate form state
  const [role, setRole] = useState<"user" | "admin">("user");
  const [note, setNote] = useState("");
  const [expiresInDays, setExpiresInDays] = useState<number>(14);

  // Last-generated invite (displayed in a copyable field right under the form)
  const [generated, setGenerated] = useState<AdminInvite | null>(null);

  // Per-row "show URL" toggles
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMsg({ kind: "ok", text: "Copied to clipboard" });
    } catch {
      setMsg({ kind: "err", text: "Clipboard copy failed" });
    }
  }

  async function onGenerate(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const r = await fetch("/api/admin/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role,
        note: note || undefined,
        expiresInDays,
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      setMsg({ kind: "err", text: data.error || `Error ${r.status}` });
      return;
    }
    const inv = data.invite as {
      id: string;
      code: string;
      role: string;
      note: string | null;
      createdAt: string;
      expiresAt: string;
      usedAt: string | null;
      revokedAt: string | null;
      createdBy?: { email: string } | null;
      usedBy?: { email: string } | null;
    };
    const normalized: AdminInvite = {
      id: inv.id,
      code: inv.code,
      role: inv.role,
      note: inv.note,
      createdByEmail: inv.createdBy?.email ?? null,
      createdAt: inv.createdAt,
      expiresAt: inv.expiresAt,
      usedAt: inv.usedAt,
      usedByEmail: inv.usedBy?.email ?? null,
      revokedAt: inv.revokedAt,
    };
    setInvites((rows) => [normalized, ...rows]);
    setGenerated(normalized);
    setNote("");
    setMsg({ kind: "ok", text: "Invite generated" });
    refresh();
  }

  async function onRevoke(id: string) {
    if (!confirm("Revoke this invite? The URL will stop working immediately.")) return;
    setMsg(null);
    const r = await fetch(`/api/admin/invites/${id}`, { method: "DELETE" });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      setMsg({ kind: "err", text: data.error || `Error ${r.status}` });
      return;
    }
    setInvites((rows) =>
      rows.map((row) =>
        row.id === id ? { ...row, revokedAt: new Date().toISOString() } : row,
      ),
    );
    setMsg({ kind: "ok", text: "Invite revoked" });
    refresh();
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {msg && (
        <div
          style={{
            padding: "8px 14px",
            borderRadius: 6,
            background: "var(--bg-1)",
            border: `1px solid ${msg.kind === "ok" ? "var(--ok)" : "var(--err)"}`,
            color: msg.kind === "ok" ? "var(--ok)" : "var(--err)",
            fontFamily: "var(--mono)",
            fontSize: 12,
          }}
        >
          {msg.text}
        </div>
      )}

      <Panel title="Generate invite">
        <form
          onSubmit={onGenerate}
          className="admin-invite-form"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 8,
            alignItems: "end",
          }}
        >
          <label style={{ display: "grid", gap: 4 }}>
            <span className="caps" style={{ fontSize: 11, color: "var(--ink-mute)" }}>Role</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "user" | "admin")}
              className="admin-input"
            >
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            <span className="caps" style={{ fontSize: 11, color: "var(--ink-mute)" }}>Note (optional)</span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. For family member"
              className="admin-input"
              maxLength={200}
            />
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            <span className="caps" style={{ fontSize: 11, color: "var(--ink-mute)" }}>Expires</span>
            <select
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(Number(e.target.value))}
              className="admin-input"
            >
              <option value={1}>1 day</option>
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
            </select>
          </label>
          <button type="submit" disabled={pending} className="admin-btn">Generate</button>
        </form>

        {generated && (
          <div
            style={{
              marginTop: 14,
              padding: "12px 14px",
              borderRadius: 6,
              border: "1px solid var(--ok)",
              background: "var(--bg-1)",
              display: "grid",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 11, color: "var(--ink-mute)", fontFamily: "var(--mono)" }}>
              Share this URL with the new user. It works once.
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input
                readOnly
                value={inviteUrl(generated.code)}
                className="admin-input"
                style={{ flex: "1 1 200px", minWidth: 0, fontFamily: "var(--mono)", fontSize: 12 }}
                onFocus={(e) => e.currentTarget.select()}
              />
              <button
                type="button"
                className="admin-btn"
                onClick={() => copy(inviteUrl(generated.code))}
              >
                Copy
              </button>
            </div>
          </div>
        )}
      </Panel>

      <Panel title="Invites" flush>
        <div className="admin-table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Role</th>
              <th>Note</th>
              <th>Created by</th>
              <th>Created</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {invites.length === 0 && (
              <tr>
                <td colSpan={7} style={{ color: "var(--ink-mute)", textAlign: "center", padding: 20 }}>
                  No invites yet. Generate one above.
                </td>
              </tr>
            )}
            {invites.map((inv) => {
              const s = statusOf(inv);
              const canRevoke = s.kind === "pending";
              return (
                <tr key={inv.id}>
                  <td style={{ fontFamily: "var(--mono)", fontSize: 12 }}>
                    {inv.code.slice(0, 8)}…
                  </td>
                  <td>
                    <span
                      className="caps"
                      style={{
                        fontSize: 10,
                        letterSpacing: "0.08em",
                        color: inv.role === "admin" ? "var(--accent)" : "var(--ink-mute)",
                      }}
                    >
                      {inv.role}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: "var(--ink-mute)" }}>{inv.note ?? "-"}</td>
                  <td style={{ fontSize: 12 }}>{inv.createdByEmail ?? "-"}</td>
                  <td style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-mute)" }}>
                    {inv.createdAt.slice(0, 10)}
                  </td>
                  <td style={{ fontSize: 12, color: statusColor(s) }}>{statusLabel(s)}</td>
                  <td style={{ textAlign: "right" }}>
                    {canRevoke && (
                      <>
                        <button
                          type="button"
                          className="admin-btn admin-btn-ghost"
                          onClick={() =>
                            setRevealed((r) => ({ ...r, [inv.id]: !r[inv.id] }))
                          }
                        >
                          {revealed[inv.id] ? "hide" : "url"}
                        </button>{" "}
                        <button
                          type="button"
                          className="admin-btn admin-btn-ghost"
                          onClick={() => copy(inviteUrl(inv.code))}
                        >
                          copy
                        </button>{" "}
                        <button
                          type="button"
                          className="admin-btn admin-btn-danger"
                          onClick={() => onRevoke(inv.id)}
                          disabled={pending}
                        >
                          revoke
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        {Object.entries(revealed).some(([, v]) => v) && (
          <div style={{ padding: "10px 14px", borderTop: "1px solid var(--border)" }}>
            {invites
              .filter((inv) => revealed[inv.id] && statusOf(inv).kind === "pending")
              .map((inv) => (
                <div
                  key={inv.id}
                  style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 0", flexWrap: "wrap" }}
                >
                  <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-mute)", minWidth: 90 }}>
                    {inv.code.slice(0, 8)}…
                  </span>
                  <input
                    readOnly
                    value={inviteUrl(inv.code)}
                    className="admin-input"
                    style={{ flex: "1 1 200px", minWidth: 0, fontFamily: "var(--mono)", fontSize: 12 }}
                    onFocus={(e) => e.currentTarget.select()}
                  />
                </div>
              ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

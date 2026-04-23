"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Panel } from "@/components/primitives";

export type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
};

export function UsersAdmin({
  initialUsers,
  currentUserId,
}: {
  initialUsers: AdminUser[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // Form state for reset-password inline dialog
  const [resetFor, setResetFor] = useState<string | null>(null);
  const [resetPw, setResetPw] = useState("");

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function onDelete(id: string, userEmail: string) {
    if (!confirm(`Delete user ${userEmail}?`)) return;
    setMsg(null);
    const r = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      setMsg({ kind: "err", text: data.error || `Error ${r.status}` });
      return;
    }
    setUsers((u) => u.filter((x) => x.id !== id));
    setMsg({ kind: "ok", text: `Deleted ${userEmail}` });
    refresh();
  }

  async function onResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!resetFor) return;
    setMsg(null);
    const r = await fetch(`/api/admin/users/${resetFor}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: resetPw }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      setMsg({ kind: "err", text: data.error || `Error ${r.status}` });
      return;
    }
    setResetFor(null);
    setResetPw("");
    setMsg({ kind: "ok", text: `Password reset for ${data.user.email}` });
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

      <div
        style={{
          padding: "10px 14px",
          borderRadius: 6,
          background: "var(--bg-1)",
          border: "1px solid var(--border)",
          color: "var(--ink-mute)",
          fontSize: 12,
        }}
      >
        Need to add a family member?{" "}
        <Link href="/admin/invites" style={{ color: "var(--accent)" }}>
          Generate an invite →
        </Link>
      </div>

      <Panel title="Users" flush>
        <div className="admin-table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Role</th>
              <th>Created</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.email}{u.id === currentUserId ? " (you)" : ""}</td>
                <td>{u.name ?? "-"}</td>
                <td>
                  <span className="caps" style={{
                    fontSize: 10,
                    letterSpacing: "0.08em",
                    color: u.role === "admin" ? "var(--accent)" : "var(--ink-mute)",
                  }}>
                    {u.role}
                  </span>
                </td>
                <td style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-mute)" }}>
                  {u.createdAt.slice(0, 10)}
                </td>
                <td style={{ textAlign: "right" }}>
                  <button
                    type="button"
                    className="admin-btn admin-btn-ghost"
                    onClick={() => { setResetFor(u.id); setResetPw(""); }}
                    disabled={pending}
                  >
                    reset password
                  </button>{" "}
                  <button
                    type="button"
                    className="admin-btn admin-btn-danger"
                    onClick={() => onDelete(u.id, u.email)}
                    disabled={pending || u.id === currentUserId}
                    title={u.id === currentUserId ? "Cannot delete your own account" : undefined}
                  >
                    delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Panel>

      {resetFor && (
        <Panel title={`Reset password for ${users.find((u) => u.id === resetFor)?.email}`}>
          <form onSubmit={onResetSubmit} style={{ display: "flex", gap: 8, alignItems: "end", flexWrap: "wrap" }}>
            <label style={{ display: "grid", gap: 4, flex: 1 }}>
              <span className="caps" style={{ fontSize: 11, color: "var(--ink-mute)" }}>New password</span>
              <input
                type="password" required minLength={12} value={resetPw}
                onChange={(e) => setResetPw(e.target.value)}
                className="admin-input" autoComplete="new-password"
              />
            </label>
            <button type="submit" disabled={pending} className="admin-btn">Save</button>
            <button
              type="button" className="admin-btn admin-btn-ghost"
              onClick={() => { setResetFor(null); setResetPw(""); }}
            >
              Cancel
            </button>
          </form>
        </Panel>
      )}
    </div>
  );
}

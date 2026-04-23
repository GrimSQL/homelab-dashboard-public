"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Panel } from "@/components/primitives";
import type { ProjectRow } from "@/lib/services/projects";

type FormState = {
  slug: string;
  title: string;
  group: string;
  summary: string;
  tagsInput: string; // comma-separated for UX
  date: string;
  url: string;
  repoUrl: string;
  status: "" | "live" | "private" | "doc" | "archived";
  markdown: string;
};

function todayYMD(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function emptyForm(): FormState {
  return {
    slug: "",
    title: "",
    group: "",
    summary: "",
    tagsInput: "",
    date: todayYMD(),
    url: "",
    repoUrl: "",
    status: "",
    markdown: "",
  };
}

function fromProject(p: ProjectRow): FormState {
  return {
    slug: p.slug,
    title: p.title,
    group: p.group,
    summary: p.summary,
    tagsInput: p.tags.join(", "),
    date: p.date,
    url: p.url ?? "",
    repoUrl: p.repoUrl ?? "",
    status: (p.status as FormState["status"]) ?? "",
    markdown: p.markdown ?? "",
  };
}

type Payload = {
  slug: string;
  title: string;
  group: string;
  summary: string;
  tags: string[];
  date: string;
  url: string | null;
  repoUrl: string | null;
  status: "live" | "private" | "doc" | "archived" | null;
  markdown: string | null;
};

function toPayload(f: FormState): Payload {
  return {
    slug: f.slug.trim(),
    title: f.title.trim(),
    group: f.group.trim(),
    summary: f.summary.trim(),
    tags: f.tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    date: f.date.trim(),
    url: f.url.trim() ? f.url.trim() : null,
    repoUrl: f.repoUrl.trim() ? f.repoUrl.trim() : null,
    status: f.status === "" ? null : f.status,
    markdown: f.markdown.length > 0 ? f.markdown : null,
  };
}

export function ProjectsAdmin({
  initialProjects,
  initialLastSyncAt,
}: {
  initialProjects: ProjectRow[];
  initialLastSyncAt: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(initialLastSyncAt);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function handleSync() {
    if (syncing) return;
    setSyncing(true);
    setMsg(null);
    try {
      const r = await fetch("/api/admin/projects/sync", { method: "POST" });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg({ kind: "err", text: `sync failed: ${data.error ?? `HTTP ${r.status}`}` });
      } else {
        const errCount = Array.isArray(data.errors) ? data.errors.length : 0;
        setMsg({
          kind: errCount > 0 ? "err" : "ok",
          text: `sync: scanned ${data.scanned ?? 0}, +${data.created ?? 0} new, ${data.updated ?? 0} updated, ${data.skipped ?? 0} skipped, ${errCount} errors`,
        });
        if (data.at) setLastSyncAt(new Date(data.at).toISOString());
        refresh();
      }
    } catch (err) {
      setMsg({ kind: "err", text: `sync error: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setSyncing(false);
    }
  }

  function formatLastSync(iso: string | null): string {
    if (!iso) return "never";
    try {
      return new Date(iso).toISOString().slice(0, 16).replace("T", " ") + "Z";
    } catch {
      return iso;
    }
  }

  const filtered = query.trim()
    ? initialProjects.filter((p) => {
        const q = query.toLowerCase();
        return (
          p.slug.toLowerCase().includes(q) ||
          p.title.toLowerCase().includes(q) ||
          p.group.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
        );
      })
    : initialProjects;

  async function onCreate(form: FormState) {
    setMsg(null);
    const r = await fetch("/api/admin/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toPayload(form)),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      setMsg({ kind: "err", text: data.error || `Error ${r.status}` });
      return false;
    }
    setMsg({ kind: "ok", text: `Created ${data.project.slug}` });
    setAdding(false);
    refresh();
    return true;
  }

  async function onSave(id: string, form: FormState) {
    setMsg(null);
    const r = await fetch(`/api/admin/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toPayload(form)),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      setMsg({ kind: "err", text: data.error || `Error ${r.status}` });
      return false;
    }
    setMsg({ kind: "ok", text: `Saved ${data.project.slug}` });
    setEditingId(null);
    refresh();
    return true;
  }

  async function onDelete(p: ProjectRow) {
    if (!confirm(`Delete project "${p.title}" (${p.slug})?`)) return;
    setMsg(null);
    const r = await fetch(`/api/admin/projects/${p.id}`, { method: "DELETE" });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      setMsg({ kind: "err", text: data.error || `Error ${r.status}` });
      return;
    }
    setMsg({ kind: "ok", text: `Deleted ${p.slug}` });
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

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          className="admin-btn"
          onClick={() => {
            setAdding((v) => !v);
            setEditingId(null);
          }}
          disabled={pending}
        >
          {adding ? "Cancel" : "+ Add project"}
        </button>
        <button
          type="button"
          className="admin-btn admin-btn-ghost"
          onClick={handleSync}
          disabled={pending || syncing}
          title="Sync project list from GitHub (example-user repos)"
        >
          {syncing ? "syncing..." : "\u21bb Sync from GitHub"}
        </button>
        <span
          className="caps"
          style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-mute)" }}
          title={lastSyncAt ?? "never"}
        >
          last sync: {formatLastSync(lastSyncAt)}
        </span>
        <input
          type="text"
          className="admin-input"
          placeholder="Search projects, tags, groups..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-mute)" }}>
          {filtered.length} of {initialProjects.length}
        </div>
      </div>

      {adding && (
        <Panel title="New project" flush>
          <ProjectForm
            initial={emptyForm()}
            pending={pending}
            onSubmit={onCreate}
            onCancel={() => setAdding(false)}
            submitLabel="Create"
          />
        </Panel>
      )}

      <Panel title="Projects" flush>
        <div className="admin-table-wrap">
        <table className="table admin-projects-table">
          <thead>
            <tr>
              <th style={{ width: 28 }} title="Source: GH = synced from GitHub, M = manual"></th>
              <th>Slug</th>
              <th>Title</th>
              <th>Group</th>
              <th>Date</th>
              <th>Status</th>
              <th>Repo</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <ProjectRowUI
                key={p.id}
                project={p}
                editing={editingId === p.id}
                pending={pending}
                onEdit={() => {
                  setEditingId(p.id);
                  setAdding(false);
                }}
                onCancel={() => setEditingId(null)}
                onSave={(form) => onSave(p.id, form)}
                onDelete={() => onDelete(p)}
              />
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: 20, color: "var(--ink-mute)", fontFamily: "var(--mono)", fontSize: 12 }}>
                  No projects match &quot;{query}&quot;.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </Panel>
    </div>
  );
}

function ProjectRowUI({
  project,
  editing,
  pending,
  onEdit,
  onCancel,
  onSave,
  onDelete,
}: {
  project: ProjectRow;
  editing: boolean;
  pending: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (form: FormState) => Promise<boolean>;
  onDelete: () => void;
}) {
  if (editing) {
    return (
      <tr>
        <td colSpan={8} style={{ padding: 0 }}>
          <div style={{ padding: 14, background: "var(--bg-1)", borderTop: "1px solid var(--rule)", borderBottom: "1px solid var(--rule)" }}>
            <div className="caps" style={{ fontSize: 11, color: "var(--ink-mute)", marginBottom: 8 }}>
              Editing {project.slug}{" "}
              {project.source === "github" && (
                <span style={{ color: "var(--ink-dim)" }}>
                  (synced from GitHub{project.lastSyncedAt ? ` · last ${project.lastSyncedAt.slice(0, 16).replace("T", " ")}Z` : ""})
                </span>
              )}
            </div>
            <ProjectForm
              initial={fromProject(project)}
              pending={pending}
              onSubmit={onSave}
              onCancel={onCancel}
              submitLabel="Save"
              slugLocked
            />
          </div>
        </td>
      </tr>
    );
  }

  const isGh = project.source === "github";
  return (
    <tr>
      <td
        style={{ fontFamily: "var(--mono)", fontSize: 10, color: isGh ? "var(--accent)" : "var(--ink-mute)", textAlign: "center" }}
        title={
          isGh
            ? `Synced from GitHub${project.lastSyncedAt ? ` at ${project.lastSyncedAt}` : ""}`
            : "Manual / admin-created"
        }
      >
        {isGh ? "GH" : "M"}
      </td>
      <td style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{project.slug}</td>
      <td>{project.title}</td>
      <td style={{ color: "var(--ink-dim)", fontSize: 12 }}>{project.group}</td>
      <td style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-mute)" }}>{project.date}</td>
      <td>
        <span
          className="caps"
          style={{
            fontSize: 10,
            letterSpacing: "0.08em",
            color: project.status === "live" ? "var(--ok)" : project.status === "private" ? "var(--warn)" : "var(--ink-mute)",
          }}
        >
          {project.status ?? "-"}
        </span>
      </td>
      <td style={{ fontFamily: "var(--mono)", fontSize: 11 }}>
        {project.repoUrl ? (
          <a href={project.repoUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>
            ↗ github
          </a>
        ) : (
          <span style={{ color: "var(--ink-mute)" }}>-</span>
        )}
      </td>
      <td style={{ textAlign: "right" }}>
        <button type="button" className="admin-btn admin-btn-ghost" onClick={onEdit} disabled={pending}>
          edit
        </button>{" "}
        <button type="button" className="admin-btn admin-btn-danger" onClick={onDelete} disabled={pending}>
          delete
        </button>
      </td>
    </tr>
  );
}

function ProjectForm({
  initial,
  pending,
  onSubmit,
  onCancel,
  submitLabel,
  slugLocked,
}: {
  initial: FormState;
  pending: boolean;
  onSubmit: (form: FormState) => Promise<boolean>;
  onCancel: () => void;
  submitLabel: string;
  slugLocked?: boolean;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof FormState>(key: K, v: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await onSubmit(form);
    } finally {
      setBusy(false);
    }
  }

  const disabled = pending || busy;

  return (
    <form onSubmit={handleSubmit} className="project-form">
      <div className="project-form-row">
        <label>
          <span>Slug *</span>
          <input
            type="text"
            required
            pattern="[a-zA-Z0-9\-]+"
            value={form.slug}
            onChange={(e) => set("slug", e.target.value)}
            disabled={slugLocked || disabled}
          />
        </label>
        <label>
          <span>Title *</span>
          <input
            type="text"
            required
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            disabled={disabled}
          />
        </label>
        <label>
          <span>Group *</span>
          <input
            type="text"
            required
            value={form.group}
            onChange={(e) => set("group", e.target.value)}
            disabled={disabled}
            placeholder="Products / Utilities / Homelab / ..."
          />
        </label>
      </div>

      <label>
        <span>Summary</span>
        <textarea
          value={form.summary}
          onChange={(e) => set("summary", e.target.value)}
          disabled={disabled}
          rows={2}
        />
      </label>

      <div className="project-form-row">
        <label>
          <span>Tags (comma-separated)</span>
          <input
            type="text"
            value={form.tagsInput}
            onChange={(e) => set("tagsInput", e.target.value)}
            disabled={disabled}
            placeholder="typescript, react, postgres"
          />
        </label>
        <label>
          <span>Date (YYYY-MM-DD)</span>
          <input
            type="date"
            value={form.date}
            onChange={(e) => set("date", e.target.value)}
            disabled={disabled}
          />
        </label>
        <label>
          <span>Status</span>
          <select
            value={form.status}
            onChange={(e) => set("status", e.target.value as FormState["status"])}
            disabled={disabled}
          >
            <option value="">(none)</option>
            <option value="live">live</option>
            <option value="private">private</option>
            <option value="doc">doc</option>
            <option value="archived">archived</option>
          </select>
        </label>
      </div>

      <div className="project-form-row">
        <label>
          <span>URL slug (docs subdomain)</span>
          <input
            type="text"
            value={form.url}
            onChange={(e) => set("url", e.target.value)}
            disabled={disabled}
            placeholder="app1"
          />
        </label>
        <label>
          <span>Repo URL</span>
          <input
            type="url"
            value={form.repoUrl}
            onChange={(e) => set("repoUrl", e.target.value)}
            disabled={disabled}
            placeholder="https://github.com/example-user/..."
          />
        </label>
      </div>

      <label>
        <span>Markdown</span>
        <textarea
          className="markdown-field"
          value={form.markdown}
          onChange={(e) => set("markdown", e.target.value)}
          disabled={disabled}
          rows={12}
          placeholder="# Project name&#10;&#10;README content goes here..."
        />
      </label>

      <div className="form-actions">
        <button type="button" className="admin-btn admin-btn-ghost" onClick={onCancel} disabled={disabled}>
          Cancel
        </button>
        <button type="submit" className="admin-btn" disabled={disabled}>
          {busy ? "..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

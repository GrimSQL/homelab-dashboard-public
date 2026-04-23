// Projects page — grouped list + sanitized markdown viewer.
// Data now comes from the Project table in SQLite (admin-editable) instead of
// static imports. The server component at app/(dashboard)/projects/page.tsx
// fetches from listProjects() and passes `projects` in.
"use client";
import { useMemo, useState } from "react";
import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";
import type { HomelabData, Service } from "@/lib/data/types";
import type { ProjectRow } from "@/lib/services/projects";
import { Panel, SectionHeader, StatusDot } from "@/components/primitives";

type DockerMatch = { running: boolean; services: Service[] };

const CONTAINER_MAP: Record<string, string[]> = {
  "app1":        ["app1-frontend", "app1-backend", "app1-db"],
  "app2":      ["app2-server", "app2-postgres"],
  "example-scripts-bot": ["example-scripts-bot"],
  "frigate":         ["frigate"],
  "home-assistant":  ["Home Assistant Core", "Zigbee2MQTT", "Node-RED", "Mosquitto broker", "Matter Server"],
};

function findContainers(slug: string, services: Service[]): DockerMatch | null {
  const names = CONTAINER_MAP[slug] || [];
  const matches = names.map(n => services.find(s => s.name === n)).filter((s): s is Service => Boolean(s));
  if (!matches.length) return null;
  const running = matches.every(s => s.status === "ok" || s.status === "warn");
  return { running, services: matches };
}

function statusFor(p: ProjectRow, services: Service[]): string {
  const c = findContainers(p.slug, services);
  if (c) return c.running ? "running" : "stopped";
  if (p.url === "alva") return "archived";
  if (p.url) return "external";
  if (p.group === "Homelab") return "docs";
  if (p.group === "example-scripts (Game)") {
    // Data-level status overrides the group default:
    //   - "live" for Published-on-SDN scripts (GrimStarter, GrimMule)
    //   - "private" for everything else (not published)
    if (typeof p.status === "string") {
      if (p.status === "live") return "live";
      if (p.status === "private") return "private";
    }
    return "published";
  }
  if (p.group === "Forks") return "fork";
  return "local";
}

export function ProjectsPage({ data, projects }: { data: HomelabData; projects: ProjectRow[] }) {
  const services = data.services || [];

  const [query, setQuery] = useState("");

  const filteredProjects = useMemo(() => {
    if (!query.trim()) return projects;
    const q = query.toLowerCase();
    return projects.filter(p => {
      const tags = Array.isArray(p.tags) ? p.tags : [];
      return (
        p.title.toLowerCase().includes(q) ||
        p.group.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        tags.some(t => t.toLowerCase().includes(q))
      );
    });
  }, [projects, query]);

  const groups = useMemo(() => {
    const out: { name: string; items: ProjectRow[] }[] = [];
    const seen = new Map<string, ProjectRow[]>();
    for (const p of filteredProjects) {
      if (!seen.has(p.group)) { const arr: ProjectRow[] = []; seen.set(p.group, arr); out.push({ name: p.group, items: arr }); }
      seen.get(p.group)!.push(p);
    }
    return out;
  }, [filteredProjects]);

  const missingRepoCount = useMemo(() => projects.filter(p => !p.repoUrl).length, [projects]);

  const [sel, setSel] = useState<string | undefined>(projects[0]?.slug);
  const proj = projects.find(p => p.slug === sel) || projects[0];
  const body = (proj?.markdown && proj.markdown.length > 0 ? proj.markdown : null) ?? "*No content yet.*";
  const containers = proj ? findContainers(proj.slug, services) : null;
  const projStatus = proj ? statusFor(proj, services) : "local";
  const showUrl = proj?.url && projStatus !== "archived";

  const html = useMemo(() => {
    const rendered = marked.parse(body, { async: false }) as string;
    return DOMPurify.sanitize(rendered);
  }, [body]);

  if (!proj) {
    return (
      <section className="page anchor" id="projects">
        <SectionHeader num="08" title="Projects" sub="No projects available." />
      </section>
    );
  }

  return (
    <section className="page anchor" id="projects">
      <SectionHeader num="08" title="Projects"
        sub={`${projects.length} READMEs across ${groups.length} groups · status reflects whether the project's containers are running on docker (LXC 101).`} />

      <Panel title="Library" meta={`${projects.length} entries`}>
        <div className="project-grid">
          <div className="project-list" style={{ maxHeight: "70vh", overflowY: "auto", paddingRight: 8 }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects, tags, groups..."
              className="project-search"
              aria-label="Search projects"
            />
            <div className="project-list-summary caps">
              {filteredProjects.length} of {projects.length} · {missingRepoCount} missing repo
            </div>
            {groups.length === 0 && (
              <div style={{ padding: "16px 8px", color: "var(--ink-mute)", fontFamily: "var(--mono)", fontSize: 12 }}>
                No projects match &quot;{query}&quot;.
              </div>
            )}
            {groups.map(g => (
              <div key={g.name} style={{ marginBottom: 14 }}>
                <div className="caps" style={{ padding: "8px 4px 6px", color: "var(--ink-mute)", borderBottom: "1px dashed var(--rule)", marginBottom: 6, position: "sticky", top: 0, background: "var(--bg)" }}>
                  {g.name} <span style={{ opacity: 0.5 }}>· {g.items.length}</span>
                </div>
                {g.items.map(p => {
                  const st = statusFor(p, services);
                  return (
                    <button key={p.slug} className={"project-item " + (sel === p.slug ? "active" : "")} onClick={() => setSel(p.slug)}>
                      <div className="t">{p.title}</div>
                      <div className="m">
                        <span className={"s " + st}>{st}</span>
                        <span>{p.date}</span>
                        {p.repoUrl ? (
                          <a
                            href={p.repoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="project-repo"
                            title={p.repoUrl}
                          >
                            ↗ GitHub
                          </a>
                        ) : (
                          <span className="project-repo missing" title="No GitHub repo linked yet">no repo</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="project-view">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "1px dashed var(--rule)", paddingBottom: 10, marginBottom: 14, gap: 12, flexWrap: "wrap" }}>
              <div>
                <div className="caps" style={{ color: "var(--ink-mute)" }}>{proj.group}</div>
                <div style={{ fontSize: 18, color: "var(--ink)", fontFamily: "var(--mono)", marginTop: 2 }}>{proj.title}</div>
              </div>
              <div className="caps" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                {showUrl && <a className="svc-link" href={`https://${proj.url}.example.com`} target="_blank" rel="noopener noreferrer">{proj.url}.example.com ↗</a>}
                {proj.repoUrl ? (
                  <a
                    href={proj.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="project-repo"
                    title={proj.repoUrl}
                  >
                    ↗ GitHub
                  </a>
                ) : (
                  <span className="project-repo missing" title="No GitHub repo linked yet">no repo yet</span>
                )}
                <span className={"s " + projStatus} style={{ border: "1px solid var(--rule-2)", padding: "1px 6px", borderRadius: 3 }}>{projStatus}</span>
                <span>· {proj.date}</span>
              </div>
            </div>

            {containers && (
              <div style={{ display: "grid", gap: 6, marginBottom: 14, padding: "10px 12px", background: "var(--bg-1)", border: "1px solid var(--rule)", borderRadius: 4 }}>
                <div className="caps" style={{ color: "var(--ink-mute)" }}>Running on docker · LXC 101</div>
                {containers.services.map(s => (
                  <div key={s.name} style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-dim)" }}>
                    <span><StatusDot s={s.status} /> {s.name}</span>
                    <span>{s.uptime.toFixed(2)}% · {s.ram} MB{s.port ? " · :" + s.port : ""}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="md" dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        </div>
      </Panel>
    </section>
  );
}

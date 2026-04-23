import { getHomelab } from "@/lib/data/homelab";
import { listProjects } from "@/lib/services/projects";
import { ProjectsPage } from "@/components/pages/Projects";

// The Project list lives in SQLite and is admin-editable at runtime, so this
// page must never be prerendered at build time. The Docker service mapping
// comes from getHomelab() which has its own TTL cache, so there's no extra
// cost to making this dynamic.
export const dynamic = "force-dynamic";

export default async function Page() {
  const [data, projects] = await Promise.all([getHomelab(), listProjects()]);
  return <ProjectsPage data={data} projects={projects} />;
}

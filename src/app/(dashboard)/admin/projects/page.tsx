import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { listProjects } from "@/lib/services/projects";
import { getLastSyncAt } from "@/lib/services/github-sync";
import { ProjectsAdmin } from "./ProjectsAdmin";

export const dynamic = "force-dynamic";

export default async function AdminProjectsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    // Don't leak that this page exists — return 404 instead of 403
    notFound();
  }

  const [projects, lastSyncAt] = await Promise.all([listProjects(), getLastSyncAt()]);

  return (
    <>
      <h2 className="section">Admin · Projects</h2>
      <ProjectsAdmin
        initialProjects={projects}
        initialLastSyncAt={lastSyncAt ? lastSyncAt.toISOString() : null}
      />
    </>
  );
}

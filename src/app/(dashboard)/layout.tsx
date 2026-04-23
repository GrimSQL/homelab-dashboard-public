import { redirect } from "next/navigation";
import { SidebarWrapper } from "@/components/chrome/SidebarWrapper";
import { TopbarWrapper } from "@/components/chrome/TopbarWrapper";
import { DataErrorBanner } from "@/components/DataErrorBanner";
import { getHomelab } from "@/lib/data/homelab";
import { auth } from "@/lib/auth";
import { bootstrapAdmin } from "@/lib/bootstrap-admin";
import { bootstrapProjects } from "@/lib/bootstrap-projects";
import { scheduleGithubSync } from "@/lib/bootstrap-github-sync";
import { scheduleDataRefresh } from "@/lib/bootstrap-data-refresh";

// Dashboard is per-user auth-gated — rendered on every request, never
// prerendered at build time. auth() needs a request context and Prisma is
// not available during build. Live HA/PVE/Portainer data is read from an
// in-memory cache (populated by a background refresher, see
// bootstrap-data-refresh.ts) so getHomelab() never blocks on network.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Idempotent first-boot seeds. Harmless on subsequent requests thanks to
  // per-process one-time latches inside each bootstrap function.
  await Promise.all([bootstrapAdmin(), bootstrapProjects()]);

  // Fire-and-forget: schedules a recurring GitHub -> DB sync. The latch
  // inside scheduleGithubSync() means only the first call actually wires
  // up timers; subsequent renders no-op.
  scheduleGithubSync();

  // Kick off the HA/PVE/Portainer background refresher. Same latch pattern.
  // getHomelab() below reads from the cache this refresher populates and
  // never blocks on network fetches.
  scheduleDataRefresh();

  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const data = await getHomelab();
  return (
    <div className="app">
      <SidebarWrapper meta={data.meta} containerCount={data.services.length} role={session.user.role} />
      <main className="main">
        <TopbarWrapper user={{ email: session.user.email, role: session.user.role }} />
        <DataErrorBanner sources={data.sources} />
        {children}
      </main>
    </div>
  );
}

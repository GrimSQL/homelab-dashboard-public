import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { InvitesAdmin, type AdminInvite } from "./InvitesAdmin";

export const dynamic = "force-dynamic";

export default async function AdminInvitesPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    // Don't leak that the admin area exists
    notFound();
  }

  const rows = await prisma.inviteCode.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { email: true } },
      usedBy: { select: { email: true } },
    },
  });

  const initialInvites: AdminInvite[] = rows.map((r) => ({
    id: r.id,
    code: r.code,
    role: r.role,
    note: r.note,
    createdByEmail: r.createdBy?.email ?? null,
    createdAt: r.createdAt.toISOString(),
    expiresAt: r.expiresAt.toISOString(),
    usedAt: r.usedAt ? r.usedAt.toISOString() : null,
    usedByEmail: r.usedBy?.email ?? null,
    revokedAt: r.revokedAt ? r.revokedAt.toISOString() : null,
  }));

  return (
    <>
      <h2 className="section">Admin · Invites</h2>
      <InvitesAdmin initialInvites={initialInvites} />
    </>
  );
}

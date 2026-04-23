import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { UsersAdmin } from "./UsersAdmin";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    // Don't leak that this page exists — return 404 instead of 403
    notFound();
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  return (
    <>
      <h2 className="section">Admin · Users</h2>
      <UsersAdmin
        initialUsers={users.map((u) => ({
          ...u,
          createdAt: u.createdAt.toISOString(),
        }))}
        currentUserId={session.user.id}
      />
    </>
  );
}

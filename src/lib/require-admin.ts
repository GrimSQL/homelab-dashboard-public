import "server-only";
import { NextResponse } from "next/server";
import { auth } from "./auth";

export type AdminCheck =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse };

/**
 * Guard for admin API routes. Returns a NextResponse on failure that the
 * caller should return immediately, otherwise returns the authenticated
 * user id.
 */
export async function requireAdminApi(): Promise<AdminCheck> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (session.user.role !== "admin") {
    // 404 (not 403) so we don't leak that an admin area exists to regular users
    return { ok: false, response: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }
  return { ok: true, userId: session.user.id };
}

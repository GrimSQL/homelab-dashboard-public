import "server-only";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/require-admin";
import { syncFromGithub, getLastSyncAt } from "@/lib/services/github-sync";

export const dynamic = "force-dynamic";

export async function POST() {
  const guard = await requireAdminApi();
  if (!guard.ok) return guard.response;
  const result = await syncFromGithub();
  return NextResponse.json(result);
}

export async function GET() {
  const guard = await requireAdminApi();
  if (!guard.ok) return guard.response;
  const at = await getLastSyncAt();
  return NextResponse.json({ lastSyncAt: at ? at.toISOString() : null });
}

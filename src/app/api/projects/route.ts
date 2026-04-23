import "server-only";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listProjects } from "@/lib/services/projects";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projects = await listProjects();
  return NextResponse.json({ projects });
}

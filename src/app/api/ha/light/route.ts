import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { env, isHaConfigured } from "@/lib/env";
import { ROOMS } from "@/lib/data/rooms";

export const dynamic = "force-dynamic";

const schema = z.object({
  roomId: z.string().min(1),
  action: z.enum(["on", "off", "toggle"]),
  brightness: z.number().int().min(0).max(100).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isHaConfigured()) return NextResponse.json({ error: "HA not configured" }, { status: 503 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const room = ROOMS.find((r) => r.id === parsed.data.roomId);
  if (!room) return NextResponse.json({ error: "Unknown room" }, { status: 404 });

  const service =
    parsed.data.action === "on"
      ? "turn_on"
      : parsed.data.action === "off"
        ? "turn_off"
        : "toggle";

  const servicePayload: Record<string, unknown> = { entity_id: room.lightEntityId };
  if (parsed.data.brightness !== undefined && parsed.data.action !== "off") {
    servicePayload.brightness_pct = parsed.data.brightness;
  }

  const res = await fetch(`${env.ha.baseUrl}/api/services/light/${service}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.ha.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(servicePayload),
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return NextResponse.json({ error: `HA service failed (${res.status})`, detail }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}

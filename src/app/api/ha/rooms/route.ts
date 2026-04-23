import "server-only";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { env, isHaConfigured } from "@/lib/env";
import { ROOMS } from "@/lib/data/rooms";

export const dynamic = "force-dynamic";

type HaState = {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
};

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isHaConfigured()) return NextResponse.json({ error: "HA not configured" }, { status: 503 });

  const res = await fetch(`${env.ha.baseUrl}/api/states`, {
    headers: { Authorization: `Bearer ${env.ha.token}` },
    cache: "no-store",
  });
  if (!res.ok) return NextResponse.json({ error: `HA returned ${res.status}` }, { status: 502 });
  const states = (await res.json()) as HaState[];

  const byEntityId = new Map(states.map((s) => [s.entity_id, s]));

  const rooms = ROOMS.map((r) => {
    const light = byEntityId.get(r.lightEntityId);
    const temp = r.tempEntityId ? byEntityId.get(r.tempEntityId) : undefined;
    const brightnessAttr = light?.attributes.brightness;
    const supportedColorModes = light?.attributes.supported_color_modes;
    return {
      id: r.id,
      lightOn: light?.state === "on",
      brightness:
        typeof brightnessAttr === "number"
          ? Math.round((brightnessAttr / 255) * 100)
          : null,
      supportsBrightness:
        Array.isArray(supportedColorModes) &&
        (supportedColorModes as string[]).some((m) => m !== "onoff"),
      temperatureC:
        temp?.state && !Number.isNaN(parseFloat(temp.state))
          ? parseFloat(temp.state)
          : null,
    };
  });

  return NextResponse.json({ rooms });
}

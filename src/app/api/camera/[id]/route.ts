import "server-only";
import { NextRequest } from "next/server";
import { env, isHaConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

// 1×1 transparent PNG — served on any failure path so <img onError> falls back
// gracefully without the browser logging a failed-resource console error on
// routes like /cameras (some mock camera IDs don't exist in HA).
const TRANSPARENT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

function placeholder(): Response {
  return new Response(TRANSPARENT_PNG, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=5",
      "X-Camera-Fallback": "placeholder",
    },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;

  if (!isHaConfigured()) return placeholder();

  const entityId = id.startsWith("camera.") ? id : `camera.${id}`;
  const url = `${env.ha.baseUrl}/api/camera_proxy/${entityId}`;

  try {
    const upstream = await fetch(url, {
      headers: { Authorization: `Bearer ${env.ha.token}` },
      cache: "no-store",
    });

    if (!upstream.ok) return placeholder();

    const body = await upstream.arrayBuffer();
    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=5, stale-while-revalidate=10",
      },
    });
  } catch {
    return placeholder();
  }
}

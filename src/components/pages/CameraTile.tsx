"use client";
import { useEffect, useState } from "react";
import type { Camera } from "@/lib/data/types";

export function CameraTile({ cam, haEnabled }: { cam: Camera; haEnabled: boolean }) {
  const [hasError, setHasError] = useState(false);
  // Defer time-dependent state to after mount so SSR and first client render
  // match. Before mount: fallback has no timestamp, snapshot URL has no
  // cache-buster.
  const [mountedBucket, setMountedBucket] = useState<number | null>(null);
  useEffect(() => {
    setMountedBucket(Math.floor(Date.now() / 10_000));
    const id = setInterval(() => {
      setMountedBucket(Math.floor(Date.now() / 10_000));
    }, 10_000);
    return () => clearInterval(id);
  }, []);

  const src =
    mountedBucket === null
      ? `/api/camera/${cam.id}`
      : `/api/camera/${cam.id}?t=${mountedBucket}`;
  const showSnapshot = haEnabled && !hasError;

  return (
    <div className={"cam-tile " + cam.status}>
      <div className="cam-screen">
        {showSnapshot ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={cam.name}
            onError={() => setHasError(true)}
            loading="lazy"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <FakeCamStream id={cam.id} />
        )}
        <div className="cam-overlay-top">
          <span className={"cam-dot " + cam.status} />
          <span className="caps">
            {cam.status === "recording"
              ? "REC · " + (((cam.id.length * 31) % 58) + 2).toFixed(0) + "m"
              : "IDLE"}
          </span>
          <span className="mono" style={{ marginLeft: "auto", color: "var(--ink-dim)" }}>
            {cam.id}
          </span>
        </div>
        <div className="cam-overlay-bot">
          <span style={{ fontFamily: "var(--mono)", color: "#fff", fontSize: 12 }}>{cam.name}</span>
          <span className="mono" style={{ color: "rgba(255,255,255,0.6)", fontSize: 10 }}>
            {cam.type}
          </span>
        </div>
      </div>
      <div className="cam-foot">
        <span className="caps">{cam.location}</span>
      </div>
    </div>
  );
}

// Scan-lined gradient box standing in for a live camera feed.
// Preserved verbatim from the original Cameras.tsx so the fallback keeps the
// same visual identity when HA isn't configured or a snapshot fails.
// The timestamp is rendered after mount to avoid SSR/client hydration drift.
function FakeCamStream({ id }: { id: string }) {
  const seed = id.charCodeAt(0) + id.charCodeAt(1);
  const hue = (seed * 13) % 360;
  const [stamp, setStamp] = useState<string>("");
  useEffect(() => {
    const update = () => setStamp(new Date().toISOString().slice(0, 19).replace("T", " "));
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, []);
  return (
    <svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
      <defs>
        <linearGradient id={"g" + id} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor={`oklch(0.32 0.04 ${hue})`} />
          <stop offset="1" stopColor={`oklch(0.18 0.03 ${(hue + 40) % 360})`} />
        </linearGradient>
        <pattern id={"sc" + id} width="1" height="2" patternUnits="userSpaceOnUse">
          <line x1="0" x2="160" y1="0" y2="0" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect x="0" y="0" width="160" height="90" fill={"url(#g" + id + ")"} />
      <rect x="0" y="0" width="160" height="90" fill={"url(#sc" + id + ")"} />
      <g fill="rgba(0,0,0,0.4)">
        <rect x={(seed % 40) + 40} y={(seed % 20) + 45} width="28" height="38" rx="2" />
        <circle cx={(seed % 40) + 54} cy={(seed % 20) + 40} r="7" />
      </g>
      <text x="4" y="86" fontFamily="var(--mono)" fontSize="5" fill="rgba(255,255,255,0.6)">
        {stamp}
      </text>
    </svg>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Room } from "@/lib/data/rooms";

export type RoomState = {
  lightOn: boolean;
  brightness: number | null; // 0-100 or null
  supportsBrightness: boolean;
  temperatureC: number | null;
};

export function RoomCard({ room, initial }: { room: Room; initial: RoomState }) {
  const [state, setState] = useState<RoomState>(initial);
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState(false);

  const brightnessTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Optimistic toggle
  const onToggle = useCallback(async () => {
    const nextOn = !state.lightOn;
    setState((s) => ({ ...s, lightOn: nextOn }));
    setPending(true);
    setErr(false);
    try {
      const res = await fetch("/api/ha/light", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: room.id, action: nextOn ? "on" : "off" }),
      });
      if (!res.ok) {
        setState((s) => ({ ...s, lightOn: !nextOn }));
        setErr(true);
      }
    } catch {
      setState((s) => ({ ...s, lightOn: !nextOn }));
      setErr(true);
    } finally {
      setPending(false);
    }
  }, [state.lightOn, room.id]);

  // Debounced brightness change
  const onBrightnessChange = useCallback(
    (value: number) => {
      setState((s) => ({ ...s, brightness: value, lightOn: value > 0 }));
      if (brightnessTimer.current) clearTimeout(brightnessTimer.current);
      brightnessTimer.current = setTimeout(async () => {
        const res = await fetch("/api/ha/light", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId: room.id,
            action: value === 0 ? "off" : "on",
            brightness: value,
          }),
        });
        if (!res.ok) setErr(true);
      }, 300);
    },
    [room.id],
  );

  // Pick up polled refreshes from parent
  useEffect(() => {
    setState(initial);
  }, [initial]);

  return (
    <div className={`room-card ${state.lightOn ? "on" : ""} ${err ? "err" : ""}`}>
      <button
        type="button"
        className="room-card-body"
        onClick={onToggle}
        disabled={pending}
        aria-pressed={state.lightOn}
        aria-label={`Toggle ${room.name} lights`}
      >
        <span className="room-icon" aria-hidden="true">
          {room.icon}
        </span>
        <span className="room-name">{room.name}</span>
        <span className="room-meta">
          {state.temperatureC !== null ? `${state.temperatureC.toFixed(1)}°C` : "—"}
        </span>
        <span className="room-status">
          {state.lightOn
            ? state.brightness !== null
              ? `${state.brightness}%`
              : "ON"
            : "OFF"}
        </span>
      </button>
      {state.lightOn && state.supportsBrightness && (
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={state.brightness ?? 100}
          onChange={(e) => onBrightnessChange(Number(e.target.value))}
          className="room-brightness"
          aria-label={`${room.name} brightness`}
        />
      )}
    </div>
  );
}

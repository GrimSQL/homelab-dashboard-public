"use client";

import { useCallback, useEffect, useState } from "react";
import { ROOMS, SECTION_LABELS, type RoomSection } from "@/lib/data/rooms";
import { RoomCard, type RoomState } from "./RoomCard";

type RoomsMap = Record<string, RoomState>;

const SECTIONS: RoomSection[] = ["entry", "right", "left", "outdoor"];

const EMPTY_STATE: RoomState = {
  lightOn: false,
  brightness: null,
  supportsBrightness: false,
  temperatureC: null,
};

export function RoomsGrid({ initialRooms }: { initialRooms: RoomsMap }) {
  const [roomsById, setRoomsById] = useState<RoomsMap>(initialRooms);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/ha/rooms", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { rooms: Array<{ id: string } & RoomState> };
      const next: RoomsMap = {};
      for (const r of data.rooms) {
        next[r.id] = {
          lightOn: r.lightOn,
          brightness: r.brightness,
          supportsBrightness: r.supportsBrightness,
          temperatureC: r.temperatureC,
        };
      }
      setRoomsById(next);
    } catch {
      // ignore — next tick will retry
    }
  }, []);

  useEffect(() => {
    const id = setInterval(refresh, 10_000);
    return () => clearInterval(id);
  }, [refresh]);

  return (
    <div className="rooms-grid">
      {SECTIONS.map((section) => {
        const rooms = ROOMS.filter((r) => r.section === section);
        return (
          <section key={section} className="rooms-section">
            <div className="caps rooms-section-label">{SECTION_LABELS[section]}</div>
            <div className="rooms-row">
              {rooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  initial={roomsById[room.id] ?? EMPTY_STATE}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

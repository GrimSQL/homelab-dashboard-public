"use client";
import { useEffect, useState } from "react";

const pad = (n: number) => String(n).padStart(2, "0");

export function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!now) {
    return { dateStr: "", timeStr: "" };
  }
  return {
    dateStr: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    timeStr: `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
  };
}

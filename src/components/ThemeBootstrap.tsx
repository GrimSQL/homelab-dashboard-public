"use client";
import { useEffect } from "react";
import { useTweaks } from "@/lib/tweaks";

export function ThemeBootstrap() {
  useEffect(() => {
    useTweaks.getState().hydrate();
  }, []);
  return null;
}

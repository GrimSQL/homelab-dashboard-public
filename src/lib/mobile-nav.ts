"use client";
import { create } from "zustand";

type State = {
  open: boolean;
  openNav: () => void;
  closeNav: () => void;
  toggleNav: () => void;
};

export const useMobileNav = create<State>((set) => ({
  open: false,
  openNav: () => set({ open: true }),
  closeNav: () => set({ open: false }),
  toggleNav: () => set((s) => ({ open: !s.open })),
}));

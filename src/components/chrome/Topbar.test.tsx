import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
  signIn: vi.fn(),
  useSession: () => ({ data: null, status: "unauthenticated" }),
}));

import { Topbar } from "./Topbar";
import { useTweaks, TWEAK_DEFAULTS } from "@/lib/tweaks";

beforeEach(() => {
  localStorage.clear();
  useTweaks.setState(TWEAK_DEFAULTS, true);
  document.documentElement.className = "";
  document.documentElement.style.cssText = "";
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-04-18T10:00:00"));
});

describe("Topbar", () => {
  it("renders domain + page label in crumbs", () => {
    render(<Topbar active="services" />);
    expect(screen.getByText("homelab.example.com")).toBeInTheDocument();
    expect(screen.getByText("Services")).toBeInTheDocument();
  });

  it("renders ONLINE pill with time", () => {
    render(<Topbar active="overview" />);
    expect(screen.getByText(/ONLINE · 10:00:00/)).toBeInTheDocument();
  });

  it("renders date in ISO form", () => {
    render(<Topbar active="overview" />);
    expect(screen.getByText("2026-04-18")).toBeInTheDocument();
  });

  it("clicking theme button updates the tweaks store", () => {
    render(<Topbar active="overview" />);
    fireEvent.click(screen.getByTitle("Light"));
    expect(useTweaks.getState().theme).toBe("light");
  });

  it("applies .on class to the active theme button", () => {
    render(<Topbar active="overview" />);
    const darkButton = screen.getByTitle("Dark");
    expect(darkButton).toHaveClass("on");
  });

  it("renders signout button when a user is provided", () => {
    render(<Topbar active="overview" user={{ email: "a@b.se", role: "admin" }} />);
    expect(screen.getByRole("button", { name: /signout/i })).toBeInTheDocument();
  });

  it("hides signout button when no user is provided", () => {
    render(<Topbar active="overview" />);
    expect(screen.queryByRole("button", { name: /signout/i })).toBeNull();
  });
});

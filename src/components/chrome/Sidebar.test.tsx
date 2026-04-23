import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Sidebar } from "./Sidebar";
import type { HomelabMeta } from "@/lib/data/types";

vi.mock("next/link", () => ({
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) =>
    <a href={href} className={className}>{children}</a>,
}));

describe("Sidebar", () => {
  const meta: HomelabMeta = {
    title: "homelab.example.com",
    tagline: "Running a data center from the laundry room",
    owner: "Admin",
    location: "Test",
    publicIp: "0.0.0.0",
    isp: "Test ISP",
    uptimeSinceISO: "2025-01-01T00:00:00Z",
    generatedAt: "2026-04-01T00:00:00Z",
  };

  it("renders brand", () => {
    render(<Sidebar active="overview" meta={meta} containerCount={42} />);
    expect(screen.getByText("homelab")).toBeInTheDocument();
    expect(screen.getByText(".example")).toBeInTheDocument();
    expect(screen.getByText("S")).toBeInTheDocument();
  });

  it("marks active nav link with .active class", () => {
    const { container } = render(<Sidebar active="services" meta={meta} containerCount={42} />);
    const active = container.querySelector("a.active");
    expect(active?.textContent).toContain("Services");
  });

  it("only one link has the active class at a time", () => {
    const { container } = render(<Sidebar active="services" meta={meta} containerCount={42} />);
    const active = container.querySelectorAll("a.active");
    expect(active.length).toBe(1);
  });

  it("shows container count in foot", () => {
    render(<Sidebar active="overview" meta={meta} containerCount={42} />);
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("shows operator name in foot", () => {
    render(<Sidebar active="overview" meta={meta} containerCount={42} />);
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("renders all 17 nav items for a non-admin user", () => {
    const { container } = render(<Sidebar active="overview" meta={meta} containerCount={42} role="user" />);
    expect(container.querySelectorAll(".nav a").length).toBe(17);
  });

  it("renders admin section (20 items total) when role is admin", () => {
    const { container } = render(<Sidebar active="overview" meta={meta} containerCount={42} role="admin" />);
    expect(container.querySelectorAll(".nav a").length).toBe(20);
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("Invites")).toBeInTheDocument();
    // Note: two nav items are labelled "Projects" — the public Docs/Projects
    // and the admin-only Manage Projects. getAllByText covers both.
    expect(screen.getAllByText("Projects").length).toBeGreaterThanOrEqual(2);
  });

  it("hides admin section when role is missing", () => {
    const { container } = render(<Sidebar active="overview" meta={meta} containerCount={42} />);
    expect(container.querySelectorAll(".nav a").length).toBe(17);
    expect(screen.queryByText("Users")).toBeNull();
  });
});

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StatusDot } from "./StatusDot";
import { KPI } from "./KPI";
import { Panel } from "./Panel";
import { SectionHeader } from "./SectionHeader";

describe("StatusDot", () => {
  it("renders OK label for s=ok", () => {
    render(<StatusDot s="ok" />);
    expect(screen.getByText("OK")).toBeInTheDocument();
  });
  it("renders WARN label for s=warn", () => {
    render(<StatusDot s="warn" />);
    expect(screen.getByText("WARN")).toBeInTheDocument();
  });
  it("renders DEGRADED label for s=deg", () => {
    render(<StatusDot s="deg" />);
    expect(screen.getByText("DEGRADED")).toBeInTheDocument();
  });
  it("renders DOWN label for s=err", () => {
    render(<StatusDot s="err" />);
    expect(screen.getByText("DOWN")).toBeInTheDocument();
  });
  it("applies warn class for s=warn", () => {
    const { container } = render(<StatusDot s="warn" />);
    expect(container.firstChild).toHaveClass("status", "warn");
  });
  it("applies warn class for s=deg (shares visual with warn)", () => {
    const { container } = render(<StatusDot s="deg" />);
    expect(container.firstChild).toHaveClass("status", "warn");
  });
  it("applies err class for s=err", () => {
    const { container } = render(<StatusDot s="err" />);
    expect(container.firstChild).toHaveClass("status", "err");
  });
  it("uses custom label when provided", () => {
    render(<StatusDot s="ok" label="RUNNING" />);
    expect(screen.getByText("RUNNING")).toBeInTheDocument();
  });
});

describe("KPI", () => {
  it("shows label, value, unit, trend", () => {
    render(<KPI label="UPTIME" value="42" unit="d" trend="+1d" />);
    expect(screen.getByText("UPTIME")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("d")).toBeInTheDocument();
    expect(screen.getByText("+1d")).toBeInTheDocument();
  });
  it("renders sparkline when spark prop given", () => {
    const { container } = render(<KPI label="L" value="1" spark={[1, 2, 3]} />);
    expect(container.querySelector("svg")).toBeTruthy();
  });
  it("does not render sparkline when spark absent", () => {
    const { container } = render(<KPI label="L" value="1" />);
    expect(container.querySelector("svg")).toBeFalsy();
  });
});

describe("Panel", () => {
  it("renders title + meta", () => {
    render(<Panel title="T" meta="m">x</Panel>);
    expect(screen.getByText("T")).toBeInTheDocument();
    expect(screen.getByText("m")).toBeInTheDocument();
  });
  it("applies flush class when flush=true", () => {
    const { container } = render(<Panel flush>x</Panel>);
    expect(container.firstChild).toHaveClass("flush");
  });
  it("renders children regardless of head presence", () => {
    render(<Panel>hello</Panel>);
    expect(screen.getByText("hello")).toBeInTheDocument();
  });
  it("omits panel-head when no title/head/meta provided", () => {
    const { container } = render(<Panel>x</Panel>);
    expect(container.querySelector(".panel-head")).toBeNull();
  });
});

describe("SectionHeader", () => {
  it("renders num + title + sub", () => {
    render(<SectionHeader num="01" title="Dashboard" sub="Morning view" />);
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Morning view")).toBeInTheDocument();
  });
  it("omits sub paragraph when sub is undefined", () => {
    const { container } = render(<SectionHeader num="02" title="Status" />);
    expect(container.querySelector(".section-sub")).toBeNull();
  });
});

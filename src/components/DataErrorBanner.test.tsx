import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { DataErrorBanner } from "./DataErrorBanner";

describe("DataErrorBanner", () => {
  it("renders nothing when all sources are ok", () => {
    const { container } = render(
      <DataErrorBanner sources={{ ha: "ok", pve: "ok", portainer: "ok" }} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when sources are skipped (not configured)", () => {
    const { container } = render(
      <DataErrorBanner sources={{ ha: "skipped", pve: "ok", portainer: "skipped" }} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders singular 'SOURCE OFFLINE' when one source failed", () => {
    const { getByRole, getByText } = render(
      <DataErrorBanner sources={{ ha: "fail", pve: "ok", portainer: "ok" }} />,
    );
    expect(getByRole("status")).toBeInTheDocument();
    expect(getByText(/SOURCE OFFLINE/)).toBeInTheDocument();
    expect(getByText(/HA/)).toBeInTheDocument();
  });

  it("renders plural 'SOURCES OFFLINE' when multiple failed", () => {
    const { getByText } = render(
      <DataErrorBanner sources={{ ha: "fail", pve: "fail", portainer: "ok" }} />,
    );
    expect(getByText(/SOURCES OFFLINE/)).toBeInTheDocument();
    expect(getByText(/HA, PVE/)).toBeInTheDocument();
  });

  it("renders INITIALIZING banner when a source is 'never'", () => {
    const { getByText } = render(
      <DataErrorBanner sources={{ ha: "never", pve: "ok", portainer: "ok" }} />,
    );
    expect(getByText(/INITIALIZING/)).toBeInTheDocument();
    expect(getByText(/HA/)).toBeInTheDocument();
    expect(getByText(/warming up cache/)).toBeInTheDocument();
  });

  it("shows OFFLINE (not INITIALIZING) when both fail and never coexist", () => {
    const { getByText, queryByText } = render(
      <DataErrorBanner sources={{ ha: "fail", pve: "never", portainer: "ok" }} />,
    );
    expect(getByText(/SOURCE OFFLINE/)).toBeInTheDocument();
    expect(queryByText(/INITIALIZING/)).toBeNull();
  });
});

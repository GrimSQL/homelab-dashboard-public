import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Sparkline } from "./Sparkline";

describe("Sparkline", () => {
  it("renders two paths (fill + stroke) when fill=true (default)", () => {
    const { container } = render(<Sparkline values={[1, 2, 3, 4]} />);
    expect(container.querySelectorAll("path").length).toBe(2);
  });
  it("renders one path (stroke only) when fill=false", () => {
    const { container } = render(<Sparkline values={[1, 2, 3, 4]} fill={false} />);
    expect(container.querySelectorAll("path").length).toBe(1);
  });
  it("uses non-scaling-stroke vector effect on stroke path", () => {
    const { container } = render(<Sparkline values={[1, 2]} />);
    const stroke = container.querySelector("path[stroke]");
    expect(stroke?.getAttribute("vector-effect")).toBe("non-scaling-stroke");
  });
  it("respects custom color prop", () => {
    const { container } = render(<Sparkline values={[1, 2]} color="red" />);
    const stroke = container.querySelector("path[stroke]");
    expect(stroke?.getAttribute("stroke")).toBe("red");
  });
});

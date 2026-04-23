import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import "../app/globals.css";

describe("globals.css", () => {
  it("loads without throwing", () => {
    const { container } = render(<div className="caps">hello</div>);
    expect(container.querySelector(".caps")).toBeTruthy();
  });
});

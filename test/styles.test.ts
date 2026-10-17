import { describe, it, expect } from "vitest";
import { styles } from "../src/styles";

describe("styles", () => {
  it("segments wrap instead of clipping on narrow screens", () => {
    const css = styles.cssText.replace(/\s+/g, " ");
    expect(css).toMatch(/\.seg \{[^}]*flex-wrap: wrap/);
    expect(css).toMatch(/\.seg div \{[^}]*min-width: 0/);
  });
});

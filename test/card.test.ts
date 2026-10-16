import { describe, it, expect } from "vitest";
import "../src/robot-vacuum-duo-card";

const make = () => document.createElement("robot-vacuum-duo-card") as HTMLElement & { setConfig(c: unknown): void };

describe("card", () => {
  it("registers the custom element and rejects a config without robots", () => {
    expect(customElements.get("robot-vacuum-duo-card")).toBeDefined();
    expect(() => make().setConfig({ robots: [] })).toThrow("robots: hace falta al menos un robot");
    expect(() => make().setConfig({})).toThrow("robots: hace falta al menos un robot");
    expect(() => make().setConfig({ robots: [{ name: "S7" }] })).toThrow("robots[0].vacuum es obligatorio");
  });
});

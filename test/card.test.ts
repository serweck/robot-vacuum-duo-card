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

describe("config validation (final review)", () => {
  const ok = { name: "S7", vacuum: "vacuum.s7" };
  it("requires the robot name", () => {
    expect(() => make().setConfig({ robots: [{ vacuum: "vacuum.s7" }] })).toThrow("robots[0].name es obligatorio");
  });
  it("requires a name for each error and consumable", () => {
    expect(() => make().setConfig({ robots: [{ ...ok, errors: [{ entity: "sensor.e" }] }] })).toThrow("robots[0].errors[0].name es obligatorio");
    expect(() => make().setConfig({ robots: [{ ...ok, consumables: [{ entity: "sensor.c" }] }] })).toThrow("robots[0].consumables[0].name es obligatorio");
  });
});

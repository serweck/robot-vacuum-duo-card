import { describe, it, expect } from "vitest";
import { primaryAction, returnHome, pressRoutine, selectOption, setFanSpeed, toggleLock } from "../src/actions";
import { buildRobotView } from "../src/model";
import { makeHass, st, cleaningS7, S7_CONFIG, NOW } from "./fixtures";

const V = "vacuum.s7_max_ultra";

describe("actions", () => {
  it("primary action follows vacuum state", () => {
    expect(primaryAction(buildRobotView(makeHass(cleaningS7()), S7_CONFIG, NOW), V)).toEqual({ domain: "vacuum", service: "pause", data: { entity_id: V } });
    const attrs = makeHass().states[V].attributes;
    for (const s of ["docked", "idle", "paused", "returning"]) {
      const view = buildRobotView(makeHass({ [V]: st(s, attrs) }), S7_CONFIG, NOW);
      expect(primaryAction(view, V)).toEqual({ domain: "vacuum", service: "start", data: { entity_id: V } });
    }
  });

  it("return home", () => {
    expect(returnHome(V)).toEqual({ domain: "vacuum", service: "return_to_base", data: { entity_id: V } });
  });

  it("press routine", () => {
    expect(pressRoutine("button.x_cocina")).toEqual({ domain: "button", service: "press", data: { entity_id: "button.x_cocina" } });
  });

  it("select option", () => {
    expect(selectOption("select.m", "mop")).toEqual({ domain: "select", service: "select_option", data: { entity_id: "select.m", option: "mop" } });
  });

  it("set fan speed", () => {
    expect(setFanSpeed(V, "turbo")).toEqual({ domain: "vacuum", service: "set_fan_speed", data: { entity_id: V, fan_speed: "turbo" } });
  });

  it("toggle lock", () => {
    expect(toggleLock("input_boolean.l")).toEqual({ domain: "input_boolean", service: "toggle", data: { entity_id: "input_boolean.l" } });
  });
});

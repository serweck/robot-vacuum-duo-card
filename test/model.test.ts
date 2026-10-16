import { describe, it, expect } from "vitest";
import { buildRobotView, labelForOption, formatWhen } from "../src/model";
import { makeHass, cleaningS7, st, S7_CONFIG, QR_CONFIG, NOW } from "./fixtures";

describe("model", () => {
  it("cleaning robot shows room, progress and mode", () => {
    const v = buildRobotView(makeHass(cleaningS7()), S7_CONFIG, NOW);
    expect(v.cleaning).toBe(true);
    expect(v.progress).toBe(45);
    expect(v.battery).toBe(78);
    expect(v.room).toBe("Pasillo");
    expect(v.statusText).toBe("Limpiando Pasillo · 45 % · Las dos");
  });

  it("docked robot shows last clean", () => {
    const v = buildRobotView(makeHass(), QR_CONFIG, NOW);
    expect(v.cleaning).toBe(false);
    expect(v.statusText).toBe("En la base · última limpieza 14/10 19:24");
    const s7 = buildRobotView(makeHass(), S7_CONFIG, NOW);
    expect(s7.statusText).toBe("En la base · última limpieza ayer 15:57");
  });

  it("other vacuum states are translated", () => {
    const attrs = makeHass().states["vacuum.s7_max_ultra"].attributes;
    for (const [state, text] of [["returning", "Volviendo a la base"], ["paused", "En pausa"], ["error", "Error"], ["idle", "Parado"]]) {
      const v = buildRobotView(makeHass({ "vacuum.s7_max_ultra": st(state, attrs) }), S7_CONFIG, NOW);
      expect(v.statusText).toBe(text);
    }
  });

  it("fan speed list drops off and custom", () => {
    const v = buildRobotView(makeHass(), QR_CONFIG, NOW);
    expect(v.fanSpeed?.current).toBe("max");
    expect(v.fanSpeed?.options.map((o) => o.value)).toEqual(["quiet", "balanced", "turbo", "max", "max_plus", "smart_mode"]);
    expect(v.fanSpeed?.options.map((o) => o.label)).toEqual(["Silencio", "Normal", "Turbo", "Máx.", "Máx.+", "Inteligente"]);
  });

  it("select options hide app-only custom values unless they are current", () => {
    const v = buildRobotView(makeHass(), QR_CONFIG, NOW);
    expect(v.mode?.options.map((o) => o.label)).toEqual(["Aspirar", "Las dos", "Fregar", "Inteligente"]);
    expect(v.mopIntensity?.options.map((o) => o.value)).toEqual(["off", "low", "medium", "high", "smart_mode"]);
    const custom = buildRobotView(makeHass({ "select.roborock_qrevo_edge_series_modo_de_limpieza": st("custom", { options: ["vacuum", "custom"] }) }), QR_CONFIG, NOW);
    expect(custom.mode?.options.map((o) => o.value)).toEqual(["vacuum", "custom"]);
  });

  it("unknown select options keep their raw label", () => {
    expect(labelForOption("deep_plus")).toBe("deep_plus");
    expect(labelForOption("mild")).toBe("Suave");
    expect(labelForOption("intense")).toBe("Intensa");
  });

  it("missing and unavailable entities render nothing, never throw", () => {
    const bare = buildRobotView(makeHass(), { name: "Solo", vacuum: "vacuum.no_existe" }, NOW);
    expect(bare.battery).toBeNull();
    expect(bare.mode).toBeNull();
    expect(bare.fanSpeed).toBeNull();
    expect(bare.statusText).toBe("No disponible");
    const unav = buildRobotView(makeHass({ "sensor.s7_max_ultra_bateria": st("unavailable") }), S7_CONFIG, NOW);
    expect(unav.battery).toBeNull();
  });

  it("unavailable routine buttons are listed but flagged", () => {
    const s7 = buildRobotView(makeHass(), S7_CONFIG, NOW);
    expect(s7.routines).toEqual([{ entity: "button.s7_max_ultra_cocina_full", name: "Cocina full", available: false }]);
    const qr = buildRobotView(makeHass(), QR_CONFIG, NOW);
    expect(qr.routines).toEqual([{ entity: "button.roborock_qrevo_edge_series_cocina", name: "Cocina", available: true }]);
  });

  it("formats dates relative to now in Madrid time", () => {
    expect(formatWhen(new Date("2026-10-16T08:05:00Z"), NOW, "Europe/Madrid")).toBe("hoy 10:05");
    expect(formatWhen(new Date("2026-10-15T13:57:25Z"), NOW, "Europe/Madrid")).toBe("ayer 15:57");
    expect(formatWhen(new Date("2026-10-14T17:24:26Z"), NOW, "Europe/Madrid")).toBe("14/10 19:24");
  });
});

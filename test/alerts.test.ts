import { describe, it, expect } from "vitest";
import { errorAlerts, maintenanceAlerts, maintenanceSummary } from "../src/alerts";
import { makeHass, st, S7_CONFIG, QR_CONFIG } from "./fixtures";

const robots = [S7_CONFIG, QR_CONFIG];

describe("alerts", () => {
  it("today's data gives 8 maintenance alerts, worst first", () => {
    const a = maintenanceAlerts(makeHass(), robots);
    expect(a).toHaveLength(8);
    expect(a[0]).toMatchObject({ kind: "maintenance", robot: "S7 Max Ultra", label: "Sensores", value: -201 });
    expect(a.map((x) => x.value)).toEqual([-201, -157, -107, -63, -39, -25, -7, -3]);
    expect(a.filter((x) => x.robot === "Qrevo Edge").map((x) => x.label)).toEqual(["Colador base", "Sensores"]);
  });

  it("threshold is inclusive and configurable", () => {
    const at = (v: string) => maintenanceAlerts(makeHass({ "sensor.roborock_qrevo_edge_series_tiempo_restante_del_filtro": st(v) }), [QR_CONFIG]);
    expect(at("10").map((x) => x.label)).toContain("Filtro");
    expect(at("10.5").map((x) => x.label)).not.toContain("Filtro");
    expect(maintenanceAlerts(makeHass(), [QR_CONFIG], 100).map((x) => x.label)).toContain("Filtro");
  });

  it("non-numeric consumables are ignored", () => {
    const h = makeHass({
      "sensor.s7_max_ultra_tiempo_restante_del_filtro": st("unavailable"),
      "sensor.s7_max_ultra_tiempo_restante_del_sensor": st(""),
      "sensor.s7_max_ultra_tiempo_restante_del_cepillo_lateral": st("abc"),
    });
    expect(maintenanceAlerts(h, [S7_CONFIG]).map((x) => x.label)).toEqual(["Cepillo base", "Cepillo principal", "Colador base"]);
  });

  it("none/ok/unknown/unavailable are not errors", () => {
    for (const v of ["none", "ok", "unknown", "unavailable"]) {
      const h = makeHass({ "sensor.s7_max_ultra_error_en_la_base": st(v) });
      expect(errorAlerts(h, robots)).toEqual([]);
    }
  });

  it("water_empty is translated, other codes stay raw", () => {
    expect(errorAlerts(makeHass(), robots)).toEqual([
      { kind: "error", robot: "S7 Max Ultra", label: "Base", text: "S7 Max Ultra · Base: depósito de agua limpia vacío" },
    ]);
    const h = makeHass({ "sensor.roborock_qrevo_edge_series_error_de_aspirador": st("bumper_stuck") });
    expect(errorAlerts(h, robots).map((x) => x.text)).toContain("Qrevo Edge · Robot: bumper_stuck");
  });

  it("summary text matches the mockup", () => {
    const names = robots.map((r) => r.name);
    expect(maintenanceSummary(maintenanceAlerts(makeHass(), robots), names)).toBe("8 piezas para cambiar (6 del S7 Max Ultra, 2 del Qrevo Edge)");
    expect(maintenanceSummary(maintenanceAlerts(makeHass(), [QR_CONFIG]).slice(0, 1), ["Qrevo Edge"])).toBe("1 pieza para cambiar");
    expect(maintenanceSummary([], names)).toBe("");
  });
});

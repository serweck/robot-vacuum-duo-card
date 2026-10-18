import { describe, it, expect } from "vitest";
import { errorAlerts, maintenanceAlerts, shortError } from "../src/alerts";
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
      { kind: "error", robot: "S7 Max Ultra", label: "Base", text: "S7 Max Ultra · Base: depósito de agua limpia vacío",
        short: "sin agua", detail: "Base: depósito de agua limpia vacío" },
    ]);
    const h = makeHass({ "sensor.roborock_qrevo_edge_series_error_de_aspirador": st("bumper_stuck") });
    expect(errorAlerts(h, robots).map((x) => x.text)).toContain("Qrevo Edge · Robot: bumper_stuck");
  });

  it("short error label for the robot row", () => {
    expect(shortError("water_empty")).toBe("sin agua");
    expect(shortError("waste_water_tank_full")).toBe("agua sucia llena");
    expect(shortError("main_brush_jammed")).toBe("cepillo atascado");
    expect(shortError("algo_nuevo")).toBe("error");
  });

  it("error alerts carry the short label and the detail without the robot name", () => {
    const [e] = errorAlerts(makeHass(), robots);
    expect(e).toMatchObject({ short: "sin agua", detail: "Base: depósito de agua limpia vacío" });
  });
  it("problem binary sensors alert when on, connectivity ones when off", () => {
    const qrBin = {
      ...QR_CONFIG,
      errors: [
        ...(QR_CONFIG.errors ?? []),
        { entity: "binary_sensor.roborock_qrevo_edge_series_dock_caja_de_agua_limpia", name: "Base sin agua limpia", short: "sin agua" },
        { entity: "binary_sensor.roborock_qrevo_edge_series_escasez_de_agua", name: "Robot sin agua" },
        { entity: "binary_sensor.roborock_qrevo_edge_series_mopa_acoplada", name: "Mopa sin acoplar", short: "sin mopa" },
      ],
    };
    const ok = makeHass({
      "binary_sensor.roborock_qrevo_edge_series_dock_caja_de_agua_limpia": st("off", { device_class: "problem" }),
      "binary_sensor.roborock_qrevo_edge_series_escasez_de_agua": st("off", { device_class: "problem" }),
      "binary_sensor.roborock_qrevo_edge_series_mopa_acoplada": st("on", { device_class: "connectivity" }),
    });
    expect(errorAlerts(ok, [qrBin])).toEqual([]);

    const bad = makeHass({
      "binary_sensor.roborock_qrevo_edge_series_dock_caja_de_agua_limpia": st("on", { device_class: "problem" }),
      "binary_sensor.roborock_qrevo_edge_series_escasez_de_agua": st("on", { device_class: "problem" }),
      "binary_sensor.roborock_qrevo_edge_series_mopa_acoplada": st("off", { device_class: "connectivity" }),
    });
    expect(errorAlerts(bad, [qrBin])).toEqual([
      { kind: "error", robot: "Qrevo Edge", label: "Base sin agua limpia", text: "Qrevo Edge · Base sin agua limpia",
        short: "sin agua", detail: "Base sin agua limpia" },
      { kind: "error", robot: "Qrevo Edge", label: "Robot sin agua", text: "Qrevo Edge · Robot sin agua",
        short: "robot sin agua", detail: "Robot sin agua" },
      { kind: "error", robot: "Qrevo Edge", label: "Mopa sin acoplar", text: "Qrevo Edge · Mopa sin acoplar",
        short: "sin mopa", detail: "Mopa sin acoplar" },
    ]);
  });

  it("unavailable binary sensors are not errors", () => {
    const cfg = { ...QR_CONFIG, errors: [{ entity: "binary_sensor.roborock_qrevo_edge_series_mopa_acoplada", name: "Mopa sin acoplar" }] };
    for (const v of ["unknown", "unavailable"]) {
      const h = makeHass({ "binary_sensor.roborock_qrevo_edge_series_mopa_acoplada": st(v, { device_class: "connectivity" }) });
      expect(errorAlerts(h, [cfg])).toEqual([]);
    }
  });
});

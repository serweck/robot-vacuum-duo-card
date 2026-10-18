import type { HomeAssistant } from "custom-card-helpers";
import type { Alert, RobotConfig } from "./types";

export const DEFAULT_THRESHOLD = 10;

const NOT_AN_ERROR = new Set(["none", "ok", "unknown", "unavailable", ""]);

const ERROR_TEXT: Record<string, string> = {
  water_empty: "depósito de agua limpia vacío",
  waste_water_tank_full: "depósito de agua sucia lleno",
  no_dustbin: "falta el depósito de polvo",
  no_dustbin_or_filter: "falta el depósito de polvo o el filtro",
  duct_blockage: "conducto atascado",
  maintenance_brush_jammed: "cepillo de mantenimiento atascado",
  dirty_tank_latch_open: "cierre del depósito sucio abierto",
  cleaning_tank_full_or_blocked: "depósito de limpieza lleno o atascado",
};

const ERROR_SHORT: Record<string, string> = {
  water_empty: "sin agua",
  waste_water_tank_full: "agua sucia llena",
  no_dustbin: "sin depósito",
  no_dustbin_or_filter: "sin depósito",
  duct_blockage: "atascado",
  maintenance_brush_jammed: "cepillo atascado",
  dirty_tank_latch_open: "depósito abierto",
  cleaning_tank_full_or_blocked: "depósito lleno",
  main_brush_jammed: "cepillo atascado",
  side_brush_jammed: "cepillo atascado",
  wheels_jammed: "ruedas atascadas",
  wheels_suspended: "ruedas en el aire",
  robot_trapped: "atrapado",
  bumper_stuck: "parachoques",
  low_battery: "batería baja",
  filter_blocked: "filtro atascado",
};

/** Etiqueta corta para la fila del robot; «error» si el código no está traducido. */
export function shortError(state: string): string {
  return ERROR_SHORT[state] ?? "error";
}

export function errorAlerts(hass: HomeAssistant, robots: RobotConfig[]): Alert[] {
  const out: Alert[] = [];
  for (const robot of robots) {
    for (const err of robot.errors ?? []) {
      const entity = hass.states[err.entity];
      const state = entity?.state ?? "";
      if (NOT_AN_ERROR.has(state)) continue;
      if (err.entity.startsWith("binary_sensor.")) {
        // «problem» avisa encendido; «connectivity» (mopa, depósito acoplado) avisa apagado.
        const bad = entity?.attributes?.device_class === "connectivity" ? "off" : "on";
        if (state !== bad) continue;
        out.push({ kind: "error", robot: robot.name, label: err.name, text: `${robot.name} · ${err.name}`,
          short: err.short ?? err.name.toLowerCase(), detail: err.name });
        continue;
      }
      const detail = `${err.name}: ${ERROR_TEXT[state] ?? state}`;
      out.push({ kind: "error", robot: robot.name, label: err.name, text: `${robot.name} · ${detail}`, short: shortError(state), detail });
    }
  }
  return out;
}

export function maintenanceAlerts(hass: HomeAssistant, robots: RobotConfig[], threshold = DEFAULT_THRESHOLD): Alert[] {
  const found: { alert: Alert; raw: number }[] = [];
  for (const robot of robots) {
    for (const c of robot.consumables ?? []) {
      const raw = Number.parseFloat(hass.states[c.entity]?.state ?? "");
      if (!Number.isFinite(raw) || raw > threshold) continue;
      const value = Math.round(raw);
      found.push({
        raw,
        alert: { kind: "maintenance", robot: robot.name, label: c.name, value, text: `${robot.name} · ${c.name} ${value} h` },
      });
    }
  }
  return found.sort((a, b) => a.raw - b.raw).map((f) => f.alert);
}

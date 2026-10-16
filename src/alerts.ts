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

export function errorAlerts(hass: HomeAssistant, robots: RobotConfig[]): Alert[] {
  const out: Alert[] = [];
  for (const robot of robots) {
    for (const err of robot.errors ?? []) {
      const state = hass.states[err.entity]?.state ?? "";
      if (NOT_AN_ERROR.has(state)) continue;
      out.push({
        kind: "error",
        robot: robot.name,
        label: err.name,
        text: `${robot.name} · ${err.name}: ${ERROR_TEXT[state] ?? state}`,
      });
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

export function maintenanceSummary(alerts: Alert[], robotNames: string[]): string {
  if (!alerts.length) return "";
  const head = alerts.length === 1 ? "1 pieza para cambiar" : `${alerts.length} piezas para cambiar`;
  const per = robotNames
    .map((name) => [name, alerts.filter((a) => a.robot === name).length] as const)
    .filter(([, n]) => n > 0);
  return per.length > 1 ? `${head} (${per.map(([name, n]) => `${n} del ${name}`).join(", ")})` : head;
}

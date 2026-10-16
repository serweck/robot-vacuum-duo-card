import type { HomeAssistant } from "custom-card-helpers";
import type { CardConfig, RobotConfig } from "../src/types";

type Attrs = Record<string, unknown>;
const st = (state: string, attributes: Attrs = {}) => ({ state, attributes, last_changed: "", last_updated: "" });

const S7 = "s7_max_ultra";
const QR = "roborock_qrevo_edge_series";

/** Estados reales del 16-oct (con el S7 en la base). */
export function baseStates(): Record<string, ReturnType<typeof st>> {
  return {
    [`vacuum.${S7}`]: st("docked", {
      friendly_name: "S7 Max Ultra", fan_speed: "max",
      fan_speed_list: ["quiet", "balanced", "turbo", "max", "max_plus", "off", "custom"],
    }),
    [`vacuum.${QR}`]: st("docked", {
      friendly_name: "Roborock Qrevo Edge Series", fan_speed: "max",
      fan_speed_list: ["quiet", "balanced", "turbo", "max", "max_plus", "off", "smart_mode", "custom"],
    }),
    [`sensor.${S7}_bateria`]: st("100", { unit_of_measurement: "%" }),
    [`sensor.${QR}_bateria`]: st("100", { unit_of_measurement: "%" }),
    [`sensor.${S7}_estado`]: st("charging"),
    [`sensor.${QR}_estado`]: st("charging"),
    [`sensor.${S7}_habitacion_actual`]: st("Pasillo"),
    [`sensor.${QR}_habitacion_actual`]: st("Salón"),
    [`sensor.${S7}_progreso_de_la_limpieza`]: st("0", { unit_of_measurement: "%" }),
    [`sensor.${QR}_progreso_de_la_limpieza`]: st("0", { unit_of_measurement: "%" }),
    [`sensor.${S7}_finalizacion_de_la_ultima_limpieza`]: st("2026-10-15T13:57:25+00:00"),
    [`sensor.${QR}_finalizacion_de_la_ultima_limpieza`]: st("2026-10-14T17:24:26+00:00"),
    [`select.salon_${S7}_modo_de_limpieza`]: st("vac_and_mop", { options: ["vacuum", "vac_and_mop", "mop", "custom"] }),
    [`select.${QR}_modo_de_limpieza`]: st("vac_and_mop", { options: ["vacuum", "vac_and_mop", "mop", "custom", "smart_mode"] }),
    [`select.${S7}_intensidad_de_la_mopa`]: st("standard", { options: ["off", "mild", "standard", "intense", "custom"] }),
    [`select.${QR}_intensidad_de_la_mopa`]: st("high", {
      options: ["off", "low", "medium", "high", "custom_water_flow", "smart_mode", "custom"],
    }),
    [`button.${S7}_cocina_full`]: st("unavailable", { friendly_name: "S7 Max Ultra Cocina full" }),
    [`button.${QR}_cocina`]: st("unknown", { friendly_name: "Roborock Qrevo Edge Series Cocina" }),
    [`sensor.${S7}_error_de_aspirador`]: st("none"),
    [`sensor.${S7}_error_en_la_base`]: st("water_empty"),
    [`sensor.${QR}_error_de_aspirador`]: st("none"),
    [`sensor.${QR}_dock_error_en_la_base`]: st("ok"),
    [`sensor.${S7}_tiempo_restante_del_cepillo_principal`]: st("-6.66527777777778"),
    [`sensor.${S7}_tiempo_restante_del_cepillo_lateral`]: st("-106.665277777778"),
    [`sensor.${S7}_tiempo_restante_del_filtro`]: st("-156.665277777778"),
    [`sensor.${S7}_tiempo_restante_del_sensor`]: st("-201.079722222222"),
    [`sensor.${S7}_dock_tiempo_restante_del_colador`]: st("-3"),
    [`sensor.${S7}_dock_tiempo_restante_del_cepillo_de_mantenimiento`]: st("-25"),
    [`sensor.${QR}_tiempo_restante_del_cepillo_principal`]: st("231.327222222222"),
    [`sensor.${QR}_tiempo_restante_del_cepillo_lateral`]: st("131.134444444444"),
    [`sensor.${QR}_tiempo_restante_del_filtro`]: st("81.3272222222222"),
    [`sensor.${QR}_tiempo_restante_del_sensor`]: st("-38.8655555555556"),
    [`sensor.${QR}_dock_tiempo_restante_del_colador`]: st("-63"),
    "input_boolean.bloquear_limpieza_planta_baja": st("on", { friendly_name: "bloquear_limpieza_planta_baja" }),
  };
}

export function makeHass(overrides: Record<string, ReturnType<typeof st> | undefined> = {}, calls: unknown[] = []): HomeAssistant {
  const states = { ...baseStates(), ...overrides };
  for (const k of Object.keys(states)) if (states[k] === undefined) delete states[k];
  return {
    states,
    language: "es",
    config: { time_zone: "Europe/Madrid" },
    locale: { language: "es" },
    callService: (domain: string, service: string, data: unknown) => { calls.push({ domain, service, data }); return Promise.resolve(); },
  } as unknown as HomeAssistant;
}

/** El S7 limpiando el pasillo al 45 %. */
export function cleaningS7() {
  return {
    [`vacuum.${S7}`]: st("cleaning", baseStates()[`vacuum.${S7}`].attributes),
    [`sensor.${S7}_estado`]: st("cleaning"),
    [`sensor.${S7}_progreso_de_la_limpieza`]: st("45", { unit_of_measurement: "%" }),
    [`sensor.${S7}_bateria`]: st("78", { unit_of_measurement: "%" }),
  };
}

export { st };

const cons = (p: string, extra: [string, string][] = []) => [
  { entity: `sensor.${p}_tiempo_restante_del_cepillo_principal`, name: "Cepillo principal" },
  { entity: `sensor.${p}_tiempo_restante_del_cepillo_lateral`, name: "Cepillo lateral" },
  { entity: `sensor.${p}_tiempo_restante_del_filtro`, name: "Filtro" },
  { entity: `sensor.${p}_tiempo_restante_del_sensor`, name: "Sensores" },
  ...extra.map(([entity, name]) => ({ entity, name })),
];

export const S7_CONFIG: RobotConfig = {
  name: "S7 Max Ultra",
  vacuum: `vacuum.${S7}`,
  battery: `sensor.${S7}_bateria`,
  status: `sensor.${S7}_estado`,
  current_room: `sensor.${S7}_habitacion_actual`,
  progress: `sensor.${S7}_progreso_de_la_limpieza`,
  last_clean_end: `sensor.${S7}_finalizacion_de_la_ultima_limpieza`,
  mode: `select.salon_${S7}_modo_de_limpieza`,
  mop_intensity: `select.${S7}_intensidad_de_la_mopa`,
  errors: [
    { entity: `sensor.${S7}_error_de_aspirador`, name: "Robot" },
    { entity: `sensor.${S7}_error_en_la_base`, name: "Base" },
  ],
  routines: [`button.${S7}_cocina_full`],
  consumables: cons(S7, [
    [`sensor.${S7}_dock_tiempo_restante_del_colador`, "Colador base"],
    [`sensor.${S7}_dock_tiempo_restante_del_cepillo_de_mantenimiento`, "Cepillo base"],
  ]),
};

export const QR_CONFIG: RobotConfig = {
  name: "Qrevo Edge",
  vacuum: `vacuum.${QR}`,
  battery: `sensor.${QR}_bateria`,
  status: `sensor.${QR}_estado`,
  current_room: `sensor.${QR}_habitacion_actual`,
  progress: `sensor.${QR}_progreso_de_la_limpieza`,
  last_clean_end: `sensor.${QR}_finalizacion_de_la_ultima_limpieza`,
  mode: `select.${QR}_modo_de_limpieza`,
  mop_intensity: `select.${QR}_intensidad_de_la_mopa`,
  errors: [
    { entity: `sensor.${QR}_error_de_aspirador`, name: "Robot" },
    { entity: `sensor.${QR}_dock_error_en_la_base`, name: "Base" },
  ],
  routines: [`button.${QR}_cocina`],
  consumables: cons(QR, [[`sensor.${QR}_dock_tiempo_restante_del_colador`, "Colador base"]]),
};

export const CARD_CONFIG: CardConfig = {
  type: "custom:robot-vacuum-duo-card",
  title: "Robots",
  lock: "input_boolean.bloquear_limpieza_planta_baja",
  robots: [S7_CONFIG, QR_CONFIG],
};

/** 16-oct-2026 19:00 en Madrid. */
export const NOW = new Date("2026-10-16T17:00:00Z");

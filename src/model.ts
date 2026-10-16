import type { HomeAssistant } from "custom-card-helpers";
import type { RobotConfig, RobotView, SelectView, RoutineView } from "./types";

const LABELS: Record<string, string> = {
  // modo de limpieza
  vacuum: "Aspirar", mop: "Fregar", vac_and_mop: "Las dos",
  // aspiración
  quiet: "Silencio", balanced: "Normal", turbo: "Turbo", max: "Máx.", max_plus: "Máx.+", smart_mode: "Inteligente",
  // mopa
  off: "Apagada", mild: "Suave", low: "Baja", standard: "Estándar", moderate: "Estándar", medium: "Media",
  high: "Alta", intense: "Intensa", custom: "Personalizado", custom_water_flow: "Caudal propio",
};

const VACUUM_STATES: Record<string, string> = {
  returning: "Volviendo a la base", paused: "En pausa", error: "Error", idle: "Parado",
};

/** Valores que solo se configuran desde la app: no se ofrecen salvo que sean el actual. */
const APP_ONLY = new Set(["custom", "custom_water_flow"]);
const DEAD = new Set(["unavailable", "unknown", ""]);

export function labelForOption(value: string): string {
  return LABELS[value] ?? value;
}

function live(hass: HomeAssistant, entity?: string) {
  if (!entity) return undefined;
  const s = hass.states[entity];
  return s && !DEAD.has(s.state) ? s : undefined;
}

function num(hass: HomeAssistant, entity?: string): number | null {
  const s = live(hass, entity);
  if (!s) return null;
  const n = Number(s.state);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function selectView(entity: string, current: string, values: string[], drop: Set<string>): SelectView {
  const options = values
    .filter((v) => v === current || !drop.has(v))
    .map((value) => ({ value, label: labelForOption(value) }));
  return { entity, current, options };
}

function selectFromEntity(hass: HomeAssistant, entity?: string): SelectView | null {
  const s = live(hass, entity);
  const opts = s?.attributes?.options;
  if (!s || !Array.isArray(opts)) return null;
  return selectView(entity!, s.state, opts as string[], APP_ONLY);
}

function dayKey(d: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** «hoy 10:05», «ayer 15:57» o «14/10 19:24», en la zona horaria de HA. */
export function formatWhen(date: Date, now: Date, timeZone?: string): string {
  const time = new Intl.DateTimeFormat("es-ES", { timeZone, hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
  const today = dayKey(now, timeZone);
  const yesterday = dayKey(new Date(now.getTime() - 86_400_000), timeZone);
  const key = dayKey(date, timeZone);
  if (key === today) return `hoy ${time}`;
  if (key === yesterday) return `ayer ${time}`;
  const dm = new Intl.DateTimeFormat("es-ES", { timeZone, day: "2-digit", month: "2-digit" }).format(date);
  return `${dm} ${time}`;
}

function routineName(friendly: string | undefined, vacuumName: string | undefined, entity: string): string {
  let name = friendly ?? entity.split(".")[1];
  if (vacuumName && name.startsWith(vacuumName + " ")) name = name.slice(vacuumName.length + 1);
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function buildRobotView(hass: HomeAssistant, cfg: RobotConfig, now: Date = new Date()): RobotView {
  const tz = (hass as unknown as { config?: { time_zone?: string } }).config?.time_zone;
  const vac = live(hass, cfg.vacuum);
  const vacuumState = vac?.state ?? "unavailable";
  const cleaning = vacuumState === "cleaning";
  const vacName = hass.states[cfg.vacuum]?.attributes?.friendly_name as string | undefined;

  const speeds = vac?.attributes?.fan_speed_list;
  const fanSpeed = vac && Array.isArray(speeds)
    ? selectView(cfg.vacuum, String(vac.attributes.fan_speed ?? ""), speeds as string[], new Set(["off", "custom"]))
    : null;

  const mode = selectFromEntity(hass, cfg.mode);
  const room = live(hass, cfg.current_room)?.state ?? null;
  const progress = num(hass, cfg.progress);
  const endState = live(hass, cfg.last_clean_end)?.state;
  const lastCleanEnd = endState && !Number.isNaN(Date.parse(endState)) ? new Date(endState) : null;

  let statusText: string;
  if (!vac) statusText = "No disponible";
  else if (cleaning) {
    const parts = [room ? `Limpiando ${room}` : "Limpiando"];
    if (progress !== null) parts.push(`${progress} %`);
    if (mode) parts.push(labelForOption(mode.current));
    statusText = parts.join(" · ");
  } else if (vacuumState === "docked") {
    statusText = lastCleanEnd ? `En la base · última limpieza ${formatWhen(lastCleanEnd, now, tz)}` : "En la base";
  } else statusText = VACUUM_STATES[vacuumState] ?? vacuumState;

  const routines: RoutineView[] = (cfg.routines ?? []).map((entity) => {
    const s = hass.states[entity];
    return {
      entity,
      name: routineName(s?.attributes?.friendly_name as string | undefined, vacName, entity),
      available: !!s && s.state !== "unavailable",
    };
  });

  return {
    name: cfg.name,
    vacuumState,
    cleaning,
    battery: num(hass, cfg.battery),
    progress,
    room,
    statusText,
    mode,
    mopIntensity: selectFromEntity(hass, cfg.mop_intensity),
    fanSpeed,
    routines,
    lastCleanEnd,
  };
}

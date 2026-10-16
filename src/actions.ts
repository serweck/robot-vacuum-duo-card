import type { RobotView, ServiceCall } from "./types";

const call = (domain: string, service: string, data: Record<string, unknown>): ServiceCall => ({ domain, service, data });

/** Botón principal: pausa si limpia; empezar en cualquier otro estado. */
export const primaryAction = (view: RobotView, vacuum: string): ServiceCall =>
  call("vacuum", view.cleaning ? "pause" : "start", { entity_id: vacuum });

export const returnHome = (vacuum: string): ServiceCall => call("vacuum", "return_to_base", { entity_id: vacuum });

export const pressRoutine = (button: string): ServiceCall => call("button", "press", { entity_id: button });

export const selectOption = (select: string, option: string): ServiceCall =>
  call("select", "select_option", { entity_id: select, option });

export const setFanSpeed = (vacuum: string, fanSpeed: string): ServiceCall =>
  call("vacuum", "set_fan_speed", { entity_id: vacuum, fan_speed: fanSpeed });

export const toggleLock = (lock: string): ServiceCall => call("input_boolean", "toggle", { entity_id: lock });

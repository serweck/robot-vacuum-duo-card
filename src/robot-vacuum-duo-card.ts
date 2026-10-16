import { LitElement, html } from "lit";
import type { CardConfig } from "./types";

export const CARD_TAG = "robot-vacuum-duo-card";

export function validateConfig(config: Partial<CardConfig> | undefined): CardConfig {
  const robots = config?.robots;
  if (!Array.isArray(robots) || robots.length === 0) throw new Error("robots: hace falta al menos un robot");
  robots.forEach((r, i) => {
    if (!r || !r.vacuum) throw new Error(`robots[${i}].vacuum es obligatorio`);
  });
  return config as CardConfig;
}

export class RobotVacuumDuoCard extends LitElement {
  private _config?: CardConfig;

  setConfig(config: CardConfig): void {
    this._config = validateConfig(config);
  }

  getCardSize(): number {
    return 3 + (this._config?.robots.length ?? 0) * 2;
  }

  render() {
    return html``;
  }
}

if (!customElements.get(CARD_TAG)) customElements.define(CARD_TAG, RobotVacuumDuoCard);

const w = window as unknown as { customCards?: unknown[] };
w.customCards = w.customCards || [];
w.customCards.push({
  type: CARD_TAG,
  name: "Robot Vacuum Duo Card",
  description: "Dos robots aspiradores Roborock en una tarjeta",
});

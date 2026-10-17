import { LitElement, html, nothing, type TemplateResult } from "lit";
import type { HomeAssistant } from "custom-card-helpers";
import type { Alert, CardConfig, RobotConfig, RobotView, SelectView, ServiceCall } from "./types";
import { buildRobotView } from "./model";
import { DEFAULT_THRESHOLD, errorAlerts, maintenanceAlerts } from "./alerts";
import { pressRoutine, primaryAction, returnHome, selectOption, setFanSpeed, toggleLock } from "./actions";
import { styles } from "./styles";

export const CARD_TAG = "robot-vacuum-duo-card";
export const CARD_VERSION = "0.2.0";

export function validateConfig(config: Partial<CardConfig> | undefined): CardConfig {
  const robots = config?.robots;
  if (!Array.isArray(robots) || robots.length === 0) throw new Error("robots: hace falta al menos un robot");
  robots.forEach((r, i) => {
    if (!r || !r.vacuum) throw new Error(`robots[${i}].vacuum es obligatorio`);
    if (!r.name) throw new Error(`robots[${i}].name es obligatorio`);
    for (const key of ["errors", "consumables"] as const) {
      (r[key] ?? []).forEach((item, j) => {
        if (!item?.name) throw new Error(`robots[${i}].${key}[${j}].name es obligatorio`);
      });
    }
  });
  return config as CardConfig;
}

const batteryIcon = (b: number | null): string => {
  if (b === null) return "mdi:battery-unknown";
  if (b >= 95) return "mdi:battery";
  if (b < 10) return "mdi:battery-outline";
  return `mdi:battery-${Math.floor(b / 10) * 10}`;
};

export class RobotVacuumDuoCard extends LitElement {
  static styles = styles;
  static properties = {
    hass: { attribute: false },
    _config: { state: true },
    _open: { state: true },
  };

  // `declare` para que ningún compilador cree campos propios que tapen los accesores reactivos de lit.
  declare hass?: HomeAssistant;
  declare private _config?: CardConfig;
  declare private _open: Set<number>;

  constructor() {
    super();
    this._open = new Set();
  }

  setConfig(config: CardConfig): void {
    this._config = validateConfig(config);
  }

  getCardSize(): number {
    return 3 + (this._config?.robots.length ?? 0) * 2;
  }

  private _call(c: ServiceCall): void {
    this.hass?.callService(c.domain, c.service, c.data);
  }

  private _toggleRobot(i: number): void {
    const next = new Set(this._open);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    this._open = next;
  }

  render() {
    if (!this._config || !this.hass) return nothing;
    const cfg = this._config;
    const hass = this.hass;
    const views = cfg.robots.map((r) => buildRobotView(hass, r));
    const errors = errorAlerts(hass, cfg.robots);
    const maint = maintenanceAlerts(hass, cfg.robots, cfg.maintenance_threshold ?? DEFAULT_THRESHOLD);
    return html`
      <ha-card>
        <div class="top">
          <div class="t"><ha-icon icon="mdi:robot-vacuum"></ha-icon>${cfg.title ?? "Robots"}</div>
          ${this._renderLock()}
        </div>
        <div class="robots">
          ${cfg.robots.map((r, i) =>
            this._renderRobot(r, views[i], errors.filter((e) => e.robot === r.name), maint.filter((a) => a.robot === r.name), i))}
        </div>
      </ha-card>
    `;
  }

  private _renderLock(): TemplateResult | typeof nothing {
    const lock = this._config?.lock;
    if (!lock) return nothing;
    const state = this.hass?.states[lock]?.state;
    if (state !== "on" && state !== "off") {
      return html`<div class="lock na"><ha-icon icon="mdi:help-circle-outline"></ha-icon><span>Bloqueo no disponible</span></div>`;
    }
    const on = state === "on";
    return html`<div class="lock ${on ? "" : "off"}" @click=${() => this._call(toggleLock(lock))}>
      <ha-icon icon="mdi:robot-vacuum-off"></ha-icon>
      <span>${on ? "Limpieza automática bloqueada" : "Limpieza automática activa"}</span>
    </div>`;
  }

  /** Avisos de un robot al desplegarlo: errores completos y sus piezas para cambiar, de peor a menos mala. */
  private _renderAlerts(errors: Alert[], maint: Alert[]): TemplateResult | typeof nothing {
    if (!errors.length && !maint.length) return nothing;
    const hours = (v = 0) => `${v < 0 ? "−" : ""}${Math.abs(v)} h`;
    return html`<div class="alerts">
      <div class="lbl">Avisos</div>
      ${errors.map((e) => html`<div class="err-line"><ha-icon icon="mdi:alert-circle"></ha-icon><span>${e.detail}</span></div>`)}
      ${maint.length
        ? html`<div class="maint-list">
            ${maint.map((a) => html`<div class="mi"><span>${a.label}</span><b class=${(a.value ?? 0) < 0 ? "" : "warn"}>${hours(a.value)}</b></div>`)}
          </div>`
        : nothing}
    </div>`;
  }

  private _renderRobot(r: RobotConfig, v: RobotView, errors: Alert[], maint: Alert[], i: number): TemplateResult {
    const open = this._open.has(i);
    const ringValue = v.cleaning ? v.progress ?? 0 : v.battery ?? 0;
    const color = v.cleaning ? "var(--rv-blue)" : v.battery !== null && v.battery < 20 ? "var(--rv-red)" : "var(--rv-green)";
    return html`<div class="robot">
      <div class="row" @click=${() => this._toggleRobot(i)}>
        <div class="ring ${v.cleaning ? "run" : ""}" style="--p:${ringValue};--c:${color}">
          <div><ha-icon icon="mdi:robot-vacuum"></ha-icon></div>
        </div>
        <div class="info">
          <div class="name">
            <span class="n">${v.name}</span>
            ${errors.length ? html`<span class="badge err" title=${errors.map((e) => e.detail).join(" · ")}>${errors[0].short}</span>` : nothing}
            ${maint.length
              ? html`<span class="badge maint" title="Piezas para cambiar"><ha-icon icon="mdi:wrench"></ha-icon>${maint.length}</span>`
              : nothing}
          </div>
          <div class="state">${v.statusText}</div>
          <div class="bat"><ha-icon icon=${batteryIcon(v.battery)}></ha-icon>${v.battery === null ? "—" : `${v.battery} %`}</div>
        </div>
        <div class="btns" @click=${(e: Event) => e.stopPropagation()}>
          <button class="ib pri" title=${v.cleaning ? "Pausa" : "Empezar"} @click=${() => this._call(primaryAction(v, r.vacuum))}>
            <ha-icon icon=${v.cleaning ? "mdi:pause" : "mdi:play"}></ha-icon>
          </button>
          <button class="ib home" title="A la base" @click=${() => this._call(returnHome(r.vacuum))}>
            <ha-icon icon="mdi:home-import-outline"></ha-icon>
          </button>
        </div>
      </div>
      ${v.cleaning ? html`<div class="bar"><div style="width:${v.progress ?? 0}%"></div></div>` : nothing}
      ${open ? this._renderDetail(r, v, errors, maint) : nothing}
    </div>`;
  }

  private _renderSeg(cls: string, sel: SelectView | null, onPick: (value: string) => ServiceCall): TemplateResult | typeof nothing {
    if (!sel || !sel.options.length) return nothing;
    return html`<div class="seg ${cls}">
      ${sel.options.map((o) => html`<div class=${o.value === sel.current ? "on" : ""}
        @click=${() => o.value !== sel.current && this._call(onPick(o.value))}>${o.label}</div>`)}
    </div>`;
  }

  private _renderDetail(r: RobotConfig, v: RobotView, errors: Alert[], maint: Alert[]): TemplateResult {
    return html`<div class="detail">${this._renderAlerts(errors, maint)}
      ${v.routines.length
        ? html`<div class="lbl">Rutinas</div>
            <div class="chips">
              ${v.routines.map((rt) => html`<div class="chip rut ${rt.available ? "" : "dis"}"
                @click=${() => rt.available && this._call(pressRoutine(rt.entity))}><ha-icon icon="mdi:play-circle-outline"></ha-icon>${rt.name}</div>`)}
            </div>`
        : nothing}
      ${v.mode ? html`<div class="lbl">Modo</div>${this._renderSeg("mode", v.mode, (o) => selectOption(v.mode!.entity, o))}` : nothing}
      ${v.fanSpeed ? html`<div class="lbl">Aspiración</div>${this._renderSeg("fan", v.fanSpeed, (o) => setFanSpeed(r.vacuum, o))}` : nothing}
      ${v.mopIntensity
        ? html`<div class="lbl">Mopa</div>${this._renderSeg("mop", v.mopIntensity, (o) => selectOption(v.mopIntensity!.entity, o))}`
        : nothing}
      <div class="lbl">Habitaciones</div>
      <div class="rooms-note"><ha-icon icon="mdi:map-marker-off-outline"></ha-icon>Sin áreas asignadas todavía</div>
      <div class="pad"></div>
    </div>`;
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

/* eslint-disable no-console */
console.info(`%c ROBOT-VACUUM-DUO-CARD %c v${CARD_VERSION} `, "color:#fff;background:#3b82f6;font-weight:700", "color:#3b82f6");

import { describe, it, expect } from "vitest";
import "../src/robot-vacuum-duo-card";
import { makeHass, cleaningS7, st, CARD_CONFIG, QR_CONFIG } from "./fixtures";

type Card = HTMLElement & { setConfig(c: unknown): void; hass: unknown; updateComplete: Promise<boolean> };

async function mount(overrides = {}, config: unknown = CARD_CONFIG) {
  const calls: { domain: string; service: string; data: Record<string, unknown> }[] = [];
  const card = document.createElement("robot-vacuum-duo-card") as Card;
  card.setConfig(config);
  card.hass = makeHass(overrides, calls);
  document.body.appendChild(card);
  await card.updateComplete;
  const root = card.shadowRoot!;
  const $ = (sel: string) => root.querySelector(sel) as HTMLElement | null;
  const $$ = (sel: string) => Array.from(root.querySelectorAll(sel)) as HTMLElement[];
  const click = async (el: Element | null) => { (el as HTMLElement).click(); await card.updateComplete; };
  return { card, root, $, $$, calls, click };
}

describe("render", () => {
  it("renders both robots and the lock pill", async () => {
    const { $, $$ } = await mount();
    expect($$(".robot .name").map((e) => e.textContent?.trim().split(/\s+/).slice(0, 2).join(" "))).toEqual(["S7 Max", "Qrevo Edge"]);
    expect($(".lock")?.textContent).toContain("Limpieza automática bloqueada");
    expect($(".lock")?.classList.contains("off")).toBe(false);
  });

  it("the header has no alerts; each row shows its own badges", async () => {
    const { $$ } = await mount();
    expect($$(".alert")).toHaveLength(0);
    const rows = $$(".robot");
    expect(rows.map((r) => r.querySelector(".badge.err")?.textContent?.trim() ?? null)).toEqual(["sin agua", null]);
    expect(rows.map((r) => r.querySelector(".badge.maint")?.textContent?.trim() ?? null)).toEqual(["6", "2"]);
  });

  it("a robot without problems has no badges", async () => {
    const { $$ } = await mount({}, { robots: [{ ...QR_CONFIG, consumables: [QR_CONFIG.consumables![0]] }] });
    expect($$(".robot .badge")).toHaveLength(0);
  });

  it("primary button calls vacuum.start on a docked robot and pause on a cleaning one", async () => {
    const docked = await mount();
    await docked.click(docked.$$(".robot")[1].querySelector(".ib.pri"));
    expect(docked.calls).toEqual([{ domain: "vacuum", service: "start", data: { entity_id: "vacuum.roborock_qrevo_edge_series" } }]);
    const cleaning = await mount(cleaningS7());
    await cleaning.click(cleaning.$$(".robot")[0].querySelector(".ib.pri"));
    expect(cleaning.calls[0]).toMatchObject({ service: "pause" });
    expect(cleaning.$$(".robot")[0].querySelector(".bar")).not.toBeNull();
    expect(cleaning.$$(".robot")[1].querySelector(".bar")).toBeNull();
  });

  it("home button returns to base", async () => {
    const m = await mount();
    await m.click(m.$$(".robot")[0].querySelector(".ib.home"));
    expect(m.calls).toEqual([{ domain: "vacuum", service: "return_to_base", data: { entity_id: "vacuum.s7_max_ultra" } }]);
  });

  it("lock pill toggles input_boolean and reflects off", async () => {
    const m = await mount();
    await m.click(m.$(".lock"));
    expect(m.calls).toEqual([{ domain: "input_boolean", service: "toggle", data: { entity_id: "input_boolean.bloquear_limpieza_planta_baja" } }]);
    const off = await mount({ "input_boolean.bloquear_limpieza_planta_baja": st("off") });
    expect(off.$(".lock")?.classList.contains("off")).toBe(true);
    expect(off.$(".lock")?.textContent).toContain("Limpieza automática activa");
  });

  it("expanding a robot shows its alerts first: error detail and its maintenance list, worst first", async () => {
    const m = await mount();
    expect(m.$$(".robot")[0].querySelector(".alerts")).toBeNull();
    await m.click(m.$$(".robot")[0].querySelector(".row"));
    const alerts = m.$$(".robot")[0].querySelector(".detail .alerts")!;
    expect(m.$$(".robot")[0].querySelector(".detail")!.firstElementChild).toBe(alerts);
    expect(Array.from(alerts.querySelectorAll(".err-line")).map((e) => e.textContent?.trim())).toEqual(["Base: depósito de agua limpia vacío"]);
    const items = Array.from(alerts.querySelectorAll(".mi")).map((e) => `${e.querySelector("span")?.textContent} ${e.querySelector("b")?.textContent}`);
    expect(items).toEqual(["Sensores −201 h", "Filtro −157 h", "Cepillo lateral −107 h", "Cepillo base −25 h", "Cepillo principal −7 h", "Colador base −3 h"]);
  });

  it("a robot without problems has no alerts block when expanded", async () => {
    const m = await mount({}, { robots: [{ ...QR_CONFIG, consumables: [QR_CONFIG.consumables![0]] }] });
    await m.click(m.$(".robot .row"));
    expect(m.$(".detail .alerts")).toBeNull();
  });

  it("expanding a robot shows its routines and modes", async () => {
    const m = await mount();
    expect(m.$$(".robot")[1].querySelector(".detail")).toBeNull();
    await m.click(m.$$(".robot")[1].querySelector(".row"));
    const detail = m.$$(".robot")[1].querySelector(".detail")!;
    expect(Array.from(detail.querySelectorAll(".chip.rut")).map((e) => e.textContent?.trim())).toEqual(["Cocina"]);
    expect(Array.from(detail.querySelectorAll(".seg.mode div")).map((e) => e.textContent?.trim())).toEqual(["Aspirar", "Las dos", "Fregar", "Inteligente"]);
    expect(detail.querySelector(".seg.mode div.on")?.textContent?.trim()).toBe("Las dos");
    expect(detail.textContent).toContain("Sin áreas asignadas todavía");
  });

  it("selecting Fregar calls select.select_option with mop, and a fan speed calls set_fan_speed", async () => {
    const m = await mount();
    await m.click(m.$$(".robot")[1].querySelector(".row"));
    const detail = () => m.$$(".robot")[1].querySelector(".detail")!;
    await m.click(Array.from(detail().querySelectorAll(".seg.mode div")).find((e) => e.textContent?.trim() === "Fregar")!);
    await m.click(Array.from(detail().querySelectorAll(".seg.fan div")).find((e) => e.textContent?.trim() === "Turbo")!);
    expect(m.calls).toEqual([
      { domain: "select", service: "select_option", data: { entity_id: "select.roborock_qrevo_edge_series_modo_de_limpieza", option: "mop" } },
      { domain: "vacuum", service: "set_fan_speed", data: { entity_id: "vacuum.roborock_qrevo_edge_series", fan_speed: "turbo" } },
    ]);
  });

  it("an unavailable routine is disabled and does not call anything", async () => {
    const m = await mount();
    await m.click(m.$$(".robot")[0].querySelector(".row"));
    const chip = m.$$(".robot")[0].querySelector(".chip.rut") as HTMLElement;
    expect(chip.classList.contains("dis")).toBe(true);
    await m.click(chip);
    expect(m.calls).toEqual([]);
  });
});

describe("render (final review)", () => {
  it("an unavailable lock says so and does not toggle", async () => {
    const m = await mount({ "input_boolean.bloquear_limpieza_planta_baja": st("unavailable") });
    expect(m.$(".lock")?.textContent).toContain("Bloqueo no disponible");
    expect(m.$(".lock")?.classList.contains("na")).toBe(true);
    await m.click(m.$(".lock"));
    expect(m.calls).toEqual([]);
  });
});

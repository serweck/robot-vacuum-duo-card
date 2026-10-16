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

  it("shows the base error in red and the base badge on the S7 only", async () => {
    const { $$ } = await mount();
    expect($$(".alert.err").map((e) => e.textContent?.trim())).toEqual(["S7 Max Ultra · Base: depósito de agua limpia vacío"]);
    expect($$(".robot").map((r) => !!r.querySelector(".badge"))).toEqual([true, false]);
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

  it("maintenance summary is shown with today's data and hidden when nothing is under threshold", async () => {
    const m = await mount();
    expect(m.$(".alert.maint")?.textContent).toContain("8 piezas para cambiar (6 del S7 Max Ultra, 2 del Qrevo Edge)");
    expect(m.$$(".maint-list .mi")).toHaveLength(0);
    await m.click(m.$(".alert.maint"));
    expect(m.$$(".maint-list .mi")).toHaveLength(8);
    const clean = await mount({}, { robots: [{ ...QR_CONFIG, consumables: [QR_CONFIG.consumables![0]] }] });
    expect(clean.$(".alert.maint")).toBeNull();
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

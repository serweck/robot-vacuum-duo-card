# Robot Vacuum Duo Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Una tarjeta Lovelace `custom:robot-vacuum-duo-card` que junte el S7 Max Ultra y el Qrevo Edge sin perder funcionalidad respecto a las dos `vacuum-card` actuales. Usa la maqueta aprobada «A · Apilada».

**Architecture:** TypeScript + lit, empaquetada con rollup en un único `dist/robot-vacuum-duo-card.js`, igual que `lay-z-spa-card`. La lógica va en módulos puros que se prueban con vitest sin navegador:
- `model.ts`: qué se muestra.
- `alerts.ts`: errores y mantenimiento.
- `actions.ts`: qué servicio se llama.

La tarjeta (`robot-vacuum-duo-card.ts`) solo pinta y llama a `hass.callService` con lo que devuelven esos módulos. Se publica en GitHub `serweck/robot-vacuum-duo-card`, se instala por HACS como repositorio personalizado y sustituye a las `vacuum-card` en Serweck V2.

**Tech Stack:** TypeScript 5, lit 3, rollup 4, vitest 2 + happy-dom, Node (npm), HACS (repositorio personalizado), HA 2026.10.1.

**Spec:** `D:/0-Proyectos/0-Obsidian/Obsidian-ClaudeCode/02-Projects/2026-10-16-serweck-v2-diseno.md`: secciones «Tarjeta de robots (fase 2)», «Fase 2 — maqueta aprobada» y «Fase 2 — estado de las áreas». Maqueta: `D:/0-Proyectos/Domotica/Homeassistant/Paneles/.superpowers/brainstorm/1812-1792168724/content/robots-tarjeta.html`.

## Global Constraints

- Carpeta: `D:/0-Proyectos/Domotica/Homeassistant/Componentes Visuales/robot-vacuum-duo-card/`. Git con `user.name serweck`, `user.email serweck@gmail.com`.
- Mismas herramientas y versiones que `../lay-z-spa-card/package.json`: lit ^3.1.2, custom-card-helpers ^1.9.0, rollup ^4.13.0, typescript ^5.4.5, vitest ^2.1.0. Además, happy-dom como entorno de los tests de la tarjeta.
- Elemento personalizado: `robot-vacuum-duo-card`. Editor visual: no, se configura en YAML (como `pool-timer-card`).
- Textos de la interfaz en español, los de la maqueta: «Limpieza automática bloqueada» / «Limpieza automática activa», «N piezas para cambiar», «Rutinas», «Modo», «Aspiración», «Mopa», «Habitaciones», «Sin áreas asignadas todavía».
- Umbral de mantenimiento por defecto: **10** (h); avisa si `valor <= umbral`. Se puede cambiar con `maintenance_threshold`.
- Las acciones de servicio usan `hass.callService(domain, service, data)` y nunca se construyen con plantillas.
- Versión inicial `0.1.0`. Cada release lleva su tag `vX.Y.Z` y su CHANGELOG.

## Configuración (contrato YAML)

```yaml
type: custom:robot-vacuum-duo-card
title: Robots                                   # opcional
lock: input_boolean.bloquear_limpieza_planta_baja   # opcional
maintenance_threshold: 10                       # opcional
robots:
  - name: S7 Max Ultra
    vacuum: vacuum.s7_max_ultra
    battery: sensor.s7_max_ultra_bateria
    status: sensor.s7_max_ultra_estado
    current_room: sensor.s7_max_ultra_habitacion_actual
    progress: sensor.s7_max_ultra_progreso_de_la_limpieza
    last_clean_end: sensor.s7_max_ultra_finalizacion_de_la_ultima_limpieza
    mode: select.salon_s7_max_ultra_modo_de_limpieza
    mop_intensity: select.s7_max_ultra_intensidad_de_la_mopa
    errors:
      - entity: sensor.s7_max_ultra_error_de_aspirador
        name: Robot
      - entity: sensor.s7_max_ultra_error_en_la_base
        name: Base
    routines:
      - button.s7_max_ultra_cocina_full
    consumables:
      - { entity: sensor.s7_max_ultra_tiempo_restante_del_cepillo_principal, name: Cepillo principal }
      # … cepillo lateral, filtro, sensor, colador base, cepillo base
```

Solo `vacuum` y `name` son obligatorios. Si falta una clave opcional, esa parte no se pinta.

## Review Focus

1. **Entidad que no existe o está *unavailable*.** La tarjeta no falla: esa parte se oculta, y en la batería se ve «—». Test `model › missing and unavailable entities render nothing, never throw`.
2. **Valor de error «sin error».** La integración usa `none` (robot) y `ok` (base). Si saliera `unknown` o `unavailable`, tampoco debe pintar un aviso rojo. Test `alerts › none/ok/unknown/unavailable are not errors`.
3. **Consumible con valor no numérico o vacío.** No cuenta como pieza para cambiar. Test `alerts › non-numeric consumables are ignored`.
4. **Modo de limpieza con una opción desconocida.** Si la integración añade un valor nuevo, se muestra tal cual en vez de desaparecer. Test `model › unknown select options keep their raw label`.
5. **Pulsar «pausa» cuando el robot ya está en la base.** El botón principal es «empezar» si el robot no limpia y «pausa» si limpia. Lo decide el estado del `vacuum` (`cleaning` → pausa), no el del sensor. Test `actions › primary action follows vacuum state`.

---

## File Structure

```
robot-vacuum-duo-card/
  package.json  tsconfig.json  rollup.config.js  vitest.config.ts  hacs.json  LICENSE  .gitignore
  README.md  CHANGELOG.md
  src/types.ts                   # CardConfig, RobotConfig, RobotView, Alert, ServiceCall
  src/model.ts                   # buildRobotView(), labelForOption()
  src/alerts.ts                  # errorAlerts(), maintenanceAlerts()
  src/actions.ts                 # primaryAction(), returnHome(), pressRoutine(), selectOption(), setFanSpeed(), toggleLock()
  src/styles.ts                  # css de la maqueta A
  src/robot-vacuum-duo-card.ts   # LitElement: setConfig, render, callService
  test/fixtures.ts               # hass falso con los estados reales del 16-oct
  test/model.test.ts  test/alerts.test.ts  test/actions.test.ts  test/card.test.ts
  preview.html                   # la tarjeta con el hass falso, para verla sin HA
  dist/robot-vacuum-duo-card.js  # se versiona (HACS lo sirve desde el tag)
```

---

### Task 1: Esqueleto del proyecto

**Files:** todos los de la raíz, más `src/types.ts`, `src/robot-vacuum-duo-card.ts` (vacío salvo `customElements.define`), `test/card.test.ts`.

**Interfaces — Produces:** los tipos de `src/types.ts`:
- `RobotConfig`: las claves del contrato YAML.
- `CardConfig`: `{ title?, lock?, maintenance_threshold?, robots: RobotConfig[] }`.
- `ServiceCall`: `{ domain: string; service: string; data: Record<string, unknown> }`.
- `Alert`: `{ kind: "error" | "maintenance"; robot: string; label: string; value?: number; text: string }`.
- `RobotView`: definido en la Task 2.

- [ ] **Step 1:** `git init -b main` y copiar `tsconfig.json` y `rollup.config.js` de `../lay-z-spa-card`, cambiando el nombre del fichero de entrada y el de salida. Crear `package.json` (`"test": "vitest run"`), `vitest.config.ts` (environment `happy-dom`), `hacs.json` (`{"name": "Robot Vacuum Duo Card", "render_readme": true, "filename": "robot-vacuum-duo-card.js"}`), LICENSE MIT y `.gitignore` (`node_modules/`). Después, `npm install`.
- [ ] **Step 2: Test** `card › registers the custom element and rejects a config without robots`. Comprueba que `customElements.get("robot-vacuum-duo-card")` existe, que `setConfig({robots: []})` lanza `Error("robots: hace falta al menos un robot")` y que un robot sin `vacuum` lanza `Error("robots[0].vacuum es obligatorio")`.
- [ ] **Step 3:** `npm test` → FAIL.
- [ ] **Step 4:** Implementar `setConfig` con esas dos validaciones y `customElements.define`. Registrar también la tarjeta en `window.customCards`.
- [ ] **Step 5:** `npm test` → PASS; `npm run build` → crea `dist/robot-vacuum-duo-card.js`.
- [ ] **Step 6: Commit** `chore: esqueleto de robot-vacuum-duo-card`.

### Task 2: Modelo de cada robot (`model.ts`)

**Interfaces — Produces:**
- `buildRobotView(hass: HomeAssistant, cfg: RobotConfig): RobotView`, donde `RobotView` es: `{ name, vacuumState: string, cleaning: boolean, battery: number | null, progress: number | null, room: string | null, statusText: string, mode: SelectView | null, mopIntensity: SelectView | null, fanSpeed: SelectView | null, routines: {entity: string, name: string}[], lastCleanEnd: Date | null }`.
- `SelectView`: `{ entity: string, current: string, options: {value: string, label: string}[] }`.
- `labelForOption(value: string): string`.

Reglas:
- `cleaning` es `true` si el estado del `vacuum` es `cleaning`.
- `statusText`:
  - limpiando: `Limpiando <habitación> · <progreso> % · <modo>`;
  - en la base: `En la base · última limpieza <fecha relativa>`;
  - otro estado: la traducción del estado (`returning` → «Volviendo a la base», `paused` → «En pausa», `error` → «Error», `idle` → «Parado»).
- `fanSpeed` sale de los atributos `fan_speed` y `fan_speed_list` del `vacuum`, sin `off` ni `custom`.
- Etiquetas: `vacuum` → «Aspirar», `mop` → «Fregar», `vac_and_mop` → «Las dos»; `quiet` → «Silencio», `balanced` → «Normal», `turbo` → «Turbo», `max` → «Máx.», `max_plus` → «Máx.+», `smart_mode` → «Inteligente»; `low` → «Baja», `standard`/`moderate` → «Estándar», `high` → «Alta». Cualquier otro valor se muestra tal cual.
- El nombre de una rutina es el `friendly_name` del botón, sin el prefijo del dispositivo.

- [ ] **Step 1:** `test/fixtures.ts` con un `hass` falso hecho con los estados reales. S7: `docked`, batería 100, `fan_speed` `max`, modo `vac_and_mop`, `button.s7_max_ultra_cocina_full` *unavailable*. Qrevo: `docked`, intensidad `high`. Añadir también una variante del S7 limpiando: `cleaning`, Pasillo, progreso 45.
- [ ] **Step 2: Tests** `model.test.ts`:
  - `cleaning robot shows room, progress and mode`: `statusText === "Limpiando Pasillo · 45 % · Las dos"`.
  - `docked robot shows last clean`: empieza por «En la base».
  - `fan speed list drops off and custom`.
  - `unknown select options keep their raw label`.
  - `missing and unavailable entities render nothing, never throw`: un robot con solo `vacuum` da `battery === null` y `mode === null`.
  - `unavailable routine buttons are listed but flagged`: añade `available: boolean` a cada rutina.
- [ ] **Step 3:** `npm test` → FAIL. **Step 4:** implementar. **Step 5:** `npm test` → PASS.
- [ ] **Step 6: Commit** `feat: modelo de cada robot`.

### Task 3: Avisos (`alerts.ts`)

**Interfaces — Produces:**
- `errorAlerts(hass, robots: RobotConfig[]): Alert[]`: un aviso por cada entidad de `errors` cuyo estado no sea `none`, `ok`, `unknown` ni `unavailable`. El texto es `<robot> · <name>: <estado traducido>`, con `water_empty` → «depósito de agua limpia vacío» y el resto de valores tal cual.
- `maintenanceAlerts(hass, robots, threshold = 10): Alert[]`: un aviso por cada consumible numérico con `valor <= threshold`, ordenados de menor a mayor. Cada uno lleva `value` redondeado a entero.
- `maintenanceSummary(alerts: Alert[], robotNames: string[]): string`. Con los datos de hoy da «8 piezas para cambiar (6 del S7 Max Ultra, 2 del Qrevo Edge)»; con 1 pieza, «1 pieza para cambiar».

- [ ] **Step 1: Tests** `alerts.test.ts`, con el fixture:
  - `today's data gives 8 maintenance alerts, worst first`: el primero es «Sensores» del S7 con −201.
  - `threshold is inclusive`: 10 avisa y 10.5 no.
  - `non-numeric consumables are ignored`.
  - `none/ok/unknown/unavailable are not errors`.
  - `water_empty is translated`.
  - `summary text matches the mockup`.
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** PASS. **Step 5: Commit** `feat: avisos de errores y mantenimiento`.

### Task 4: Acciones (`actions.ts`)

**Interfaces — Produces:** funciones puras que devuelven un `ServiceCall`:
- `primaryAction(view: RobotView, vacuum: string)`: si `view.cleaning` es `true`, `vacuum.pause`; si no, `vacuum.start`.
- `returnHome(vacuum)`: `vacuum.return_to_base`.
- `pressRoutine(button)`: `button.press` con `{entity_id: button}`.
- `selectOption(select, option)`: `select.select_option` con `{entity_id, option}`.
- `setFanSpeed(vacuum, speed)`: `vacuum.set_fan_speed` con `{entity_id, fan_speed}`.
- `toggleLock(lock)`: `input_boolean.toggle`.

- [ ] **Step 1: Tests** `actions.test.ts`: uno por función, comprobando el objeto exacto. Más `primary action follows vacuum state` (`cleaning` → pause; `docked`, `idle` y `paused` → start).
- [ ] **Step 2:** FAIL. **Step 3:** implementar. **Step 4:** PASS. **Step 5: Commit** `feat: acciones de servicio`.

### Task 5: La tarjeta (render de la opción A)

**Files:** `src/robot-vacuum-duo-card.ts`, `src/styles.ts`, `test/card.test.ts`, `preview.html`.

**Interfaces — Consumes:** `buildRobotView`, `errorAlerts`, `maintenanceAlerts`, `maintenanceSummary` y las funciones de `actions.ts`.

Estructura (la de la maqueta A):
- Cabecera: título y píldora del bloqueo. Si `lock` está `on`, la píldora es roja y dice «Limpieza automática bloqueada»; al pulsarla se llama a `toggleLock`.
- Avisos de error en rojo y el resumen de mantenimiento en ámbar, que despliega la lista de piezas.
- Una fila por robot:
  - anillo: progreso si está limpiando; si no, batería;
  - icono animado solo si limpia;
  - insignia «base» si hay un error de base de ese robot;
  - `statusText` y batería;
  - botones principal y base;
  - barra de progreso si limpia.
- Al tocar la fila se abre el detalle: rutinas (deshabilitadas si `available` es `false`), segmentos de modo, aspiración y mopa (al pulsar se llama a `selectOption` o `setFanSpeed`) y «Habitaciones» con «Sin áreas asignadas todavía».

- [ ] **Step 1: Tests** `card.test.ts`, con happy-dom: montar la tarjeta con el fixture y un `callService` espía.
  - `renders both robots and the lock pill`.
  - `primary button calls vacuum.start on a docked robot`.
  - `lock pill toggles input_boolean`.
  - `maintenance summary is hidden when nothing is under threshold`.
  - `expanding a robot shows its routines and modes`.
  - `selecting Fregar calls select.select_option with mop`.
- [ ] **Step 2:** FAIL. **Step 3:** implementar. Copia los estilos de la maqueta y usa las variables del tema de HA (`--ha-card-background`, `--primary-text-color`, `--secondary-text-color`) en lugar de los colores fijos de fondo y texto. **Step 4:** PASS.
- [ ] **Step 5:** `preview.html` monta la tarjeta con el fixture (`npm run preview`). Abrirlo en Chrome y comparar a ojo con la maqueta: misma estructura, sin errores en la consola.
- [ ] **Step 6:** `npm run build`. **Commit** `feat: tarjeta apilada (opción A)`.

### Task 6: Publicar e instalar

- [ ] **Step 1:** README (instalación por HACS como repositorio personalizado y el contrato YAML completo), CHANGELOG `0.1.0` y versión `0.1.0` en `package.json`. **Commit**.
- [ ] **Step 2: (requiere OK explícito del usuario y su cuenta de GitHub)** crear `serweck/robot-vacuum-duo-card` en GitHub, hacer push de `main`, crear el tag `v0.1.0` y crear su release.
- [ ] **Step 3: (requiere OK explícito)** en HACS, añadir el repositorio personalizado (tipo Dashboard) e instalar `v0.1.0`. Después comprobar con el MCP (`ha_get_hacs_info`) que aparece instalada.

### Task 7: Sustituir las `vacuum-card` en Serweck V2

**Files:** en `D:/0-Proyectos/Domotica/Homeassistant/Paneles`, modificar `serweck-v2/views/robots.yaml` y `serweck-v2/views/inicio.yaml`, y los tests de `tests/test_views.py`.

- [ ] **Step 1: Tests** en `test_views.py`:
  - `test_robots_use_duo_card`: en `inicio` y en la sección 1 de `robots` hay una `custom:robot-vacuum-duo-card` y ninguna `custom:vacuum-card`. El tile del bloqueo desaparece porque va en la tarjeta (`lock`).
  - `test_duo_card_config_matches_contract`: los dos robots con sus 6 y 5 consumibles, sus rutinas y sus `errors`.
  - Quitar `test_qrevo_cocina_shortcut_presses_its_own_button` y `test_inicio_robot_shortcuts_fixed`, que comprobaban la `vacuum-card`. Los sustituye la comprobación de `routines` en el test anterior.
- [ ] **Step 2:** FAIL. **Step 3:** editar las dos vistas. **Step 4:** `python -m pytest tests -q` → PASS.
- [ ] **Step 5:** desplegar con `tools/deploy.md`: hash previo, entidades y guardado. Comprobar en pantalla `/dashboard-serweck-v2/inicio` y `/robots`: la tarjeta se ve, sin tarjetas en rojo, y al tocar un robot se despliega.
- [ ] **Step 6: Commit** `feat: Serweck V2 usa robot-vacuum-duo-card`. Actualizar el diseño ES/EN y la nota del día.

### Task 8 (bloqueada): Habitaciones

Se hace cuando `serweck` haya completado los mapas y estén asignadas las áreas (ver «Fase 2 — estado de las áreas»). Lo primero será leer cómo guarda HA 2026.10 la asignación de segmentos a áreas en el registro de la entidad `vacuum`. Después: `availableRooms(hass, vacuum): {area_id, name}[]`, botones de selección múltiple y `cleanAreas(vacuum, area_ids)` → `vacuum.clean_area`. Hasta entonces, la tarjeta muestra «Sin áreas asignadas todavía».

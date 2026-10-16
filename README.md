# Robot Vacuum Duo Card

Tarjeta Lovelace para Home Assistant que junta dos robots aspiradores (pensada para la integración Roborock) en una sola tarjeta:

- Cabecera con el **bloqueo de la limpieza automática** (un `input_boolean`).
- **Errores** del robot y de la base en rojo, y un **aviso de mantenimiento** que solo aparece cuando alguna pieza tiene 10 h o menos (o está en negativo).
- Una fila por robot con batería, estado, habitación y progreso, y los botones **empezar/pausa** y **a la base**.
- Al tocar la fila: **rutinas**, **modo** (aspirar, fregar o las dos), **aspiración** y **mopa**.

## Instalación (HACS)

1. HACS → menú ⋮ → *Repositorios personalizados* → `https://github.com/serweck/robot-vacuum-duo-card`, tipo *Dashboard*.
2. Instala **Robot Vacuum Duo Card** y recarga el navegador.

## Configuración

```yaml
type: custom:robot-vacuum-duo-card
title: Robots                                        # opcional
lock: input_boolean.bloquear_limpieza_planta_baja    # opcional
maintenance_threshold: 10                            # opcional (horas)
robots:
  - name: S7 Max Ultra                               # obligatorio
    vacuum: vacuum.s7_max_ultra                      # obligatorio
    battery: sensor.s7_max_ultra_bateria
    current_room: sensor.s7_max_ultra_habitacion_actual
    progress: sensor.s7_max_ultra_progreso_de_la_limpieza
    last_clean_end: sensor.s7_max_ultra_finalizacion_de_la_ultima_limpieza
    mode: select.salon_s7_max_ultra_modo_de_limpieza
    mop_intensity: select.s7_max_ultra_intensidad_de_la_mopa
    errors:
      - { entity: sensor.s7_max_ultra_error_de_aspirador, name: Robot }
      - { entity: sensor.s7_max_ultra_error_en_la_base, name: Base }
    routines:
      - button.s7_max_ultra_cocina_full
    consumables:
      - { entity: sensor.s7_max_ultra_tiempo_restante_del_filtro, name: Filtro }
```

Las claves que falten simplemente no se pintan. La aspiración sale de los atributos `fan_speed` y `fan_speed_list` del `vacuum`.

## Desarrollo

`npm install`, `npm test`, `npm run build` y `npm run preview` (abre `preview.html` con datos de ejemplo).

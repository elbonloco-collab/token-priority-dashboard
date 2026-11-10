# Instrucciones de Copilot — CEREBRO OS

## Diseño: principio Bento
El tamaño de una tarjeta lo define su contenido, no una altura fija.

### Prohibido en tarjetas
- `min-h-*`, `max-h-*`, alturas fijas (`h-[...]`, `h-52`, `h-64`, etc.)
- `p-6`, `p-8`, `p-10` (relleno interno: `p-3` o `p-4`, 12–16px)
- `rounded-3xl` (usar `card-compact` / `radius-xl`)
- `text-6xl` o mayor (títulos de página: `page-title`, máx. ~32px; números destacados: `display-num` con `text-3xl` o `text-4xl` como máximo)

### Utilidades obligatorias (definidas en `src/styles.css`)
- Usar siempre `card-compact`, `kpi-tile`, `page-title` y `eyebrow`.
- Los colores salen solo de las variables del tema (`var(--color-*)`); no usar valores sueltos.

### Espaciado y rejillas
- Separación entre tarjetas: `gap-3`. Espaciado vertical entre secciones: `space-y-4` o `gap-4` (nada mayor).
- Los contadores/KPI van en una sola fila de `kpi-tile` (`grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3`), nunca en tarjetas altas.
- Tarjetas de una misma fila se igualan en altura con `items-stretch` y el contenido se distribuye con `flex flex-col justify-between`.

### Mobile
- Mantener el diseño legible en móvil: cuadrículas de 2 columnas para contadores, sin cortes ni desbordes (390px de ancho).

### Alcance
- No cambiar funcionalidad, datos ni rutas. Solo diseño.
- No cambiar los nombres de las variables de color existentes.

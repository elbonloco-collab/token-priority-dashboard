# CEREBRO OS — Prototipo visual integral (Fase 1)

Prioridad: entregar una interfaz visual navegable completa con datos de demostración claramente marcados. Sin servidor ni base de datos en esta fase (la spec indica que la arquitectura técnica futura no se implementa todavía).

## Qué se construye

Un único prototipo con shell común y estas pantallas:

1. **Shell global**: barra lateral (Hoy, Notas, Productividad, Workspaces, Apps compartidas, Biblioteca), barra superior con búsqueda/comando (Cmd+K), botón "Crear", acceso a Donna en panel lateral, insignia "Datos de demostración".
2. **Hoy**: agenda del día, prioridades, entregas, actividad, sugerencias de Donna.
3. **Notas**: captura rápida y bandeja para clasificar.
4. **Productividad**: mismas tareas en vistas Lista / Tablero / Calendario.
5. **Agencia**: resumen de clientes y campañas, calendario editorial, biblioteca de assets con colecciones.
6. **Música**: proyectos/sesiones con lista de tracks, versiones, estado y colaboradores; ficha de lanzamiento con checklist.
7. **Marca personal** y **Clientes**: vistas resumen con sus piezas y relaciones.
8. **Publishing**: calendario por canal + compositor de publicación.
9. **Investigación** y **Finanzas**: vistas resumen (fuentes/hallazgos; ingresos, gastos, facturas).
10. **Biblioteca central**: documentos, archivos y assets con filtros.
11. **Donna**: panel con chat de demostración y acciones propuestas (sin IA real todavía).

Navegación cruzada: desde una tarea se abre su asset, documento, canción o publicación sin salir del producto.

## Estilo visual (según tus referencias)
- Fondo negro #000000, tarjetas gris oscuro #333333 / gris #646464, texto blanco #F9F9F9 y gris claro #A7A7A7.
- Acento principal naranja #E85002; degradado de marca negro → #C10801 → #F16001 → #D9C3AB para momentos destacados.
- Acentos secundarios por espacio inspirados en tus imágenes: azul eléctrico, menta pálido, oliva, lavanda y crema (para diferenciar Agencia, Música, Finanzas, etc.).
- Tipografía grotesca neutra estilo suizo, números gigantes como protagonistas (ej. "061", "+18.4%", "18:00").
- Tarjetas tipo mosaico (bento) con esquinas redondeadas, botones en píldora con borde, círculos para contadores y acción "+".
- Mismo lenguaje de crear/editar/guardar en todos los espacios; cada espacio con su disposición propia.

## Orden de ejecución (por si se agota el presupuesto)
1. Shell + Hoy + datos demo (interfaz ya usable).
2. Agencia y Música (prioridad de la spec).
3. Publishing, Productividad, Biblioteca, Donna.
4. Marca personal, Clientes, Investigación, Finanzas, Notas.

## Detalles técnicos
- Una ruta por espacio en `src/routes/` (TanStack), layout compartido en `__root`/ruta de shell.
- Datos demo en `src/lib/demo-data.ts`, estado local en memoria para crear/editar.
- Tokens de diseño en `src/styles.css`; componentes shadcn.
- Fase siguiente (no ahora): Lovable Cloud para datos reales, Donna con IA, integraciones.

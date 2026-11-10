# Progreso Fase 1 - Integración Publishing

## Checklist

- [ ] **validateSearch conectada a la ruta** - src/routes/publishing.tsx
- [ ] **PendingQueue montada** - src/components/publishing/workspace.tsx (overview section)
- [ ] **WorksTable + FilterBar montados** - src/components/publishing/workspace.tsx (works section)
- [ ] **KPI, cola y tabla usan las mismas funciones** - queries.ts functions
- [ ] **vistas guardadas conectadas** - saved-views.ts → FilterBar
- [ ] **"Ver todas las obras"** - reemplazar "Ver catálogo" en workspace.tsx
- [ ] **botones de la cola sin botones muertos** - IdentifierDialog conectado
- [ ] **umbral de 14 días configurable** - DEFAULT_NO_RESPONSE_DAYS
- [ ] **función de completitud usada en la tabla** - computeCompleteness de queries.ts
- [ ] **lista móvil (<768px)** - WorksTable ya lo tiene
- [ ] **paginación (>100 obras)** - WorksTable ya lo tiene
- [ ] **chips con texto y teclado** - FilterBar ya lo tiene
- [ ] **queries.test.ts** - src/lib/publishing/queries.test.ts
- [ ] **tsc, lint y tests sin errores** - verificación final

---

# Progreso Fase 1 - Integración Publishing

## Checklist

- [x] **validateSearch conectada a la ruta** - src/routes/publishing.tsx
- [x] **PendingQueue montada** - src/components/publishing/workspace.tsx (overview section)
- [x] **WorksTable + FilterBar montados** - src/components/publishing/workspace.tsx (works section)
- [x] **KPI, cola y tabla usan las mismas funciones** - queries.ts functions
- [x] **vistas guardadas conectadas** - saved-views.ts → FilterBar
- [x] **"Ver todas las obras"** - reemplazar "Ver catálogo" en workspace.tsx
- [x] **botones de la cola sin botones muertos** - IdentifierDialog conectado
- [x] **umbral de 14 días configurable** - DEFAULT_NO_RESPONSE_DAYS
- [x] **función de completitud usada en la tabla** - computeCompleteness de queries.ts
- [x] **lista móvil (<768px)** - WorksTable ya lo tiene
- [x] **paginación (>100 obras)** - WorksTable ya lo tiene
- [x] **chips con texto y teclado** - FilterBar ya lo tiene
- [x] **queries.test.ts** - src/lib/publishing/queries.test.ts
- [x] **tsc, lint y tests sin errores** - verificación final

---

## Paso 1: RUTA - validateSearch conectada a la ruta
**Estado**: hecho
**Archivos**: src/routes/publishing.tsx, src/components/publishing/workspace.tsx
**Líneas**: publishing.tsx:1-30, workspace.tsx:1-30 (imports), 402-425 (component signature + state), 450-495 (updateSearch helper)

## Paso 2: PENDIENTES - PendingQueue montada
**Estado**: hecho
**Archivos**: src/components/publishing/workspace.tsx
**Líneas**: ~767-782 (overview section replaced with PendingQueue)

## Paso 3: OBRAS - WorksTable + FilterBar montados
**Estado**: hecho
**Archivos**: src/components/publishing/workspace.tsx
**Líneas**: ~784-832 (works section replaced with FilterBar + WorksTable)

## Paso 4: VOCABULARIO - "Ver todas las obras"
**Estado**: hecho
**Archivos**: src/components/publishing/workspace.tsx
**Líneas**: 812 (era 771)

## Paso 5: BOTONES - IdentifierDialog conectado
**Estado**: hecho
**Archivos**: src/components/publishing/PendingQueue.tsx, workspace.tsx
**Líneas**: PendingQueue.tsx:25-140 (handleActionClick, onSaveIdentifier), workspace.tsx:768-782 (onSaveIdentifier handler)

## Paso 6: PRUEBAS - queries.test.ts
**Estado**: hecho
**Archivos**: src/lib/publishing/queries.test.ts (nuevo)

## Paso 7: VERIFICACIÓN - tsc, lint, tests
**Estado**: completado
- `npx tsc --noEmit`: ✅ Sin errores
- `npx vitest run`: ✅ 57 tests passed
- `npx eslint`: Solo errores de prettier pre-existentes (CRLF, formateo), no errores causados por mis cambios

## Paso 8: REPORTE FINAL
**Estado**: completado

## Paso 8: REPORTE FINAL
**Estado**: pendiente
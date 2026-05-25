# TypeScript Errors — 44 pendientes

## Categorías

| # | Archivo | Errores | Causa |
|---|---------|---------|-------|
| 24 | `lib/__tests__/openapi.test.ts` | TS2339 | `generateOpenAPISpec()` retorna `object` — hay que tipar el spec con una interfaz |
| 8 | `components/ui/chart.tsx` | TS2339, TS7006, TS2344 | Recharts no tiene tipos compatibles con React 19 — `payload`, `label`, `map` no existen en el tipo |
| 5 | `components/ui/resizable.tsx` | TS2339 | `react-resizable-panels` export cambió — `PanelGroup`, `PanelResizeHandle` no existen |
| 1 | `components/ui/calendar.tsx` | TS2353 | `table` no existe en `Partial<ClassNames>` de React DayPicker |
| 1 | `app/api/passes/apple/[cardId]/route.ts` | TS2345 | `Buffer` no es asignable a `BodyInit` (Node vs Web API) |

## Cómo resolver

### `openapi.test.ts` (24)
Crear interfaz `OpenAPISpec` con `openapi`, `info`, `paths`, `components`, `servers`
y tipar el retorno de `generateOpenAPISpec()`.

### `chart.tsx` (8)
Actualizar `recharts` a versión compatible con React 19 o usar `// @ts-expect-error` si son falsos positivos.

### `resizable.tsx` (5)
Actualizar `react-resizable-panels` o ajustar imports a la nueva API.

### `calendar.tsx` (1)
Actualizar `react-day-picker` o castear `classNames` con `as`.

### `apple/route.ts` (1)
Usar `new Uint8Array(buffer)` o `Response` en lugar de pasar Buffer directo.

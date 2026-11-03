# Evidencia de la base — 2026-11-03

## Ejecutado en entorno aislado

- Node 22.16.0 y TypeScript global 5.8.3: ensayo **suplementario offline**, no toolchain objetivo.
- `tsc -p tests/tsconfig.offline.json` y
  `node --import ./tests/register-obsidian.mjs --test tests/*.test.mjs`: **13 PASS**.
- TDD inventario: cinco fallos esperados antes de implementar (siete tests), luego siete PASS.
- TDD shell: cinco fallos de comportamiento antes de implementar, luego cinco PASS.
- TDD unload: una regresión reproducida (modal después de desactivar), luego corregida.

Los dobles de `tests/fixtures/` están identificados como simulaciones. Los tipos
reales de Obsidian solo se verifican con el SDK instalado y `pnpm typecheck`.

## No comprobado aún

| Gate | Estado |
|---|---|
| Toolchain Node24/pnpm11.25, lock real, SDK y bundle esbuild | PENDIENTE CI de bootstrap y posterior ejecución congelada |
| Biome sobre árbol final | PENDIENTE CI |
| Carga en Obsidian desktop y piloto sintético | NOT_RUN; Mac desconectado |
| Rulesync/Vale/rumdl, hooks cargados, bloqueo real | NOT_IMPLEMENTED / NOT_RUN |
| Auditoría independiente, aprobación de integración | PENDIENTE; revisión propia no es independiente |

La configuración CI no demuestra su ejecución. Esta tabla se actualiza solo con
resultados observados del SHA correspondiente. No hay release ni instalación.

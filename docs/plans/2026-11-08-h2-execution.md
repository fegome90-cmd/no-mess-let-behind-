# H2 — Plan de ejecución B0–B2

> Superpowers: executing-plans, TDD, revisión de diff/autoridad y verificación por PR.

**Objetivo:** preferencias preservables, panel del vault actual y catálogo con impacto
estimado. **Arquitectura:** reutilizar instalador/lectores; UI imperativa y metadatos
TypeScript embebidos, sin motores nuevos. **Stack:** dependencias fijadas de A1,
Node24.22.2/pnpm11.25.0 de desarrollo. **Spec:** contrato v2 S3/S4 y plan canónico
`2026-11-04-three-milestones-v2.md`. Base: develop@382587d, A1 cerrado en PR #14.

## Restricciones globales

Sin main/release/vaults reales, políticas clínicas, ejecución de proveedores, red,
watchers ni instalación automática. data.json pertenece al usuario, no al instalador.
Fixtures sintéticos; los tests nativos no se sustituyen por mocks. Cada PR conserva
Headless + Verify y E2E Obsidian1.8.7/1.14.5 antes/después del merge.

## Validación previa y Review focus

| Riesgo / interfaz compartida | Decisión y prueba propietaria |
|---|---|
| B0 preserva datos consumidos por B1 | data.json regular <=1 MiB, JSON objeto, nunca mover/borrar; hash invalida plan concurrente |
| Recibo original y retirada | /1 sigue legible; /2 distingue INSTALLED/RETAINED_DATA, reinstalar mismo paquete |
| Catálogo usado por B2 | metadata-only embebido; paquete instalado sin checkout/profiles |
| Preferencias corruptas/futuras | B1 no guarda al cargar, no migra ni sobrescribe; sólo acción explícita |
| Observación sin hash de configuración | B1 configHash=null, presencia no implica validez; frescura y hora explícitas |
| UI tras unload | B1 invalida operaciones asincrónicas; sin procesos/watchers al arrancar |
| Estimación convertida en autorización | B2 kind=ESTIMATE, sin planId/hashes/apply y advertencia visible |

## B0 — Lifecycle y catálogo

Archivos: tools/lib/install.mjs, tests/headless/install.test.mjs,
src/features/profiles/catalog.ts, src/main.ts, tests/profiles-catalog.test.mjs,
tests/e2e/preferences-lifecycle.test.mjs y docs/headless.md.
Interfaces existentes conservadas; nueva listProfileMetadata(): readonly ProfileMetadata[].
- [x] RED observado: NOOP, retiro/reinstalación y cambios de preferencias.
- [x] GREEN: transición de assets propios y recibo, no de data.json; rollback conservador.
- [x] Catálogo inmutable con fuente/commit/licencia, todos fixture-only.
- [x] E2E real saveData→cerrar→NOOP→retirar→reinstalar→loadData y catálogo sin checkout.
- [ ] Revisión, CI completa, merge y misma batería sobre SHA integrado.

## B1 — Panel y preferencias

Archivos nuevos: src/features/governance/{preferences,view-model}.ts,
src/ui/governance-settings.ts, tests/governance.test.mjs; ampliar main, fixture SDK y E2E.
Interfaces: loadPreferences(raw), getGovernanceOverview(context); S3/S4 canónico.
- [ ] RED: entradas inválidas/futuras, no save al cargar, current-vault/configDir, timestamp,
  estado desconocido tras reinicio y cambios de contexto, continuación tras unload.
- [ ] GREEN: PluginSettingTab imperativa, refresco explícito, saveData sólo por acción;
  errores saneados, sin leer notas/configuración compartida.
- [ ] E2E UI real, persistencia/reinicio, bytes ajenos intactos y corrupción preservada.
- [ ] Revisar y fusionar con gates pre/post; no activar perfiles ni proveedores.

## B2 — Selección e impacto estimado

Archivos: src/features/profiles/impact.ts, tests/profiles-impact.test.mjs, settings y E2E.
Interfaz: estimateProfileImpact(id): ProfileImpact, sin Promise de ejecución.
- [ ] RED/GREEN: id existente/desconocido, fixture-only y rutas potenciales; sin planId/hash.
- [ ] UI persiste sólo ID; «Impacto estimado; no es un diff ni autoriza cambios».
- [ ] E2E selección, reinicio y cero cambios de políticas; review, merge/post.
- [ ] Actualizar README, arquitectura, ROADMAP y evidencia de ejecución.

## Gates y rulings de ejecución

`pnpm install --frozen-lockfile && pnpm verify:headless`; cuatro proveedores del smoke
mantenido; `NMLB_OBSIDIAN_VERSION=1.8.7/1.14.5 pnpm test:e2e` por separado.
Verificar HEAD y composición; después SHA integrado. No avanzar ante un gate requerido
FAIL/NOT_RUN/SKIPPED. Revisión propia y revisión externa se identifican por separado.

Ruling: el launcher puede crear hardlinks de assets al preparar el E2E anterior.
La prueba de empaquetado toma una copia de bytes de los tres assets en su fixture;
no se debilita el rechazo de hardlinks del empaquetador ni se acepta otro contenido.
La copia in-place del E2E de lifecycle sólo usa un vault recién generado por el test,
nunca un path de usuario. Los datos y logs sensibles no entran al repositorio.

E2E: la desactivación del host se verifica en community-plugins.json antes de
cerrar la sesión; la respuesta del método no se presume persistida en disco.

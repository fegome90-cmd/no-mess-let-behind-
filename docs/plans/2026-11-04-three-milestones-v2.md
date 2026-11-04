# No Mess Left Behind — Plan de implementación en tres hitos · v2

> **Para agentes implementadores:** usar `superpowers:executing-plans` o
> `superpowers:subagent-driven-development`, con TDD y evidencia por PR.
> Casillas sin marcar = trabajo pendiente; este documento no es un recibo de ejecución.

**Fecha:** 2026-11-04. **Estado:** correcciones de auditoría aceptadas e incorporadas.
**Objetivo:** convertir el inspector en un plano de control utilizable sin duplicar motores.
**Arquitectura:** UI nativa del vault actual; módulos headless reutilizados. Rulesync
produce configuraciones, Vale/rumdl validan, Git mantiene su gate y cada host acredita
sus propios eventos. Un único aplicador publica cambios expresamente aprobados.
**Stack:** TypeScript/esbuild/SDK Obsidian, Node24.22.2/pnpm11.25.0 de desarrollo,
node:test y harness WebdriverIO existente. Proveedores del piloto: Rulesync43.6.0,
Vale3.26.0, rumdl0.3.2, Gitleaks8.30.1; fijar/revalidar versiones en su PR.
**Spec:** [contrato v2](../specs/2026-11-04-governance-integration.md), subordinado a
`AGENTS.md` y `GOVERNANCE.md`. Leer ambos antes de implementar.

## Vigencia y base

Esta es la **única secuencia vigente para el trabajo pendiente**. Integra y sustituye
`NMLB_plan_integracion_3_hitos_2026-11-04.md` y su adenda de conversación. Los planes
2026-11-03 documentan trabajo histórico; no se reabren PR #1/#9–#12 ya terminadas.
No concede permisos sobre vaults reales.

Base `integration/headless-foundation@b08e2ab` (79 archivos; 100 tests previos),
`develop@705072a`, `main@ef5ed81`. Runtime sigue inspector; CLIs no conectadas a UI.
Revalidar refs al comenzar A1; sin force-push.

## Restricciones globales

- Solo fixtures sintéticos; no instalar en vaults reales, cambiar trust/globales o publicar releases.
- `data.json` se preserva; preferencias no conceden permisos ni sustituyen reglas del vault.
- Catálogo embebido de metadatos; B2 solo **ESTIMATE**, nunca diff ni plan aplicable.
- UI solo vault actual, `configDir` observado; lecturas de config compartida acotadas y consentidas.
- Sin ejecución en onload, watchers, shell, argv/cwd libres, descargas ni nuevos motores.
- Runtime API base 1.8.7; E2E base 1.8.7/1.14.5. Claudian/SDK solo host compatible >=1.13.0.
- No heredar Node24 del CI como capacidad de Electron. C0 demuestra compatibilidad por plataforma.
- No rollback de shared config completa; preservar cambios ajenos o declarar conflicto sin escribir.
- Git/CI no dependen de Obsidian abierto. Secretos requieren política real; estilo advisory.
- Conservación de todos los gates pre/post; ningún SKIPPED/UNKNOWN/NOT_RUN satisface uno obligatorio.

## Review Focus

1. Preferencias/archivo ajeno al retirar → B0 conserva datos.
2. Sin checkout o evidencia obsoleta → B0/B1/B2: catálogo y frescura.
3. Node distinto/adapter no local → C0/C1: no ejecutar sin soporte.
4. Edición entre preview/apply/rollback → C2: preservar o declarar conflicto.
5. Commit parcial/host sin veto → C3/C4: índice y bytes reales.

## Secuencia y mapa de archivos

IDs = unidades de trabajo, **no números de PR reservados**. Una PR por fila; C0 no habilita runtime. Tras cada merge, esperar el postgate
observado antes de comenzar la siguiente integración.

| Hito | PR | Depende de | Artefacto / responsabilidad |
|---|---|---|---|
| 1 | A1 | base auditada | Promoción exacta de headless a develop, sin nuevas capacidades |
| 2 | B0 | A1 | Lifecycle de preferencias y catálogo distribuible |
| 2 | B1 | B0 | Panel nativo, preferencias y observaciones con frescura |
| 2 | B2 | B1 | Selección de perfiles e impacto estimado, sin procesos |
| 3 | C0 | B2 | Evidencia de viabilidad Electron/CJS y raíz local |
| 3 | C1 | C0 PASS por plataforma | Puente por acciones enumeradas, runner único |
| 3 | C2a | C1 | Preview real Rulesync en scratch, sin aplicar |
| 3 | C2b | C2a | Aplicación/rollback selectivo, aprobación y conflictos |
| 3 | C3 | C1 + C2b | Gate de alcance/calidad/secretos del índice real |
| 3 | C4a | C2b + C3 | Claude CLI, primer MVP preventivo probado |
| opcional | C4b | C4a + host compatible | Claudian/Claude SDK, evidencia independiente |
| extensión | D1 / D2 | C4a | Codex / Pi; separar CLI y transporte alojado cuando aplique |

10 PR hasta el MVP CLI; C4b opcional y D1/D2 fuera del primer MVP. No cerrar issues #2–#8 antes de sus gates de producto.

### A1 — Consolidar sin alterar runtime

**Modificar:** docs/verification.md; workflows/package.json solo si un gate real falta.
**Consume:** SHA de integración y develop observado. **Produce:** develop con mismo
código funcional, CI headless y E2E de inspector; main intacto.

- [ ] Revisar diff de ambas refs y crear PR `integration/headless-foundation → develop`;
  validar que src y manifest no amplían capacidades respecto de la base.
- [ ] Ejecutar G0–G3 (abajo) sobre HEAD/composición. Smoke obligatorio: cuatro proveedores,
  ninguna fila omitida. E2E inspector 1.8.7/1.14.5, fuentes/fixtures intactos.
- [ ] Si falta un gate, reproducir su ausencia y corregir solo configuración/test; no
  reemplazar E2E con mocks ni refactorizar módulos ya auditados.
- [ ] Revisar y fusionar SHA esperado, registrar recibo y repetir G0–G3 sobre merge real.
  `git diff --exit-code <base> <integrado> -- src manifest.json` debe quedar vacío
  cuando no hubo reparación funcional autorizada. Detener si falla.

### B0 — Preferencias preservadas y catálogo presente en el paquete

**Modificar:** tools/lib/install.mjs, tests/headless/install.test.mjs, docs/headless.md
y src/main.ts (referencia metadata-only desde «Ver alcance y límites»).
**Crear:** src/features/profiles/catalog.ts, tests/profiles-catalog.test.mjs,
tests/e2e/preferences-lifecycle.test.mjs. El modal existente muestra el conteo del catálogo; el bundle debe incluirlo sin
activar perfiles. B2 reutiliza esa misma fuente.
**Interfaces:** conservar planInstall/install/planRemove/remove existentes
con estados de S3. `listProfileMetadata(): readonly ProfileMetadata[]` implementa S4.

- [ ] RED: ampliar tests del instalador: data.json permitido sin alterar NOOP, retiro
  `REMOVED_WITH_DATA_RETAINED`, recibo RETAINED_DATA y reinstalación mismo paquete;
  archivo desconocido/enlace/cambio concurrente bloquean y no borran datos.
- [ ] Ejecutar `node --test tests/headless/install.test.mjs`; comprobar fallos de
  comportamiento esperado, no errores de setup. Implementar contrato S3 mínimo.
- [ ] RED/GREEN catálogo: `node --test tests/profiles-catalog.test.mjs` tras compilar.
  Metadatos con commit/licencia/compatibilidad, sin reglas activables ni secretos.
- [ ] E2E `saveData → deshabilitar/cerrar → NOOP → retiro → reinstalar → reabrir` en
  vault generado; data.json idéntico y preferencia restaurada. Instalar solo assets
  distribuidos/recibo, sin checkout ni profiles/; catálogo accesible offline.
- [ ] G0–G3, review y commit acotado `fix: preserve preferences across plugin lifecycle`;
  merge/postgate. No añadir upgrades automáticos ni eliminación de preferencias.

### B1 — Panel de estado y preferencias del vault actual

**Crear:** src/ui/governance-settings.ts, src/features/governance/view-model.ts,
src/features/governance/preferences.ts, tests/governance.test.mjs.
**Modificar:** src/main.ts, tests/e2e/obsidian.test.mjs, tests/fixtures/obsidian.* si aplica.
**Interfaces:** `getGovernanceOverview(vaultContext): Promise<GovernanceObservation[]>`;
`loadPreferences(raw: unknown): PreferencesResult`, con S3/S4 como contrato de datos.

- [ ] RED: `CONFIG_PRESENT` no implica loaded/ejecución; configDir personalizado,
  errores saneados, corrupción de preferencias sin auto-overwrite, timestamp y
  cambio de fingerprint → STALE. Reabrir sin observaciones nuevas → UNKNOWN.
- [ ] Ejecutar `pnpm build && node --import ./tests/register-obsidian.mjs --test tests/governance.test.mjs`;
  observar RED. Implementar PluginSettingTab imperativa y refresco explícito.
- [ ] GREEN con mismo comando; E2E cambia preferencia, cierra/reabre, desactiva y
  reactiva sin duplicados. Solo data.json cambia; sin procesos ni lecturas de notas
  al arrancar, path/nombre de vault actual comprobados y sin selector externo.
- [ ] G0–G3, review de permisos y accesibilidad teclado, commit `feat: show current-vault governance`;
  merge/postgate. UI muestra «última observación», no protección continua.

### B2 — Catálogo e impacto estimado

**Crear:** src/features/profiles/impact.ts, tests/profiles-impact.test.mjs.
**Modificar:** src/ui/governance-settings.ts, tests/e2e/obsidian.test.mjs.
**Consume:** listProfileMetadata y preferencias. **Produce:**
`estimateProfileImpact(profileId: string): ProfileImpact` de S4; no Promise de ejecución.

- [ ] RED: perfil conocido/desconocido, fixture-only, fuente no instalada y rutas
  potenciales; afirmar `kind === 'ESTIMATE'`, sin planId/hash de salida ni apply.
- [ ] `pnpm build && node --test tests/profiles-impact.test.mjs` RED; implementar solo
  consulta del catálogo, selección en preferencias y etiqueta exacta de S4.
- [ ] GREEN; E2E desde paquete instalado muestra impacto y advertencias sin procesos,
  red ni escrituras de políticas. Configuración ajena con sentinel nunca aparece.
- [ ] G0–G3, review, commit `feat: show profile impact estimates`; merge/postgate.
  H2 termina aquí: herramienta de diagnóstico/selección, no editor exacto de reglas.

### C0 — Spike verificable del host (no habilita ejecución productiva)

**Crear:** tests/e2e/desktop-capability.test.mjs, tests/fixtures/desktop-probe.mjs,
docs/research/desktop-capability.md. Cambiar bundling solo en fixture de test si hace falta.
**Produce:** recibo de prueba por OS/versión/Node/Electron/CJS/adapter; NO permisos ni bridge público.

- [ ] Test de capacidad: bundle instalado en host real, FileSystemAdapter/getBasePath,
  configDir con espacios, importar runner único, ejecutar proceso sintético y
  abortar al unload. Comprobar stdout acotado y descendientes terminados.
- [ ] `NMLB_OBSIDIAN_VERSION=1.8.7 node --test tests/e2e/desktop-capability.test.mjs`
  y repetir en 1.14.5, macOS y Linux objetivo. Registrar resultado observado sin
  asumir Node24. Una API inexistente/adapter no local debe dar UNSUPPORTED sin spawn.
- [ ] Si falla una plataforma, documentar fallback CLI manual y no habilitar C1 allí.
  Si pasa, fijar la estrategia única de importación sin copiar runner ni daemon.
- [ ] G0–G3 aplicables, review del recibo, commit `test: prove desktop provider capability`;
  merge/postgate. NO exige que Windows pase para ofrecer solo plataformas comprobadas.

### C1 — Acciones enumeradas y un único runner

**Crear:** src/adapters/desktop/provider-port.ts, provider-bridge.ts y
provider-actions.ts en ese directorio; tests/desktop-bridge.test.mjs.
**Modificar:** tests/e2e/desktop-capability.test.mjs; esbuild.config.mjs solo según C0.
**Interface:** `runProvider(request: ProviderRequest, context: VerifiedVaultContext,
signal: AbortSignal): Promise<ProviderResult>`. Contexto construido internamente a
partir del adapter, no texto del usuario. Datos y acciones definidos en S5.

- [ ] RED: acciones desconocidas, argv/cwd extra, path fuera del vault, enlace,
  versión/binario distintos, entorno inyectado, salida privada, TIMEOUT/ABORTED y
  OUTPUT_LIMIT con hijo vivo; host no comprobado → UNSUPPORTED sin ejecución.
- [ ] `pnpm build && node --import ./tests/register-obsidian.mjs --test tests/desktop-bridge.test.mjs`
  RED; implementar contrato de acciones/catálogo de binarios y reutilizar runner.
- [ ] GREEN y E2E host→runner sintético en ambas versiones/plataformas habilitadas;
  cero spawn en onload, cancelación al unload y solo resumen saneado.
- [ ] G0–G3, review de permisos, commit `feat: dispatch typed provider actions`;
  merge/postgate. No ejecutar texto de notas ni ampliar acciones por configuración libre.

### C2a — Preview real, sin mutaciones del vault

**Crear:** tools/lib/profile-plan.mjs (shared core), tests/headless/profile-plan.test.mjs,
src/features/profiles/preview.ts (adaptador), tests/e2e/profile-preview.test.mjs.
**Interfaces:** `buildProfilePreview(context, profileId, signal): Promise<PreviewPlan>`
y UI delegada al mismo contrato, sin segundo generador. Consume S4/S5; produce S6.

- [ ] RED: fuentes ausentes, config/overlay local y lock, plan null/v2 inválido,
  targets inesperados, symlink, contenido privado y configuración cambiada.
- [ ] `node --test tests/headless/profile-plan.test.mjs` RED; tomar snapshot acotado
  autorizado, correr Rulesync fijado en scratch y validar plan/salidas/ownership.
- [ ] GREEN con binario real: hashes y diff de scratch, ambos targets y handlers ajenos
  preservados; ningún archivo del vault modificado. SOURCE_UNAVAILABLE sin download.
- [ ] E2E muestra diff redactado y planId real, aún sin apply. G0–G3, review, commit
  `feat: preview provider changes from immutable snapshots`; merge/postgate.

### C2b — Aplicación y reversión selectivas

**Crear:** tools/lib/profile-transaction.mjs, tests/headless/profile-transaction.test.mjs,
src/features/profiles/apply.ts (adaptador), tests/e2e/profile-transaction.test.mjs.
**Interfaces:** `applyApprovedPlan(plan, approval, context): Promise<ApplyReceipt>` y
`rollbackOwnedChanges(receipt, approval, context): Promise<RollbackReceipt>`; S6 fija
contenido/propiedad. Shared core es el único writer; UI solo delega.

- [ ] RED: fuentes/versión/lock/hash cambiados, plan sin aprobación, shared key editada,
  cambio ajeno no conflictivo, dos invocaciones, symlink, fallo parcial y rollback
  fallido. Afirmar conservación de bytes ajenos y ausencia de restauración completa.
- [ ] `node --test tests/headless/profile-transaction.test.mjs` RED; implementar
  comparación optimista, lock cooperativo, operaciones propias, readback/recibo.
  No anunciar atomicidad universal ni CAS inmune a procesos no cooperativos.
- [ ] GREEN: conflicto antes de publicar; rollback propio sin perder claves ajenas;
  pérdida de journal o fallo de recuperación → PARTIAL_CONFLICT, no éxito aparente.
- [ ] E2E `preview→approve→apply→readback→edit ajeno→rollback` en fixture, prueba de
  dos sesiones y fallo I/O. G0–G3, review de autoridad, commit
  `feat: apply and revert owned configuration changes`; merge/postgate.

### C3 — Validación independiente de Obsidian

**Crear:** tools/lib/git-quality.mjs, tools/validate-staged.mjs,
tests/headless/git-quality.test.mjs, src/features/validation/summary.ts.
**Modificar:** profiles/git y docs/headless.md. No cambiar gestor ni core.hooksPath.
**Interface:** `validateStaged(context, policy): Promise<StagedValidation>` con
`scope`, `quality`, `secrets` separados, hash del índice y política adoptada.

- [ ] RED: --only/-a/índice alternativo/worktree, staged distinto de working tree,
  rename/borrado, proveedor ausente/timeout, secreto representativo, falso positivo,
  fences/wikilinks válidos y perfil fixture-only intentando aprobar secretos.
- [ ] `node --test tests/headless/git-quality.test.mjs` RED; reutilizar inspector y
  providers sobre proyección temporal de blobs. Política real versionada/aprobada
  antes del gate productivo; ninguna muestra con datos o claves reales.
- [ ] GREEN con Git y validadores reales; commits permitidos/rechazados físicamente,
  índice/working tree intactos, Obsidian cerrado. Fallo obligatorio → rechazo;
  estilo advisory salvo política adoptada. No cerrar #5 por alcance solo.
- [ ] G0–G3 aplicables, review, commit `feat: validate staged quality and secrets`;
  merge/postgate. CLI y assets requeridos disponibles fuera del proceso Obsidian.

### C4a — Claude CLI; C4b — Claudian/Claude SDK opcional

**Crear:** tests/agent-e2e/claude-cli.test.mjs (C4a),
tests/agent-e2e/claudian-claude.test.mjs (C4b), docs/capability-matrix.md.
**Consume:** plan/transaction/policy; **produce:** evidencia por host/transporte,
versiones, configuración y acción. No producir un parser universal propio.

- [ ] C4a RED/GREEN con CLI fijada: handler ausente, trust pendiente, allow, deny,
  JSON inválido/timeout, sesión nueva, configuración ajena y rollback. `node --test
  tests/agent-e2e/claude-cli.test.mjs`; rechazo exige bytes físicos intactos.
- [ ] G0–G4 para C4a, commit `test: verify Claude CLI enforcement`, merge/postgate.
  El MVP CLI no depende de tener Claudian.
- [ ] C4b en PR distinta: fijar release/commit Claudian y SDK; Obsidian1.14.5 y
  manifest compatible (referencia >=1.13.0). Ejecutar `node --test
  tests/agent-e2e/claudian-claude.test.mjs`; repetir escenarios sobre SDK real.
- [ ] Si no hay veto, documentar UNSUPPORTED y dejar la funcionalidad sin habilitar;
  una PR solo de diagnóstico puede cerrarse sin afirmar enforcement. Si se ofrece
  veto, G0–G4 obligatorio. No probar Claudian en 1.8.7 ni inferirlo de CLI.

**D1 / D2:** Codex y Pi después de C4a, PR separadas. Revalidar contrato y trust;
CLI y app-server/RPC necesitan casos propios y G4. Elegir una sola vía mantenida
por proveedor, sin handlers duplicados. Inline Edit permanece fuera del veto del agente.

## Gates ejecutables por PR

| Gate | Comando/observación requerida | Resultado de aceptación |
|---|---|---|
| G0 · checkout | `git rev-parse HEAD`; `git status --porcelain`; `pnpm install --frozen-lockfile` | SHA revisado y base fijados; árbol limpio; exit 0 |
| G1 · base | `pnpm verify:headless`; `pnpm audit --audit-level high`; `git diff --exit-code` | Todos los tests aplicables PASS, cero omitidos; sin high/critical ni cambios tracked |
| G2 · proveedores | `bash tools/ci/fetch-providers.sh` en runner Linux efímero | Cuatro filas PASS/versiones fijadas; inspeccionar receipt, no solo exit del workflow |
| G3 · producto | `NMLB_OBSIDIAN_VERSION=1.8.7 pnpm test:e2e` y `NMLB_OBSIDIAN_VERSION=1.14.5 pnpm test:e2e` (Linux con `xvfb-run -a`) | Escenarios base+nuevos PASS; paquete instalado, fixtures preservados, receipt/OS/versiones |
| G4 · host | Comando C4a/C4b o extensión correspondiente | Trust oficial y allow/deny/error físico comprobados; no mock ni SKIPPED |
| G5 · integrado | Repetir G0–G4 requeridos tras `git checkout --detach <merge-sha>` | Misma batería y versiones, nuevo recibo del SHA integrado; fallo detiene serie |

G2 se exige en A1 y cambios del bridge/proveedores/configuración/Git; G3 en cada PR
de producto hacia develop. Documentación sin cambios funcionales en rama headless
mantiene sus gates actuales y no acredita A1. C4b exige además G3 en su versión
compatible, no instalar Claudian en el host mínimo base. Los tests nuevos se añaden
al glob/job requerido; no pueden pasar solo en el portátil del implementador.

Cada tarea: RED de comportamiento → cambio mínimo → GREEN → revisión diff/autoridad
→ HEAD y composición → merge con SHA esperado → G5. Comandos de archivos futuros
son tareas por crear, no comprobaciones ejecutables ya presentes ni tests aprobados.
Un gate opcional no aplicable se explica; un gate obligatorio sin evidencia bloquea.
No bajar CI para obtener verde. CodeRabbit omitido o por cuota no es aprobación.

## Criterios de término y cierre del diseño

**H1:** código headless promovido y E2E repetidos; sin nuevas capacidades activas.
**H2:** panel del vault actual, preferencias preservables, catálogo distribuido y
estimación rotulada; sin ejecución inesperada ni promesas de reglas inspeccionadas a fondo.
**H3 / MVP:** recorrido Claude CLI + Git en fixture, preview real, aprobación,
aplicación, allow/deny comprobados y rollback propio. Claudian se entrega solo si
su ruta separada se verifica. Main, release, vaults reales y marketplace fuera de alcance.

[AF-01–AF-10: decisiones, pruebas y estado](../research/2026-11-04-plan-corrections.md).
La incorporación de estas correcciones cierra contradicciones del documento; no
cierra los gates funcionales ni crea evidencia independiente de capacidades futuras.

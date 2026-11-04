# NMLB — Contrato de integración de los tres hitos (v2)

Fecha: 2026-11-04. Correcciones aceptadas por Felipe; alcance de esta revisión:
consolidar el diseño y su plan. **No implementa ni activa las capacidades descritas.**
El [plan canónico](../plans/2026-11-04-three-milestones-v2.md) desarrolla este contrato.
AGENTS y GOVERNANCE siguen gobernando el trabajo; ni este documento ni un recibo
conceden permisos de instalación en vaults reales, publicación o confianza de agentes.

## S1. Base y límites

Base de código: `b08e2ab4111627305ecf4955578f77dcbdfe9e44`, árbol
`eda2bc0992e6bd8083bf4cda031165943e3c5bf0`. Las PR #9–#12 están integradas en
`integration/headless-foundation`; `develop` continúa en `705072a` y `main` en
`ef5ed81`. Los 100 tests y cuatro proveedores son evidencia de la base, no del diseño futuro.

El piloto utiliza solo datos sintéticos. No leer conversaciones, credenciales ni
notas para diagnosticar configuración. Para validación de documentos C3: selección
explícita y acotada de archivos sintéticos; para Git, únicamente blobs del índice
seleccionado. Las configuraciones compartidas solo se leen tras consentimiento
acotado, para preservar claves y calcular cambios; no se muestran valores ajenos.
No watchers, ejecución en onload, telemetría, backend, auto-fix, auto-update,
descargas automáticas, selector de otro vault o DSL de políticas propio.

## S2. Autoridad y distribución

| Artefacto | Dueño / escritor admitido | Lectores y límite |
|---|---|---|
| Notas, AGENTS y reglas ya existentes | Responsable del vault | NMLB no los reescribe por adoptar un perfil |
| Preferencias `data.json` | `Plugin.saveData` del propio NMLB | Instalador preserva bytes, no los migra ni elimina |
| Assets y recibo de instalación | Instalador NMLB | UI no se actualiza ni se retira a sí misma |
| Catálogo `ProfileMetadata[]` | Build versionado, contenido en main.js | UI consume metadatos; no confiere aprobación a perfiles |
| Fuentes `.rulesync` y políticas de validación | Responsable del vault | Uso explícito de fuentes locales revisadas; no download |
| Contenido generado para agentes | Rulesync fijado, **en scratch** | Un único aplicador compartido publica un plan autorizado |
| Configuración compartida y locks | Responsable + ownership verificable | Apply/rollback mediante el mismo contrato; nunca otro writer UI |
| Índice y decisión de commit | Git + gestor de hooks existente | CLI de validación independiente de Obsidian |
| Diagnóstico y recibos | Evidencia de observaciones | No conceden autoridad ni demuestran carga por sí solos |

Reutilizar `tools/lib/{files,doctor,runner,providers,staged,install}.mjs`. Un único
runner y un único aplicador para CLI/UI. Rulesync no escribe en vivo por una segunda
vía en el mismo recorrido. No mantener generadores, parsers de hooks ni linters propios.

## S3. Lifecycle de preferencias (AF-01)

B0 amplía explícitamente el contrato del instalador **antes** de activar saveData.
`data.json` es contenido conservado del usuario: no se incluye en los hashes de
assets distribuidos, no se imprime y nunca se elimina para conseguir un directorio limpio.

- Instalación idéntica + assets y recibo intactos + `data.json` regular: `NOOP`,
  aunque hayan cambiado preferencias. No se considera ownership del contenido.
- Retiro aprobado: quitar solo los assets propios y conservar `data.json` **in situ**.
  Reportar `REMOVED_WITH_DATA_RETAINED`, no borrado completo; dejar recibo propio
  versionado de estado `RETAINED_DATA`, sin valores de preferencias.
- Reinstalar desde ese estado exige plan nuevo del **mismo paquete** y conserva los
  bytes de preferencias. Upgrades a otro paquete continúan fuera de alcance.
- Cualquier archivo adicional desconocido, enlace, asset editado, recibo inválido,
  cambio entre preview/apply o plugin habilitado bloquea la mutación. No borrar ni
  mover datos desconocidos. `--app-closed` continúa siendo declaración del operador.
- Conservar lectura acotada (máximo 1 MiB para este archivo), UTF-8 fatal cuando se
  interprete JSON y bloqueo conservador ante formato/tamaño no soportado.

La UI usa preferencias `schemaVersion: 1`, `selectedProfileId`, `expandedSections`
y `lastSelectedTab`; son presentación/selección, **no** permisos ni política activa.
Datos corruptos no se sobrescriben automáticamente al cargar: avisar y permanecer
read-only hasta una acción explícita de recuperación que preserve el original.

## S4. Metadatos, estado y estimación (AF-02/03/08/10)

`ProfileMetadata`: `id`, `label`, `sourceRepository`, `sourceCommit`, `license`,
`compatibleHosts`, `potentialPaths`, `classification: fixture-only|candidate`.
Build incorpora solo estos metadatos en main.js; no depende de `profiles/` en disco,
checkout, red ni payloads secretos. Un perfil aprobado para un vault se registra
como aprobación de una operación concreta, no cambiando globalmente el catálogo.
No sugerir que conocer metadatos significa que sus fuentes están instaladas.

`GovernanceObservation`: `surface`, `owner`, `scope`, `configured`, `installed`,
`loaded`, `execution`, `observedAt`, `configHash`, `host`, `transport`, `version`,
`source`, `evidenceRef`, `freshness`, `staleReason?`. Estados independientes:
configuración/carga `YES|NO|UNKNOWN`; ejecución `PASS|FAIL|NOT_RUN|UNSUPPORTED`;
frescura `FRESH|STALE|UNKNOWN`. ConfigHash puede ser null si no hubo lectura autorizada.
No se cambia un histórico PASS a un PASS vigente sin revalidar sus inputs.

Sin watchers: refresco manual con hora visible; al reabrir, cargar solo preferencias
y marcar observaciones `UNKNOWN` hasta refrescar. Un resultado de ejecución se
rotula «observado a las…», nunca «protección activa» permanente. Al detectar cambio
de host/configuración/versiones, marcar `STALE`; justo antes de mutar, recalcular.

B2 devuelve `ProfileImpact {kind: ESTIMATE, profileId, potentialPaths, warnings}`.
Su UI dice **«Impacto estimado; no es un diff ni autoriza cambios»**. No contiene
`planId`, `beforeHash`, `afterHash`, ni botón Aplicar. El diff real comienza en C2a.
Todo se refiere a `app.vault` actual y su `configDir` observado.

## S5. Host y acciones (AF-05/06/09)

Toolchain de desarrollo: Node24.22.2/pnpm11.25.0; esto **no** fija el Node/Electron
embebido de Obsidian. Producto base: API 1.8.7 con PluginSettingTab imperativa;
matriz 1.8.7/1.14.5. Claudian `realclaudian@2.3.38` en el commit de referencia exige
Obsidian >=1.13.0; su piloto usa 1.14.5 y no se ejecuta en 1.8.7. Revalidar el manifest
y fijar versiones de CLI/SDK/host antes de C4b; documentación no demuestra veto.

C0 prueba el bundle CJS instalado, importación del único runner, FileSystemAdapter,
raíz OS/cwd/configDir, versiones reales, procesos descendientes y unload. macOS y
Linux se prueban por separado; Windows no hereda garantías POSIX. Sin evidencia,
capacidad `UNSUPPORTED` y ninguna ejecución; puede mantenerse una CLI externa manual.

`ProviderAction` enumera `rulesync.preview`, `vale.check`, `rumdl.check`,
`gitleaks.scan`. `ProviderRequest {action, relativePaths, profileId?}` no admite
shell, argv libre, cwd libre ni texto ejecutable. El catálogo privado de acciones
resuelve ejecutable/versión/flags; un host context validado deriva la raíz activa.
Una selección local explícita de binario solo registra identidad/ruta/versiones:
no lo ejecuta al cargar ni lo convierte en permiso persistente en data.json.

`ProviderResult {status, findingCount, code, version, elapsedMs, evidenceRef}`
no expone stdout/stderr ni argumentos sensibles. `AbortSignal` y unload terminan
el grupo antes de informar cierre; contextos y salidas inválidas nunca son CLEAN.
Aplicar/rollback no son acciones libres de ProviderRequest: C2b tiene su contrato.

## S6. Preview, apply y rollback (AF-04)

`PreviewPlan`: `planVersion: 1`, `planId`, `sourceSha`, `rulesyncVersion`, `scope`,
`sourceHashes`, `beforeHashes`, `generatedHashes`, `operations`, `ownedKeys`,
`ownershipHashes`, `foreignKeysUnchanged`. `planId` cubre todos esos inputs y la raíz
canónica. No es un token de autorización; una aprobación explícita se liga al ID.

C2a toma un snapshot de fuentes locales autorizadas y config existente, sin
seguir enlaces ni copiar carpetas enteras innecesarias. Ejecuta Rulesync en scratch,
valida su plan v2 y salidas reales; calcula diff con valores ajenos redactados.
Si faltan fuentes locales revisadas, `SOURCE_UNAVAILABLE`: no inventar salida ni
instalar una fuente desde internet. No muta el vault ni sus locks.

C2b delega generación, no lógica de reglas. Un único `applyApprovedPlan` valida la
aprobación, hashes y propiedad inmediatamente antes de escribir, usa lock
cooperativo, readback y recibo. Plan alterado, fuente/versión/config/lock cambiado:
`CONFLICT` antes de publicar. Distinguir archivo íntegramente propio de shared config.

Rollback de shared config **nunca restaura un backup completo**: retirar/reponer
solo claves/handlers propios si aún coinciden con el after-image. Una edición ajena
no conflictiva se conserva; edición de una clave propia, ownership desconocido o
parser incapaz de preservación deja `CONFLICT` y no escribe. Reutilizar editor
mantenido para JSONC/TOML; no implementar parser artesanal ni normalizar todo el archivo.

`ApplyReceipt`: `planId`, `approvedAction`, `approvalRef`, `ownedOperations`,
`beforeHashes`, `afterHashes`, `readback`, `conflicts`, `rollbackStatus`. Sin prompts
ni datos sensibles. Persistencia de recibos: solo metadatos saneados; backups de
scratch no se copian a archivos sincronizados del vault. Una recuperación que
requiera valores previos debe mantenerlos en almacenamiento temporal externo,
restringido y explícito; pérdida de ese estado exige intervención, no un rollback inventado.

No existe transacción atómica universal de varios archivos ni exclusión de editores
que ignoran el lock. No afirmar que «CAS» resuelve todas las carreras del filesystem:
el contrato es comparación optimista + escritor cooperativo + conflicto explícito.
Ante fallo parcial, revertir únicamente operaciones comprobadas propias; si la
reversión falla, `PARTIAL_CONFLICT`, detener y conservar evidencia/archivos del usuario.

## S7. Validación y hooks (AF-07)

C3 usa snapshot del índice efectivo, distinto del working tree, con verificación
antes/después. Campos separados `scope`, `quality`, `secrets`; ningún NOT_RUN es PASS.
El perfil sintético Gitleaks jamás puede aprobar secretos para producción. Exigir
política versionada explícitamente adoptada (reglas mantenidas, no solo sentinel),
pruebas positivas y negativas y hash de política. Falta/fallo de proveedor obligatorio
bloquea; estilo advisory por defecto. CLI/Git/CI funcionan con Obsidian cerrado.
No cambiar core.hooksPath ni instalar otro framework sobre el existente.

C4a prueba Claude CLI; C4b opcional prueba Claudian/SDK en host compatible. Cada
ruta fija versiones, trust oficial, cwd, fuentes y correlación; comprueba allow,
deny, error, timeout, reinicio y rollback mediante bytes físicos. Inline Edit no
se presenta como interceptado. Un transporte no probado queda NOT_RUN; una ausencia
demostrada del evento se informa UNSUPPORTED. Codex y Pi son extensiones separadas.

## S8. Referencias y criterios de aceptación

- Base propia: [b08e2ab](https://github.com/fegome90-cmd/no-mess-let-behind-/tree/b08e2ab4111627305ecf4955578f77dcbdfe9e44), especialmente `tools/lib/install.mjs`, `src/main.ts`, `docs/headless.md`.
- Claudian: [manifest fijado](https://github.com/YishenTu/claudian/blob/ce394e85d951320bf3c8b32298c28d771c0daefb/manifest.json).
- Métodos: My Skills `authority-flow-audit` / `quality-plan-loop` a revisión `5211aae8843eca4966d2aee828513582a04a7c8f`; Superpowers `writing-plans`, `receiving-code-review` y `verification-before-completion`.

La [matriz de cierre](../research/2026-11-04-plan-corrections.md) vincula AF-01–AF-10
con PR, contratos y tests futuros. Corregido en diseño no significa implementado,
revisado independientemente ni validado por E2E. Las capacidades se habilitan solo
cuando su PR pase los gates del plan en HEAD, composición y SHA integrado.

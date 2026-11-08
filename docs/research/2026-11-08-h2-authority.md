# Authority-Flow Audit Report — H2

**Mode:** change-audit. **Scope:** B0 frente a develop@382587d.
**Date:** 2026-11-08. **Auditor:** Domelia, revisión propia del código candidato.
Método: my-skills/authority-flow-audit@5211aae; no aprobación independiente.

## 1. Verdict

HEALTHY dentro del alcance B0: se conserva un escritor por artefacto. El instalador
no elimina, migra ni mueve data.json; falta observar CI/merge para cerrar integración.

## 2. Surface Inventory

| Superficie | Tipo | Archivo / función | Llamada / origen |
|---|---|---|---|
| [MODIFIED] lifecycle | function | tools/lib/install.mjs: owned, transition, install, remove | CLI explícita |
| [NEW] catálogo | function | src/features/profiles/catalog.ts: listProfileMetadata | BoundariesModal |
| [UNCHANGED-AFFECTED] preferencias | method | Plugin.saveData | sólo fixture E2E en B0 |

## 3. Authority Table

| Superficie | Acción / entradas | Lecturas | Escrituras | Autoridad / competencia | Riesgo, confianza, evidencia | Decisión |
|---|---|---|---|---|---|---|
| [MODIFIED] installer | plan aprobado + paquete | assets, recibo y hash de data | assets/recibo propios, lock | authoritative; ninguna con app cerrada | INFO, high, direct-write | keep |
| [NEW] catálogo | devolver metadata | array fijado | ninguna | reader-only | INFO, high, call-chain | keep |
| [UNCHANGED-AFFECTED] saveData | persistir preferencias | objeto del usuario | data.json | authoritative; installer no lo escribe | INFO, high, call-chain | keep |

Antes/después: installer conserva propietario de assets; preferencias pasan de bloquear
retiro a permanecer in situ. Ninguna selección confiere autoridad de ejecución.

## 4. Pipelines Detected

[MODIFIED] CLI→plan→approve→lock→transition→readback: single-pipeline para assets.
[UNCHANGED-AFFECTED] Plugin.saveData→data.json: sigue single-pipeline, no UI nueva en B0.
[NEW] build→catálogo→modal: reader-only, no instalación de perfiles.

## 5. Duplications and Conflicts

[MODIFIED] La revisión detectó que una lectura posterior a la revalidación podía
aceptar otro snapshot de preferencias. Dos inyecciones deterministas reprodujeron
la aceptación del plan anterior; se corrigió comparando el snapshot inmediato con
plan.stateHash antes de cualquier transición. No se escribe data.json.

[BASELINE] No doble escritor activo detectado en el alcance. La declaración app-closed
y la comprobación de plugin deshabilitado son precondiciones, no garantía contra un
actor hostil que cambie el filesystem. No se afirma transacción universal.

## 6. Side Effects and Contention Points

[MODIFIED] transitions generan backup temporal de assets y publicación exclusiva.
Ante conflicto de recuperación conservan backup/lock y no sobrescriben terceros.
El plan incluye snapshot de preferencias; el readback vuelve a comprobar su hash.
Fallos ENOSPC sintéticos durante publicación del recibo restauran assets sin tocar datos.

## 7. Proposed Official Entrypoints

[MODIFIED] planInstall/install/planRemove/remove mantienen la API CLI oficial.
[UNCHANGED-AFFECTED] datos del usuario sólo por Plugin.saveData. Sin ruta alternativa UI.

## 8. Surfaces That Must Not Mutate Official State

[NEW] catálogo sólo metadatos. [MODIFIED] installer no escribe preferencias.
[BASELINE] notas/AGENTS/hooks ajenos siguen fuera de las mutaciones permitidas.

Checklist de cambio: (1) escritor en estado ajeno CLEAR; (2) nuevos entrypoints CLEAR;
(3) evidencia como permiso CLEAR; (4) side effects CLEAR acotados a assets/recibo;
(5) validación CLEAR, fortalecida; (6) legado CLEAR, /1 sólo compatible;
(7) expansión de autoridad CLEAR, data sólo lectura; (8) pipeline CLEAR, single-writer.

## 9. Prioritized Risks

[INFO/high/direct-write] conservar bloqueo y backup ante recuperación conflictiva.
[LOW/high/docs-only] no representar el catálogo fixture-only como política productiva.
No hay cambios de dependencias, red, procesos de runtime o trust.

## 10. Recommended Intervention Order

Cerrar B0 con CI/E2E sobre HEAD/composición y SHA integrado. Después B1 introduce
un writer explícito de preferencias y exige nueva revisión; B2 permanece ESTIMATE.

## 11. Uncertainties and Evidence Gaps

No se certifica recuperación tras pérdida eléctrica ni seguridad contra filesystem
hostil. Los tests Linux/macOS no acreditan Windows. Revisión propia no independiente;
la revisión fresca y los resultados de CI deben identificarse por SHA en la PR.

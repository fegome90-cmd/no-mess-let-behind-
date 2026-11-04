# Aplicación de las correcciones del plan · AF-01–AF-10

Fecha: 2026-11-04. Decisión del responsable: aplicar las correcciones propuestas.
**Resultado de diseño:** incorporadas al [plan v2](../plans/2026-11-04-three-milestones-v2.md)
y [contrato](../specs/2026-11-04-governance-integration.md). **Resultado funcional:**
no implementado en esta revisión. No se convierten especificaciones en tests PASS.

## Matriz de trazabilidad

| Hallazgo | Corrección incorporada | PR y prueba propietaria | Estado de implementación |
|---|---|---|---|
| AF-01 | S3: NOOP con preferencias; retiro de assets preserva datos y recibo; reinstalación mismo paquete | B0: saveData→NOOP→remove→reinstall, bytes iguales; ajeno bloquea | PENDIENTE |
| AF-02 | S4: catálogo solo de metadatos dentro del bundle, sin checkout | B0: instalado desde assets, offline, sin profiles/ | PENDIENTE |
| AF-03 | S4: B2 produce ESTIMATE, sin planId/diff/hash/aplicar; diff real en C2a | B2: no procesos; C2a: Rulesync real y snapshot | PENDIENTE |
| AF-04 | S6: escritor único, plan inmutable, conflicto, rollback solo propio; nunca backup completo compartido | C2b: edit ajeno, lock perdido, fallo parcial y readback | PENDIENTE |
| AF-05 | S5: C0 prueba Electron/Node/CJS/adapter antes de habilitar bridge, por OS | C0: bundle real, unload y descendientes; C1 reutiliza runner | PENDIENTE |
| AF-06 | S5/S7: Claude CLI separado de Claudian/SDK; base1.8.7, host Claudian >=1.13.0 | C4a CLI; C4b 1.14.5, sin inferir equivalencia | PENDIENTE |
| AF-07 | S7: política Gitleaks real adoptada, fixture-only nunca aprueba producción | C3: política/versiones, positivos/negativos, proveedor ausente | PENDIENTE |
| AF-08 | S4: fecha, fingerprint, host/transporte/frescura; UNKNOWN al reabrir | B1: invalidación y refresco; C2 recalcula antes de escribir | PENDIENTE |
| AF-09 | S5: ProviderRequest enumerado, contexto privado desde adapter, sin argv/cwd libres | C1: acciones extra, escapes, binario/config cambiados, no spawn | PENDIENTE |
| AF-10 | S1/S4: vault actual; metadatos vs lectura acotada consentida; UI saneada | B1/B2: configDir, sentinel, cero cambio fuera del vault | PENDIENTE |

Se aceptan los diez hallazgos; no se reabren los seis defectos de código de la
auditoría PR9–12 que ya fueron reparados. «AF» identifica diseño futuro, no un
regreso de los hallazgos A01–A06 de la base headless.

## Decisiones que resuelven ambigüedades sin ampliar el MVP

- No se introduce un actualizador: B0 cubre reinstalación del mismo paquete y
  conserva data.json en su carpeta. Retiro parcial con datos retenidos se declara.
- El catálogo no instala perfiles. C2a consume fuentes locales revisadas;
  fuente ausente da SOURCE_UNAVAILABLE. No descarga automática ni política implícita.
- El plan v1 de NMLB envuelve un plan v2 de Rulesync; sus versiones no se confunden.
- Configuración se genera en scratch y solo un aplicador publica cambios aprobados;
  no existe un writer genérico adicional en UI. Locks son cooperativos, no una
  transacción universal contra cualquier proceso del filesystem.
- C4a define el primer MVP; C4b es opcional con gate propio. D1/D2 continúan separados.
- La antigua instrucción de «seleccionar un vault» se reemplaza por inspeccionar
  el actual. Cerrar el plan no habilita acceso a otros vaults.

## Control de revisión

Una consolidación, seguida de comprobación de cobertura AF-01–AF-10, dependencias,
interfaces, enlaces y límites de permisos. Plan <=20 KiB y <=450 líneas. Máximo
dos pasadas correctivas documentales ante hallazgos nuevos; no extender a features
ni ejecutar A1 por inferencia. Una revisión externa, si se obtiene, se registra
por separado; no se presume independencia a partir de esta auto-revisión.

Criterio de cierre documental: diez hallazgos mapeados sin contradicciones abiertas,
plan/spec consistentes y diff sin código/workflows. Criterio funcional: permanece
pendiente y se prueba en cada PR de implementación, con G0–G5 pre/post.

## Identidad de las entradas preservadas

Los originales se mantienen en los artefactos de conversación; el repositorio
recibe una síntesis consolidada, no tres autoridades paralelas ni datos privados.

| Entrada | SHA-256 de bytes originales |
|---|---|
| `NMLB_plan_integracion_3_hitos_2026-11-04.md` | `9411260f234ffb6226fdfca1a72f85d864514d686f301e6d08947e6e9f8fe85f` |
| `NMLB_plan_adenda_correctiva_2026-11-04.md` | `fa4215c25ee273f00a4b511167808627eec3c420f07745b6af8be7aecde6b63b` |
| `NMLB_auditoria_plan_3_hitos_2026-11-04.md` | `4adaa85c11c35128848b951531e0ffd0d3b3bcd4391a3d7ec5716f179853abf5` |

Base cotejada: `b08e2ab4111627305ecf4955578f77dcbdfe9e44`.
Métodos de esta aplicación: Superpowers `writing-plans`, `receiving-code-review`,
`using-git-worktrees` y `verification-before-completion`; verificación de fuentes
con GitHub/Files. Las referencias de My Skills de la auditoría se preservan en S8.
No se atribuye trabajo a subagentes ni se modifica la constitución del repositorio.

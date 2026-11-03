# Integraciones NMLB por PR y gates antes/después del merge

Fecha: 2026-11-03. Autoridad: Felipe solicitó «organiza las integraciones por PR,
revisa cada uno y testea la ejecucion completa previo y post cada merge».
Esta instrucción autoriza merges condicionados en este repositorio y pruebas en
entornos sintéticos. No autoriza releases, modificar vaults reales, configuraciones
globales de agentes, omitir confianza o modificar protección de ramas.

## Secuencia y entregables

Los IDs I1–I7 son hitos, no números de PR reservados. Se abre una PR implementable
por integración; no se crean PR vacías para simular avance. Cada rama nace del
último develop verificado, con worktree aislado y un escritor. Las integraciones
pendientes se registran como issues, enlazadas a este plan y sus dependencias.

| Hito | PR / entrega | Dependencia | Gate E2E particular |
|---|---|---|---|
| I1 | PR #1: fundación, lifecycle y harness E2E real | Investigación revisada | Bundle cargado en Obsidian, comandos y reportes, disable/reload, notas intactas |
| I2 | Diagnóstico Claudian y matriz host/transporte | I1 post-merge verde | Metadata acotada, ausente/deshabilitado/cargado distintos, settings inválidos seguros; nunca certificar hooks |
| I3 | Rulesync: preview de distribución sin instalación | I2 y contrato de proveedor | Versión fijada, preview acotado/redactado, no escrituras, config ajena preservada, fallos explícitos |
| I4 | Vale + rumdl: validación editorial/sintáctica en lectura | I3: ejecución externa segura | Corpus español y Obsidian, bloques protegidos, códigos de salida reales, notas intactas |
| I5 | Gate Git staged + secretos, sin reemplazar gestor | I4 | Staging parcial, renombres/borrados protegidos, nombres difíciles, Gitleaks real, mismo resultado CI |
| I6 | Claude CLI + Claudian/SDK: primer flujo preventivo | I3/I5 y confianza oficial | allow/deny/error correlacionados, bytes intactos al denegar, hooks ajenos y rollback selectivo |
| I7 | Pi CLI/RPC y Codex CLI/app-server, PR separada por proveedor | I6 post-merge verde | Elegir una vía mantenida, carga por transporte y denegación física; unsupported no es PASS |

Gemini/Antigravity y observación poscambio de Obsidian quedan como PR opcionales,
sólo después de verificar el host concreto y una necesidad no cubierta. No se
importa el runtime Python HookFlow ni se mantiene un nuevo parser/editorial engine.

## Gate previo a cada merge

1. Releer alcance, diff, propietarios y dependencias; revisión propia y revisión
   externa real cuando esté disponible. CodeRabbit omitido/pending no es aprobado.
2. Congelar head SHA y base SHA; actualizar la base si cambió y repetir pruebas.
3. `pnpm install --frozen-lockfile`, `pnpm verify` y E2E de producto en Obsidian
   aislado. Probar el bundle compilado, no sólo importar código contra mocks.
4. Probar la composición propuesta con base (merge ref o merge local sin publicar)
   y verificar que no cambie fuente, notas de fixture ni configuración ajena.
5. Adjuntar recibo: SHA, versiones, comandos, resultados, cobertura, límites,
   hashes de bundle y evidencia. Ausencias/error/timeout se reportan, no se saltan.
6. No fusionar con fallos materiales sin resolver o E2E requerido NOT_RUN.

## Merge y gate posterior

Merge explícito con head esperado, nunca force ni bypass de protección. No auto-merge
sin evidencia del SHA aprobado. Leer el SHA que GitHub realmente integró.

Desde checkout limpio de ese SHA: repetir instalación congelada, verify y **el
mismo E2E**, además de la CI del push a develop. Comparar resultados, bundle y
preservación. No comenzar la siguiente integración hasta pasar este gate.

Si el gate posterior falla: detener la serie, registrar fallo y aislar reparación;
no continuar apilando merges ni resetear historia. Revertir mediante commit/PR
revisable cuando sea la opción segura y dentro de la autorización del encargo.

## Entorno de prueba

Mac conectado: clon y worktree desechables bajo TMPDIR; Node24/pnpm11 instalados
sólo en ese directorio. No cambia Homebrew ni el Node/pnpm global del usuario.
Obsidian se lanza con wdio-obsidian-service en perfil y vault copiados aislados;
no se automatiza la instancia que usa los vaults personales. CI repite la prueba
en runner efímero. Credenciales de agentes y sesiones reales no entran al fixture.

## Evidencia y honestidad de alcance

Los tests unitarios, E2E Obsidian, E2E proveedor y revisión son gates distintos.
Un test de diagnóstico Claudian puede usar un fixture de metadata; no acredita
que el runtime Claudian o un agente haya ejecutado un hook. Cada PR declara qué
recorrido completo implementa y qué recorridos futuros siguen NOT_IMPLEMENTED.

Las integraciones cuya ejecución nativa o confianza no pueda verificarse permanecen
bloqueadas. No hay promoción a main ni release implícita al integrar en develop.

## Backlog trazado en GitHub

- I2: #2, diagnóstico Claudian.
- I3: #3, preview Rulesync.
- I4: #4, validadores editoriales/sintácticos.
- I5: #5, índice Git y secretos.
- I6: #6, Claude CLI/Claudian.
- I7a: #7, Pi CLI/RPC.
- I7b: #8, Codex CLI/app-server.

Estas issues describen futuras PR y sus gates; no son integraciones implementadas.

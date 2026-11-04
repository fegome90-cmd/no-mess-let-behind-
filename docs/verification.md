# Evidencia de la base — 2026-11-03

## TDD aislado

Node 22.16.0 y TypeScript global 5.8.3 se usaron solo como ensayo suplementario
offline. `tsc -p tests/tsconfig.offline.json` seguido de
`node --import ./tests/register-obsidian.mjs --test tests/*.test.mjs`: **13 PASS**.

Inventario: cinco fallos de comportamiento antes de implementar (siete tests),
luego siete PASS. Shell: cinco fallos antes de implementar, luego cinco PASS.
Unload: una regresión reproducida (modal después de desactivar), luego corregida.
Los dobles de `tests/fixtures/` son simulaciones; nunca SDK oficial ni app real.

## Bootstrap de dependencias y SDK real

[Run 41634169655](https://github.com/fegome90-cmd/no-mess-let-behind-/actions/runs/41634169655)
ejecutó en Node **24.22.1**, pnpm **11.25.0**, TypeScript **5.9.3** y SDK Obsidian
**1.8.7**. `pnpm verify`: Biome, tipos, **13 tests** y esbuild completados.

Precisión: ese run partió de `2042d50f4e9777e35ea1970eaec0cd3f3bf81639` y normalizó
formato en su copia efímera antes de probar. Su verde corresponde al **candidato
normalizado**, no a afirmar que el árbol original pasara lint sin cambios.
El patch se inspeccionó y aplicó al código; el lock y el bundle se recuperaron del
artefacto **13229353060**, cuyo SHA-256 fue comprobado:
`e27912fa681ba42741d4f64a6fe3924b4454b98c909a03055308d3bf7c22f13b`.

Un primer run falló porque pnpm 11 ya no lee `pnpm.onlyBuiltDependencies` desde
package.json. Se corrigió la causa con `pnpm-workspace.yaml`, autorizando únicamente
`esbuild@0.25.5`; no se desactivó el control ni se autorizaron todos los builds.

## Gate final y límites

La CI permanente **Verify** ejecuta `pnpm install --frozen-lockfile`, `pnpm verify`
y `git diff --exit-code` sobre el HEAD de la PR. Su resultado por SHA es la evidencia
vigente; este archivo no se autoactualiza ni sustituye el check de GitHub.
La CI no modifica ramas, formatea fuentes ni publica una release. Las acciones
están fijadas por SHA; el bootstrap temporal se retiró.

| Verificación | Estado |
|---|---|
| Lock real y candidato normalizado con SDK oficial | Comprobados en el run citado |
| Instalación congelada y verify del SHA final | Consultar check Verify de la PR, no inferir del bootstrap |
| Carga en Obsidian desktop y piloto sintético | NOT_RUN; Mac desconectado |
| Rulesync/Vale/rumdl, hooks cargados, bloqueo real | NOT_IMPLEMENTED / NOT_RUN |
| Auditoría independiente y autorización de integración | PENDIENTES; revisión propia no equivale a revisión independiente |

No hubo instalaciones en vaults, cambios globales en estaciones, merge ni release.

## Fase de integración por PR — evidencia más reciente

Mac conectado, clon/worktree desechables y toolchain Node24.22.2/pnpm11.25.0 local
al entorno de prueba. La primera ejecución Obsidian 1.14.5 reprodujo dos fallos
relacionados: modal retenido al desactivar e interferencia en la reactivación.
Se añadieron dos regresiones unitarias (RED observados) y se corrigió el lifecycle.
Después: 15 pruebas unitarias y los seis escenarios E2E tanto en Obsidian 1.8.7 como
en 1.14.5 pasaron. Son pruebas del producto actual, no E2E de Claudian/proveedores.

La CI `Verify` ahora usa el merge ref de la PR por defecto; después del merge usa
el SHA del push a develop. Ejecuta instalación congelada, verify y matriz Obsidian.
Los recibos por SHA y las capturas se publican como artefactos de cada ejecución.
Los primeros ensayos locales incluyen `sourceDirty: true`; no se presentan como
validación del commit final. El gate final exige volver a probar el SHA publicado
sin cambios, y después el SHA realmente integrado. Consultar esas ejecuciones.

### Revisión externa y dependencias

CodeRabbit identificó un gate ausente sobre la composición de la PR y dos errores
en la reproducción de investigación. La CI ahora verifica HEAD y merge ref por
separado; el probe HF-R06 exige exit 0 y ausencia del sentinel en stdout **y** stderr
(cuatro casos RED/GREEN comprobados). El comando del informe usa la ruta desde raíz.

El primer runner WebdriverIO9 introdujo cuatro avisos altos de dependencias; se
sustituyó por 10.1.0 y se repitieron los E2E. El audit final observa **0 altos/0
críticos y 3 moderados de desarrollo**: moment del SDK y glob/minimatch del runner.
No están incluidos en el bundle del plugin; los paths/patrones del harness son
fijos y sintéticos. No se ocultan ni se fuerza un cambio mayor de transitivas para
silenciar el scanner. El gate automatizado rechaza avisos altos/críticos; esta
clasificación de alcance no es una afirmación de ausencia de vulnerabilidades.
Las actualizaciones se siguen por Dependabot y deben repetir E2E y audit.

## A1 — Contrato de promoción a develop · 2026-11-04

Las secciones anteriores conservan evidencia histórica; no describen por sí solas
el estado actual de una rama. El estado de A1 lo determinan el SHA integrado y sus
checks/recibos, enlazados en la PR de promoción, no esta entrada prospectiva.

Encargo explícito de Felipe: planificar, auditar, verificar y aplicar A1 del
[plan v2](plans/2026-11-04-three-milestones-v2.md). Base observada:
`develop@705072ad28ae16f55f1a389e810d541b00a989cf`; origen funcional:
`integration/headless-foundation@8691e4eb330e538df4007a89bf9e1ca42e9a81f0`.
La promoción incluye esa base, este registro y la reparación acotada de rutas
del índice descrita abajo; no introduce B0, configuración global, hooks activos,
release o cambios en main.

### Preflight y revisión

El diff de promoción no altera src/, manifest.json, styles.css, bundler,
dependencias fijadas ni el workflow Verify. Incorpora módulos headless ya revisados
y su workflow, que también se ejecuta en PR y push a develop. La revisión externa
detectó un rechazo incorrecto de índices explícitos que atraviesan un ancestro
simbólico. Se reprodujo antes de corregir (RED) y se repara sólo su resolución de
ruta y el helper de temporales; no se relajan los controles del índice final.

La copia de inspección usa un worktree de snapshot validado contra el árbol remoto,
no un clon del historial. Los ensayos Node22 locales de pruebas headless son
suplementarios; la aprobación depende de Node24.22.2/pnpm11.25.0 en CI limpia.

### Gates obligatorios y cierre

1. Headless sobre HEAD y composición: lock congelado, 89 headless + 15 contratos,
   lint/tipos/build, audit sin high/critical, cuatro proveedores reales y paquete.
   Leer el recibo de proveedores: ninguna fila requerida puede estar omitida.
2. Verify sobre HEAD y composición; E2E real del bundle en Obsidian1.8.7 y1.14.5
   sobre la composición: seis escenarios por versión, fuentes y fixtures intactos.
3. Revisar diff y comentarios; un check CodeRabbit SKIPPED o por cuota no se cuenta
   como aprobación. La revisión propia y la independiente se registran por separado.
4. Fusionar sólo el HEAD revisado tras comprobar que la base no cambió. Repetir
   Headless y Verify/E2E sobre el SHA real de develop; no continuar B0 ante un fallo.
5. Comparar recibos, checksums y source.zip antes/después de integrar. Separadamente,
   comprobar contra la base completa 705072ad28ae16f55f1a389e810d541b00a989cf:
   `git diff --exit-code <base> <integrado> -- src manifest.json styles.css
   esbuild.config.mjs pnpm-lock.yaml pnpm-workspace.yaml .github/workflows/verify.yml`.
   Comparar también los objetos dependencies/devDependencies/optionalDependencies/
   peerDependencies/engines y packageManager de package.json: deben ser idénticos.
   Excepción explícita: los scripts headless añadidos en package.json son parte
   intencional de la promoción; no se exige igualdad del archivo completo.
   Confirmar main en ef5ed81 y registrar run IDs, SHA y límites en el cierre.

Estos E2E usan un vault y perfil sintéticos en Linux CI; no abren vaults del usuario
ni certifican hosts Claude/Claudian/Codex/Pi. Los tres avisos moderados heredados de
desarrollo se vuelven a consultar; no se declara ausencia universal de defectos.
Esta sección no afirma que los gates futuros hayan pasado: consultar la ejecución
observada por SHA y el recibo final de la PR.

### Hallazgos de revisión A1 y regresión de rutas

La revisión CodeRabbit añadió tres precisiones documentales (gates aplicables,
adquisición de proveedores y comparación contra base), además de dos hallazgos
relacionados con rutas de temporales/índice. Se canonicaliza el padre de un
GIT_INDEX_FILE explícito antes de confinarlo al gitdir; el componente final sigue
sometido a lstat y no puede ser un enlace. El índice por defecto no cambia.
El helper de tests crea temporales desde realpath(tmpdir()), sin ocultar el caso:
las nuevas regresiones construyen deliberadamente ancestros simbólicos.

Cuatro regresiones verifican índice con ruta absoluta/relativa alias, rechazo de
índice-final simbólico o fuera del gitdir, y helper con TMPDIR alias. RED observado:
tres fallos y un control negativo correcto; GREEN después de la reparación.
Es una corrección headless de integración; no modifica src ni el bundle del inspector.
La reproducción usa Linux y enlaces sintéticos, no una ejecución macOS no observada.

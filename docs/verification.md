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

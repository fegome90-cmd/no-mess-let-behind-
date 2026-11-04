# Herramientas sin abrir Obsidian

Estado: desarrollo separado del plugin activo. Nada se ejecuta al cargar Obsidian.
Consultar el [plan](plans/2026-11-03-headless.md) para alcance y gates pendientes.

## Diagnóstico estático

```sh
node tools/doctor.mjs --vault /ruta/al/vault --config-dir .obsidian
```

Sólo lee el manifest de `realclaudian` y la lista de plugins habilitados. Rechaza
links, archivos de tamaño excesivo y JSON incorrecto. No lee `data.json`, notas,
conversaciones ni configuraciones de agentes. `CONFIGURED` no significa cargado;
`loaded: UNKNOWN`, hooks `NOT_RUN`. No descubre automáticamente configDir: indicar
el directorio correcto cuando se usa uno personalizado.

## Pruebas

```sh
pnpm install --frozen-lockfile
pnpm verify:headless
```

Incluye lint, tipos contra SDK, pruebas de contrato y bundle; ninguna de esas
operaciones abre Obsidian. Los tests nuevos utilizan temporales desechables.

## Procesos y proveedores

`tools/lib/runner.mjs` sólo acepta un ejecutable absoluto y argv separado. No usa
shell, no hereda credenciales del entorno y acota duración/salida; cancelación,
fallo y timeout no equivalen a PASS. Los detalles de stdout/stderr quedan internos;
los resúmenes públicos exponen estados y conteos. El proceso no está sandboxed:
no ejecutar binarios o configuraciones arbitrarios de un vault no confiable.
La terminación del grupo no depende de que el padre mantenga abiertos sus pipes;
no se certifican procesos que abandonan el grupo ni equivalencia en Windows.
Sólo el consumidor Git puede suministrar su índice absoluto como GIT_INDEX_FILE;
no se admite un entorno arbitrario.

`tools/provider-smoke.mjs` ejecuta Rulesync, Vale, rumdl y Gitleaks en temporales
creados por el propio script; no recibe una ruta de vault real. Las versiones y
flags están centralizados en `tools/lib/providers.mjs`. La CI descarga releases
fijadas con checksum y conserva el lock npm resuelto de Rulesync como evidencia.
Esta prueba de compatibilidad no equivale a adoptar sus transitivas congeladas.

Los perfiles de `profiles/` son ejemplos sintéticos para probar contratos. No
son políticas clínicas ni un estándar de redacción. **La regla Gitleaks sólo
reconoce un marcador de prueba y no debe usarse como política de secretos real.**
Rulesync primero debe emitir un plan v2 válido con ambos targets y conservar
intacto el fixture durante el dry-run. Después se genera exclusivamente dentro
del mismo temporal para comprobar que el plan coincide y que los handlers propios
y ajenos permanecen una sola vez, junto con la configuración no relacionada.
No se ejecutan hooks ni agentes y no se escribe en vaults reales. El plan enumera
operaciones, no payloads: esa segunda comprobación no se infiere del JSON del plan.
Los resultados reales se leen en el artefacto `provider-evidence-<revisión>-<SHA>`
de cada CI. Los casos de auditoría y límites están en
[el contrato de reparación](research/2026-11-04-provider-fixes.md).

## Índice de Git (sólo alcance)

```sh
node tools/staged.mjs --vault /ruta/al/repo --git /usr/bin/git --protect 00_KERNEL
```

La inspección trabaja sobre blobs staged, no sobre la versión corregida pero aún
no preparada del working tree. Revisa el origen y destino de renombres, borrados,
modos de archivo, límites de tamaño y entradas ambiguas. No cambia el índice ni
instala hooks. `scopeStatus: PASS` sólo aprueba alcance; `quality` y `secrets`
permanecen `NOT_RUN`. No usar esta salida como aprobación completa de un commit.

`profiles/git/pre-commit.example.yaml` es una entrada local opcional que se revisa
y combina con el gestor existente. No sustituye su configuración ni los chequeos
editoriales/secretos. Requiere que estas herramientas existan en el checkout; no
contiene descarga o instalación automática.

Se utiliza el índice efectivo de Git: GIT_INDEX_FILE se resuelve respecto del
directorio de invocación y se valida dentro del gitdir de este worktree. Esto
incluye los índices temporales de commit --only y -a. Índices externos, ausentes
cuando se declararon explícitamente, enlaces y contextos no soportados fallan
sin volver silenciosamente al índice ordinario. No se hereda todo el entorno.
La inspección verifica también los bytes del índice antes y después.

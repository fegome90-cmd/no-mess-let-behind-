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

## Empaquetar e instalar (operación manual)

El paquete contiene exactamente `main.js`, `manifest.json`, `styles.css` y
`SHA256SUMS`. Crear una carpeta nueva después de compilar; no sobrescribe releases:

```sh
pnpm build
node tools/package.mjs --build "$PWD" --out /ruta/a/paquete-nuevo
```

Primero cerrar Obsidian y deshabilitar el plugin si estuviera habilitado. Revisar
el paquete, su origen y la ruta del vault. El instalador NO descarga dependencias,
NO ejecuta el bundle, NO abre Obsidian y NO activa plugins. No existe auto-update.
El padre de la carpeta de salida y el configDir del vault deben existir.

Previsualización sin escritura (modo predeterminado):

```sh
node tools/install.mjs --vault /ruta/al/vault --package /ruta/a/paquete-nuevo
```

Leer el plan, conservar su `planId` y aplicarlo explícitamente:

```sh
node tools/install.mjs --vault /ruta/al/vault --package /ruta/a/paquete-nuevo \
  --apply --app-closed --expect PLAN_ID_REVISADO
```

`--app-closed` es una **declaración del operador**, no una detección automática de
procesos. Un plan distinto/caducado, checksum incorrecto, destino ajeno, enlace o
plugin configurado como activo interrumpe la operación. Se usa staging privado,
rename final, lectura posterior y lock cooperativo. La activación se hace a mano
después de la revisión; en esta entrega no se ha instalado en ningún vault real.

Retiro: generar un segundo plan con `--remove` (sin `--package`), revisar su ID y
repetir con `--apply --app-closed --expect ...`. Sólo retira los archivos propios
cuando todos conservan sus hashes y no hay entradas adicionales. `data.json`,
cambios manuales u otros archivos bloquean el retiro para revisión humana; no se
borran para dejar el directorio limpio. No limpia automáticamente locks abandonados.

La repetición sobre el mismo paquete intacto devuelve `NOOP`. Un paquete distinto
sobre una instalación existente requiere migración futura: no se implementó un
upgrade que pudiera destruir configuración. El recibo y los checksums prueban
consistencia de bytes, no firma/autenticidad del editor ni protección frente a un
propietario malicioso del filesystem. No modificar el árbol durante la operación.

## Estado de integración

La serie se integra de forma secuencial en `integration/headless-foundation`.
Cada PR requiere verificación del HEAD, de su composición y del SHA integrado;
los resultados observados se registran en su revisión y artefactos de CI. No se
promueve a develop/main ni se publica una release en esta fase.

Las herramientas headless no están enlazadas a comandos de la interfaz. Sus
pruebas de filesystem, procesos, Git y proveedores no certifican ejecución bajo
Obsidian/Claudian ni hooks nativos. El workflow de producto conserva sus gates.
El empaquetador también rechaza UTF-8 dañado en el manifest; nunca sustituye
bytes inválidos para aprobar un paquete.

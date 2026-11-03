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

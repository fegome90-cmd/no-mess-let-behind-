# No Mess Left Behind

Base de un plugin de Obsidian para gestionar reglas de un vault con herramientas
existentes. **Esta entrega es un inspector de configuración de solo lectura**, no
un gestor de hooks terminado ni una capa de seguridad instalada.

## Qué funciona en esta base

Dos comandos en la paleta: **Inspeccionar configuración del vault** y **Ver alcance
y límites**. Un icono de escudo abre la misma inspección. Consulta la existencia
de siete rutas convencionales de AGENTS, Rulesync, Vale, rumdl y pre-commit.
Presenta `PRESENT`, `ABSENT` o `ERROR`; la ejecución permanece `NOT_RUN`.

Una ruta presente puede ser un directorio o una configuración inválida. No prueba
instalación, carga, compatibilidad ni bloqueo. Esta versión no lee cuerpos de notas,
parsea políticas, ejecuta procesos, usa red, guarda estado ni escribe en el vault.
No tiene trabajo de fondo. Los errores se muestran con códigos, sin copiar mensajes
que puedan contener datos privados.

## Base reutilizada

- **Kit Fundador LEGO:** piezas explícitas, TypeScript estricto, tests de JavaScript
  compilado con `node:test`, versiones fijadas y separación entre evidencia y adopción.
  El starter es un backend Fastify: no se importa su servidor en Obsidian.
- **Sample oficial de Obsidian:** API nativa y bundle CommonJS con esbuild; sin React.
- **Constitución Agéntica v1.1:** autoridades y aplicación local en [GOVERNANCE.md](GOVERNANCE.md).
- **My Skills y plugins de trabajo:** selección y procedencia en [SKILLS.md](SKILLS.md).

Rulesync, Vale y rumdl siguen siendo proveedores **candidatos**, no dependencias
instaladas ni adaptadores probados. No hay motor, DSL de políticas, traductor de
hooks, linter, daemon, servidor MCP ni base de datos propios.

## Desarrollo

Toolchain de destino: Node 24 y pnpm 11.25.0. Estas versiones son de desarrollo;
no se exige Node 24 al runtime Electron de Obsidian. Dependencias directas exactas.

```sh
pnpm install --frozen-lockfile
pnpm run verify
```

La instalación congelada requiere `pnpm-lock.yaml` obtenido del registro, no
reconstruido a mano. Durante el bootstrap se prepara en una CI aislada; no se
declara reproducibilidad completa hasta versionar ese artefacto y verificarlo.

`verify` ejecuta Biome, TypeScript, pruebas y bundle. `pnpm format` modifica solo
este repositorio y debe usarse intencionalmente; nunca es un hook de un vault.
Las pruebas simulan la superficie de Obsidian; **no prueban la aplicación real**.

## Piloto de Obsidian pendiente

Solo después de revisar el artefacto y autorizar una instalación, usar un vault
sintético. Copiar `main.js`, `manifest.json` y `styles.css` al directorio del plugin
y habilitarlo manualmente. No abrir un vault de trabajo real para probar esta base.
El manifiesto declara desktop y API mínima 1.8.7; compatibilidad en la aplicación
sigue `NOT_RUN`. No se ha instalado nada en la estación de Felipe.

## Continuidad

[Plan](docs/plans/2026-11-03-foundation.md) · [Arquitectura](docs/architecture.md) ·
[Estado de verificación](docs/verification.md) · [Seguridad](SECURITY.md) ·
[Procedencia](provenance/sources.json).

La ruta de revisión es `feat/*` → `develop` → `main`. Ninguna rama implica por sí
sola branch protection activa. No hay publicación ni merge automático.

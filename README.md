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

Rulesync, Vale y rumdl siguen siendo proveedores **candidatos del plugin**. Sus
contratos headless se prueban por separado, sin habilitarlos en el runtime. No hay
motor, DSL de políticas, traductor de hooks, linter, daemon, servidor MCP ni base
de datos propios.

## Desarrollo

Toolchain de destino: Node 24 y pnpm 11.25.0. Estas versiones son de desarrollo;
no se exige Node 24 al runtime Electron de Obsidian. Dependencias directas exactas.

```sh
pnpm install --frozen-lockfile
pnpm run verify
```

`pnpm-lock.yaml` se obtuvo del registro en una CI aislada y se recuperó como
artefacto con SHA-256 comprobado. La CI permanente instala con lock congelado,
no modifica el código y publica el paquete de revisión cuando los gates pasan.

`verify` ejecuta Biome, TypeScript, pruebas y bundle. `pnpm format` modifica solo
este repositorio y debe usarse intencionalmente; nunca es un hook de un vault.
Las pruebas simulan la superficie de Obsidian; **no prueban la aplicación real**.

## Pruebas de Obsidian y gate de integración

`pnpm test:e2e` carga el bundle compilado en Obsidian **1.14.5** real, con
`wdio-obsidian-service@3.5.0` y WebdriverIO **10.1.0**. Para la versión mínima:

```sh
NMLB_OBSIDIAN_VERSION=1.8.7 pnpm test:e2e
```

El harness crea únicamente fixtures sintéticos y el launcher copia el vault y
utiliza un perfil aislado. No acepta rutas de vaults de trabajo. Prueba comandos,
reportes, desactivación/reactivación, reinicio y preservación de bytes; no instala
Claudian ni certifica hooks de agentes. Genera recibos y capturas en `artifacts/e2e/`.

La CI prueba la composición propuesta con la base en cada PR y repite unitarios,
build y E2E de ambas versiones después del merge. Se requiere revisar el resultado
del SHA integrado antes de continuar la serie. No hay merge automático.

## Continuidad

[Plan](docs/plans/2026-11-03-foundation.md) · [Arquitectura](docs/architecture.md) ·
[Estado de verificación](docs/verification.md) · [Seguridad](SECURITY.md) ·
[Procedencia](provenance/sources.json).

La ruta de revisión es `feat/*` → `develop` → `main`. Ninguna rama implica por sí
sola branch protection activa. No hay publicación ni merge automático.
Dependabot queda configurado para propuestas mensuales agrupadas hacia develop;
su activación depende de integrar la configuración en la rama predeterminada.

## Investigación para la siguiente integración

[HookFlow v2: revisión y adopción selectiva](docs/research/2026-11-03-hookflow-review/review.md)
incorpora Claudian y sus transportes al diseño. Incluye pruebas reproducidas y
bloqueos de adopción del prototipo; no instala HookFlow ni amplía las capacidades
de esta base. El runtime del plugin permanece de solo lectura.

## Desarrollo sin ejecutar Obsidian

La serie headless añade herramientas explícitas de diagnóstico, procesos acotados,
inspección del índice Git, empaquetado e instalación inicial reversible. **No se
activan al cargar el plugin**, ni convierten configuraciones presentes en hooks
verificados. No añade dependencias npm al producto.

```sh
pnpm verify:headless
```

[Uso y límites de las herramientas](docs/headless.md) ·
[Plan de cuatro PR](docs/plans/2026-11-03-headless.md).

Los perfiles incluidos son fixtures sintéticos/advisory, no políticas de producción.
La instalación es dry-run por defecto y requiere paquete revisado, confirmación del
plan y declaración de aplicación cerrada; nunca autoactiva o instala hooks globales.

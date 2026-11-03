# Base Obsidian LEGO — plan de implementación

## Intención, alcance y autoridad

Encargo de Felipe del 2026-11-03: configurar `no-mess-let-behind-` como plugin
Obsidian usando Kit Fundador LEGO, Constitución Agéntica y skills existentes.
El pedido reemplaza la recomendación anterior de no construir un plugin.
No habilita instalaciones en vaults, cambios globales, releases ni merge.

Riesgo: alto para la definición de gobernanza; acotado mediante solo lectura,
rama de revisión, fixtures sintéticos y ausencia de ejecución de procesos.

## Diseño elegido

Interfaz nativa de Obsidian + feature de inventario pura. Reutilizar del Kit
la disciplina LEGO, TypeScript estricto y tests del JavaScript compilado con
`node:test`. El template Fastify no sirve como runtime de Obsidian: no se copia
su servidor ni sus dependencias. Usar la configuración de bundle del sample
oficial como referencia. Mantener proveedores externos candidatos, no activos.

## Tareas y gates

1. Gobernanza: AGENTS, autoridades, matriz constitucional, procedencia y catálogo
   de skills por referencia inmutable. Gate: contratos coherentes, sin afirmar
   instalación de skills ni protección de ramas que no se haya comprobado.
2. Inventario: `inspectVault(reader)` consulta solo rutas convencionales fijas
   mediante `exists`; devuelve PRESENT/ABSENT/ERROR y ejecución NOT_RUN.
   Gate TDD: ausencia, presencia, fuente ambigua, errores saneados, no escrituras.
3. Shell Obsidian: dos comandos y modal nativo, sin watchers, red, procesos,
   almacenamiento o acceso a cuerpos de notas. Gate: tests de contrato con SDK
   simulado; la prueba en Obsidian real sigue separada y obligatoria para release.
4. Build/CI: TypeScript, Biome, bundle CJS, pruebas y lockfile congelado. Si no se
   puede resolver dependencias localmente, registrar el bloqueo, no inventar lock
   ni PASS. La CI de bootstrap puede producir lock como artefacto sin escribir Git.
5. Cierre: auditar diff, registrar resultados, publicar rama/PR sin merge. Conservar
   UNKNOWN/NOT_RUN y entregar el bundle de revisión, no una release productiva.

## No objetivos

Crear un motor de políticas, traductor de hooks, linter, daemon, MCP, base de datos,
instalador universal, migrador de vaults o validador clínico. No reescribir AGENTS.
No declarar conformidad a partir de un archivo presente ni de un score editorial.

## Condiciones de promoción

Dependencias resueltas con lockfile; `pnpm verify` verde; revisión humana del diff;
prueba en vault sintético con Obsidian; aprobación de Felipe para integrar.

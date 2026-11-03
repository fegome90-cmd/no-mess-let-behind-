# ADR-001 — Obsidian delgado, piezas LEGO y motores externos

Fecha: 2026-11-03. Estado: base preparada para revisión, sin integración aprobada.
Decisor de producto: Felipe. Implementación acotada: inspector de rutas.

## Decisión y alternativas

La investigación v0.3 recomendaba primero probar herramientas sin plugin propio.
El encargo posterior elige explícitamente **un plugin para Obsidian**. Conservamos
su objetivo de bajo mantenimiento: UI nativa pequeña, sin rehacer motores.

No usamos una plantilla Fastify como runtime: introducir HTTP, auth, DB o workers
sería trabajo no requerido. Tampoco un fork completo de otro plugin. De LEGO se
adapta la disciplina de composición, TS estricto, testing de salida compilada y
versionado; del sample oficial Obsidian, la frontera SDK y el bundler. Esta decisión
no afirma que Kit Fundador ya contenga una plantilla Obsidian.

## Componentes y propietarios

```text
Obsidian Plugin → comandos/modales nativos
               → inspectVault(VaultProbe) → exists(rutas fijas)

Futuro, NO implementado:
UI → preview/contrato de proveedor → herramienta externa → recibo verificable
```

| Superficie | Propietario | Papel del plugin en esta base |
|---|---|---|
| AGENTS y normas editoriales | Responsable del vault | Detectar existencia de AGENTS raíz |
| Configuración Rulesync | Generador adoptado por el usuario | Detectar rutas convencionales, sin parsear |
| `.vale.ini`, `.rumdl.toml` | Perfil editorial/sintáctico del vault | Detectar existencia, sin ejecutar |
| `.pre-commit-config.yaml` y Git | Gestor de hooks elegido por el vault | Detectar archivo; no toca hooksPath |
| Reporte de inspección | Plugin | Memoria efímera; sin persistencia |
| Versiones/procedencia de desarrollo | Este repositorio | Manifests, lock y referencias fijadas |

## Contrato actual

Entrada: `VaultProbe` con una única capacidad `exists(path): Promise<boolean>`.
La lista de siete rutas relativas está compilada en la feature y no proviene de
notas ni de instrucciones de un agente. No hay recursión ni descubrimiento global.
Salida: cinco filas con presencia `PRESENT|ABSENT|ERROR`, rutas observadas y estado
`execution: NOT_RUN`. Excepción de consulta produce `NMLB_PROBE_FAILED` sin texto
original. Dos variantes hooks.json/hooks.jsonc generan `NMLB_SOURCE_AMBIGUOUS`.

Se serializa una inspección por instancia; desactivar el plugin impide que una
consulta pendiente abra una nueva ventana. No se interpreta la presencia como
validez ni se certifica el tipo de entrada, symlinks, seguridad o autoridad.
Los tests usan un doble explícito de SDK: no sustituyen integración real.

## Próximas piezas, cada una con gate propio

1. Piloto del paquete en vault sintético: carga, comandos, cierre/reapertura,
   ausencia de cambios en notas y cero actividad sin acción del usuario.
2. Preview de un proveedor mantenido: comparar Rulesync directo y alternativas;
   probar contratos/versiones antes de escribir adaptadores. Sin shell arbitrario.
3. Integración de Vale/rumdl en lectura, sin duplicar parsers; corpus español y
   dialecto Obsidian antes de convertir una preferencia editorial en bloqueo.
4. Pre-commit y hooks nativos: índice staged, configuración ajena, fallos del runner,
   readback y denegación real. Nunca instalación global o autoaceptación de confianza.

## Presupuesto de mantenimiento

Cero dependencias de ejecución adicionales al host. Cuatro dependencias de build
fijadas. Cero servicios. Un workflow de verificación una vez resuelto el lock.
No actualizaciones automáticas en Obsidian ni generación universal de hooks propia.
Cada capacidad nueva necesita una prueba que justifique mantener su contrato.

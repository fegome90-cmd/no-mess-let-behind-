# Skills seleccionadas y plugins de trabajo

Este proyecto referencia skills existentes en lugar de mantener copias o forks.
`.agents/skills.lock.json` fija revisión y blob de los puntos de entrada. No es un
instalador ni un esquema de políticas. Cargar el recurso remoto por conector o
checkout autorizado; si no está disponible, declarar el límite.

| Fuente | Uso en esta base | Activación futura |
|---|---|---|
| `my-skills/authority-flow-audit` | Separación de propietarios: vault, generador, validador e interfaz | Antes de introducir un escritor, pipeline compartido o integrar un cambio de autoridad; cargar también sus recursos de auditoría |
| `my-skills/ai-work-prompting-gates` | Scope, comandos verificables y disciplina de evidencia | Preparar tareas de implementación; es referencia **no normativa** |
| `my-skills/work-closeout` | Distinguir artefactos entregables de residuos; cierre diagnóstico | Cierre `inspect`/`dry-run`; no ejecutar borrados ni interpretar esta skill como autorización de limpieza |

Se consultaron los puntos de entrada durante el bootstrap. No se declara una
instalación local de estos paquetes ni una auditoría independiente completa.
Las fuentes completas y sus referencias permanecen en `my-skills`; no importar
subrecursos silenciosamente ni reemplazar su revisión fijada con `main`.

## Plugins disponibles en la conversación

**GitHub** se utiliza para leer fuentes, crear la rama y publicar cambios/PR;
**Files** para recuperar la investigación previa; **Superpowers** para planificación,
worktree, TDD y verificación. Son herramientas de desarrollo de esta sesión,
no dependencias runtime del plugin ni permiso para ejecutar acciones ajenas.

Desktop Commander se consultó para verificar disponibilidad: Mac desconectado.
No se simuló ejecución allí. Los métodos de revisión y testing se adaptan a las
capacidades observadas; no se atribuye trabajo a subagentes inexistentes.

La elección de estas tres skills evita cargar diseño web, macOS AppKit, bases de
datos o generación visual que no corresponden a este esqueleto de Obsidian.

# AGENTS — No Mess Left Behind

## Autoridad y encargo

Leer [GOVERNANCE.md](GOVERNANCE.md), [README.md](README.md) y la documentación del
área antes de mutar. La Constitución Agéntica v1.1 referenciada en GOVERNANCE es
normativa; las skills son métodos subordinados y no conceden permisos.

El encargo vigente es configurar una base de plugin Obsidian, reutilizando LEGO.
El destino es este repositorio público; no copiar notas privadas, transcripciones,
configuración de usuario, credenciales ni material clínico desde otros proyectos.

## Ciclo operativo

1. Clarify/Layout: registrar objetivo, archivos autorizados, riesgo, contratos,
   pruebas y exclusiones en un plan proporcional. Investigar antes de crear.
2. Operate: rama por tarea y worktree aislado; un escritor por superficie. No tocar
   main. Reutilizar herramientas mantenidas, sin reimplementar motores de terceros.
3. Observe/Reflect: TDD para comportamiento, `pnpm verify`, revisión del diff y
   simplificación. No sustituir revisión por lint. Usar fixtures sintéticos.
4. Reconcile/Handoff: actualizar evidencia y límites, commit acotado y PR a develop.
   Merges a develop: autorización condicionada de Felipe y gates pre/post del plan
   de integraciones. Release, main y vaults reales requieren autorización adicional.

## Fronteras del producto

La base solo consulta existencia de rutas fijas. No debe añadir escrituras,
subprocesos, red, telemetría ni watchers por conveniencia. Una ampliación necesita
contrato y revisión de seguridad propios. Las pruebas con mocks no prueban hosts.
No declarar activo un hook por estar generado o instalado; `NOT_RUN` nunca es PASS.

Los AGENTS y reglas de un vault pertenecen a su responsable. El plugin no los
reescribe ni los convierte en otra fuente de verdad. Git/pre-commit conserva su
propietario; no apropiarse de `core.hooksPath` ni formatear notas automáticamente.
NMLB significa no introducir incumplimientos o cambios ajenos al alcance, no forzar
un repositorio sin cambios. No borrar archivos del usuario para conseguir verde.

## Skills y capacidades

Consultar [SKILLS.md](SKILLS.md) y `.agents/skills.lock.json`; cargar solo la skill
pertinente desde su revisión fijada. No afirmar que una referencia se instaló ni
que una herramienta de ChatGPT existe dentro de Obsidian. Si no hay subagentes,
reportar revisión propia, no simular independencia.

## Validación y fallos

Comando completo: `pnpm verify` después de `pnpm install --frozen-lockfile`.
El ensayo offline documentado no sustituye ese gate. Si faltan SDK, lock, binario o
runtime, informar `NOT_RUN`/bloqueado y no aprobar promoción. No instalar herramientas
globales en estaciones de trabajo ni modificar políticas para evitar un fallo. Nunca usar `--no-verify`,
force-push, reset destructivo o `git add -A` sobre una raíz con cambios ajenos.

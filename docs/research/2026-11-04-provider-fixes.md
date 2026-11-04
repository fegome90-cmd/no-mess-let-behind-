# Contratos reparados del runner y Rulesync

A01: un cierre del proceso padre durante TIMEOUT, ABORTED u OUTPUT_LIMIT fuerza
SIGKILL al grupo antes de cancelar la escalada. Las regresiones usan descendientes
reales, stdio independiente y heartbeat; no cuentan el estado del padre como prueba
de terminación. No es una sandbox para procesos que abandonan su grupo ni prueba
de equivalencia Windows. El entorno sigue mínimo: la única extensión admitida es
GIT_INDEX_FILE absoluto validado por el consumidor Git; no acepta PATH, NODE_OPTIONS
ni credenciales arbitrarias.

A04: el smoke valida el envelope generate de Rulesync 43.6.0, su plan v2 y ambos
targets del fixture; rechaza null, errores, vacíos, versiones desconocidas y rutas
inválidas. El plan NO contiene payloads de hooks. Por eso la preservación de comandos
se verifica generando en el mismo directorio temporal después de comprobar que el
dry-run dejó sus bytes intactos. Se compara el plan de ambas operaciones y se leen
los JSON generados: un comando propio, el ajeno original y su clave no relacionada.
No se ejecuta ningún hook ni agente; no se escribe en vaults del usuario.

Referencias fijadas: dyoshikawa/rulesync@v43.6.0, src/types/json-output.ts y
 docs/reference/cli-commands.md (Mutation plan in JSON output).
Los 4 binarios de proveedores se prueban realmente en CI; las regresiones unitarias
no sustituyen ese recorrido. El perfil Gitleaks continúa sintético, no productivo.

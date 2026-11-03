# HookFlow v2 — revisión e integración selectiva en No Mess Left Behind

Fecha: 2026-11-03. Encargo: revisar la investigación de otro agente para integrarla.
Base del plugin: `0396a8e39d53dffd21565a7696ec1e1fa212a4a9`.
Alcance de esta entrega: documentación, decisiones de reutilización y evidencia
sintética. **No modifica el runtime del plugin, instala hooks ni autoriza un merge.**

## 1. Dictamen

**Integrar el conocimiento y los contratos de prueba; no importar el runtime de
HookFlow tal cual.** Su aportación principal es separar agente, host y transporte,
incluir Claudian y reconocer el canal de edición directa de Obsidian. Esto completa
la investigación previa sin obligarnos a mantener otro motor de políticas.

Reproduje las **21 pruebas originales: 21 PASS**. Además ejecuté **10 comprobaciones
dirigidas de aceptación para NMLB: 10 FAIL** sobre el snapshot sin corregir. Seis
muestran problemas de integridad, confinamiento o privacidad; dos afectan el
tratamiento del Markdown; una detecta identificación estática incorrecta y otra
una carencia de correlación de evidencia. No son una muestra aleatoria ni una
estimación porcentual de calidad. Tampoco son diez fallos de las pruebas originales.

El prototipo se reconoce como experimental y declara sus E2E pendientes. No se le
atribuye haber demostrado integración nativa ni garantías de sandbox. Este dictamen
compara ese prototipo con **nuestros requisitos de adopción**, no con una promesa de
producto terminado que su autor no hizo.

## 2. Material revisado y procedencia

Se recuperaron los tres entregables más recientes de la investigación HookFlow:

| Artefacto | Corte examinado |
|---|---|
| `HookFlow_Flujo_Completo_v2.md` | Diseño interno 1.2, actualizado el 03-11-2026 |
| `HookFlow_Claudian_Compatibilidad_v2.md` | Contrato de host y transportes |
| `HookFlow_Prototipo_Referencia_v2_Claudian.zip` | 17 archivos; Python, configuración y tests |

SHA-256 del ZIP:
`d4d7e03b8b57ad3b83289b98930be0522185b3f0252f3e02d22a7ba9d355d752`.

La entrada no se ejecutó ciegamente: se inspeccionaron miembros y rutas del ZIP,
los cuatro scripts Python, sus tests y configuraciones antes de ensayar. Las
pruebas se limitaron a un contenedor y directorios temporales con datos sintéticos.
No se usaron vaults reales, credenciales ni CLIs de agentes. El original no se
corrigió: los fallos se conservaron para que la revisión sea reproducible.

Las afirmaciones de Claudian se contrastaron con
`YishenTu/claudian@ce394e85d951320bf3c8b32298c28d771c0daefb`. La documentación
externa consultada se identifica al final; sus páginas vivas no reemplazan fijar
versiones ejecutables en un piloto.

## 3. Aportes confirmados que sí incorporamos al diseño

**Claudian es un host, no otro formato de hooks.** Su lanzador de Codex usa
`app-server --listen stdio://`; el de Pi usa `--mode rpc`. El hecho de que una CLI
admita hooks no acredita que el mismo evento se entregue en esos transportes.
La unidad de compatibilidad debe ser **host + proveedor + transporte + versiones +
fuentes de configuración + alcance**, no solamente el nombre del agente. [S1–S3]

**Inline Edit es un canal distinto.** El código de aceptación llama
`editor.replaceRange()`. No debemos presentarlo como una escritura interceptada
por `PreToolUse` del proveedor. Un observador posterior puede detectar cambios,
pero no deshacerlos ni impedirlos por el simple hecho de observarlos. [S4]

**La API de Claudian no es un interceptor de herramientas.** La interfaz experimental
v1 expone `getActiveSessionId`, `send`, `read` y `claudian:turn-ended`. No ofrece
`registerPreToolUseHook`. El evento puede ayudar a observar fin de turno, pero no
certifica archivos cambiados. Además, `send` entrega texto como un prompt del
usuario: no usarlo para inyectar automáticamente advertencias o dar autoridad a
contenido de una nota. Su eventual uso exige acción explícita y alcance definido.
La API se resuelve a demanda y se comprueba su versión; no se conserva una instancia
a través de desactivaciones/actualizaciones. [S5]

**Preservación de configuración ajena.** Rulesync documenta
`preserveUnownedHooks` y locks de propiedad. Los locks deben conservarse junto con
lo generado. Una configuración emitida, una configuración cargada y una denegación
observada son evidencias diferentes. Un lock ausente no permite inferir qué puede
eliminarse de forma segura. [S6]

## 4. Mapa de responsabilidad y conflicto con la base actual

| Superficie | Propietario previsto | Papel de NMLB |
|---|---|---|
| Reglas editoriales y AGENTS del vault | Responsable del vault | Mostrar referencia y alcance; no sustituirlos |
| Configuración nativa de agentes | Un generador/gestor elegido | Preview, diagnóstico y resultados, no otro escritor concurrente |
| Sesión y herramientas del agente | Runtime del proveedor, alojado o no por Claudian | Registrar compatibilidad probada por transporte |
| Markdown y prosa | Validadores mantenidos, candidatos Vale/rumdl | Consumir resultados; no copiar el linter de ejemplo |
| Índice Git y hook pre-commit | Gestor existente del repositorio | Mantenerlo; no instalar Lefthook encima por defecto |
| Estado que muestra la interfaz | NMLB | Separar presencia, configuración y verificación; no fabricar PASS |

La configuración HookFlow tiene `.rulesync/hooks.jsonc` **y**
`hookflow/policy.json`: son dos superficies de responsabilidad distintas, no dos
archivos que mágicamente constituyan una sola autoridad. Su dispatcher, linter,
instalador Gemini, auditoría JSONL y nuevo esquema agregarían contratos propios.
No se adoptan como dependencias de producción en esta revisión.

Varios handlers en el mismo evento pueden ser legítimos. El problema es duplicar
una responsabilidad o perder entradas, no la mera coincidencia del evento. La
identidad de un handler requiere contrato/propiedad; una coincidencia de texto o
la ordenación accidental de un array no bastan para identificarlo.

## 5. Hallazgos reproducidos sobre el prototipo

Todos los rangos siguientes pertenecen a los archivos originales del ZIP. Los
resultados completos están en [findings.json](findings.json). Las prioridades se
refieren a una eventual adopción en NMLB.

| ID | Prioridad | Evidencia y resultado observado | Consecuencia de integración |
|---|---|---|---|
| HF-R01 | Alta | `git_quality.py:35–49`: `--diff-filter=ACMR` excluye borrados. Un archivo protegido eliminado y staged produce `{}`. | No adoptar el gate como protección de rutas; comprobar también D. |
| HF-R02 | Alta | La lista `--name-only` pierde el origen de un rename. Mover `00_KERNEL/locked.md` a `docs/moved.md` no genera hallazgos. | Evaluar origen y destino con registros Git delimitados por NUL y estados explícitos. |
| HF-R03 | Alta | `dispatch.py:45–50` espera `Move to File:`. El formato nativo utiliza `*** Move to:`. La prueba descubre solo el origen permitido y retorna `allow` al mover hacia `00_KERNEL`. | No mantener un parser parcial como control de seguridad; usar contrato real y fixtures completos. [S7] |
| HF-R04 | Alta | `dispatch.py:181`: política JSON corrupta produce exit 1 y traceback, no denegación gobernada. | Un error técnico no equivale a deny. Con el comportamiento normal documentado de Claude puede no bloquear; falta configurar/probar el contrato de fallos. No se ejecutó Claude para esta inferencia. [S8] |
| HF-R05 | Alta | `gemini_bridge.py:57–72`: settings es symlink a un archivo fuera de la raíz; `--apply` modifica ese archivo. | No importar el instalador; exige confinamiento, control de concurrencia y escritura segura antes de adopción. |
| HF-R06 | Alta | `gemini_bridge.py:86–87` imprime la configuración completa. `--dry-run` expone un token ficticio ajeno a los hooks. | Preview debe limitarse a cambios propios y redactar valores sensibles. No se utilizaron secretos reales. |
| HF-R07 | Media | `git_quality.py:24–26` rechaza dos espacios al final de línea, que pueden ser un salto de línea Markdown válido. | Incompatible con preservar contenido/formato válido por defecto; una preferencia distinta requeriría adopción expresa. [S9] |
| HF-R08 | Media | `git_quality.py:24–31` aplica reglas de prosa dentro de fences. Un ejemplo de código con texto prohibido se marca como infracción. | Delegar a un parser/linter existente con exclusiones verificadas. |
| HF-R09 | Media | `claudian_doctor.py:89–101` identifica el dispatcher por substring. `echo hookflow/dispatch.py ...` obtiene `pass` para la definición. | Reutilizar el procedimiento, no ese criterio como prueba de registro o carga. |
| HF-R10 | Brecha de evidencia | `dispatch.py:84–93` descarta session/tool IDs del evento. Dos sesiones no pueden correlacionarse con claves estables desde el registro emitido. | Hace falta correlación mínima por sesión/operación, sin prompts ni contenido, para ejecutar el gate E2E propuesto. |

HF-R07/08 son incompatibilidades con nuestro contrato editorial, no afirmaciones
sobre que el autor no pueda elegir otro estilo. HF-R10 es una exigencia de
observabilidad todavía ausente, no una denegación rota. Los seis primeros casos
sí impiden aceptar el prototipo como control duro sin cambios.

## 6. Límites adicionales de la revisión

Por lectura estática: `Stop` recorre Markdown modificado del repositorio, no un
conjunto atribuible a la tarea; ignora ciertos errores/archivos grandes y limita
resultados sin un recibo explícito de cobertura. El instalador Gemini realiza
lectura y escritura directa, sin promoción atómica ni comparación del estado
aprobado. Los comandos relativos dependen del cwd. Estas observaciones no se
cuentan como pruebas ejecutadas adicionales.

El workflow incluido ejecuta Python/tests, pero no Gitleaks ni el control editorial
del diff del PR; la propia investigación reconoce ese pendiente. Una configuración
CI no constituye prueba de ejecución. No se auditaron todas las rutas de shell/MCP,
variantes Windows, race conditions ni interposición adversarial del filesystem.

## 7. Decisión de reutilización por pieza

| Pieza propuesta | Decisión para NMLB | Condición |
|---|---|---|
| Matriz host/proveedor/transporte y gates G0–G7 | **Integrar al contrato de diseño** | Estados separados; no afirmar pruebas nativas ejecutadas |
| Diagnóstico Claudian | **Reutilizar criterios y fixtures** | No añadir Python ni un nuevo servicio al plugin; revisar límites de lectura y falsos positivos |
| Rulesync + preservación de hooks | **Mantener como candidato principal de distribución** | Versión exacta, preview acotado, locks, readback y reversión probados |
| `pi-claude-hooks` | **Candidato opcional** | Comparar con generación Pi ya disponible; elegir una vía, comprobar RPC, trust y no duplicación |
| Dispatcher Python y `hookflow/policy.json` | **No adoptar en runtime ahora** | Un esquema/motor nuevo necesita una necesidad no resuelta por herramientas mantenidas |
| Puente Gemini propio | **No adoptar ahora** | Demostrar primero que el generador elegido no cubre el host/versión real; no construir un puente por inercia |
| `git_quality.py` | **No adoptar como linter de producción** | Conservar sus casos de índice y límites; evaluar Vale/rumdl sin multiplicar parsers |
| Lefthook | **No migrar el gestor Git existente** | Sólo evaluar para un repositorio sin gestor, o con migración separada aprobada |
| Gitleaks | **Candidato de chequeo independiente** | Versión y alcance staged/diff verificados; sin reemplazar el gate vigente |
| API Claudian y observación poscambio | **Diseño opcional posterior** | Capability check, desregistro, alcance mínimo y ausencia de loops; no prevención universal |

El puente Pi sí documenta lectura de settings Claude, confianza, opciones para
excluir settings globales/extra y ausencia de deduplicación. Es una alternativa
real para evitar un adapter propio, pero esa documentación no prueba su carga en
Claudian RPC. [S10] No se instala junto con otro handler que ejecute lo mismo.

## 8. Contrato de integración incorporado al diseño

La matriz futura distinguirá al menos estas rutas, inicialmente **NOT_RUN**:
Claude CLI; Claudian/Claude SDK; Codex CLI; Claudian/Codex app-server; Pi CLI;
Claudian/Pi RPC. Gemini se valida por su host real si resulta pertinente, sin
inventar un proveedor Claudian ni extrapolar de otras rutas.

Cada fila debe distinguir: configuración presente/legible; handler seleccionado;
confianza pendiente o comprobada; carga observada; allow observado; deny observado;
fallo técnico observado; reversión observada. No convertir esta lista en un único
score. Tampoco asumir una escalera universal: unos hosts carecen de determinados
eventos. Reportar `UNSUPPORTED`, `UNKNOWN` y `NOT_RUN` cuando correspondan.

Una prueba de bloqueo exige el resultado físico: archivo ausente o bytes anteriores
intactos, no solo stdout o un registro `deny`. Registrar versión, host/transporte,
hash de configuración relevante, escenario y correlación de sesión/operación.
Los recibos no otorgan permisos ni constituyen por sí mismos una prueba antifraude;
no guardar cuerpos de notas ni configuración completa. Su futura persistencia,
retención y exclusión de sincronización requieren decisión propia.

Un fallo obligatorio no se transforma en PASS. Los contratos de salida, confianza
y error difieren por host: Codex también exige revisar hooks no administrados y
advierte sobre fallas de callbacks que pueden no bloquear. No reutilizar una
respuesta JSON como universal sin pruebas de cada ruta. [S11]

## 9. Secuencia siguiente, sin ampliar la base silenciosamente

**I0 — Preservar el inspector.** La entrega actual sigue sin leer cuerpos de notas,
escribir, instalar, ejecutar procesos o añadir watchers. Esta revisión no cambia
esas capacidades ni convierte candidatos en proveedores activos.

**I1 — Diagnóstico Claudian acotado.** Primer incremento propuesto: identificar host
y exponer la matriz de cobertura desde Obsidian. Antes de programar, especificar
qué metadata se puede leer, directorio de configuración real, máximo de bytes,
saneamiento de salidas y diferencias entre habilitado/cargado/probado. No depender
de métodos privados de intercepción que la API no ofrece.

**I2 — Un recorrido completo antes de cuatro.** En un vault sintético, probar Claude
CLI y Claudian/Claude con configuración producida por una herramienta existente.
Fijar versiones; verificar trust, cwd, allow, deny, errores y preservación. No
instalar universalmente ni ejecutar ensayos sobre el vault de trabajo.

**I3 — Extender según evidencia.** Comparar las rutas Pi candidatas y luego Codex
app-server; añadir sólo la vía que reduzca mantenimiento y pase el mismo contrato.
Una brecha puede requerir contribución upstream, no automáticamente un fork.

**I4 — Canales fuera del agente.** Preservar el pre-commit del vault y probar
Inline Edit, staging parcial, borrado y rename. La observación en Obsidian es
opcional y detectiva; ninguna corrección de contenido se vuelve automática.

## 10. Evidencia y reproducción

Entorno de esta revisión: Python 3.13.5 en Linux, Git en directorios temporales.
Los 21 tests del original pasaron. Las diez comprobaciones nuevas guardan tanto
contrato esperado como observación y no modifican la fuente examinada.

```sh
# Después de extraer e inspeccionar el ZIP exacto en un directorio descartable:
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s <fuente>/tests -v
PYTHONDONTWRITEBYTECODE=1 python3 docs/research/2026-11-03-hookflow-review/probe_hookflow.py --source <fuente> --out findings-reproduced.json
```

[probe_hookflow.py](probe_hookflow.py) es un **artefacto de revisión**, no parte del
plugin, hook ni CI productiva. Requiere el snapshot revisado; no descarga ni instala
nada. Su salida de proceso 0 significa que terminó de recolectar observaciones,
**no que sus gates hayan pasado**: leer `summary.failed` y el estado de cada caso.
Resultados esperados del snapshot original: suite 21 PASS; checks nuevos 10 FAIL.

Quedan NOT_RUN los agentes reales, Claudian desktop, Pi RPC, Codex app-server,
generación/instalación de Rulesync, Gitleaks y los motores editoriales. La prueba
local con dobles del SDK de NMLB tampoco equivale a integración Obsidian.
No se declara revisión ciega o por subagentes: es una revisión técnica de otra
salida, ejecutada en esta sesión con alcance y limitaciones explícitos.

## 11. Fuentes y trazabilidad

- **S1.** [Claudian, configuración Claude](https://github.com/YishenTu/claudian/blob/ce394e85d951320bf3c8b32298c28d771c0daefb/src/providers/claude/config.ts) y [encoder](https://github.com/YishenTu/claudian/blob/ce394e85d951320bf3c8b32298c28d771c0daefb/src/providers/claude/execution/ClaudeExecutionRequestEncoder.ts).
- **S2.** [Claudian, CodexLaunchSpecBuilder](https://github.com/YishenTu/claudian/blob/ce394e85d951320bf3c8b32298c28d771c0daefb/src/providers/codex/runtime/CodexLaunchSpecBuilder.ts).
- **S3.** [Claudian, PiLaunchSpecBuilder](https://github.com/YishenTu/claudian/blob/ce394e85d951320bf3c8b32298c28d771c0daefb/src/providers/pi/runtime/PiLaunchSpecBuilder.ts).
- **S4.** [Claudian, InlineEditModal](https://github.com/YishenTu/claudian/blob/ce394e85d951320bf3c8b32298c28d771c0daefb/src/features/inline-edit/ui/InlineEditModal.ts).
- **S5.** [API experimental Claudian](https://github.com/YishenTu/claudian/blob/ce394e85d951320bf3c8b32298c28d771c0daefb/docs/plugin-api.md).
- **S6.** [Rulesync: hooks, formatos y propiedad](https://rulesync.dyoshikawa.com/reference/file-formats), consultado 03-11-2026.
- **S7.** [Parser apply_patch de Codex: Move to](https://github.com/openai/codex/blob/main/codex-rs/apply-patch/src/parser.rs), consultado 03-11-2026; no se ejecutó Codex.
- **S8.** [Claude: contrato de errores de hooks](https://code.claude.com/docs/en/hooks#other-exit-codes), consultado 03-11-2026.
- **S9.** [CommonMark 0.31.2: hard line breaks](https://spec.commonmark.org/0.31.2/#hard-line-breaks).
- **S10.** [pi-claude-hooks: fuentes, confianza y límites](https://github.com/jordyvanvorselen/pi-claude-hooks), consultado 03-11-2026; candidato no instalado.
- **S11.** [Codex: hooks y confianza](https://learn.chatgpt.com/docs/hooks), consultado 03-11-2026.
- **S12.** HookFlow: tres artefactos identificados en §2; bytes y resultados en [findings.json](findings.json). Se integra una síntesis, no notas privadas ni el runtime en producción.
- **S13.** [Base NMLB revisada](https://github.com/fegome90-cmd/no-mess-let-behind-/tree/0396a8e39d53dffd21565a7696ec1e1fa212a4a9): AGENTS, GOVERNANCE, arquitectura y límites del inspector.

**Resultado:** el proyecto incorpora una ruta de integración Claudian mejor definida
y pruebas que evitan adoptar controles aparentes. No asume una segunda plataforma
Python, otro linter ni otro instalador de hooks como costo permanente.

# Gobernanza local

## Fuente normativa y adopción

Se adopta por encargo de Felipe del **2026-11-03** la
[Constitución de Código Agéntico v1.1](https://github.com/fegome90-cmd/constitucion-ai/blob/39f2e3fd9965fea1be573e79fb3670fc2ccb9924/constitution/AGENTIC-CONSTITUTION.md).
Esta es una aplicación local, no una enmienda ni una copia alterada del original.
Las instrucciones de la plataforma y las autorizaciones explícitas delimitan las
capacidades reales. El documento no concede acceso por sí mismo.

## Autoridades operativas

| Actor | Puede decidir/ejecutar | No puede presumir |
|---|---|---|
| Felipe, responsable del proyecto | Alcance, adopción, excepciones, integración, publicación e instalaciones | Aprobación técnica por existir una autorización |
| Agente implementador | Lectura, implementación y pruebas del encargo en rama aislada; commit y PR de revisión | Merge, release, escritura en vaults, permisos globales o excepciones constitucionales |
| Revisor humano o agente convocado | Hallazgos y evidencia sobre el cambio | Que su informe autorice publicación o cambie reglas |
| CI | Ejecutar gates sobre código sintético público y generar artefactos | Modificar ramas, aprobarse, acceder a secretos o instalar en estaciones |

Las aprobaciones se registran en el encargo/PR con persona, fecha, acción y alcance.
Cambios de seguridad y nuevos efectos laterales requieren aprobación específica.
El encargo actual cubre la **configuración inicial de gobernanza y CI de este repo**;
no cubre controles de otros repositorios ni del Mac.

## Aplicación de las trece leyes

| Ley | Aplicación verificable o límite |
|---|---|
| I Cambio legítimo | Plan, alcance inicial y comparación con diff al cierre |
| II Lectura/no duplicación | Procedencia fijada; herramientas externas antes de motores propios |
| III Arquitectura | Feature local de inventario, shell Obsidian; sin capas ni servicios ornamentales |
| IV Git/promoción | Feature y worktree aislados; PR a develop; main sin implementación directa |
| V Verificación | Tests RED/GREEN, lint, formato, tipos y build; piloto real separado |
| VI Fuente de verdad | Un responsable por superficie; docs reconciliadas con estado observado |
| VII Neutralidad | Sin dependencia de un modelo ni proveedor de LLM |
| VIII Seguridad | Solo lectura, ninguna red/subproceso/telemetría; errores saneados |
| IX Persistencia | No requerida en esta base; ninguna DB ni copia de notas |
| X Contratos | `VaultProbe.exists` y estados explícitos; mock no equivale a SDK real |
| XI Observabilidad | Resultados efímeros explícitos, sin cuerpos de notas ni errores sensibles |
| XII Roles | Matriz precedente; herramienta y evidencia no conceden autoridad |
| XIII Interacción | Solicitud expresa de configurar base, posterior a investigación; no ampliar a producto completo |

## Git e inicialización

El repositorio estaba vacío. Se creó un README mínimo como raíz Git
(`ef5ed81d0a186f76bcaeef378cf70314d9227e12`) antes de adoptar esta base; ninguna
implementación se realizó sobre main. `develop` parte de ese mismo seed y recibe
la PR. No se ha configurado ni certificado protección remota de ramas.

El trabajo se prepara en un worktree local aislado. Al no haber conectividad Git
saliente en el contenedor, se usa un ancla local de snapshot; la publicación usa
el conector GitHub, un parent remoto conocido y actualización sin force con lease.
No se presenta el historial local sintético como clon idéntico al remoto.

## Excepciones y estado

No se inventan excepciones aprobadas. La falta de Mac conectado o SDK local limita
la evidencia y bloquea el gate correspondiente, no lo convierte en exención.
El bootstrap de dependencias debe resolverse con registro real antes de cerrar
reproducibilidad. La integración, release y piloto de vault quedan pendientes.

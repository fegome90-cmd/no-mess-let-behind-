# Seguridad y privacidad

La base no ejecuta comandos, usa red, abre puertos, copia notas, guarda configuración
ni instala hooks. Solo consulta existencia de rutas fijas mediante la API del vault.
Los reportes son efímeros y no incluyen excepciones originales ni cuerpos de notas.
Esto reduce superficie: **no convierte el plugin en una barrera de seguridad**.

No se considera confiable una configuración por estar en el vault; su validación y
adopción pertenecen a etapas posteriores. Los datos recuperados son datos, nunca
instrucciones que amplíen permisos. No añadir comandos a partir de texto de notas.

Toda integración futura debe declarar rutas y efectos, usar ejecutables/versiones
conocidos y argumentos separados (sin shell interpolado), límites de salida y
cancelación. Una falla de una comprobación obligatoria nunca se transforma en PASS.
No cambiar confianza de Codex, hooks globales o reglas del vault sin aprobación.

Reportar vulnerabilidades al responsable mediante un canal privado acordado; no
abrir issues públicos con secretos, notas, rutas personales o datos clínicos.
Este repositorio no configura todavía un canal privado específico de seguridad.

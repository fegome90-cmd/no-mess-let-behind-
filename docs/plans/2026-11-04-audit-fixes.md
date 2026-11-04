# Reparación y merge de la serie headless

Felipe autorizó corregir los hallazgos, iterar la revisión y fusionar las PR #9–#12.
Se conserva su restricción de no ejecutar Obsidian en esta fase. Destino:
`integration/headless-foundation`; no promoción a develop/main ni release.

## Contratos de cierre

- #9: A03 (CI de HEAD, composición y push integrado), A05 (UTF-8 fatal), A06
  (causa de error community separada). Tests headless permanecen al promover;
  el workflow nativo conserva sus E2E sin ejecutarlos desde la rama headless.
- #10: A01 (limpieza del grupo aunque cierre el padre); A04 (contrato Rulesync
  fijado, fixtures positivos y negativos, no aceptar JSON arbitrario).
- #11: A02 (índice efectivo de Git, incluidos commit parcial y worktrees,
  sin heredar indiscriminadamente el entorno).
- #12: conservar las garantías de instalación/retiro y repetir la composición.

Cada PR se retargetea a la rama de integración después de pasar la anterior.
Se revisan el diff y los hilos; se exigen regresiones RED/GREEN, CI del HEAD y
merge ref, merge con SHA esperado y CI del SHA integrado antes del siguiente.
Los cambios ya integrados se incorporan al siguiente candidato sin force-push.

Las pruebas locales suplementarias no sustituyen Node24.22.2/SDK oficial en CI.
No se afirma ausencia universal de fallos ni se cuentan comentarios de cuota como
revisión independiente. Un fallo real mantiene detenida la serie hasta reparación.
No instalar en vaults reales, ejecutar LLM, cambiar confianza o borrar datos ajenos.

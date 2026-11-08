# No Mess Left Behind — roadmap operativo

Fuente: [plan canónico](plans/2026-11-04-three-milestones-v2.md).
Base integrada comprobada: **A1, develop@382587d, PR #14**.
Una implementación candidata no se declara integrada antes de su gate posterior.

| Objetivo | Estado | Cierre requerido |
|---|---|---|
| A1 · base única | COMPLETO | CI y Obsidian E2E pre/post PR #14 |
| B0 · preferencias y catálogo | CANDIDATO EN ESTA PR | saveData, retiro/reinstalación, catálogo distribuido |
| B1 · panel y preferencias | PENDIENTE | current-vault, persistencia y corrupción preservada |
| B2 · selección e impacto estimado | PENDIENTE | ESTIMATE, sin procesos ni apply |
| C0 · host Electron | PENDIENTE | pruebas por plataforma |
| C1 · acciones enumeradas | PENDIENTE | un runner, sin argv/cwd libres |
| C2a / C2b · preview real / apply | PENDIENTES | scratch, ownership, CAS, rollback selectivo |
| C3 · Git/calidad/secretos | PENDIENTE | política real aprobada; índice efectivo |
| C4a · Claude CLI | PENDIENTE | allow/deny/error físico y trust oficial |
| C4b · Claudian SDK | OPCIONAL PENDIENTE | host compatible >=1.13.0, prueba independiente |
| D1 / D2 · Codex / Pi | FUERA DEL PRIMER MVP | cada transporte y sin duplicados |

Incremento activo: [plan validado B0–B2](plans/2026-11-08-h2-execution.md).
No hay promoción a main, release ni cambios en vaults reales.

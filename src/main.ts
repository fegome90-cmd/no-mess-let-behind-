import { Modal, Notice, Plugin } from 'obsidian';
import { inspectVault, type SurfaceStatus } from './features/inventory/inventory.js';

class InventoryModal extends Modal {
  constructor(
    app: Plugin['app'],
    private readonly rows: SurfaceStatus[],
  ) {
    super(app);
  }

  onOpen(): void {
    const el = this.contentEl;
    el.empty();
    el.addClass('nmlb-report');
    el.createEl('h2', { text: 'Gobernanza del vault' });
    el.createEl('p', {
      text: 'Inspección de rutas convencionales. Una ruta presente no demuestra configuración válida, instalación, carga ni bloqueo.',
    });
    for (const row of this.rows) {
      el.createEl('h3', { text: row.name });
      el.createEl('p', { text: `${row.presence} · ${row.execution} · ${row.owner}` });
      if (row.paths.length > 0) el.createEl('code', { text: row.paths.join(', ') });
      if (row.code) el.createEl('p', { text: row.code, cls: 'nmlb-diagnostic' });
    }
    el.createEl('p', {
      text: 'Solo lectura: no se leyeron cuerpos de notas ni se ejecutaron herramientas. NOT_RUN no equivale a PASS.',
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

class BoundariesModal extends Modal {
  onOpen(): void {
    this.contentEl.addClass('nmlb-report');
    this.contentEl.createEl('h2', { text: 'Alcance de esta base' });
    this.contentEl.createEl('p', {
      text: 'No instala hooks, ejecuta procesos, cambia configuraciones, formatea notas ni certifica su contenido.',
    });
    this.contentEl.createEl('p', {
      text: 'Rulesync, Vale y rumdl son candidatos externos. Los hooks Git siguen bajo el propietario del vault. La integración ejecutable requiere un piloto separado.',
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export default class NoMessLeftBehind extends Plugin {
  private inspecting = false;
  private disposed = false;

  onload(): void {
    this.disposed = false;
    this.addCommand({
      id: 'inspect-vault',
      name: 'Inspeccionar configuración del vault',
      callback: () => this.inspect(),
    });
    this.addCommand({
      id: 'show-boundaries',
      name: 'Ver alcance y límites',
      callback: () => new BoundariesModal(this.app).open(),
    });
    this.addRibbonIcon('shield-check', 'Inspeccionar gobernanza del vault', () => {
      void this.inspect();
    });
  }

  onunload(): void {
    this.disposed = true;
  }

  private async inspect(): Promise<void> {
    if (this.disposed) return;
    if (this.inspecting) {
      new Notice('Ya hay una inspección en curso.');
      return;
    }
    this.inspecting = true;
    try {
      const rows = await inspectVault({ exists: (path) => this.app.vault.adapter.exists(path) });
      if (!this.disposed) new InventoryModal(this.app, rows).open();
    } catch {
      if (!this.disposed)
        new Notice('NMLB_INSPECTION_FAILED: no fue posible completar la inspección.');
    } finally {
      this.inspecting = false;
    }
  }
}

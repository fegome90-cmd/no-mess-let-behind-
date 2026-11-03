// Offline contract double only. Release typechecks use the real pinned SDK.
declare module 'obsidian' {
  export interface App {
    vault: { adapter: { exists(path: string): Promise<boolean> } };
  }
  export class Plugin {
    app: App;
    addCommand(command: { id: string; name: string; callback: () => unknown }): unknown;
    addRibbonIcon(icon: string, title: string, callback: () => unknown): HTMLElement;
  }
  export class Modal {
    contentEl: HTMLElement;
    constructor(app: App);
    open(): void;
  }
  export class Notice {
    constructor(message: string);
  }
}
interface HTMLElement {
  empty(): void;
  addClass(...names: string[]): void;
  createEl<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    options?: { text?: string; cls?: string },
  ): HTMLElementTagNameMap[K];
}

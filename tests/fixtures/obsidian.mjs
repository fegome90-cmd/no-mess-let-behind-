export const modals = [];
export const notices = [];
function element() {
  return {
    text: '',
    children: [],
    empty() {
      this.children = [];
    },
    addClass() {},
    createEl(_tag, opts = {}) {
      const child = element();
      child.text = opts.text ?? '';
      this.children.push(child);
      return child;
    },
  };
}
export class Plugin {
  constructor(app) {
    this.app = app;
    this.commands = [];
    this.icons = [];
  }
  addCommand(command) {
    this.commands.push(command);
  }
  addRibbonIcon(icon, title, callback) {
    this.icons.push({ icon, title, callback });
  }
}
export class Modal {
  constructor(app) {
    this.app = app;
    this.contentEl = element();
  }
  open() {
    modals.push(this);
    this.onOpen?.();
  }
}
export class Notice {
  constructor(text) {
    notices.push(text);
  }
}
export function reset() {
  modals.length = 0;
  notices.length = 0;
}
export function textOf(el) {
  return [el.text, ...el.children.map(textOf)].join(' ');
}

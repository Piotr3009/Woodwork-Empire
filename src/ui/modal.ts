// The one modal in the game: draggable by its header, scrollable in the body, sticky footer, and a
// close cross top right (CLAUDE.md 3.9, 10.4).

export interface ModalSpec {
  id: string;
  title: string;
  body: string;
  footer?: string;
  /** Decisions have no cross: the choice buttons are the way out. */
  closable?: boolean;
  wide?: boolean;
}

export interface ModalPosition {
  left: number;
  top: number;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Money with a thousands comma and no decimals (CLAUDE.md 10.4). */
export function money(value: number): string {
  const rounded = Math.round(value);
  const text = Math.abs(rounded).toLocaleString('en-GB');
  return `${rounded < 0 ? '-' : ''}£${text}`;
}

export function minutes(value: number): string {
  return `${Math.max(0, Math.round(value))} min`;
}

export function days(value: number): string {
  return `${Math.round(value)} days`;
}

export function renderModal(spec: ModalSpec, position: ModalPosition | null): string {
  const style = position ? ` style="left:${position.left}px;top:${position.top}px"` : '';
  const closable = spec.closable !== false;
  const cross = closable
    ? '<button class="modal-close" data-do="closeModal" title="Close" aria-label="Close">' +
      '×</button>'
    : '';
  return (
    `<div class="modal${spec.wide === true ? ' modal-wide' : ''}${position ? '' : ' modal-centred'}"` +
    ` data-modal="${spec.id}"${style}>` +
    `<header class="modal-head" data-drag="1"><h2>${escapeHtml(spec.title)}</h2>${cross}</header>` +
    `<div class="modal-body">${spec.body}</div>` +
    (spec.footer === undefined ? '' : `<footer class="modal-foot">${spec.footer}</footer>`) +
    '</div>'
  );
}

/** A text filter with the clear cross every filter field has (CLAUDE.md 3.10). */
export function filterField(key: string, value: string, placeholder: string): string {
  const clear =
    value === ''
      ? ''
      : `<button class="field-clear" data-do="clearFilter" data-key="${key}" ` +
        'title="Clear" aria-label="Clear">×</button>';
  return (
    `<div class="field"><input type="text" class="filter-input" data-filter="${key}" ` +
    `data-focus-key="filter-${key}" value="${escapeHtml(value)}" ` +
    `placeholder="${escapeHtml(placeholder)}" />${clear}</div>`
  );
}

export function emptyLine(text: string): string {
  return `<p class="empty">${escapeHtml(text)}</p>`;
}

export function button(action: string, text: string, extra = ''): string {
  return `<button class="btn" data-do="${action}"${extra ? ` ${extra}` : ''}>${escapeHtml(text)}</button>`;
}

export function primaryButton(action: string, text: string, extra = ''): string {
  return (
    `<button class="btn btn-primary" data-do="${action}"${extra ? ` ${extra}` : ''}>` +
    `${escapeHtml(text)}</button>`
  );
}

export function disabledButton(text: string, reason: string): string {
  return (
    `<button class="btn" disabled title="${escapeHtml(reason)}">${escapeHtml(text)}</button>`
  );
}

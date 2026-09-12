// The one modal in the game: draggable by its header, scrollable in the body, sticky footer, and a
// close cross top right (CLAUDE.md 3.9, 10.4).
//
// One escape and one money format for the whole game: the renderers and the engine own them,
// because both layers sit below the modals.

import { WHY, formatMoney, plural } from '../engine/index';
import { escapeText } from '../render/hall';

export const escapeHtml = escapeText;
export const money = formatMoney;

export interface ModalSpec {
  id: string;
  title: string;
  body: string;
  footer?: string;
  /** Decisions have no cross: the choice buttons are the way out. */
  closable?: boolean;
  wide?: boolean;
  /** Fills the page, for the order board (CLAUDE.md T2 3.2). */
  full?: boolean;
}

export interface ModalPosition {
  left: number;
  top: number;
}

export function minutes(value: number): string {
  return `${Math.max(0, Math.round(value))} min`;
}

/** The one plural in the game lives in the engine, because the event copy needs it too. */
export { plural };

export function days(value: number): string {
  return plural(Math.round(value), 'day', 'days');
}

export function renderModal(spec: ModalSpec, position: ModalPosition | null): string {
  const style = position ? ` style="left:${position.left}px;top:${position.top}px"` : '';
  const closable = spec.closable !== false;
  const cross = closable
    ? '<button class="modal-close" data-do="closeModal" title="Close" aria-label="Close">' +
      '×</button>'
    : '';
  const size = spec.full === true ? ' modal-full' : spec.wide === true ? ' modal-wide' : '';
  return (
    `<div class="modal${size}${position ? '' : ' modal-centred'}"` +
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

/** The one allowed disabled button: a locked catalogue line with its reason (CLAUDE.md 9.2). */
export function lockedButton(text: string, reason: string): string {
  return `<button class="btn" disabled title="${escapeHtml(reason)}">${escapeHtml(text)}</button>`;
}

/** The optional real life note beside a decision: a text link, never an icon (CLAUDE.md T2 3.12). */
export function whyLink(state: { showWhy: boolean }, key: string): string {
  if (!state.showWhy || WHY[key] === undefined) return '';
  return (
    `<button class="why-link" data-do="showWhy" data-id="${key}" ` +
    'title="Why it is like this in real life">i</button>'
  );
}

/** Everywhere else, a reason the player can read instead of a control he cannot press. */
export function reasonLabel(reason: string): string {
  return `<span class="reason">${escapeHtml(reason)}</span>`;
}

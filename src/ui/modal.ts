// The one modal in the game: draggable by its header, scrollable in the body, sticky footer, and a
// close cross top right (CLAUDE.md 3.9, 10.4).
//
// One escape and one money format for the whole game: the renderers and the engine own them,
// because both layers sit below the modals.

import { WHY, formatMoney, plural, startTaskCheck } from '../engine/index';
import type { GameState, TaskInstance } from '../engine/index';
import { escapeText } from '../render/hall';

export const escapeHtml = escapeText;
export const money = formatMoney;

export interface ModalPosition {
  left: number;
  top: number;
}

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
  /** Where the player dragged it. Null is centred. */
  position?: ModalPosition | null;
}

export function minutes(value: number): string {
  return `${Math.max(0, Math.round(value))} min`;
}

/** The one plural in the game lives in the engine, because the event copy needs it too. */
export { plural };

export function days(value: number): string {
  return plural(Math.round(value), 'day', 'days');
}

const CROSS =
  '<button class="modal-close" data-do="closeModal" title="Close" aria-label="Close">' +
  '×</button>';

function modalClass(spec: ModalSpec): string {
  const size = spec.full === true ? ' modal-full' : spec.wide === true ? ' modal-wide' : '';
  return `modal${size}${spec.position ? '' : ' modal-centred'}`;
}

/** The shell of a modal: a head, an empty body and an empty foot. Content goes in through
 *  `fillModal`, which is the only path that touches it afterwards (CLAUDE.md T3 3.4). */
export function renderModal(spec: ModalSpec): string {
  return (
    `<div class="${modalClass(spec)}" data-modal="${spec.id}">` +
    '<header class="modal-head" data-drag="1"><h2></h2></header>' +
    '<div class="modal-body"></div>' +
    '<footer class="modal-foot"></footer>' +
    '</div>'
  );
}

/** Puts this render's content into a shell that is already on the page, and leaves the body
 *  scrolled where the player left it. Replacing the whole modal every game minute is what threw
 *  him back to the top (CLAUDE.md T3 3.4). */
function fillModal(node: Element, spec: ModalSpec): void {
  node.className = modalClass(spec);
  if (node instanceof HTMLElement) {
    node.style.left = spec.position ? `${spec.position.left}px` : '';
    node.style.top = spec.position ? `${spec.position.top}px` : '';
  }
  const head = node.querySelector('.modal-head');
  const heading = node.querySelector('.modal-head h2');
  if (heading !== null && heading.textContent !== spec.title) heading.textContent = spec.title;
  if (head !== null) {
    const cross = head.querySelector('.modal-close');
    const closable = spec.closable !== false;
    if (closable && cross === null) head.insertAdjacentHTML('beforeend', CROSS);
    if (!closable && cross !== null) cross.remove();
  }
  const body = node.querySelector('.modal-body');
  if (body !== null) {
    const scrolled = body.scrollTop;
    body.innerHTML = spec.body;
    // Clamp only when the new content measures shorter. A browser clamps for itself, and the
    // measurement is zero in a headless DOM, where clamping would throw the player to the top.
    const most = body.scrollHeight - body.clientHeight;
    body.scrollTop = most > 0 ? Math.min(scrolled, most) : scrolled;
  }
  const foot = node.querySelector('.modal-foot');
  if (foot !== null) {
    if (spec.footer === undefined) {
      foot.setAttribute('hidden', 'hidden');
      foot.innerHTML = '';
    } else {
      foot.removeAttribute('hidden');
      foot.innerHTML = spec.footer;
    }
  }
}

/** Brings the modal layer into line with what should be open, keeping every shell that is still
 *  wanted. One path for every modal in the game, with no special case (CLAUDE.md T3 3.4). */
export function syncModals(layer: Element, specs: ModalSpec[]): void {
  const wanted = new Set(specs.map((spec) => spec.id));
  for (const node of Array.from(layer.children)) {
    if (!wanted.has(node.getAttribute('data-modal') ?? '')) node.remove();
  }
  let previous: Element | null = null;
  for (const spec of specs) {
    let node: Element | null = layer.querySelector(`[data-modal="${spec.id}"]`);
    if (node === null) {
      const holder = document.createElement('div');
      holder.innerHTML = renderModal(spec);
      node = holder.firstElementChild;
      if (node === null) continue;
      layer.appendChild(node);
    }
    fillModal(node, spec);
    // The event modal sits over a desk modal, so the order the caller asked for is kept.
    const after: Element | null =
      previous === null ? layer.firstElementChild : previous.nextElementSibling;
    if (after !== node) layer.insertBefore(node, after);
    previous = node;
  }
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
    `data-field="filter-${key}" value="${escapeHtml(value)}" ` +
    `placeholder="${escapeHtml(placeholder)}" />${clear}</div>`
  );
}

/** The row of chips a modal is read in tabs by. One shape for all of them: the laptop, the
 *  catalogue and the books all put their own action and their own list through here. */
export function tabBar(action: string, tabs: Array<[string, string]>, current: string): string {
  const chips = tabs
    .map(
      ([id, label]) =>
        `<button class="chip${id === current ? ' is-on' : ''}" data-do="${action}" ` +
        `data-id="${id}">${escapeHtml(label)}</button>`,
    )
    .join('');
  return `<div class="tabs">${chips}</div>`;
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

/** The one control a task row carries, wherever the row is drawn. The engine is asked whether the
 *  owner could start this task and the answer is shown: a button he can press, or the reason he
 *  cannot, with the way out of it. A Start the engine would refuse is never drawn, which is what
 *  left the drawings unable to be drawn (CLAUDE.md T4 3.2). */
export function taskStartAction(state: GameState, task: TaskInstance, startLabel: string): string {
  if (task.done) return '<span class="done">Done</span>';
  if (state.owner.currentTaskId === task.id) return button('pauseTask', 'Pause');
  const check = startTaskCheck(state, task.id);
  if (check.ok) return button('startTask', startLabel, `data-id="${task.id}"`);
  // He is holding something else: he can put it down here, without going to find it.
  const wayOut = check.blockingTaskId === null ? '' : button('pauseTask', 'Put that down');
  return reasonLabel(check.reason) + wayOut;
}

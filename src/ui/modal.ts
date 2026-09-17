// The one modal in the game: draggable by its header, scrollable in the body, sticky footer, and a
// close cross top right (CLAUDE.md 3.9, 10.4).
//
// One escape and one money format for the whole game: the renderers and the engine own them,
// because both layers sit below the modals.

import { WHY, formatMoney, interviewTask, plural, startTaskCheck } from '../engine/index';
import type { GameState, TaskInstance } from '../engine/index';
import { escapeText } from '../render/hall';
import { patchInto } from './patch';

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

/** The class a signed figure is written in: the game's green above nothing, its red below it
 *  and the body colour at nothing. The one helper for every plus and minus line on a card, so the
 *  sign decides the colour everywhere (PIOTR, CLAUDE.md T12 3.1). */
export function signClass(value: number): string {
  if (value > 0) return 'good';
  if (value < 0) return 'bad';
  return '';
}

/** Pounds with the sign: "+\u00a3300", "-\u00a32,699", "\u00a30". The one formatter for a signed
 *  money figure, so every plus and minus in pounds reads the same (CLAUDE.md T13 1). */
export function signedMoney(value: number): string {
  const rounded = Math.round(value);
  if (rounded > 0) return `+${money(rounded)}`;
  return money(rounded);
}

/** A signed figure as a span in the class its sign gives it: the one helper for a coloured
 *  plus or minus in the body of a card, a modal or a tooltip (CLAUDE.md T13 3.1). */
export function signedFigure(text: string, value: number): string {
  const tone = signClass(value);
  return `<span class="figure${tone === '' ? '' : ` ${tone}`}">${escapeHtml(text)}</span>`;
}

/** The one close control in the game: the cross the Company board has, a cream disc on the top
 *  right corner of the frame, half outside it. Every modal, every page and every card is shut by
 *  this markup and this class, so a screen cannot wear a different cross from the one beside it,
 *  and the catalogue's little dark cross in the corner is gone with the rest of them
 *  (PIOTR, 17.09; CLAUDE.md T18 2.5). The action is the one thing that changes: a modal is shut
 *  with `closeModal` and the Menu with `closeMenu`. */
export function closeButton(action = 'closeModal'): string {
  return (
    `<button class="modal-close" data-do="${action}" title="Close" aria-label="Close">` +
    '×</button>'
  );
}

const CROSS = closeButton();

/** Three families and nothing else (CLAUDE.md T11 1, T14 2.1). `folder` is paper on a kraft
 *  folder (SPRITES.md 11, the GPT asset ui.folder.png): the catalogue, the books, the desk and
 *  every event. `board` is cards on a board: the Work Plan and the shopping list on steel with
 *  magnets, the company board on its own felt. `screen` is software: the laptop, and only the
 *  laptop, a bezel drawn in CSS with a cool light screen inside it, the system font, flat tiles,
 *  and nothing of paper across the bezel; the Team is a page of it (PIOTR, 15.09 and 16.09). */
export type ModalSkin = 'folder' | 'board' | 'screen';

/** Every modal id in the game with the skin it wears. One table, so a modal cannot be paper in
 *  one place and steel in another, and a modal that is on none of the families is a test failure
 *  (CLAUDE.md T11 1, 3.5, T14 2.1). */
export const MODAL_SKINS: Record<string, ModalSkin> = {
  board: 'folder',
  // The one screen in the game: the laptop is a computer (CLAUDE.md T14 2.1).
  laptop: 'screen',
  accounting: 'folder',
  catalogue: 'folder',
  event: 'folder',
  daySummary: 'folder',
  workPlan: 'board',
  shopping: 'board',
  company: 'board',
  // The settings, off the gear on the top bar, are a sheet of paper (CLAUDE.md T13 3.22).
  settings: 'folder',
  // One machine's card is a card in a folder, like an event (CLAUDE.md T17 2.6).
  machineCard: 'folder',
};

/** The one board of the three that is a picture and not CSS: green felt in an oak frame, with the
 *  live text over it (SPRITES.md 11; CLAUDE.md T11 3.5). */
const FELT_MODALS: ReadonlySet<string> = new Set(['company']);

function modalClass(spec: ModalSpec): string {
  const size = spec.full === true ? ' modal-full' : spec.wide === true ? ' modal-wide' : '';
  const skin = ` modal-${MODAL_SKINS[spec.id] ?? 'folder'}`;
  const felt = FELT_MODALS.has(spec.id) ? ' modal-felt' : '';
  return `modal${size}${skin}${felt}${spec.position ? '' : ' modal-centred'}`;
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
    // Patched, not replaced: a control the player has his finger on keeps its node, whatever the
    // minute does to the figures beside it (CLAUDE.md T9 3.8).
    patchInto(body, spec.body);
    // Clamp only when the new content measures shorter. A browser clamps for itself, and the
    // measurement is zero in a headless DOM, where clamping would throw the player to the top.
    const most = body.scrollHeight - body.clientHeight;
    body.scrollTop = most > 0 ? Math.min(scrolled, most) : scrolled;
  }
  const foot = node.querySelector('.modal-foot');
  if (foot !== null) {
    if (spec.footer === undefined) {
      foot.setAttribute('hidden', 'hidden');
      patchInto(foot, '');
    } else {
      foot.removeAttribute('hidden');
      patchInto(foot, spec.footer);
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
/** The interview the owner is in, over the modal that started it. Nobody is taken on until the
 *  hour is spent (CLAUDE.md T7 3.10). Buying is no longer a trip: it costs him nothing and he
 *  never leaves the workshop for it (CLAUDE.md T9 3.1), and an interview is not one of the three
 *  things the "Owner is out" line is for, so it has its own selector (CLAUDE.md T9 3.3). */
export function tripLine(state: GameState): string {
  const task = interviewTask(state);
  if (task === null) return '';
  const spent = Math.round(task.minutesTotal - task.minutesRemaining);
  return (
    `<p class="warn trip">Interview: ${spent} of ${Math.round(task.minutesTotal)} min. ` +
    'Nobody is on the books until it is over.</p>'
  );
}

export function taskStartAction(state: GameState, task: TaskInstance, startLabel: string): string {
  if (task.done) return '<span class="done">Done</span>';
  if (state.owner.currentTaskId === task.id) return button('pauseTask', 'Pause');
  const check = startTaskCheck(state, task.id);
  if (check.ok) return button('startTask', startLabel, `data-id="${task.id}"`);
  // He is holding something else: he can put it down here, without going to find it.
  const wayOut = check.blockingTaskId === null ? '' : button('pauseTask', 'Put that down');
  return reasonLabel(check.reason) + wayOut;
}

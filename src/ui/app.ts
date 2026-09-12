// Bootstrap, view switching and the game loop. Every engine action the player can reach is wired
// here, in one place (CLAUDE.md 3.5, 10.1).

import {
  CLEANING_MINUTES,
  applyAction,
  createGame,
  gameMinutesPerRealSecond,
  brokenMachines,
  findSpec,
  machinesDueService,
  oldestReadyJob,
  ownerJob,
  runMinutes,
} from '../engine/index';
import type {
  Difficulty,
  GameAction,
  GameState,
  Speed,
  WorkerRole,
  WorkerTier,
} from '../engine/index';
import type { Ghost } from '../render/hall';

/** The item under the mouse while the hall is being set out. */
interface Drag {
  itemId: string;
  x: number;
  y: number;
}
import { WHY, boxOf, canPlace } from '../engine/index';
import { renderHall } from '../render/hall';
import { screenToTile } from '../render/iso';
import { renderOffice } from '../render/office';
import { renderAccounting } from './accounting';
import { renderBoard } from './board';
import { renderCatalogue } from './catalogue';
import { renderDayEnd, renderGameOver } from './dayEnd';
import { renderEvent, renderEventFooter } from './eventModal';
import { renderHiring } from './hiring';
import { renderLaptop } from './laptop';
import { renderMaterials } from './materials';
import {
  type ModalPosition,
  escapeHtml,
  minutes,
  reasonLabel,
  renderModal,
} from './modal';
import { renderStart } from './start';
import { renderMenu, renderTopbar, speedFromString } from './topbar';

type ModalId = 'board' | 'laptop' | 'accounting' | 'catalogue' | 'hiring' | 'materials';

interface Ui {
  screen: 'start' | 'game';
  view: 'hall' | 'office';
  modal: ModalId | null;
  modalPosition: ModalPosition | null;
  eventPosition: ModalPosition | null;
  menuOpen: boolean;
  note: string;
  filters: Record<string, string>;
  /** Field to put the caret back in after the next render. */
  focusNext: string | null;
  stockSheets: string;
  arrearsAmount: string;
  /** Setting the hall out: the clock is stopped and the kit can be dragged about. */
  setup: boolean;
  speedBeforeSetup: Speed;
  drag: Drag | null;
  showWhy: boolean;
  /** The real life note the player has open, and where he clicked for it. */
  why: { key: string; left: number; top: number } | null;
  difficulty: Difficulty;
  playerName: string;
  companyName: string;
}

const MODAL_TITLES: Record<ModalId, string> = {
  board: 'Order board',
  laptop: 'Laptop',
  accounting: 'Accounting',
  catalogue: 'Equipment catalogue',
  hiring: 'Team board',
  materials: 'Materials and stock',
};

let ui: Ui = freshUi();
let state: GameState | null = null;
let root: HTMLElement | null = null;
let accumulator = 0;
let lastFrame = 0;

function freshUi(): Ui {
  return {
    screen: 'start',
    view: 'hall',
    modal: null,
    modalPosition: null,
    eventPosition: null,
    menuOpen: false,
    note: '',
    filters: { board: '', catalogue: '' },
    focusNext: null,
    stockSheets: '6',
    arrearsAmount: '500',
    setup: false,
    speedBeforeSetup: 0,
    drag: null,
    showWhy: true,
    why: null,
    difficulty: 'easy',
    playerName: 'Piotr',
    companyName: 'Woodwork Empire',
  };
}

function game(): GameState {
  if (!state) throw new Error('no game running');
  return state;
}

function dispatch(action: GameAction): void {
  state = applyAction(game(), action);
  render();
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function modalBody(id: ModalId, current: GameState): string {
  switch (id) {
    case 'board':
      return renderBoard(current, ui.filters.board ?? '');
    case 'laptop':
      return renderLaptop(current);
    case 'accounting':
      return renderAccounting(current, ui.arrearsAmount);
    case 'catalogue':
      return renderCatalogue(current, ui.filters.catalogue ?? '');
    case 'hiring':
      return renderHiring(current);
    case 'materials':
      return renderMaterials(current, ui.stockSheets);
  }
}

/** The ghost of the item being dragged, with the engine's verdict on the tile under the mouse. */
function ghostFor(current: GameState): Ghost | null {
  const drag = ui.drag;
  if (drag === null) return null;
  const item = current.equipment.find((entry) => entry.id === drag.itemId);
  if (!item) return null;
  const box = boxOf(item.specId, drag.x, drag.y);
  const check = canPlace(current, drag.itemId, drag.x, drag.y);
  return { x: box.x, y: box.y, width: box.width, depth: box.depth, ok: check.ok, reason: check.reason };
}

function setupControls(): string {
  return (
    '<div class="view-controls">' +
    '<button class="btn btn-primary" data-do="endSetup">Done</button>' +
    '<span class="reason">Drag the machines, the benches and the shelving where you want them. ' +
    'The rooms and the gate stay where they are.</span>' +
    '</div>'
  );
}

function hallControls(current: GameState): string {
  if (ui.setup) return setupControls();
  const ready = oldestReadyJob(current);
  const working = ownerJob(current) !== null;
  const workHere = working
    ? reasonLabel('You are at the bench')
    : ready
      ? '<button class="btn btn-primary" data-do="workHere">Work here</button>'
      : reasonLabel('No job has its material in the hall yet');
  const name = (specId: string): string =>
    (findSpec(specId)?.name ?? specId).toLowerCase();
  const fix = brokenMachines(current)
    .map(
      (item) =>
        `<button class="btn" data-do="repairMachine" data-id="${item.id}">` +
        `Fix the ${escapeHtml(name(item.specId))}</button>`,
    )
    .join('');
  const service = machinesDueService(current)
    .filter((item) => !item.broken)
    .map(
      (item) =>
        `<button class="btn" data-do="serviceMachine" data-id="${item.id}">` +
        `Service the ${escapeHtml(name(item.specId))}</button>`,
    )
    .join('');
  return (
    '<div class="view-controls">' +
    workHere +
    '<button class="btn" data-do="startCleaning">Clean up · ' +
    `${minutes(CLEANING_MINUTES)}</button>` +
    '<button class="btn" data-do="startSetup">Set up hall</button>' +
    fix +
    service +
    '</div>'
  );
}

/** The little popover behind an "i" link (CLAUDE.md T2 3.12). */
function renderWhy(): string {
  const open = ui.why;
  if (open === null) return '';
  const text = WHY[open.key];
  if (text === undefined) return '';
  const left = Math.max(8, Math.min(open.left, 1280 - 340));
  return (
    `<div class="why-pop" style="left:${left}px;top:${open.top + 16}px">` +
    `<p>${escapeHtml(text)}</p>` +
    '<button class="btn" data-do="closeWhy">Right</button></div>'
  );
}

function screenHtml(): string {
  if (ui.screen === 'start' || state === null) {
    return renderStart({
      difficulty: ui.difficulty,
      playerName: ui.playerName,
      companyName: ui.companyName,
      showWhy: ui.showWhy,
    });
  }
  const current = state;
  const modals: string[] = [];
  if (ui.modal !== null) {
    modals.push(
      renderModal(
        {
          id: ui.modal,
          title: MODAL_TITLES[ui.modal],
          body: modalBody(ui.modal, current),
          wide: ui.modal === 'accounting',
          full: ui.modal === 'board',
        },
        ui.modalPosition,
      ),
    );
  }
  if (current.activeEvent) {
    const event = current.activeEvent;
    modals.push(
      renderModal(
        {
          id: 'event',
          title: event.title,
          body: event.kind === 'dayEnd' ? renderDayEnd(current) : renderEvent(current, event),
          footer: renderEventFooter(event),
          closable: event.choices.length === 1,
          wide: event.kind === 'dayEnd',
        },
        ui.eventPosition,
      ),
    );
  }
  // The last word the company gets is the bankruptcy event, over the game over screen.
  if (current.gameOver) {
    return renderGameOver(current) + `<div class="modal-layer">${modals.join('')}</div>`;
  }
  const view = ui.view === 'hall' ? renderHall(current, ghostFor(current)) : renderOffice(current);
  const controls = ui.view === 'hall' ? hallControls(current) : '';
  const note = ui.note === '' ? '' : `<p class="view-note">${escapeHtml(ui.note)}</p>`;
  const why = renderWhy();
  return (
    renderTopbar(current, ui.view) +
    (ui.menuOpen ? renderMenu(current) : '') +
    `<main class="view">${view}${controls}${note}</main>` +
    `<div class="modal-layer">${modals.join('')}</div>${why}`
  );
}

interface FocusMemory {
  key: string;
  start: number | null;
}

function captureFocus(): FocusMemory | null {
  const active = document.activeElement;
  if (!(active instanceof HTMLInputElement)) return null;
  const key = active.dataset.focusKey;
  if (key === undefined) return null;
  return { key, start: active.selectionStart };
}

function restoreFocus(memory: FocusMemory | null): void {
  if (!memory || !root) return;
  const field = root.querySelector(`[data-focus-key="${memory.key}"]`);
  if (!(field instanceof HTMLInputElement)) return;
  field.focus();
  if (memory.start !== null && field.type === 'text') {
    field.setSelectionRange(memory.start, memory.start);
  }
}

/** Where every figure was standing before this render, by its key. */
function figurePositions(): Map<string, string> {
  const positions = new Map<string, string>();
  if (!root) return positions;
  for (const node of Array.from(root.querySelectorAll('[data-figure]'))) {
    const key = node.getAttribute('data-figure');
    const transform = node.getAttribute('transform');
    if (key !== null && transform !== null) positions.set(key, transform);
  }
  return positions;
}

/** The view is rebuilt from the state every frame, so a figure that moved would jump. It is put
 *  back where it was and moved on the next frame, which is what the CSS transition needs. */
function slideFigures(before: Map<string, string>): void {
  if (!root || before.size === 0) return;
  const moving: Array<{ node: Element; to: string }> = [];
  for (const node of Array.from(root.querySelectorAll('[data-figure]'))) {
    const key = node.getAttribute('data-figure');
    const to = node.getAttribute('transform');
    if (key === null || to === null) continue;
    const from = before.get(key);
    if (from === undefined || from === to) continue;
    node.setAttribute('transform', from);
    moving.push({ node, to });
  }
  if (moving.length === 0) return;
  const step = (): void => {
    for (const entry of moving) entry.node.setAttribute('transform', entry.to);
  };
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(step);
  } else {
    step();
  }
}

export function render(): void {
  if (!root) return;
  const memory = ui.focusNext === null ? captureFocus() : { key: ui.focusNext, start: null };
  ui.focusNext = null;
  const before = figurePositions();
  root.innerHTML = screenHtml();
  slideFigures(before);
  restoreFocus(memory);
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

function openModal(id: ModalId, anchor: { x: number; y: number } | null): void {
  ui.modal = id;
  // The board fills the page, so it is always centred (CLAUDE.md T2 3.2).
  const beside = anchor === null || id === 'board' ? null : clampToViewport(anchor.x + 24, anchor.y - 40);
  ui.modalPosition = beside;
  ui.menuOpen = false;
}

function clampToViewport(x: number, y: number): ModalPosition {
  const width = typeof window === 'undefined' ? 1280 : window.innerWidth;
  const height = typeof window === 'undefined' ? 800 : window.innerHeight;
  return {
    left: Math.max(8, Math.min(x, width - 520)),
    top: Math.max(56, Math.min(y, height - 220)),
  };
}

/** Clicking the van at the gate opens the unloading choice again (CLAUDE.md 10.1). */
function askUnload(deliveryId: string): void {
  dispatch({ type: 'ASK_UNLOAD', deliveryId });
}

/** Objects on the desk open their modal beside where the player clicked (CLAUDE.md 10.4). */
const OFFICE_MODALS: Record<string, ModalId> = {
  laptop: 'laptop',
  accounting: 'accounting',
  materials: 'materials',
  catalogue: 'catalogue',
  hiring: 'hiring',
  phone: 'board',
};

function officeTarget(id: string, point: { x: number; y: number }): void {
  const modal = OFFICE_MODALS[id];
  if (modal !== undefined) {
    openModal(modal, point);
    return;
  }
  if (id === 'desk') ui.note = 'The desk. The laptop goes on it.';
}

/** Elements in the SVG views are SVGElement, not HTMLElement, but both carry a dataset. */
type DataElement = HTMLElement | SVGElement;

function dataElement(node: Element | null): DataElement | null {
  if (node instanceof HTMLElement) return node;
  if (node instanceof SVGElement) return node;
  return null;
}

function handleAction(element: DataElement, point: { x: number; y: number }): void {
  const what = element.dataset.do;
  if (what === undefined) return;
  const id = element.dataset.id ?? '';
  ui.note = '';
  switch (what) {
    case 'pickDifficulty':
      ui.difficulty = id as Difficulty;
      break;
    case 'startGame':
      state = createGame({
        seed: newSeed(),
        difficulty: ui.difficulty,
        playerName: ui.playerName.trim() === '' ? 'Piotr' : ui.playerName.trim(),
        companyName: ui.companyName.trim() === '' ? 'Woodwork Empire' : ui.companyName.trim(),
        showWhy: ui.showWhy,
      });
      ui.screen = 'game';
      accumulator = 0;
      break;
    case 'restart':
      ui = freshUi();
      state = null;
      break;
    case 'setSpeed':
      dispatch({ type: 'SET_SPEED', speed: speedFromString(element.dataset.speed ?? '0') });
      return;
    case 'setView':
      ui.view = element.dataset.view === 'office' ? 'office' : 'hall';
      if (ui.view !== 'hall') endSetup();
      break;
    case 'startSetup':
      ui.setup = true;
      ui.drag = null;
      ui.speedBeforeSetup = game().speed;
      dispatch({ type: 'SET_SPEED', speed: 0 });
      return;
    case 'endSetup':
      endSetup();
      dispatch({ type: 'SET_SPEED', speed: ui.speedBeforeSetup });
      return;
    case 'toggleMenu':
      ui.menuOpen = !ui.menuOpen;
      break;
    case 'toggleWhy':
      ui.showWhy = !game().showWhy;
      ui.menuOpen = false;
      ui.why = null;
      dispatch({ type: 'SET_SHOW_WHY', on: ui.showWhy });
      return;
    case 'showWhy':
      ui.why =
        ui.why !== null && ui.why.key === id
          ? null
          : { key: id, left: Math.round(point.x), top: Math.round(point.y) };
      break;
    case 'closeWhy':
      ui.why = null;
      break;
    case 'openModal':
      openModal((element.dataset.modal ?? 'board') as ModalId, null);
      break;
    case 'closeModal':
      if (game().activeEvent && game().activeEvent?.choices.length === 1) {
        const choice = game().activeEvent?.choices[0];
        dispatch({ type: 'RESOLVE_EVENT', choiceId: choice ? choice.id : 'ok' });
        return;
      }
      ui.modal = null;
      ui.modalPosition = null;
      break;
    case 'clearFilter': {
      const key = element.dataset.key ?? '';
      ui.filters[key] = '';
      // Rule 3.10: clearing a filter puts the caret back in the field.
      ui.focusNext = `filter-${key}`;
      break;
    }
    case 'endDay':
      ui.menuOpen = false;
      dispatch({ type: 'END_DAY' });
      return;
    case 'skipDay':
      ui.menuOpen = false;
      dispatch({ type: 'SKIP_DAY' });
      return;
    case 'acceptEnquiry':
      dispatch({
        type: 'ACCEPT_ENQUIRY',
        enquiryId: id,
        byHand: element.dataset.byhand === '1',
      });
      return;
    case 'startTask':
      dispatch({ type: 'START_TASK', taskId: id });
      return;
    case 'pauseTask':
      dispatch({ type: 'PAUSE_TASK' });
      return;
    case 'buyEquipment':
      dispatch({ type: 'BUY_EQUIPMENT', specId: id });
      return;
    case 'buySoftware':
      dispatch({ type: 'BUY_SOFTWARE', mode: id === 'subscription' ? 'subscription' : 'oneOff' });
      return;
    case 'buyStock':
      dispatch({ type: 'BUY_STOCK', sheets: Number(element.dataset.sheets ?? '0') });
      return;
    case 'orderTransport':
      dispatch({ type: 'ORDER_TRANSPORT', jobId: id });
      return;
    case 'startProduction':
      // Straight to the bench: the laptop closes and the hall comes up (CLAUDE.md T2 3.3).
      ui.modal = null;
      ui.modalPosition = null;
      ui.view = 'hall';
      dispatch({ type: 'WORK_HERE', jobId: id });
      return;
    case 'payArrears': {
      const typed = element.dataset.amount ?? 'all';
      dispatch({ type: 'PAY_ARREARS', amount: typed === 'all' ? null : Number(typed) });
      return;
    }
    case 'setMaterialMode':
      dispatch({
        type: 'SET_MATERIAL_MODE',
        jobId: id,
        mode: element.dataset.mode === 'stock' ? 'stock' : 'perJob',
      });
      return;
    case 'hire':
      dispatch({
        type: 'HIRE',
        role: (element.dataset.role ?? 'joiner') as WorkerRole,
        tier: (element.dataset.tier ?? '') === ''
          ? null
          : ((element.dataset.tier ?? '') as WorkerTier),
      });
      return;
    case 'workHere':
      dispatch({ type: 'WORK_HERE', jobId: null });
      return;
    case 'assignJob':
      dispatch({ type: 'ASSIGN_JOB', jobId: id, workerId: element.dataset.worker ?? 'owner' });
      return;
    case 'startCleaning':
      dispatch({ type: 'START_CLEANING' });
      return;
    case 'repairMachine':
      dispatch({ type: 'REPAIR_MACHINE', equipmentId: id });
      return;
    case 'serviceMachine':
      dispatch({ type: 'SERVICE_MACHINE', equipmentId: id });
      return;
    case 'resolveEvent':
      ui.eventPosition = null;
      dispatch({ type: 'RESOLVE_EVENT', choiceId: id });
      return;
    case 'copyState':
      copyState();
      break;
    default:
      break;
  }
  void point;
  render();
}

function newSeed(): number {
  // The engine needs a seed from outside: this is the one place a clock reading is allowed.
  return Math.floor(Date.now() % 2147483647);
}

function copyState(): void {
  const clipboard = typeof navigator === 'undefined' ? undefined : navigator.clipboard;
  if (!clipboard) {
    ui.note = 'This browser gives no clipboard access.';
    return;
  }
  void clipboard.writeText(JSON.stringify(game()));
  ui.note = 'State copied as JSON.';
}

function handleSceneClick(element: DataElement, point: { x: number; y: number }): boolean {
  // In setup mode a click on the kit is a drag, not a question about the bag.
  if (ui.setup) return true;
  const room = element.dataset.room;
  if (room !== undefined) {
    if (room === 'office') {
      ui.view = 'office';
    } else if (room === 'wc') {
      ui.note = 'The WC. Cold tap, one towel.';
    } else {
      ui.note = 'The canteen. Tea, and somewhere to eat out of the dust.';
    }
    render();
    return true;
  }
  const van = element.dataset.van;
  if (van !== undefined) {
    askUnload(van);
    return true;
  }
  const kit = element.dataset.kit;
  if (kit !== undefined) {
    const item = game().equipment.find((entry) => entry.id === kit);
    if (item === undefined) return true;
    if (item.bagFull) {
      // The machine is stopped: clicking it asks again who changes the bag.
      dispatch({ type: 'ASK_BAG_CHANGE', equipmentId: item.id });
      return true;
    }
    ui.note = item.broken
      ? 'It has stopped. Nothing runs until it is fixed.'
      : `${minutes(item.minutesUsed)} of use since the last bag change.`;
    render();
    return true;
  }
  const office = element.dataset.office;
  if (office !== undefined) {
    const lock = element.dataset.lock;
    if (lock !== undefined) {
      ui.note = `${lock} first.`;
      render();
      return true;
    }
    officeTarget(office, point);
    render();
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------

function onClick(event: MouseEvent): void {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const point = { x: event.clientX, y: event.clientY };
  const doer = dataElement(target.closest('[data-do]'));
  if (doer) {
    if (doer instanceof HTMLButtonElement && doer.disabled) return;
    handleAction(doer, point);
    return;
  }
  const scene = dataElement(target.closest('[data-room],[data-van],[data-kit],[data-office]'));
  if (scene && state !== null) {
    handleSceneClick(scene, point);
  }
}

function onInput(event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  const filter = target.dataset.filter;
  if (filter !== undefined) {
    ui.filters[filter] = target.value;
    render();
    return;
  }
  const field = target.dataset.field;
  if (field === 'showWhy') {
    ui.showWhy = target.checked;
    render();
    return;
  }
  if (field === 'playerName') ui.playerName = target.value;
  if (field === 'companyName') ui.companyName = target.value;
  if (field === 'stockSheets') {
    ui.stockSheets = target.value;
    render();
  }
  if (field === 'arrearsAmount') {
    ui.arrearsAmount = target.value;
    render();
  }
}

function endSetup(): void {
  ui.setup = false;
  ui.drag = null;
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.key !== 'Escape') return;
  // Escape drops whatever is in hand before it closes anything (CLAUDE.md T2 3.10).
  if (ui.drag !== null) {
    ui.drag = null;
    render();
    return;
  }
  if (ui.modal !== null) {
    ui.modal = null;
    ui.modalPosition = null;
    render();
  }
}

/** The tile under the mouse, read through the hall SVG's own view box. */
function tileUnder(event: MouseEvent): { x: number; y: number } | null {
  if (!root) return null;
  const svg = root.querySelector('.hall-view');
  if (!(svg instanceof SVGSVGElement)) return null;
  const viewBox = (svg.getAttribute('viewBox') ?? '').split(' ').map(Number);
  const [minX, minY, width, height] = viewBox;
  if (minX === undefined || minY === undefined || width === undefined || height === undefined) {
    return null;
  }
  const rect = svg.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;
  const userX = ((event.clientX - rect.left) / rect.width) * width + minX;
  const userY = ((event.clientY - rect.top) / rect.height) * height + minY;
  const tile = screenToTile(userX, userY);
  return { x: Math.floor(tile.x), y: Math.floor(tile.y) };
}

/** Dragging a machine about while the hall is being set out (CLAUDE.md T2 3.10). */
function onSetupPointerDown(event: MouseEvent): boolean {
  if (!ui.setup || state === null) return false;
  const target = event.target;
  if (!(target instanceof Element)) return false;
  const kit = target.closest('[data-kit]');
  if (kit === null) return false;
  const itemId = kit.getAttribute('data-kit');
  if (itemId === null) return false;
  const at = tileUnder(event);
  if (at === null) return false;
  ui.drag = { itemId, x: at.x, y: at.y };
  const move = (moveEvent: MouseEvent): void => {
    if (ui.drag === null) return;
    const tile = tileUnder(moveEvent);
    if (tile === null || (tile.x === ui.drag.x && tile.y === ui.drag.y)) return;
    ui.drag = { itemId: ui.drag.itemId, x: tile.x, y: tile.y };
    render();
  };
  const up = (): void => {
    window.removeEventListener('mousemove', move);
    window.removeEventListener('mouseup', up);
    const drag = ui.drag;
    ui.drag = null;
    if (drag === null) {
      render();
      return;
    }
    dispatch({ type: 'MOVE_ITEM', itemId: drag.itemId, x: drag.x, y: drag.y });
  };
  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', up);
  event.preventDefault();
  render();
  return true;
}

/** Modals are dragged by their header (CLAUDE.md 3.9). */
function onPointerDown(event: MouseEvent): void {
  if (onSetupPointerDown(event)) return;
  const target = event.target;
  if (!(target instanceof Element)) return;
  const head = target.closest('[data-drag]');
  if (head === null) return;
  const modal = head.closest('.modal');
  if (!(modal instanceof HTMLElement)) return;
  const rect = modal.getBoundingClientRect();
  const grabX = event.clientX - rect.left;
  const grabY = event.clientY - rect.top;
  const isEvent = modal.dataset.modal === 'event';
  const move = (moveEvent: MouseEvent): void => {
    const position = {
      left: Math.max(0, moveEvent.clientX - grabX),
      top: Math.max(0, moveEvent.clientY - grabY),
    };
    if (isEvent) {
      ui.eventPosition = position;
    } else {
      ui.modalPosition = position;
    }
    modal.classList.remove('modal-centred');
    modal.style.left = `${position.left}px`;
    modal.style.top = `${position.top}px`;
  };
  const up = (): void => {
    window.removeEventListener('mousemove', move);
    window.removeEventListener('mouseup', up);
  };
  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', up);
  event.preventDefault();
}

/** One step of the loop: whole game minutes into the engine, fractions stay in the UI
 *  (CLAUDE.md 4). The frame callback and the smoke test both come through here. Hands back the
 *  minutes that actually ran, so an event opening part way through loses none. */
export function advanceMinutes(wholeMinutes: number): number {
  if (state === null || wholeMinutes <= 0) return 0;
  const result = runMinutes(state, wholeMinutes);
  state = result.state;
  render();
  return result.minutesRun;
}

function frame(now: number): void {
  const elapsed = Math.min(1000, now - lastFrame);
  lastFrame = now;
  if (state !== null && ui.screen === 'game' && state.gameOver === null) {
    const perSecond = gameMinutesPerRealSecond(state.speed);
    if (perSecond > 0 && state.activeEvent === null) {
      accumulator += (elapsed / 1000) * perSecond;
      const whole = Math.floor(accumulator);
      // Only what the engine actually ran leaves the accumulator: the rest waits for the modal.
      if (whole > 0) accumulator -= advanceMinutes(whole);
    }
  }
  requestAnimationFrame(frame);
}

export function mount(element: HTMLElement): void {
  root = element;
  element.addEventListener('click', onClick);
  element.addEventListener('input', onInput);
  element.addEventListener('mousedown', onPointerDown);
  window.addEventListener('keydown', onKeyDown);
  render();
  lastFrame = typeof performance === 'undefined' ? 0 : performance.now();
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(frame);
}

/** For the smoke test: the state the app is holding. */
export function currentState(): GameState | null {
  return state;
}

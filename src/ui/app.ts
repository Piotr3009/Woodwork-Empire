// Bootstrap, view switching and the game loop. Every engine action the player can reach is wired
// here, in one place (CLAUDE.md 3.5, 10.1).

import {
  CLEANING_MINUTES,
  applyAction,
  createGame,
  gameMinutesPerRealSecond,
  machinesStopped,
  oldestReadyJob,
  ownerJob,
  tick,
} from '../engine/index';
import type { Difficulty, GameAction, GameState, WorkerRole, WorkerTier } from '../engine/index';
import { renderHall } from '../render/hall';
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
      return renderAccounting(current);
    case 'catalogue':
      return renderCatalogue(current, ui.filters.catalogue ?? '');
    case 'hiring':
      return renderHiring(current);
    case 'materials':
      return renderMaterials(current, ui.stockSheets);
  }
}

function hallControls(current: GameState): string {
  const ready = oldestReadyJob(current);
  const working = ownerJob(current) !== null;
  const workHere = working
    ? reasonLabel('You are at the bench')
    : ready
      ? '<button class="btn btn-primary" data-do="workHere">Work here</button>'
      : reasonLabel('No job has its material in the hall yet');
  const fix = machinesStopped(current)
    ? '<button class="btn" data-do="repairExtractor">Fix extractor</button>'
    : '';
  return (
    '<div class="view-controls">' +
    workHere +
    '<button class="btn" data-do="startCleaning">Clean up · ' +
    `${minutes(CLEANING_MINUTES)}</button>` +
    fix +
    '</div>'
  );
}

function screenHtml(): string {
  if (ui.screen === 'start' || state === null) {
    return renderStart({
      difficulty: ui.difficulty,
      playerName: ui.playerName,
      companyName: ui.companyName,
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
          body: event.kind === 'dayEnd' ? renderDayEnd(current) : renderEvent(event),
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
  const view = ui.view === 'hall' ? renderHall(current) : renderOffice(current);
  const controls = ui.view === 'hall' ? hallControls(current) : '';
  const note = ui.note === '' ? '' : `<p class="view-note">${escapeHtml(ui.note)}</p>`;
  return (
    renderTopbar(current, ui.view) +
    (ui.menuOpen ? renderMenu(current) : '') +
    `<main class="view">${view}${controls}${note}</main>` +
    `<div class="modal-layer">${modals.join('')}</div>`
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

export function render(): void {
  if (!root) return;
  const memory = ui.focusNext === null ? captureFocus() : { key: ui.focusNext, start: null };
  ui.focusNext = null;
  root.innerHTML = screenHtml();
  restoreFocus(memory);
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

function openModal(id: ModalId, anchor: { x: number; y: number } | null): void {
  ui.modal = id;
  ui.modalPosition = anchor === null ? null : clampToViewport(anchor.x + 24, anchor.y - 40);
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
      break;
    case 'toggleMenu':
      ui.menuOpen = !ui.menuOpen;
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
    case 'repairExtractor':
      dispatch({ type: 'REPAIR_EXTRACTOR' });
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
    ui.note =
      item === undefined
        ? ''
        : item.bagFull
          ? 'The bag is full. Somebody has to change it.'
          : item.broken
            ? 'It has stopped. Nothing runs until it is fixed.'
            : `${item.minutesUsed} minutes of use since the last bag change.`;
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
  if (field === 'playerName') ui.playerName = target.value;
  if (field === 'companyName') ui.companyName = target.value;
  if (field === 'stockSheets') {
    ui.stockSheets = target.value;
    render();
  }
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.key !== 'Escape') return;
  if (ui.modal !== null) {
    ui.modal = null;
    ui.modalPosition = null;
    render();
  }
}

/** Modals are dragged by their header (CLAUDE.md 3.9). */
function onPointerDown(event: MouseEvent): void {
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
 *  (CLAUDE.md 4). The frame callback and the smoke test both come through here. */
export function advanceMinutes(wholeMinutes: number): void {
  if (state === null || wholeMinutes <= 0) return;
  state = tick(state, wholeMinutes);
  render();
}

function frame(now: number): void {
  const elapsed = Math.min(1000, now - lastFrame);
  lastFrame = now;
  if (state !== null && ui.screen === 'game' && state.gameOver === null) {
    const perSecond = gameMinutesPerRealSecond(state.speed);
    if (perSecond > 0 && state.activeEvent === null) {
      accumulator += (elapsed / 1000) * perSecond;
      const whole = Math.floor(accumulator);
      if (whole > 0) {
        accumulator -= whole;
        advanceMinutes(whole);
      }
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

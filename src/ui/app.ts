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
  ductingDue,
  movePending,
  movingMachines,
  oldestReadyJob,
  ownerJob,
  runMinutes,
  startProductionCheck,
} from '../engine/index';
import type {
  Difficulty,
  GameAction,
  GameState,
  Speed,
  SummaryCadence,
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
import {
  type Frame,
  type HallCamera,
  HALL_CAMERA_FIT,
  HALL_ZOOM_STEP,
  type Scene,
  cameraTransform,
  clampCamera,
  hallScene,
  roomAtScenePoint,
  sceneToContent,
  zoomAt,
  zoomTo,
} from '../render/hall';
import { type RoomId, roomById } from '../engine/constants';
import { centreOf, screenToTile } from '../render/iso';
import { fitOfficeStack, officeScene } from '../render/office';
import { renderAccounting } from './accounting';
import { renderBoard } from './board';
import { type CatalogueTab, CATALOGUE_FIRST_TAB, catalogueTabFrom, renderCatalogue } from './catalogue';
import { renderDayEnd, renderGameOver } from './dayEnd';
import { renderEvent, renderEventFooter } from './eventModal';
import { type LaptopTab, laptopTabFrom, renderLaptop } from './laptop';
import { renderMachine } from './machine';
import { renderSpriteCheck } from './spriteCheck';
import { renderWorkPlan } from './workPlan';
import {
  type ModalPosition,
  type ModalSpec,
  escapeHtml,
  minutes,
  money,
  plural,
  reasonLabel,
  syncModals,
} from './modal';
import { renderStart } from './start';
import { cloudAvailable } from '../cloud/supabase';
import { hasSave, loadGame, saveGame, sendMagicLink, signOut, signedInEmail } from '../cloud/saves';
import { renderMenu, renderTopbar, speedFromString } from './topbar';

/** The modals the room can open. Materials, Team and Drawings are tabs inside the laptop now:
 *  one path per modal, only the entry moved (docs/art/SPRITES.md 8.4). */
type ModalId = 'board' | 'laptop' | 'workPlan' | 'accounting' | 'catalogue';

interface Ui {
  screen: 'start' | 'game';
  /** The sprite check is a page of its own, reached from the Menu (CLAUDE.md T3 3.6). */
  view: 'hall' | 'office' | 'sprites';
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
  /** Which tab of the laptop is on top (CLAUDE.md T4 3.1). */
  laptopTab: LaptopTab;
  /** Which tab of the equipment catalogue is on top (CLAUDE.md T6 3.6). */
  catalogueTab: CatalogueTab;
  /** A new tab is new content, not the same list a minute later: it starts at the top. */
  scrollModalTop: boolean;
  /** The family whose classes are on screen, over whatever else is open (CLAUDE.md T3 3.5). */
  machine: string | null;
  machinePosition: ModalPosition | null;
  /** Setting the hall out: the clock is stopped and the kit can be dragged about. */
  setup: boolean;
  speedBeforeSetup: Speed;
  drag: Drag | null;
  /** Where the player has the hall pushed to and how far in. UI state, never game state: a save
   *  carries the workshop, not where somebody was looking (CLAUDE.md T6 3.3). */
  camera: HallCamera;
  /** A pan that moved is not a click on what it started on. */
  panned: boolean;
  showWhy: boolean;
  /** The real life note the player has open, and where he clicked for it. */
  why: { key: string; left: number; top: number } | null;
  cloud: {
    available: boolean;
    email: string;
    signedIn: string | null;
    hasSave: boolean;
    note: string;
  };
  difficulty: Difficulty;
  playerName: string;
  companyName: string;
}

const MODAL_TITLES: Record<ModalId, string> = {
  board: 'Order board',
  laptop: 'Laptop',
  workPlan: 'Work Plan',
  accounting: 'Accounting',
  catalogue: 'Equipment catalogue',
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
    laptopTab: 'tasks',
    catalogueTab: CATALOGUE_FIRST_TAB,
    scrollModalTop: false,
    machine: null,
    machinePosition: null,
    setup: false,
    speedBeforeSetup: 0,
    drag: null,
    camera: { ...HALL_CAMERA_FIT },
    panned: false,
    showWhy: true,
    why: null,
    cloud: {
      available: cloudAvailable(),
      email: '',
      signedIn: null,
      hasSave: false,
      note: '',
    },
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
  autosave();
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
      return renderLaptop(current, { tab: ui.laptopTab, stockSheets: ui.stockSheets });
    case 'workPlan':
      return renderWorkPlan(current);
    case 'accounting':
      return renderAccounting(current, ui.arrearsAmount);
    case 'catalogue':
      return renderCatalogue(current, ui.filters.catalogue ?? '', ui.catalogueTab);
  }
}

/** The ghost of the item being dragged, with the engine's verdict on the cell under the mouse. */
function ghostFor(current: GameState): Ghost | null {
  const drag = ui.drag;
  if (drag === null) return null;
  const item = current.equipment.find((entry) => entry.id === drag.itemId);
  if (!item) return null;
  const box = boxOf(item.specId, drag.x, drag.y);
  const check = canPlace(current, drag.itemId, drag.x, drag.y);
  return { x: box.x, y: box.y, width: box.width, depth: box.depth, ok: check.ok, reason: check.reason };
}

function setupControls(current: GameState): string {
  // What the moves made so far will cost to reconnect, before he presses Done (T4 3.5).
  const due = ductingDue(current);
  const bill =
    due.machines === 0
      ? ''
      : `<span class="reason">Ducting to reconnect: ${plural(due.machines, 'machine', 'machines')}, ` +
        `${money(due.cost)}</span>`;
  return (
    '<div class="view-controls">' +
    '<button class="btn btn-primary" data-do="endSetup">Done</button>' +
    bill +
    '<span class="reason">Drag the machines, the benches and the shelving where you want them. ' +
    'The rooms and the gate stay where they are. Every item moved is an hour of somebody\'s ' +
    'time.</span>' +
    '</div>'
  );
}

function hallControls(current: GameState): string {
  if (ui.setup) return setupControls(current);
  // Somebody is carrying the kit: nothing else happens in the hall until it is down (T4 3.5).
  if (movingMachines(current) !== null) {
    return (
      '<div class="view-controls">' +
      '<span class="reason">Moving machines. Nothing gets made until the kit is back down and ' +
      'the ducting is on.</span></div>'
    );
  }
  const ready = oldestReadyJob(current);
  const working = ownerJob(current) !== null;
  // The hall says exactly what the job card says, out of the one check (CLAUDE.md T4 3.4).
  const check = ready === null ? null : startProductionCheck(current, ready);
  const workHere = working
    ? reasonLabel('You are at the bench')
    : check === null
      ? reasonLabel('No job has its material in the hall yet')
      : check.ok
        ? '<button class="btn btn-primary" data-do="workHere">Work here</button>'
        : reasonLabel(`Cannot work here, ${check.reason}`);
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
    setupButton(current) +
    fix +
    service +
    '</div>'
  );
}

/** The camera under the hall. It is here in setup mode as well: the player sets the hall out at
 *  whatever he can see (CLAUDE.md T6 3.3). */
function hallZoomControls(): string {
  const at = `${Math.round(ui.camera.scale * 100)}%`;
  return (
    '<div class="view-controls">' +
    '<button class="btn" data-do="zoomFit">Fit</button>' +
    '<button class="btn" data-do="zoomIn">+</button>' +
    '<button class="btn" data-do="zoomOut">-</button>' +
    `<span class="reason">Wheel to zoom, drag the floor to move. Now at ${at}.</span>` +
    '</div>'
  );
}

/** A first guess at the room the office has, for the one render before it is on the page and can
 *  be measured. `VIEW_PADDING` is the padding of `.view` in styles.css; `TOPBAR_HEIGHT` is what the
 *  top bar comes to with that stylesheet's padding and type, and it is a guess, not a declared
 *  number. `fitOfficeStack` takes the real box a moment later, so neither has to be right. */
const TOPBAR_HEIGHT = 45;
const VIEW_PADDING = 12;

/** The room the office has under the top bar, in CSS pixels, before it has been measured. */
function officeViewport(): { width: number; height: number } {
  const width = typeof window === 'undefined' ? 1280 : window.innerWidth;
  const height = typeof window === 'undefined' ? 800 : window.innerHeight;
  return {
    width: Math.max(1, width - VIEW_PADDING * 2),
    height: Math.max(1, height - TOPBAR_HEIGHT - VIEW_PADDING * 2),
  };
}

/** The hall cannot be set out again while a move is still on the list, carried or waiting, or the
 *  second batch would ride on the first one's minutes (CLAUDE.md T4 3.5). */
function setupButton(current: GameState): string {
  if (movePending(current) !== null) {
    return reasonLabel('The kit is half shifted. Finish the move first.');
  }
  return '<button class="btn" data-do="startSetup">Set up hall</button>';
}

/** The little popover behind an "i" link (CLAUDE.md T2 3.12). */
function renderWhy(): string {
  const open = ui.why;
  if (open === null) return '';
  const text = WHY[open.key];
  if (text === undefined) return '';
  const width = typeof window === 'undefined' ? 1280 : window.innerWidth;
  const left = Math.max(8, Math.min(open.left, Math.max(8, width - 340)));
  return (
    `<div class="why-pop" style="left:${left}px;top:${open.top + 16}px">` +
    `<p>${escapeHtml(text)}</p>` +
    '<button class="btn" data-do="closeWhy">Right</button></div>'
  );
}

/** What should be open on the modal layer, in the order it is stacked (CLAUDE.md T3 3.4). */
function modalSpecs(): ModalSpec[] {
  if (ui.screen === 'start' || state === null) return [];
  const current = state;
  const specs: ModalSpec[] = [];
  if (ui.modal !== null) {
    specs.push({
      id: ui.modal,
      title: MODAL_TITLES[ui.modal],
      body: modalBody(ui.modal, current),
      wide: ui.modal === 'accounting' || ui.modal === 'workPlan',
      full: ui.modal === 'board',
      position: ui.modalPosition,
    });
  }
  if (ui.machine !== null) {
    const spec = findSpec(ui.machine);
    specs.push({
      id: 'machine',
      title: spec === null ? 'Machine' : spec.name,
      body: renderMachine(current, ui.machine),
      full: true,
      position: ui.machinePosition,
    });
  }
  const event = current.activeEvent;
  if (event) {
    specs.push({
      id: 'event',
      title: event.title,
      body: event.kind === 'dayEnd' ? renderDayEnd(current) : renderEvent(current, event),
      footer: renderEventFooter(event),
      closable: event.choices.length === 1,
      wide: event.kind === 'dayEnd',
      position: ui.eventPosition,
    });
  }
  return specs;
}

/** Where the scene goes in the page. The page around it is written again every render; the scene
 *  itself is carried across, because its pictures cost megabytes to load (see `mountScene`). */
const SCENE_SLOT = '<div data-scene-slot="1"></div>';

/** The scene for the view the player is on, in the two pieces the page needs it in: the shell to
 *  keep and the live part to write again. The sprite check page has no live part at all. */
function sceneFor(current: GameState): Scene | null {
  if (ui.view === 'sprites') {
    // A page of every key in the game, which is dear to build and never changes: it is all shell.
    return { key: 'sprites', shell: renderSpriteCheck, live: '', notes: '' };
  }
  if (ui.view === 'hall') {
    return hallScene(current, { ghost: ghostFor(current), setup: ui.setup });
  }
  return officeScene(current, officeViewport());
}

/** Everything on the page except the modal layer, which keeps its own DOM between renders, and the
 *  scene, which goes into the slot afterwards. */
function pageHtml(scene: Scene | null): string {
  if (ui.screen === 'start' || state === null) {
    return renderStart({
      difficulty: ui.difficulty,
      playerName: ui.playerName,
      companyName: ui.companyName,
      showWhy: ui.showWhy,
      cloud: ui.cloud,
    });
  }
  const current = state;
  // The last word the company gets is the bankruptcy event, over the game over screen.
  if (current.gameOver) return renderGameOver(current);
  const notes = scene?.notes ?? '';
  const controls = ui.view === 'hall' ? hallControls(current) + hallZoomControls() : '';
  const note = ui.note === '' ? '' : `<p class="view-note">${escapeHtml(ui.note)}</p>`;
  return (
    renderTopbar(current, ui.view) +
    (ui.menuOpen ? renderMenu(current, ui.cloud) : '') +
    `<main class="view">${SCENE_SLOT}${notes}${controls}${note}</main>` +
    renderWhy()
  );
}

interface FocusMemory {
  key: string;
  start: number | null;
}

function captureFocus(): FocusMemory | null {
  const active = document.activeElement;
  if (!(active instanceof HTMLInputElement)) return null;
  const key = active.dataset.field;
  if (key === undefined) return null;
  return { key, start: active.selectionStart };
}

function restoreFocus(memory: FocusMemory | null): void {
  if (!memory || !root) return;
  const field = root.querySelector(`[data-field="${memory.key}"]`);
  if (!(field instanceof HTMLInputElement)) return;
  field.focus();
  if (memory.start !== null && field.type === 'text') {
    field.setSelectionRange(memory.start, memory.start);
  }
}

/** How long a figure takes to walk from one station to the next [TUNE]. */
const FIGURE_SLIDE_MS = 800;

interface Point {
  x: number;
  y: number;
}

/** Who is walking where, and when he set off. The view is rebuilt from the state many times a
 *  second, so the walk has to be remembered here or it would start again from nothing on every
 *  rebuild and never finish (CLAUDE.md T2 3.3). */
const slides = new Map<string, { from: Point; to: Point; startedAt: number }>();

function translateOf(point: Point): string {
  return `translate(${Math.round(point.x)},${Math.round(point.y)})`;
}

function pointOf(transform: string): Point | null {
  const found = /translate\(\s*(-?[\d.]+)[\s,]+(-?[\d.]+)\s*\)/.exec(transform);
  const x = Number(found?.[1]);
  const y = Number(found?.[2]);
  if (found === null || Number.isNaN(x) || Number.isNaN(y)) return null;
  return { x, y };
}

/** How far along the walk he is now. */
function positionAt(slide: { from: Point; to: Point; startedAt: number }, now: number): Point {
  const part = Math.min(1, Math.max(0, (now - slide.startedAt) / FIGURE_SLIDE_MS));
  return {
    x: slide.from.x + (slide.to.x - slide.from.x) * part,
    y: slide.from.y + (slide.to.y - slide.from.y) * part,
  };
}

function nowMs(): number {
  return typeof performance === 'undefined' ? 0 : performance.now();
}

/** Puts every figure back where he had actually got to, and lets the browser carry him the rest
 *  of the way in what is left of the 0.8 s. */
function slideFigures(now: number): void {
  if (!root) return;
  const moving: Array<{ node: Element; to: Point }> = [];
  const seen = new Set<string>();
  for (const node of Array.from(root.querySelectorAll('[data-figure]'))) {
    const key = node.getAttribute('data-figure');
    const to = pointOf(node.getAttribute('transform') ?? '');
    if (key === null || to === null) continue;
    seen.add(key);
    const walking = slides.get(key);
    if (walking === undefined) {
      // First sight of him: he is where he is, and nothing is left to walk.
      slides.set(key, { from: to, to, startedAt: now - FIGURE_SLIDE_MS });
      continue;
    }
    const at = positionAt(walking, now);
    if (walking.to.x !== to.x || walking.to.y !== to.y) {
      // He has been sent somewhere else, and he sets off from wherever he had got to.
      slides.set(key, { from: at, to, startedAt: now });
    } else if (at.x === to.x && at.y === to.y) {
      continue;
    }
    const started = slides.get(key)?.startedAt ?? now;
    const left = Math.max(0, FIGURE_SLIDE_MS - (now - started));
    if (node instanceof SVGElement || node instanceof HTMLElement) {
      node.style.transitionDuration = `${Math.round(left)}ms`;
    }
    node.setAttribute('transform', translateOf(at));
    moving.push({ node, to });
  }
  for (const key of Array.from(slides.keys())) {
    if (!seen.has(key)) slides.delete(key);
  }
  if (moving.length === 0) return;
  const step = (): void => {
    for (const entry of moving) entry.node.setAttribute('transform', translateOf(entry.to));
  };
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(step);
  } else {
    step();
  }
}

/** The two halves of the page: the part that is rebuilt from the state every render, and the
 *  modal layer, whose shells outlive a render so the scroll and the caret do too (T3 3.4). */
function halves(): { page: Element; layer: Element } | null {
  if (!root) return null;
  let page = root.querySelector(':scope > .page');
  let layer = root.querySelector(':scope > .modal-layer');
  if (page === null || layer === null) {
    root.innerHTML = '<div class="page"></div><div class="modal-layer"></div>';
    page = root.querySelector(':scope > .page');
    layer = root.querySelector(':scope > .modal-layer');
  }
  if (page === null || layer === null) return null;
  return { page, layer };
}

/** The scene on the page now, with the key that says what it was built from. */
let scene: { key: string; node: Element } | null = null;

/** Parses a piece of markup and hands back its one element. A detached div parses SVG correctly,
 *  which is what the hall needs. */
function parseOne(html: string): Element | null {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder.firstElementChild;
}

/** Puts the scene into the page's slot.
 *
 *  This is the whole of why the screen stopped blinking. The page is rebuilt from the state every
 *  game minute, which is once a real second at 1x and four times at 4x, and the scene holds the
 *  painted hall or the office room: megabytes of picture. A fresh <img> has to fetch and decode
 *  before it can paint, so every one of those rebuilds left the room blank for a frame, and the
 *  office jumped as well, because the stack's scale is written from the window and then corrected
 *  from its own box once it is on the page. So the scene's shell is built once, kept, and carried
 *  into each new page; only its live part is written again. Same shape as an open modal, whose
 *  shell has outlived a render since T3 3.4. */
function mountScene(page: Element, wanted: Scene | null): void {
  const slot = page.querySelector('[data-scene-slot]');
  if (slot === null) {
    scene = null;
    return;
  }
  if (wanted === null) {
    slot.remove();
    scene = null;
    return;
  }
  if (scene === null || scene.key !== wanted.key) {
    const node = parseOne(wanted.shell());
    if (node === null) {
      slot.remove();
      scene = null;
      return;
    }
    scene = { key: wanted.key, node };
  }
  const live = scene.node.querySelector('[data-live]');
  if (live !== null) live.innerHTML = wanted.live;
  slot.replaceWith(scene.node);
}

/** The frame the hall is seen through, read off the scene's own view box so there is one number
 *  for it and it cannot drift from what is drawn. */
function hallFrame(): Frame | null {
  if (!root) return null;
  const svg = root.querySelector('.hall-view');
  if (svg === null) return null;
  const parts = (svg.getAttribute('viewBox') ?? '').split(/\s+/).map(Number);
  const [x, y, width, height] = parts;
  if (parts.length !== 4 || [x, y, width, height].some((value) => !Number.isFinite(value))) {
    return null;
  }
  return { x: x ?? 0, y: y ?? 0, width: width ?? 0, height: height ?? 0 };
}

/** The camera is one attribute on one group, written after the page is put together: it must not
 *  go into the scene key, or a wheel notch would build the shell again and fetch the painting. */
function applyCamera(): void {
  if (!root) return;
  const group = root.querySelector('.hall-scene');
  if (group === null) return;
  const frame = hallFrame();
  if (frame !== null) ui.camera = clampCamera(ui.camera, frame);
  group.setAttribute('transform', cameraTransform(ui.camera));
}

function moveCamera(next: HallCamera): void {
  ui.camera = next;
  render();
}

function resetCamera(): void {
  ui.camera = { ...HALL_CAMERA_FIT };
}

export function render(): void {
  const parts = halves();
  if (parts === null) return;
  const memory = ui.focusNext === null ? captureFocus() : { key: ui.focusNext, start: null };
  ui.focusNext = null;
  const wanted = ui.screen === 'game' && state !== null && state.gameOver === null
    ? sceneFor(state)
    : null;
  parts.page.innerHTML = pageHtml(wanted);
  mountScene(parts.page, wanted);
  applyCamera();
  syncModals(parts.layer, modalSpecs());
  if (ui.scrollModalTop) {
    ui.scrollModalTop = false;
    const body = parts.layer.querySelector('.modal-body');
    if (body) body.scrollTop = 0;
  }
  // The stylesheet is the authority on how much room the office has (docs/art/SPRITES.md 8.1).
  fitOfficeStack(parts.page);
  slideFigures(nowMs());
  restoreFocus(memory);
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/** The room fills the page, so there is no small object for a modal to sit beside any more: every
 *  modal opens centred, and the player drags it where he wants it (CLAUDE.md T4 3.1). */
function openModal(id: ModalId): void {
  ui.modal = id;
  ui.modalPosition = null;
  ui.menuOpen = false;
}

/** Clicking the van at the gate opens the unloading choice again (CLAUDE.md 10.1). */
function askUnload(deliveryId: string): void {
  dispatch({ type: 'ASK_UNLOAD', deliveryId });
}

/** What each region of the room opens (docs/art/SPRITES.md 8.2 and 8.4). The door is the one
 *  region that is not a modal: it is the way back into the hall. */
const OFFICE_REGION_MODALS: Record<string, ModalId> = {
  workPlan: 'workPlan',
  orders: 'board',
  laptop: 'laptop',
  catalogue: 'catalogue',
  binder: 'accounting',
};

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
      // Walking out of the hall and back in shows the whole hall again
      // [TUNE: reset or remember; REPORT-T6 says which was chosen].
      resetCamera();
      break;
    case 'zoomFit':
      resetCamera();
      break;
    case 'zoomIn':
    case 'zoomOut': {
      const frame = hallFrame();
      if (frame === null) break;
      const middle = { x: frame.x + frame.width / 2, y: frame.y + frame.height / 2 };
      const step = what === 'zoomIn' ? HALL_ZOOM_STEP : 1 / HALL_ZOOM_STEP;
      ui.camera = zoomAt(ui.camera, frame, middle, step);
      break;
    }
    case 'showSprites':
      // The acceptance page for the art side, always one click away (CLAUDE.md T3 3.6).
      endSetup();
      ui.view = 'sprites';
      ui.menuOpen = false;
      break;
    case 'startSetup':
      // Nothing is dragged while the last move is still on the list, carried or waiting.
      if (movePending(game()) !== null) break;
      ui.setup = true;
      ui.drag = null;
      ui.speedBeforeSetup = game().speed;
      dispatch({ type: 'SET_SPEED', speed: 0 });
      return;
    case 'endSetup':
      endSetup();
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
      openModal((element.dataset.modal ?? 'board') as ModalId);
      break;
    case 'officeRegion': {
      const region = element.dataset.office ?? '';
      if (region === 'door') {
        ui.view = 'hall';
        break;
      }
      const modal = OFFICE_REGION_MODALS[region];
      if (modal !== undefined) openModal(modal);
      break;
    }
    case 'laptopTab':
      ui.laptopTab = laptopTabFrom(id);
      ui.scrollModalTop = true;
      break;
    case 'catalogueTab':
      ui.catalogueTab = catalogueTabFrom(id);
      ui.scrollModalTop = true;
      break;
    case 'openMachine':
      // The classes of a family fill the page, over the catalogue that sent the player here.
      ui.machine = id;
      ui.machinePosition = null;
      break;
    case 'closeMachine':
      ui.machine = null;
      ui.machinePosition = null;
      break;
    case 'closeModal': {
      // The cross on the event modal is the one choice it has. The cross on anything else just
      // shuts that modal: whatever is behind it is still there.
      const which = element.closest('[data-modal]')?.getAttribute('data-modal');
      const event = game().activeEvent;
      if (which === 'event' && event !== null && event.choices.length === 1) {
        const choice = event.choices[0];
        dispatch({ type: 'RESOLVE_EVENT', choiceId: choice ? choice.id : 'ok' });
        return;
      }
      if (which === 'machine') {
        ui.machine = null;
        ui.machinePosition = null;
        break;
      }
      ui.modal = null;
      ui.modalPosition = null;
      break;
    }
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
    case 'setCadence':
      dispatch({ type: 'SET_SUMMARY_CADENCE', cadence: id as SummaryCadence });
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
      dispatch({ type: 'BUY_EQUIPMENT', specId: id, variantId: element.dataset.variant });
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
    case 'signIn':
      void runCloud(async () => (await sendMagicLink(ui.cloud.email)).note);
      break;
    case 'signOut':
      void runCloud(async () => {
        await signOut();
        return 'Signed out.';
      });
      break;
    case 'saveGame':
      ui.menuOpen = false;
      void runCloud(async () => (await saveGame(game())).note);
      break;
    case 'loadGame':
      ui.menuOpen = false;
      void runCloud(async () => {
        const result = await loadGame();
        if (result.state !== null) {
          state = result.state;
          ui.screen = 'game';
        }
        return result.note;
      });
      break;
    case 'continueGame':
      void runCloud(async () => {
        const result = await loadGame();
        if (result.state !== null) {
          state = result.state;
          ui.screen = 'game';
          accumulator = 0;
        }
        return result.note;
      });
      break;
    default:
      break;
  }
  void point;
  render();
}

/** Every cloud call goes through here: it runs, it leaves a line, and it renders again. */
async function runCloud(work: () => Promise<string>): Promise<void> {
  if (!ui.cloud.available) return;
  ui.cloud.note = 'Working.';
  render();
  try {
    ui.cloud.note = await work();
  } catch {
    ui.cloud.note = 'The save service did not answer. Try again in a moment.';
  }
  await refreshCloud();
  render();
}

/** Who is signed in, and is there anything to come back to. */
async function refreshCloud(): Promise<void> {
  if (!ui.cloud.available) return;
  try {
    ui.cloud.signedIn = await signedInEmail();
    ui.cloud.hasSave = ui.cloud.signedIn === null ? false : await hasSave();
  } catch {
    ui.cloud.signedIn = null;
    ui.cloud.hasSave = false;
  }
}

/** Slot 1 keeps up with every day, once the player is signed in (T2 3.14). The summary modal can
 *  be turned down to weekly or monthly, so the save follows the day and not the modal (T4 3.6). */
let autosavedDay = 0;

function autosave(): void {
  if (!ui.cloud.available || ui.cloud.signedIn === null || state === null) return;
  if (autosavedDay === state.clock.day) return;
  autosavedDay = state.clock.day;
  void runCloud(async () => (await saveGame(game())).note);
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

/** Walking into a room. The office is a view of its own; the other two are a line under the
 *  hall (CLAUDE.md T6 3.1). */
function handleRoomClick(room: RoomId): void {
  if (room === 'office') {
    ui.view = 'office';
    resetCamera();
  } else if (room === 'wc') {
    ui.note = roomById('wc').tooltip;
  } else {
    ui.note = roomById('canteen').tooltip;
  }
  render();
}

function handleSceneClick(element: DataElement): boolean {
  // In setup mode a click on the kit is a drag, not a question about the bag.
  if (ui.setup) return true;
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
  return false;
}

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------

function onClick(event: MouseEvent): void {
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (ui.panned) {
    // The pointer travelled: that was the player moving the hall, not pressing what it started on.
    ui.panned = false;
    return;
  }
  const point = { x: event.clientX, y: event.clientY };
  const doer = dataElement(target.closest('[data-do]'));
  if (doer) {
    if (doer instanceof HTMLButtonElement && doer.disabled) return;
    handleAction(doer, point);
    return;
  }
  if (state === null) return;
  const scene = dataElement(target.closest('[data-van],[data-kit]'));
  if (scene) {
    handleSceneClick(scene);
    return;
  }
  // A room is not an element the pointer can land on: its block is painted, and the painting is
  // three images that answer for every pixel of the hall. The footprints decide instead.
  if (ui.setup || target.closest('.hall-view') === null) return;
  const local = contentPointUnder(event);
  if (local === null) return;
  const room = roomAtScenePoint(local);
  if (room !== null) handleRoomClick(room);
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
  if (field === 'cloudEmail') {
    ui.cloud.email = target.value;
    return;
  }
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

/** Leaving setup mode starts the clock again at the speed it was stopped at, and hands the moves
 *  to the engine: they are an hour an item and a ducting bill (CLAUDE.md T4 3.5). */
function endSetup(): void {
  if (!ui.setup) return;
  ui.setup = false;
  ui.drag = null;
  dispatch({ type: 'END_SETUP', speed: ui.speedBeforeSetup });
}

function onKeyUp(event: KeyboardEvent): void {
  if (event.key === ' ') spaceHeld = false;
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.key === ' ') spaceHeld = true;
  if (event.key !== 'Escape') return;
  // Escape drops whatever is in hand before it closes anything (CLAUDE.md T2 3.10).
  if (ui.drag !== null) {
    ui.drag = null;
    render();
    return;
  }
  if (ui.machine !== null) {
    ui.machine = null;
    ui.machinePosition = null;
    render();
    return;
  }
  if (ui.modal !== null) {
    ui.modal = null;
    ui.modalPosition = null;
    render();
  }
}

/** Where the mouse is in the hall's own coordinates, read through the SVG's own view box. One
 *  conversion for everything the hall is asked about: the cell under the pointer and the room the
 *  player clicked come off the same number. */
function scenePointUnder(event: MouseEvent): { x: number; y: number } | null {
  if (!root) return null;
  const svg = root.querySelector('.hall-view');
  if (!(svg instanceof SVGSVGElement)) return null;
  // A tree that is not on a painted page has no screen matrix, and the same guard is what the
  // frame loop and the clipboard already use here.
  if (typeof svg.getScreenCTM !== 'function') return null;
  const matrix = svg.getScreenCTM();
  if (matrix === null) return null;
  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  // Include the centred margins introduced by the SVG's uniform viewport scaling.
  return point.matrixTransform(matrix.inverse());
}

/** Where the mouse is in the scene, with the camera taken back out: the cell under the pointer
 *  and the room he clicked are the same at every zoom (CLAUDE.md T6 3.3). */
function contentPointUnder(event: MouseEvent): { x: number; y: number } | null {
  const local = scenePointUnder(event);
  return local === null ? null : sceneToContent(ui.camera, local);
}

/** The cell under the mouse. */
function cellUnder(event: MouseEvent): { x: number; y: number } | null {
  const local = contentPointUnder(event);
  if (local === null) return null;
  const cell = screenToTile(local.x, local.y);
  return { x: Math.floor(cell.x), y: Math.floor(cell.y) };
}

/** True while the space bar is down: the player is asking to push the hall about, whatever the
 *  pointer is over (CLAUDE.md T6 3.3). */
let spaceHeld = false;

/** The wheel over the hall zooms about the pointer, from the fit to four times it. */
function onWheel(event: WheelEvent): void {
  const target = event.target;
  if (!(target instanceof Element) || target.closest('.hall-view') === null) return;
  const frame = hallFrame();
  const at = scenePointUnder(event);
  if (frame === null || at === null) return;
  event.preventDefault();
  const step = event.deltaY < 0 ? HALL_ZOOM_STEP : 1 / HALL_ZOOM_STEP;
  moveCamera(zoomAt(ui.camera, frame, at, step));
}

/** A double click on something in the hall brings it up to twice the fit, in the middle. */
function onDoubleClick(event: MouseEvent): void {
  const target = event.target;
  if (!(target instanceof Element) || target.closest('.hall-view') === null) return;
  const frame = hallFrame();
  const centre = objectCentreUnder(event);
  if (frame === null || centre === null) return;
  moveCamera(zoomTo(frame, centre, 2));
}

/** The middle of whatever the player double clicked: a machine, the lorry, or a room block. */
function objectCentreUnder(event: MouseEvent): { x: number; y: number } | null {
  const target = event.target;
  if (!(target instanceof Element) || state === null) return null;
  const kit = target.closest('[data-kit]')?.getAttribute('data-kit') ?? null;
  if (kit !== null) {
    const item = state.equipment.find((entry) => entry.id === kit);
    const spec = item ? findSpec(item.specId) : null;
    if (item && spec) {
      return centreOf(item.anchorX, item.anchorY, spec.width, spec.depth, spec.height);
    }
  }
  const local = contentPointUnder(event);
  if (local === null) return null;
  const room = roomAtScenePoint(local);
  if (room === null) return null;
  const block = roomById(room);
  return centreOf(block.x, block.y, block.width, block.depth, block.height);
}

/** Pushing the hall about: the left button on empty floor, or the space bar anywhere in it. */
function onPanPointerDown(event: MouseEvent): boolean {
  if (state === null) return false;
  const target = event.target;
  if (!(target instanceof Element) || target.closest('.hall-view') === null) return false;
  const frame = hallFrame();
  const start = scenePointUnder(event);
  if (frame === null || start === null) return false;
  if (!spaceHeld) {
    // Empty floor: nothing of the workshop under the pointer, and no room block either.
    if (target.closest('[data-kit],[data-van]') !== null) return false;
    if (roomAtScenePoint(sceneToContent(ui.camera, start)) !== null) return false;
  }
  const from = { ...ui.camera };
  let moved = false;
  const move = (moveEvent: MouseEvent): void => {
    const at = scenePointUnder(moveEvent);
    if (at === null) return;
    const next = { scale: from.scale, x: from.x + (at.x - start.x), y: from.y + (at.y - start.y) };
    if (next.x === ui.camera.x && next.y === ui.camera.y) return;
    moved = true;
    ui.panned = true;
    moveCamera(clampCamera(next, frame));
  };
  const up = (): void => {
    window.removeEventListener('mousemove', move);
    window.removeEventListener('mouseup', up);
    if (!moved) ui.panned = false;
    moved = false;
  };
  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', up);
  event.preventDefault();
  return true;
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
  const item = state.equipment.find((entry) => entry.id === itemId);
  if (item === undefined) return false;
  const at = cellUnder(event);
  if (at === null) return false;
  // He has hold of it where he took hold of it, not by its corner.
  const offsetX = item.anchorX - at.x;
  const offsetY = item.anchorY - at.y;
  let moved = false;
  ui.drag = { itemId, x: item.anchorX, y: item.anchorY };
  const move = (moveEvent: MouseEvent): void => {
    if (ui.drag === null) return;
    const cell = cellUnder(moveEvent);
    if (cell === null) return;
    const x = cell.x + offsetX;
    const y = cell.y + offsetY;
    if (x === ui.drag.x && y === ui.drag.y) return;
    moved = true;
    ui.drag = { itemId: ui.drag.itemId, x, y };
    render();
  };
  const up = (): void => {
    window.removeEventListener('mousemove', move);
    window.removeEventListener('mouseup', up);
    const drag = ui.drag;
    ui.drag = null;
    // A click that never moved is not a move: it leaves the hall exactly as it was.
    if (drag === null || !moved) {
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
  // Every press starts clean: a pan swallows the click that ends it, and nothing after that.
  ui.panned = false;
  // The space bar wins: setting the hall out at 3x means pushing it about between drops.
  if (spaceHeld && onPanPointerDown(event)) return;
  if (onSetupPointerDown(event)) return;
  if (onPanPointerDown(event)) return;
  const target = event.target;
  if (!(target instanceof Element)) return;
  const head = target.closest('[data-drag]');
  if (head === null) return;
  const modal = head.closest('.modal');
  if (!(modal instanceof HTMLElement)) return;
  const rect = modal.getBoundingClientRect();
  const grabX = event.clientX - rect.left;
  const grabY = event.clientY - rect.top;
  const which = modal.dataset.modal;
  const move = (moveEvent: MouseEvent): void => {
    const position = {
      left: Math.max(0, moveEvent.clientX - grabX),
      top: Math.max(0, moveEvent.clientY - grabY),
    };
    if (which === 'event') {
      ui.eventPosition = position;
    } else if (which === 'machine') {
      ui.machinePosition = position;
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
  autosave();
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
  void refreshCloud().then(render);
  element.addEventListener('click', onClick);
  element.addEventListener('input', onInput);
  element.addEventListener('mousedown', onPointerDown);
  element.addEventListener('wheel', onWheel, { passive: false });
  element.addEventListener('dblclick', onDoubleClick);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  // The office room is scaled in code, so a resized window has to be drawn again for it, and the
  // clock may be stopped (docs/art/SPRITES.md 8.1).
  window.addEventListener('resize', render);
  render();
  lastFrame = typeof performance === 'undefined' ? 0 : performance.now();
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(frame);
}

/** For the smoke test: the state the app is holding. */
export function currentState(): GameState | null {
  return state;
}

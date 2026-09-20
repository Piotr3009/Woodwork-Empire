// Bootstrap, view switching and the game loop. Every engine action the player can reach is wired
// here, in one place (CLAUDE.md 3.5, 10.1).

import {
  applyAction,
  CLEANING_MINUTES,
  createGame,
  ductingDue,
  findSpec,
  finishTimeFor,
  formatCalendarDay,
  formatTime,
  gameMinutesPerRealSecond,
  moveConfirmPending,
  movePending,
  movingMachines,
  oldestReadyJob,
  ownerJob,
  runMinutes,
  shoppingList,
  SPEEDS,
  startProductionCheck,
  timeIsPaused,
} from '../engine/index';
import type {
  Difficulty,
  GameAction,
  GameState,
  Orientation,
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
import { WHY, boxOf, canPlace, reservationById, summaryOfDay } from '../engine/index';
import {
  type Frame,
  type HallCamera,
  type HallProblem,
  HALL_CAMERA_FIT,
  HALL_CAMERA_START,
  hallStartCamera,
  HALL_ZOOM_STEP,
  type Scene,
  cameraTransform,
  clampCamera,
  hallProblems,
  hallScene,
  roomAtScenePoint,
  sceneToContent,
  zoomAt,
  zoomTo,
} from '../render/hall';
import {
  APP_VERSION,
  HOUSE_CARD_SECONDS,
  type RoomId,
  TOOL_CABINET,
  roomById,
} from '../engine/constants';
import { centreOf, screenToTile } from '../render/iso';
import { fitOfficeStack, officeScene } from '../render/office';
import { type AccountingTab, accountingTabFrom, renderAccounting } from './accounting';
import { renderContracts } from './contracts';
// Straight off its own module, not round the public API, which Turn 13 froze (REPORT-T13 10).
import { contractManCheck } from '../engine/contracts';
import { renderHouseCard } from './house';
import { renderMonthEnd } from './monthEnd';
import { renderSettings } from './settings';
import { renderTip, renderWarningStrip } from './tips';
import { renderBoard } from './board';
import { type CatalogueTab, CATALOGUE_FIRST_TAB, catalogueTabFrom, renderCatalogue } from './catalogue';
import { renderDayEnd, renderDaySummary, renderGameOver } from './dayEnd';
import { renderEvent, renderEventFooter } from './eventModal';
import { type LaptopPage, laptopPageFrom, renderLaptop } from './laptop';
import { type TeamTab, teamTabFrom } from './team';
import { renderSpriteCheck } from './spriteCheck';
import { type WorkPlanTab, renderWorkPlan, workPlanTabFrom } from './workPlan';
import {
  type ModalPosition,
  type ModalSpec,
  closeButton,
  escapeHtml,
  minutes,
  plural,
  syncModals,
  tabBar,
} from './modal';
import { playCharacters } from '../render/characters';
import { resetWalkers, stepWalkers, syncWalkers } from '../render/walkers';
import { resetDoors, stepDoors, syncDoors } from '../render/doors';
import { applySoundSettings, play as soundPlay, setLoops, stopAllSounds, unlockSound } from './sound';
import { hallLoops, hallOneShots } from '../render/hall';
import { walkPath } from '../engine/walk';
import { unconnectedMachines } from '../engine/pipes';
import { OWNER, hasCentralExtraction } from '../engine/machines';
import { nextSpriteOrientation } from '../render/sprites';
import { patchInto } from './patch';
import { renderOwnerOut } from './ownerOut';
import { renderCompany } from './company';
import { renderShopping } from './shopping';
import { renderStart } from './start';
import { dropCardTitle, renderDropCard, renderDropCardFooter } from './dropCard';
import { renderMachineCard } from './machineCard';
import { isPerson, personCardTitle, renderPerson } from './personCard';
import { decodeSaveFile, encodeSaveFile, saveFileName } from '../cloud/file';
import {
  NO_STORED_SAVE,
  type StoredSave,
  peekSave,
  readStore,
  saveStore,
} from '../cloud/store';
import { cloudAvailable } from '../cloud/supabase';
import { hasSave, loadGame, saveGame, sendMagicLink, signOut, signedInEmail } from '../cloud/saves';
import { type TopbarNews, renderMenu, renderTopbar, speedFromString } from './topbar';

/** The modals the room can open. Materials, Drawings and, from Turn 15, the Team are pages inside
 *  the laptop: one path per page, only the entry moved (docs/art/SPRITES.md 8.4; CLAUDE.md T15
 *  2.3). */
type ModalId =
  | 'board'
  | 'laptop'
  | 'workPlan'
  | 'accounting'
  | 'catalogue'
  | 'shopping'
  | 'company'
  /** The gear on the top bar: tips on and off (CLAUDE.md T13 3.22). */
  | 'settings'
  /** One machine on the hall, opened by a click on the machine itself: its picture and class, its
   *  effects, its hours, its service, its extraction and the buttons the Owned tab has
   *  (PIOTR, 17.09; CLAUDE.md T17 2.6). */
  | 'machineCard'
  /** One person, opened by a click on his figure on the hall or on his tile in Our team: his
   *  portrait, his chips, his day, his week and the two buttons (PIOTR, 20.09;
   *  docs/mockups/t23/team-cards.png; CLAUDE.md T23 2.13). */
  | 'personCard';

/** The Orders page: the enquiries, and the standing contracts beside them (CLAUDE.md T13 3.16). */
export type BoardTab = 'enquiries' | 'contracts';
const BOARD_TABS: Array<[BoardTab, string]> = [
  ['enquiries', 'Enquiries'],
  ['contracts', 'Contracts'],
];

/** The screen a modal's first use bubble is keyed by (CLAUDE.md T13 3.22). */
const TIP_KEY_OF_MODAL: Partial<Record<ModalId, string>> = {
  catalogue: 'catalogue',
  workPlan: 'workPlan',
  board: 'board',
  settings: 'settings',
};

interface Ui {
  screen: 'start' | 'game';
  /** The sprite check is a page of its own, reached from the Menu (CLAUDE.md T3 3.6). */
  view: 'hall' | 'office' | 'sprites';
  modal: ModalId | null;
  modalPosition: ModalPosition | null;
  eventPosition: ModalPosition | null;
  menuOpen: boolean;
  note: string;
  /** The one line that says why a click did nothing, and the pulse on the Pause button that goes
   *  with it. Both last one render (CLAUDE.md T7 3.10). */
  toast: string;
  filters: Record<string, string>;
  /** Field to put the caret back in after the next render. */
  focusNext: string | null;
  stockSheets: string;
  /** What the player has typed into the loan field (CLAUDE.md T13 3.14). */
  loanAmount: string;
  /** Which tab of the Orders page is on top (CLAUDE.md T13 3.16). */
  boardTab: BoardTab;
  /** Which of the Work Plan's two tabs is on top: the jobs, or the standing contracts
   *  (CLAUDE.md T20 2.1). */
  workPlanTab: WorkPlanTab;
  /** The man an offer card on the Contracts tab is worked out for, or null for the card's own
   *  first choice. He is nobody's assignee until Take it is pressed (CLAUDE.md T20 2.1.1). */
  contractMan: string | null;
  /** The house card is up at the end of the day, since this real time (CLAUDE.md T13 3.18). */
  houseCardSince: number | null;
  houseCardDone: boolean;
  /** Which page of the laptop is on its screen. It opens on home every time, with no memory of
   *  the last page (CLAUDE.md T14 2.1). */
  laptopPage: LaptopPage;
  /** Which of the Team's four tabs is on top, on the laptop's team page (CLAUDE.md T15 2.3). */
  teamTab: TeamTab;
  /** Which tab of the equipment catalogue is on top, and which family folder is open inside it
   *  (CLAUDE.md T6 3.6, T7 3.7). */
  catalogueTab: CatalogueTab;
  catalogueFolder: string | null;
  /** The category the Owned tab is narrowed to, or all of the hall (PIOTR, 13.09). */
  ownedTab: string;
  /** The machine whose Sell button has been pressed once. A sale is meant on the second click,
   *  inside the tile itself (CLAUDE.md T8 3.5). */
  sellConfirm: string | null;
  /** The machine whose own card is open, from a click on it on the hall (CLAUDE.md T17 2.6). */
  machineCard: string | null;
  /** The person whose card is open: `owner` or a worker id (CLAUDE.md T23 2.13). */
  personCard: string | null;
  /** Tasks the player has ticked on the laptop's Tasks page, in the order he ticked them, waiting
   *  for Do these (CLAUDE.md T17 2.16). */
  tickedTasks: string[];
  /** The job whose Drop project has been pressed once. The same rule: it is meant on the second
   *  click, inside the card (CLAUDE.md T9 3.9). */
  dropConfirm: string | null;
  /** The job whose Assign to this job list is open, or null. One list is open at a time, and a
   *  click on the button that opened it shuts it again (CLAUDE.md T19 2.5). */
  assignOpen: string | null;
  /** Which tab of the books is on top, and the past day whose summary is open over them
   *  (CLAUDE.md T6 3.9). */
  accountingTab: AccountingTab;
  /** Which month of this year the Days tab is showing, or null for the one the clock is in
   *  (CLAUDE.md T7 3.9). */
  accountingMonth: number | null;
  /** The days of the books the player has opened on their lines. */
  openDays: number[];
  daySummary: number | null;
  /** A new tab is new content, not the same list a minute later: it starts at the top. */
  scrollModalTop: boolean;
  /** Setting the hall out: the clock is stopped and the kit can be dragged about. */
  setup: boolean;
  /** The orientation the thing in hand is standing at, which the ghost is drawn with and which the
   *  drop writes onto the item (T10 3.8). It is read off the item when it is picked up and turned
   *  from there, so it means nothing with nothing in hand. */
  rotate: Orientation;
  /** True while a quarter turn is armed for the next thing picked up. Rotate, or R with nothing in
   *  hand, toggles it, and the button lights while it is set; the pick up applies it once and
   *  clears it. It was `ui.rotate` itself until tonight, which the pick up then overwrote with the
   *  item's own orientation, so the button did nothing at all [PIOTR, 19.09: "it does nothing"]
   *  (CLAUDE.md T22 2.10). */
  armTurn: boolean;
  speedBeforeSetup: Speed;
  /** What the clock was doing before the P key stopped it, so the same key starts it again where
   *  it was (PIOTR, 17.09; CLAUDE.md T18 2.8). */
  speedBeforePause: Speed;
  drag: Drag | null;
  /** Where the player has the hall pushed to and how far in. UI state, never game state: a save
   *  carries the workshop, not where somebody was looking (CLAUDE.md T6 3.3). */
  camera: HallCamera;
  /** False until the hall has been measured once and opened at its 1.2 of the fit: the frame is
   *  not known until the scene is on the page (CLAUDE.md T10 3.9). */
  cameraStarted: boolean;
  /** A pan that moved is not a click on what it started on. */
  panned: boolean;
  showWhy: boolean;
  /** What was on the order board and on the shopping list when the player last opened them. A
   *  push button with something new behind it lights orange (CLAUDE.md T11 3.1). */
  seenEnquiries: string[];
  seenOrders: string[];
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
  /** What is waiting in the browser's store, and whether New game has asked its one question
   *  (CLAUDE.md T11 3.2). */
  saved: StoredSave;
  startOverAsked: boolean;
}

/** The head of a modal. Every one of them has a name of its own except the card of a thing on the
 *  hall, whose head is the thing's own name and class, because "Machine" over a tool cabinet says
 *  nothing and the card is opened by clicking that very cabinet (CLAUDE.md T22 2.13). */
function modalTitleOf(id: ModalId, current: GameState): string {
  // The card of a person is headed with his own name and trade, for the same reason the card of a
  // thing on the hall is headed with its name: "Person" over a man the player has just clicked
  // says nothing (CLAUDE.md T22 2.13, T23 2.13).
  if (id === 'personCard') {
    return personCardTitle(current, ui.personCard) ?? MODAL_TITLES[id];
  }
  if (id !== 'machineCard') return MODAL_TITLES[id];
  const item = ui.machineCard === null
    ? undefined
    : current.equipment.find((entry) => entry.id === ui.machineCard);
  if (item === undefined) return MODAL_TITLES[id];
  const spec = findSpec(item.specId);
  if (spec === undefined || spec === null) return MODAL_TITLES[id];
  const variant = spec.variants.find((entry) => entry.id === item.variantId);
  // One class deep families say their own name once and not twice over.
  return variant === undefined || spec.variants.length <= 1
    ? spec.name
    : `${spec.name}: ${variant.name}`;
}

const MODAL_TITLES: Record<ModalId, string> = {
  board: 'Order board',
  laptop: 'Laptop',
  workPlan: 'Work Plan',
  accounting: 'Accounting',
  catalogue: 'Equipment catalogue',
  shopping: 'On order',
  company: 'Company board',
  settings: 'Settings',
  machineCard: 'Machine',
  personCard: 'Person',
};

/** How much of the page each modal takes. Anything that is a list or a board fills it; a small
 *  modal is for an event with a decision in it, and nothing else (CLAUDE.md T9 1, 3.12). The one
 *  table the modal layer reads, so a modal cannot be one size in one place and another in
 *  another. */
export const MODAL_IS_FULL: Record<ModalId, boolean> = {
  board: true,
  // The laptop is a computer, and its screen fills the page (CLAUDE.md T14 2.1).
  laptop: true,
  workPlan: true,
  accounting: true,
  catalogue: true,
  shopping: true,
  company: true,
  settings: false,
  // One machine's card is a card, not a list: it sits on the page like an event does (T17 2.6).
  machineCard: false,
  // A person's card is a card in the same sense, and it wears the machine card's skin (T23 2.13).
  personCard: false,
};

/** The middle of the folder's three sizes, for a modal that is not a list but is more than two
 *  sentences: the day summary and the month end have taken it since Turn 13, and a machine's card
 *  takes it because a picture, six figures and five buttons do not fit the small folder without
 *  the buttons falling under the fold, which is the very thing the card was made to end
 *  (PIOTR, 17.09: "I never found Connect to extraction"; CLAUDE.md T11 3.5, T17 2.6). */
export const MODAL_IS_WIDE: Record<ModalId, boolean> = {
  board: false,
  laptop: false,
  workPlan: false,
  accounting: false,
  catalogue: false,
  shopping: false,
  company: false,
  settings: false,
  machineCard: true,
  personCard: true,
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
    toast: '',
    filters: { board: '', catalogue: '' },
    focusNext: null,
    stockSheets: '',
    loanAmount: '10000',
    boardTab: 'enquiries',
    workPlanTab: 'jobs',
    contractMan: null,
    houseCardSince: null,
    houseCardDone: false,
    laptopPage: 'home',
    teamTab: 'workshop',
    catalogueTab: CATALOGUE_FIRST_TAB,
    catalogueFolder: null,
    ownedTab: 'all',
    sellConfirm: null,
    machineCard: null,
    personCard: null,
    tickedTasks: [],
    dropConfirm: null,
    assignOpen: null,
    accountingTab: 'days',
    accountingMonth: null,
    openDays: [],
    daySummary: null,
    scrollModalTop: false,
    setup: false,
    rotate: 0,
    armTurn: false,
    speedBeforeSetup: 0,
    speedBeforePause: 1,
    drag: null,
    camera: { ...HALL_CAMERA_START },
    cameraStarted: false,
    panned: false,
    showWhy: true,
    seenEnquiries: [],
    seenOrders: [],
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
    saved: NO_STORED_SAVE,
    startOverAsked: false,
  };
}

function game(): GameState {
  if (!state) throw new Error('no game running');
  return state;
}

function dispatch(action: GameAction): void {
  const wasDayEnd = state?.activeEvent?.kind === 'dayEnd';
  state = applyAction(game(), action);
  // The house card is shown again at the next day end (CLAUDE.md T13 3.18).
  if (wasDayEnd && state.activeEvent?.kind !== 'dayEnd') {
    ui.houseCardSince = null;
    ui.houseCardDone = false;
  }
  autosave();
  if (AUTOSAVE_ACTIONS.includes(action.type)) autosaveLocal();
  autosaveWatch();
  noteOrders();
  requestRender();
}

/** The player knows about an order he has just placed: what lights the Orders button is something
 *  landing while he was not looking, not something he bought himself (CLAUDE.md T11 3.1). So the
 *  list he has seen takes in everything added to it, and stops the moment one of them has gone. */
function noteOrders(): void {
  if (state === null) return;
  const waiting = shoppingList(state).map((line) => line.id);
  if (ui.seenOrders.some((id) => !waiting.includes(id))) return;
  ui.seenOrders = waiting;
}

/** Renders asked for while one batch is open, and how deep the batch is. The frame loop and every
 *  click open one: the world changes as many times as it likes and the page is written once, at
 *  the end, so the page is never written in the middle of a gesture (CLAUDE.md T9 3.8). */
let batchDepth = 0;
let renderWanted = false;

/** Asks for the page to be written. Inside a batch that is a note to write it when the batch is
 *  over; outside one it is the writing itself. */
export function requestRender(): void {
  if (batchDepth > 0) {
    renderWanted = true;
    return;
  }
  render();
}

/** Runs the work with the page held still, and writes it once afterwards if anything asked. */
function batched(work: () => void): void {
  batchDepth += 1;
  try {
    work();
  } finally {
    batchDepth -= 1;
    if (batchDepth === 0 && renderWanted) {
      renderWanted = false;
      render();
    }
  }
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

/** The one order for a screen and its first use bubble: the body first and the bubble after it,
 *  the last child of the body, where there is room. The top is for what matters, not for tips
 *  (PIOTR, 16.09; CLAUDE.md T15 2.2). Every screen with a bubble comes through here, so the order
 *  cannot differ between screens. */
function withTip(body: string, current: GameState, key: string): string {
  return body + renderTip(current, key);
}

function modalBody(id: ModalId, current: GameState): string {
  switch (id) {
    case 'board':
      return (
        tabBar('boardTab', BOARD_TABS, ui.boardTab) +
        (ui.boardTab === 'contracts'
          ? withTip(renderContracts(current), current, 'contracts')
          : renderBoard(current, ui.filters.board ?? ''))
      );
    case 'laptop':
      return renderLaptop(current, {
        page: ui.laptopPage,
        stockSheets: ui.stockSheets,
        teamTab: ui.teamTab,
        tickedTasks: ui.tickedTasks,
      });
    case 'workPlan':
      return renderWorkPlan(current, ui.workPlanTab, ui.assignOpen, ui.contractMan);
    case 'machineCard':
      return renderMachineCard(current, ui.machineCard, ui.sellConfirm);
    case 'personCard':
      return ui.personCard === null
        ? '<p class="empty">Nobody by that name.</p>'
        : renderPerson(current, ui.personCard, 'card');
    case 'accounting': {
      const books = renderAccounting(
        current,
        ui.accountingTab,
        ui.openDays,
        ui.accountingMonth,
        ui.loanAmount,
      );
      return ui.accountingTab === 'finance' ? withTip(books, current, 'finance') : books;
    }
    case 'catalogue':
      return renderCatalogue(
        current,
        ui.filters.catalogue ?? '',
        ui.catalogueTab,
        ui.catalogueFolder,
        ui.ownedTab,
        ui.sellConfirm,
      );
    case 'shopping':
      return renderShopping(current);
    case 'company':
      return renderCompany(current);
    case 'settings':
      return renderSettings(current);
  }
}

/** The first use bubble of a laptop page, keyed by the page (CLAUDE.md T13 3.22, T14 2.1): the
 *  laptop's own on home, and each page's own behind its tile. */
function laptopTipKey(page: LaptopPage): string {
  return page === 'home' ? 'laptop' : page;
}

/** What is under the mouse in the hall: a machine standing in it, or the outline held for
 *  something that is bought and on its way (CLAUDE.md T8 3.2). One lookup for both. */
function kitOf(current: GameState, itemId: string): { specId: string; variantId: string } | null {
  const item = current.equipment.find((entry) => entry.id === itemId);
  if (item) return { specId: item.specId, variantId: item.variantId };
  const reserved = reservationById(current, itemId);
  return reserved === null ? null : { specId: reserved.specId, variantId: reserved.variantId };
}

/** The ghost of the item being dragged, with the engine's verdict on the cell under the mouse.
 *  Turned the way the next drop will stand it (CLAUDE.md T10 3.8). */
function ghostFor(current: GameState): Ghost | null {
  const drag = ui.drag;
  if (drag === null) return null;
  const kit = kitOf(current, drag.itemId);
  if (kit === null) return null;
  const box = boxOf(kit.specId, drag.x, drag.y, kit.variantId, ui.rotate);
  const check = canPlace(current, drag.itemId, drag.x, drag.y, ui.rotate);
  return {
    x: box.x,
    y: box.y,
    width: box.width,
    depth: box.depth,
    ok: check.ok,
    reason: check.reason,
    orientation: ui.rotate,
  };
}

/** Turns what is in hand, or arms the turn for the next thing picked up. The one write for it: the
 *  R key and the Rotate button both come through here (CLAUDE.md T10 3.8, T22 2.10).
 *
 *  With nothing in hand it is a toggle on `ui.armTurn`, so two presses cancel and the button says
 *  which it is; the pick up in `onSetupPointerDown` reads the item's own orientation and applies the
 *  armed turn to it once. With something in hand it turns what is in hand, as it always did. */
function turnGhost(): void {
  if (!ui.setup) return;
  if (ui.drag === null) {
    ui.armTurn = !ui.armTurn;
    requestRender();
    return;
  }
  ui.rotate = turnedFrom(ui.drag.itemId, ui.rotate);
  requestRender();
}

/** The orientation after this one for the thing named: round the orientations that have a picture,
 *  which is `0, 1, 0` for almost everything and `0, 1, 2, 3, 0` for the five tool cabinets
 *  (CLAUDE.md T22 2.11). The one place the cycle is asked for, so Rotate, R and the Turn row of a
 *  card all walk the same ring. */
function turnedFrom(itemId: string, orientation: Orientation): Orientation {
  const current = state;
  if (current === null) return orientation;
  const kit = kitOf(current, itemId);
  const spec = kit === null ? null : findSpec(kit.specId);
  if (kit === null || spec === null || spec === undefined) return orientation;
  return nextSpriteOrientation(spec.spriteKey, kit.variantId, orientation);
}

/** Turn on the card of a thing standing on the hall: it stands at ninety degrees where it is, at
 *  the next orientation that has a picture, through the one action anything moves by
 *  (CLAUDE.md T22 2.13). The game books the move itself, exactly as it books a drag: `END_SETUP`
 *  keeps the heavy kit an hour and a question and leaves a cabinet, a bench or a rack free, which
 *  is the rule `endSetup` has had since Turn 8 and not a second one written here. */
function turnWhereItStands(itemId: string): void {
  const current = game();
  const item = current.equipment.find((entry) => entry.id === itemId);
  const spec = item === undefined ? null : findSpec(item.specId);
  if (item === undefined || spec === null || spec === undefined) return;
  const next = nextSpriteOrientation(spec.spriteKey, item.variantId, item.orientation);
  dispatch({
    type: 'MOVE_ITEM',
    itemId: item.id,
    x: item.anchorX,
    y: item.anchorY,
    orientation: next,
  });
  dispatch({ type: 'END_SETUP', speed: game().speed });
}

function setupControls(current: GameState): string {
  // What the moves made so far will want reconnecting, before he presses Done: the pipe is run
  // again at the new length when the kit is down (T4 3.5, T13 3.19).
  const due = ductingDue(current);
  const bill =
    due.machines === 0
      ? ''
      : `<span class="reason">Extraction pipe to run again: ${plural(due.machines, 'machine', 'machines')}</span>`;
  return (
    '<div class="view-controls">' +
    '<button class="btn btn-primary" data-do="endSetup">Done</button>' +
    `<button class="btn${ui.armTurn ? ' is-on' : ''}" data-do="rotateGhost">Rotate</button>` +
    bill +
    '<span class="reason">Drag the machines, the benches and the shelving where you want them. ' +
    'The rooms and the gate stay where they are. Every item moved is an hour of somebody\'s ' +
    'time. Rotate, or the R key, stands the next one you drop at ninety degrees to the walls.' +
    '</span>' +
    '</div>'
  );
}

/** One chip over the floor: what has to be done, in the hand, with the button that does it where
 *  there is one (PIOTR, 16.09, docs/mockups/t17/hall-strip-C.html; CLAUDE.md T17 2.5). */
function hallChip(text: string, action = ''): string {
  const said = text === '' ? '' : `<span>${escapeHtml(text)}</span>`;
  return `<div class="hall-chip">${said}${action}</div>`;
}

/** The button that puts a chip's problem right: the same actions the machine's own card calls, so
 *  there is one way to clean the hall, empty the bags, fix a machine and service one. */
function chipAction(problem: HallProblem): string {
  // Somebody is already on it: the chip tells him so and asks him nothing (CLAUDE.md T19 2.7).
  if (problem.inHand === true) return '';
  if (problem.kind === 'dirty') {
    return `<button class="btn" data-do="startCleaning">Clean up · ${minutes(CLEANING_MINUTES)}</button>`;
  }
  if (problem.kind === 'bags') {
    return '<button class="btn" data-do="emptyBags">Empty bags</button>';
  }
  if (problem.equipmentId === null) return '';
  if (problem.kind === 'broken') {
    return `<button class="btn" data-do="repairMachine" data-id="${problem.equipmentId}">Fix it</button>`;
  }
  return `<button class="btn" data-do="serviceMachine" data-id="${problem.equipmentId}">Service it</button>`;
}

/** What floats over the floor, bottom left: one chip per thing that has to be done and nothing
 *  else, so a clean hall with nothing waiting shows the setting out chip alone (PIOTR, 16.09;
 *  CLAUDE.md T17 2.5). The order is what it costs the workshop: nothing runs at all, then the
 *  owner's own bench, then what the hall wants doing, then the setting out.
 *  Setup mode keeps the controls it has always had. */
function hallControls(current: GameState): string {
  if (ui.setup) return setupControls(current);
  const chips: string[] = [];
  // Somebody is carrying the kit: nothing else happens in the hall until it is down (T4 3.5).
  if (movingMachines(current) !== null) {
    chips.push(
      hallChip('Moving machines. Nothing gets made until the kit is back down and the ducting is on.'),
    );
    return `<div class="hall-chips">${chips.join('')}</div>`;
  }
  const ready = oldestReadyJob(current);
  const working = ownerJob(current) !== null;
  // The hall says exactly what the job card says, out of the one check (CLAUDE.md T4 3.4). A man
  // already at his bench, and a board with nothing ready on it, are not things to be done.
  const check = ready === null || working ? null : startProductionCheck(current, ready);
  if (check !== null) {
    chips.push(
      check.ok
        ? hallChip('', '<button class="btn btn-primary" data-do="workHere">Work here</button>')
        : hallChip(`Cannot work here, ${check.reason}`),
    );
  }
  for (const problem of hallProblems(current)) chips.push(hallChip(problem.text, chipAction(problem)));
  chips.push(hallChip('', setupButton(current)));
  return `<div class="hall-chips">${chips.join('')}</div>`;
}

/** Everything that stands under the hall, in one column, bottom left: the chips of T17 2.5 first
 *  and the first use tip last, both in the flow of the column, so a long tip pushes the chips up
 *  instead of being covered by them and nothing ever overlaps whatever the tip's length
 *  (PIOTR, 17.09; CLAUDE.md T18 2.4). The camera is its own thing, bottom right. */
function hallBottom(current: GameState): string {
  return `<div class="hall-bottom">${hallControls(current)}${hallTip(current)}</div>`;
}

/** The camera, bottom right: three small chips and nothing else. What the wheel and the drag do
 *  is a tip now, said once (CLAUDE.md T17 2.5). */
function hallZoomControls(): string {
  return (
    '<div class="hall-zoom">' +
    '<button class="btn" data-do="zoomFit">Fit</button>' +
    '<button class="btn" data-do="zoomIn">+</button>' +
    '<button class="btn" data-do="zoomOut">-</button>' +
    '</div>'
  );
}

/** A first guess at the room the office has, for the one render before it is on the page and can
 *  be measured. `VIEW_PADDING` is the padding of `.view` in styles.css; `TOPBAR_HEIGHT` is what the
 *  top bar comes to with that stylesheet's padding and type, and it is a guess, not a declared
 *  number. `fitOfficeStack` takes the real box a moment later, so neither has to be right. */
const TOPBAR_HEIGHT = 70;
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
  if (movePending(current) !== null || moveConfirmPending(current)) {
    return '<span>The kit is half shifted. Finish the move first.</span>';
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
    `<div class="why-pop" data-popover="why" style="left:${left}px;top:${open.top + 16}px">` +
    // The one cross, the same helper every modal and every list calls: the bubble used to be shut
    // by a "Right" button of its own, which was a second way out of a popover
    // (PIOTR, 18.09; CLAUDE.md T20 2.15, T18 2.5).
    closeButton('closeWhy') +
    `<p>${escapeHtml(text)}</p></div>`
  );
}

/** What should be open on the modal layer, in the order it is stacked (CLAUDE.md T3 3.4). */
function modalSpecs(): ModalSpec[] {
  if (ui.screen === 'start' || state === null) return [];
  const current = state;
  const specs: ModalSpec[] = [];
  if (ui.modal !== null) {
    // The first use bubble of the screen, over its body, until it is dismissed (T13 3.22).
    // The Work Plan's own note is about its job rows ("One row a job"), so it belongs to the Jobs
    // tab and not to the Contracts tab beside it, which is how the order board's note already
    // follows its tabs. Seen under the Contracts tab in the T20-C5 pictures.
    const tipKey =
      ui.modal === 'laptop'
        ? laptopTipKey(ui.laptopPage)
        : ui.modal === 'workPlan' && ui.workPlanTab !== 'jobs'
          ? ''
          : TIP_KEY_OF_MODAL[ui.modal] ?? '';
    const body = modalBody(ui.modal, current);
    specs.push({
      id: ui.modal,
      title: modalTitleOf(ui.modal, current),
      body: tipKey === '' ? body : withTip(body, current, tipKey),
      full: MODAL_IS_FULL[ui.modal],
      wide: MODAL_IS_WIDE[ui.modal],
      position: ui.modalPosition,
    });
  }
  if (ui.daySummary !== null) {
    const past = summaryOfDay(current, ui.daySummary);
    specs.push({
      id: 'daySummary',
      title: past === null ? formatCalendarDay(ui.daySummary) : past.title,
      body:
        past === null
          ? '<p class="empty">That day is off the back of the books now.</p>'
          : renderDaySummary(past),
      closable: true,
      wide: true,
      position: null,
    });
  }
  // Dropping a project is the one action in the game that takes two clicks, because for a big job
  // it ends the company: the first click opens this card, which says what the drop costs before
  // anything is done, and the red button on it is the second (PIOTR, 18.09; CLAUDE.md T21 2.3). It
  // is pushed after the Work Plan it was opened from, so it sits over it, and it carries the cross,
  // Escape and a click outside like every other card.
  if (ui.dropConfirm !== null) {
    const job = current.jobs.find((entry) => entry.id === ui.dropConfirm) ?? null;
    if (job === null) {
      ui.dropConfirm = null;
    } else {
      specs.push({
        id: 'dropJob',
        title: dropCardTitle(job),
        body: renderDropCard(current, job),
        footer: renderDropCardFooter(job),
        closable: true,
        wide: true,
        position: null,
      });
    }
  }
  const event = current.activeEvent;
  if (event) {
    // Going home: the house card first, for a few seconds or until a click, then the summary
    // (CLAUDE.md T13 3.18).
    const houseCard = event.kind === 'dayEnd' && houseCardShowing();
    specs.push({
      id: 'event',
      title: houseCard ? 'Home' : event.title,
      body: houseCard
        ? withTip(
            renderHouseCard(current) +
              '<p class="choices"><button class="btn" data-do="closeHouseCard">The summary</button></p>',
            current,
            'house',
          )
        : event.kind === 'dayEnd'
          ? renderDayEnd(current)
          : event.kind === 'monthEnd'
            ? renderMonthEnd(current, event)
            : renderEvent(current, event),
      footer: houseCard ? '' : renderEventFooter(event),
      closable: !houseCard && event.choices.length === 1,
      // The bank's card joins the day end and the month end on the middle folder size: a head, a
      // date line, four figures and the epitaph do not fit the small one, and the last line of it
      // ("built 0 of them") was cut in half by the fold (T21-C4, picture 4; CLAUDE.md T21 2.2).
      wide:
        event.kind === 'dayEnd' || event.kind === 'monthEnd' || event.kind === 'bankruptcy',
      position: ui.eventPosition,
    });
  }
  return specs;
}

/** True while the house card is up on the day end: from the moment the day ends, for the card's
 *  seconds, unless it was clicked away (CLAUDE.md T13 3.18). */
function houseCardShowing(): boolean {
  if (ui.houseCardDone) return false;
  if (ui.houseCardSince === null) {
    ui.houseCardSince = nowMs();
    return true;
  }
  return nowMs() - ui.houseCardSince < HOUSE_CARD_SECONDS * 1000;
}

/** Where the scene goes in the page. The page around it is written again every render; the scene
 *  itself is carried across, because its pictures cost megabytes to load (see `mountScene`). */
const SCENE_SLOT = '<div data-scene-slot="1"></div>';

/** The scene for the view the player is on, in the two pieces the page needs it in: the shell to
 *  keep and the live part to write again. The sprite check page has no live part at all. */
function sceneFor(current: GameState): Scene | null {
  if (ui.view === 'sprites') {
    // A page of every key in the game, which is dear to build and never changes: it is all shell.
    return { key: 'sprites', shell: renderSpriteCheck, live: '' };
  }
  if (ui.view === 'hall') {
    return hallScene(current, { ghost: ghostFor(current), setup: ui.setup });
  }
  return officeScene(current, officeViewport());
}

/** When the move he has just said yes to will be finished, in the words the toast wants: the rest
 *  of it is done tomorrow morning if the day runs out (CLAUDE.md T8 3.4). */
function moveFinishNote(current: GameState): string {
  const move = movePending(current);
  if (move === null) return '';
  const at = finishTimeFor(current, move.minutesRemaining);
  const clock = formatTime(at.minute);
  if (at.day === current.clock.day) return `Finished by ${clock}.`;
  if (at.day === current.clock.day + 1) return `Finished tomorrow by ${clock}.`;
  return `Finished on ${formatCalendarDay(at.day)} by ${clock}.`;
}

/** The version in the corner of every screen, the start screen included (PIOTR, 13.09). It takes
 *  no pointer, so it can never cover a control (CLAUDE.md T8 3.1). */
const VERSION_CORNER = `<span class="version-corner">${APP_VERSION}</span>`;

/** Everything on the page except the modal layer, which keeps its own DOM between renders, and the
 *  scene, which goes into the slot afterwards. */
function pageHtml(): string {
  return pageBody() + VERSION_CORNER;
}

/** What the player has not looked at yet: an enquiry that was not on the board when he last
 *  opened it, and an order that has landed since he last looked at the list (T11 3.1). */
function topbarNews(current: GameState): TopbarNews {
  const waiting = shoppingList(current).map((line) => line.id);
  return {
    board: current.enquiries.some((enquiry) => !ui.seenEnquiries.includes(enquiry.id)),
    orders: ui.seenOrders.some((id) => !waiting.includes(id)),
  };
}

function pageBody(): string {
  if (ui.screen === 'start' || state === null) {
    return (
      renderStart({
        difficulty: ui.difficulty,
        playerName: ui.playerName,
        companyName: ui.companyName,
        showWhy: ui.showWhy,
        cloud: ui.cloud,
        saved: ui.saved,
        startOverAsked: ui.startOverAsked,
      })
    );
  }
  const current = state;
  // The last word the company gets is the bankruptcy event, over the game over screen.
  if (current.gameOver) return renderGameOver(current);
  const controls = ui.view === 'hall' ? hallBottom(current) + hallZoomControls() : '';
  const note = ui.note === '' ? '' : `<p class="view-note">${escapeHtml(ui.note)}</p>`;
  const toast = ui.toast === '' ? '' : `<p class="toast">${escapeHtml(ui.toast)}</p>`;
  const out = ui.view === 'sprites' ? '' : renderOwnerOut(current);
  // The warning strip under the top bar: one problem at a time (CLAUDE.md T13 3.22).
  const strip = ui.view === 'sprites' ? '' : renderWarningStrip(current);
  return (
    renderTopbar(current, ui.view, ui.toast !== '', topbarNews(current)) +
    strip +
    toast +
    out +
    (ui.menuOpen ? renderMenu(current, ui.cloud) : '') +
    `<main class="view">${SCENE_SLOT}${controls}${note}</main>` +
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
  return { key, start: active.selectionEnd };
}

function restoreFocus(memory: FocusMemory | null): void {
  if (!memory || !root) return;
  const field = root.querySelector(`[data-field="${memory.key}"]`);
  if (!(field instanceof HTMLInputElement)) return;
  field.focus();
  if (field.type !== 'text') return;
  // The caret goes back where it was, and at the end when the remembered spot is stale (it was
  // read before the last key landed): typing 15 must give 15, never 51 (bug, 13.09).
  const end = field.value.length;
  const at = memory.start === null ? end : Math.min(Math.max(memory.start, 0), end);
  field.setSelectionRange(at === 0 && end > 0 ? end : at, at === 0 && end > 0 ? end : at);
}

function nowMs(): number {
  return typeof performance === 'undefined' ? 0 : performance.now();
}

/** Gives every walker its orders off the page that has just been built, and puts every figure
 *  back where he had actually got to: the walker owns the transform between renders
 *  (CLAUDE.md T16 2.2). The network is the engine's: the walker asks it for the path and
 *  decides no cell of its own. */
function syncFigures(now: number): void {
  if (!root) return;
  const current = state;
  syncWalkers(root, now, (from, to) =>
    current === null ? [from, to] : walkPath(current, from, to),
  );
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
    // The patch leaves anything marked as the slot alone, so the scene is carried from page to
    // page whole, with its pictures loaded (CLAUDE.md T9 3.8).
    node.setAttribute('data-scene-slot', '1');
    scene = { key: wanted.key, node };
  }
  const live = scene.node.querySelector('[data-live]');
  // The live part is patched like everything else: the board by the door is a control in it, and
  // a control that is replaced every minute cannot be clicked (CLAUDE.md T9 3.8).
  if (live !== null) patchInto(live, wanted.live);
  if (slot !== scene.node) slot.replaceWith(scene.node);
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
  if (frame !== null && !ui.cameraStarted) {
    // The hall opens a fifth past the fit, in the middle of the frame. The frame is not known
    // until the scene is on the page, so this is the first render after every way in
    // (CLAUDE.md T10 3.9).
    ui.camera = hallStartCamera(frame);
    ui.cameraStarted = true;
  }
  if (frame !== null) ui.camera = clampCamera(ui.camera, frame);
  group.setAttribute('transform', cameraTransform(ui.camera));
}

/** Pushing the hall about writes one attribute on one group and nothing else: rebuilding the page
 *  under the pointer at the rate a mouse moves is what the whole of T5 3.1 was about. Only the
 *  readout under the hall needs the page again, and only when it changes. */
function moveCamera(next: HallCamera): void {
  const before = Math.round(ui.camera.scale * 100);
  ui.camera = next;
  ui.cameraStarted = true;
  applyCamera();
  if (Math.round(ui.camera.scale * 100) !== before) requestRender();
}

/** Back to where the hall opens: a fifth past the fit (CLAUDE.md T10 3.9). */
function resetCamera(): void {
  ui.camera = { ...HALL_CAMERA_START };
  ui.cameraStarted = false;
}

/** The Fit button: the whole hall on the screen, and it stays there (CLAUDE.md T6 3.3). */
function fitCamera(): void {
  ui.camera = { ...HALL_CAMERA_FIT };
  ui.cameraStarted = true;
}

/** Setting the hall out is the hall's own job: the view is the hall while it is on, and nothing
 *  stands open over it. That is what Move on a machine's card leans on: one click puts the card
 *  away and the player on the floor with the grid out, where he shifts the machine the one way
 *  anything in this game is shifted, by dragging it (CLAUDE.md T4 3.5, T17 2.6). */
function keepSetupHonest(): void {
  if (!ui.setup) return;
  ui.view = 'hall';
  ui.modal = null;
}

export function render(): void {
  const parts = halves();
  if (parts === null) return;
  keepSetupHonest();
  const memory = ui.focusNext === null ? captureFocus() : { key: ui.focusNext, start: null };
  ui.focusNext = null;
  const wanted = ui.screen === 'game' && state !== null && state.gameOver === null
    ? sceneFor(state)
    : null;
  patchInto(parts.page, pageHtml());
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
  syncFigures(nowMs());
  // And the doors, which the fresh markup has just written back to the state the hall computed
  // for this frame: the swing is the renderer's, like the walk (CLAUDE.md T19 2.3).
  syncDoors(parts.page, nowMs());
  restoreFocus(memory);
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/** The modals that act on the world, which is every one of them but the Work Plan: nothing on
 *  them can be touched while the clock is stopped (CLAUDE.md T7 3.10). The Work Plan is a
 *  whiteboard and the Sprite check is a page of pictures: both are reading, and both open. */
const READING_MODALS: ModalId[] = ['workPlan', 'shopping', 'company', 'settings'];

/** The one line the player gets when the world will not move for him, with the Pause button
 *  pulsing once behind it (CLAUDE.md T7 3.10). */
function pausedToast(): void {
  ui.toast = 'Time is paused';
}

/** The room fills the page, so there is no small object for a modal to sit beside any more: every
 *  modal opens centred, and the player drags it where he wants it (CLAUDE.md T4 3.1). */
function openModal(id: ModalId): void {
  // Nothing happens in stopped time, so the clock starts at 1x the moment the player reaches for
  // something that acts on the world; he asked for that instead of a refusal (PIOTR, 13.09).
  if (!READING_MODALS.includes(id) && timeIsPaused(game())) {
    dispatch({ type: 'SET_SPEED', speed: 1 });
  }
  ui.modal = id;
  ui.modalPosition = null;
  ui.menuOpen = false;
  // Opening one of the two lists is seeing it: the push button goes back to cream (T11 3.1).
  if (id === 'board') ui.seenEnquiries = game().enquiries.map((enquiry) => enquiry.id);
  if (id === 'shopping') ui.seenOrders = shoppingList(game()).map((line) => line.id);
  if (id === 'laptop') {
    // The screen comes up on home every time, with no memory of the last page (T14 2.1).
    ui.laptopPage = 'home';
    // Lifting the lid costs him the five minutes the machine takes to come up (CLAUDE.md T7 3.10).
    dispatch({ type: 'BOOT_LAPTOP' });
  }
}

/** The one way onto one machine's card: a click on the machine on the hall, and from Turn 17 the
 *  Owned tab's tile as well. The card is the same functions the Owned tab calls (T17 2.6). */
function openMachineCard(equipmentId: string): void {
  // The card is the answer to the click, so whatever the last click wrote under the hall goes.
  setNote('');
  ui.machineCard = equipmentId;
  ui.sellConfirm = null;
  openModal('machineCard');
}

/** The one way onto one person's card: a click on his figure on the hall, and a click on his tile
 *  in Our team. One function, the way the machine card has one (CLAUDE.md T23 2.13). */
function openPersonCard(who: string): void {
  if (!isPerson(game(), who)) return;
  // The card is the answer to the click, so whatever the last click wrote under the hall goes.
  setNote('');
  ui.personCard = who;
  openModal('personCard');
}

/** The one way onto a page of the laptop: a tile, the back arrow, the Joinery Core tile onto the
 *  Team's Technical tab, and the order board's "Open the team" all come through here. The lid is
 *  lifted first when the laptop is not open, which is what boots it (CLAUDE.md T15 2.3). A new
 *  page starts at the top rather than where the last one was scrolled. */
function openLaptopPage(page: LaptopPage): void {
  if (ui.modal !== 'laptop') openModal('laptop');
  ui.laptopPage = page;
  ui.scrollModalTop = true;
}

/** Shutting a modal, however it was shut: the cross, Escape, or a Start production that takes the
 *  player straight to the bench. One path, so the game is written down every time (T11 3.2). */
function shutModal(): void {
  ui.modal = null;
  ui.modalPosition = null;
  ui.sellConfirm = null;
  autosaveLocal();
}

/** Hours on a machine's own clock, as the note under the hall says them. */
/** The one sentence under the hall the first time a machine stands there with no pipe to the
 *  extraction and no central system to make one unnecessary: the same bubble every screen has,
 *  in the same place (CLAUDE.md T16 2.3). */
function hallTip(current: GameState): string {
  if (ui.view !== 'hall') return '';
  // What the wheel and the drag do, said once and then never again: the sentence that used to sit
  // under the hall for ever (PIOTR, 16.09; CLAUDE.md T17 2.5). One bubble at a time, so the
  // camera is explained first and the red rings after it.
  const camera = withTip('', current, 'hallCamera');
  if (camera !== '') return camera;
  if (hasCentralExtraction(current) || unconnectedMachines(current).length === 0) return '';
  return withTip('', current, 'unconnected');
}

/** The one way a note is put under the hall. The hall's bag store is not one of them any more:
 *  it is on the extractor's own card, where the button that empties them is (CLAUDE.md T17 2.6). */
function setNote(text: string): void {
  ui.note = text;
}

function hoursOfUse(hours: number): string {
  return `${Math.round(hours * 10) / 10} h`;
}

/** Clicking the van at the gate opens the unloading choice again (CLAUDE.md 10.1). */
function askUnload(deliveryId: string): void {
  dispatch({ type: 'ASK_UNLOAD', deliveryId });
}

/** What each region of the room opens (docs/art/SPRITES.md 8.2 and 8.4). The door is the one
 *  region that is not a modal: it is the way back into the hall. */
/** What each office region opens. Exported for the test that proves the top bar's Projects chip
 *  opens the same board as the office wall (CLAUDE.md T16 2.4). */
export const OFFICE_REGION_MODALS: Record<string, ModalId> = {
  workPlan: 'workPlan',
  orders: 'board',
  laptop: 'laptop',
  catalogue: 'catalogue',
  binder: 'accounting',
  company: 'company',
};

/** Elements in the SVG views are SVGElement, not HTMLElement, but both carry a dataset. */
type DataElement = HTMLElement | SVGElement;

function dataElement(node: Element | null): DataElement | null {
  if (node instanceof HTMLElement) return node;
  if (node instanceof SVGElement) return node;
  return null;
}

/** One click, one writing of the page. The handler changes the world as many times as the click
 *  asks for and the page is written when it is done, never in the middle of it
 *  (CLAUDE.md T9 3.8). */
function handleAction(element: DataElement, point: { x: number; y: number }): void {
  batched(() => runAction(element, point));
}

function runAction(element: DataElement, point: { x: number; y: number }): void {
  const what = element.dataset.do;
  if (what === undefined) return;
  const id = element.dataset.id ?? '';
  setNote('');
  // The toast and its pulse last one click (CLAUDE.md T7 3.10).
  ui.toast = '';
  switch (what) {
    case 'pickDifficulty':
      ui.difficulty = id as Difficulty;
      break;
    case 'askStartOver':
      // The one question, on a button of its own (CLAUDE.md T11 3.2).
      ui.startOverAsked = true;
      break;
    case 'keepSaved':
      ui.startOverAsked = false;
      break;
    case 'clearSaved':
      saveStore.clear();
      ui.saved = peekSave();
      ui.startOverAsked = false;
      break;
    case 'continueSaved': {
      const stored = readStore();
      if (stored.state === null) {
        ui.saved = peekSave();
        setNote(stored.note);
        break;
      }
      state = stored.state;
      ui.screen = 'game';
      accumulator = 0;
      resetWalkers();
      resetDoors();
      startedStore();
      noteOrders();
      break;
    }
    case 'startGame':
      // A new company is the end of the old one: the store is cleared before the first minute.
      saveStore.clear();
      state = createGame({
        seed: newSeed(),
        difficulty: ui.difficulty,
        playerName: ui.playerName.trim() === '' ? 'Piotr' : ui.playerName.trim(),
        companyName: ui.companyName.trim() === '' ? 'Woodwork Empire' : ui.companyName.trim(),
        showWhy: ui.showWhy,
      });
      ui.screen = 'game';
      ui.startOverAsked = false;
      accumulator = 0;
      resetWalkers();
      resetDoors();
      startedStore();
      noteOrders();
      autosaveLocal();
      break;
    case 'restart':
      ui = freshUi();
      ui.saved = peekSave();
      state = null;
      break;
    case 'setSpeed':
      dispatch({ type: 'SET_SPEED', speed: speedFromString(element.dataset.speed ?? '0') });
      return;
    case 'skipAhead':
      dispatch({ type: 'SKIP_AHEAD' });
      return;
    case 'setView':
      walkTo(element.dataset.view === 'office' ? 'office' : 'hall');
      break;
    case 'zoomFit':
      fitCamera();
      break;
    case 'zoomIn':
    case 'zoomOut': {
      const frame = hallFrame();
      if (frame === null) break;
      const middle = { x: frame.x + frame.width / 2, y: frame.y + frame.height / 2 };
      const step = what === 'zoomIn' ? HALL_ZOOM_STEP : 1 / HALL_ZOOM_STEP;
      ui.camera = zoomAt(ui.camera, frame, middle, step);
      ui.cameraStarted = true;
      break;
    }
    case 'showSprites':
      // The acceptance page for the art side, always one click away (CLAUDE.md T3 3.6).
      endSetup();
      ui.view = 'sprites';
      ui.menuOpen = false;
      break;
    case 'startSetup':
      // Nothing is dragged while the last move is still on the list, carried or waiting, or
      // while the question about it is still in front of him (CLAUDE.md T8 3.4).
      if (movePending(game()) !== null || moveConfirmPending(game())) break;
      // Setting the hall out is a job of work, so it cannot be started in stopped time. Once it
      // is open the clock stops on purpose, as it has since Turn 4 (CLAUDE.md T7 3.10).
      if (timeIsPaused(game())) {
        pausedToast();
        break;
      }
      ui.setup = true;
      ui.drag = null;
      ui.speedBeforeSetup = game().speed;
      dispatch({ type: 'SET_SPEED', speed: 0 });
      return;
    case 'rotateGhost':
      turnGhost();
      return;
    case 'turnItem':
      turnWhereItStands(id);
      return;
    case 'endSetup':
      endSetup();
      return;
    case 'closeMenu':
      ui.menuOpen = false;
      break;
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
        walkTo('hall');
        break;
      }
      const modal = OFFICE_REGION_MODALS[region];
      if (modal !== undefined) openModal(modal);
      break;
    }
    case 'laptopPage':
      // A tile opens its page full screen inside the laptop, and the back arrow is the same
      // click with home for a page (CLAUDE.md T14 2.1, T15 2.3).
      openLaptopPage(laptopPageFrom(id));
      break;
    case 'ownedTab':
      ui.ownedTab = id;
      ui.sellConfirm = null;
      return;
    case 'cancelOrder':
      dispatch({ type: 'CANCEL_ORDER', orderId: id });
      // He called it off himself, so its going is not news to him (CLAUDE.md T11 3.1).
      ui.seenOrders = shoppingList(game()).map((line) => line.id);
      return;
    case 'sellMachine':
      // The first click says what the buyer pays, the second means it (CLAUDE.md T8 3.5).
      if (element.dataset.confirm !== '1') {
        ui.sellConfirm = id;
        break;
      }
      ui.sellConfirm = null;
      dispatch({ type: 'SELL_MACHINE', equipmentId: id });
      return;
    case 'assignAir': {
      // One click puts a machine or a dryer on a compressor (CLAUDE.md T10 3.2).
      const compressorId = element.dataset.compressor ?? null;
      dispatch({ type: 'ASSIGN_AIR', equipmentId: id, compressorId });
      return;
    }
    case 'teamTab':
      // A tab of the Team page; off the laptop's Joinery Core tile it is the Technical tab, where
      // Turn 13 put the software line, and the page comes up with it (CLAUDE.md T14 2.1, T15 2.3).
      ui.teamTab = teamTabFrom(id);
      openLaptopPage('team');
      break;
    case 'catalogueTab':
      ui.catalogueTab = catalogueTabFrom(id);
      // A sale meant on the second click is not meant on another tab (CLAUDE.md T8 3.5).
      ui.sellConfirm = null;
      // A new tab is a new set of folders, with none of them open and no filter left over.
      ui.catalogueFolder = null;
      ui.filters.catalogue = '';
      ui.scrollModalTop = true;
      break;
    case 'openFolder':
      // The classes of one family, inline under the tab that holds them (CLAUDE.md T7 3.7).
      ui.catalogueFolder = id;
      ui.filters.catalogue = '';
      ui.scrollModalTop = true;
      break;
    case 'dayOneItem': {
      // A line of the day one list opens that thing's own folder, wherever the player is standing
      // in the catalogue. The licence is not a machine: its line opens the tab it lives on
      // (CLAUDE.md T11 3.6).
      ui.filters.catalogue = '';
      ui.sellConfirm = null;
      ui.scrollModalTop = true;
      const spec = findSpec(id);
      ui.catalogueTab = catalogueTabFrom(spec?.tab ?? 'computers');
      ui.catalogueFolder = spec ? id : null;
      break;
    }
    case 'closeFolder':
      ui.catalogueFolder = null;
      ui.filters.catalogue = '';
      ui.scrollModalTop = true;
      break;
    case 'boardTab':
      ui.boardTab = id === 'contracts' ? 'contracts' : 'enquiries';
      ui.scrollModalTop = true;
      break;
    case 'workPlanTab':
      // The folder's two tabs: the jobs, and the standing contracts (CLAUDE.md T20 2.1).
      ui.workPlanTab = workPlanTabFrom(id);
      ui.scrollModalTop = true;
      break;
    case 'openSettings':
      openModal('settings');
      break;
    case 'closeHouseCard':
      ui.houseCardDone = true;
      break;
    case 'setTips':
      dispatch({ type: 'SET_TIPS', on: element.dataset.on === '1' });
      return;
    case 'setSound':
      // The mute, off the same two chips the tips row uses (CLAUDE.md T19 2.10).
      dispatch({ type: 'SET_SOUND', muted: element.dataset.muted === '1' });
      return;
    case 'setVolume':
      // Quieter and Louder each carry where they would put the master (CLAUDE.md T19 2.10).
      dispatch({ type: 'SET_SOUND', volume: Number(element.dataset.volume) });
      return;
    case 'dismissTip':
      dispatch({ type: 'DISMISS_TIP', key: id });
      return;
    case 'takeLoan':
      dispatch({ type: 'TAKE_LOAN', amount: Number(element.dataset.amount ?? '0') });
      return;
    case 'repayLoan': {
      const typed = element.dataset.amount ?? 'all';
      dispatch({ type: 'REPAY_LOAN', amount: typed === 'all' ? null : Number(typed) });
      return;
    }
    case 'setInsurance':
      dispatch({
        type: 'SET_INSURANCE',
        cover: element.dataset.cover === 'liability' ? 'liability' : 'property',
        on: element.dataset.on === '1',
      });
      return;
    case 'acceptContract':
      dispatch({ type: 'ACCEPT_CONTRACT', contractId: id });
      return;
    case 'declineContract':
      dispatch({ type: 'DECLINE_CONTRACT', contractId: id });
      return;
    case 'assignContract':
      dispatch({
        type: 'ASSIGN_CONTRACT',
        contractId: id,
        workerId: element.dataset.worker ?? '',
        on: element.dataset.on === '1',
      });
      return;
    case 'renewContract':
      dispatch({ type: 'RENEW_CONTRACT', contractId: id, accept: element.dataset.accept === '1' });
      return;
    case 'takeContract': {
      // The one click of the Contracts tab: the offer is accepted and the man the card has
      // selected is put on it, in that order (PIOTR; CLAUDE.md T20 2.1.1). The man is asked about
      // first: a click that cannot put him on it would otherwise take the contract and leave it
      // with nobody on it, which is not what the button says.
      const onIt = element.dataset.worker ?? '';
      const check = contractManCheck(game(), onIt);
      if (!check.ok) {
        ui.toast = check.reason;
        requestRender();
        return;
      }
      dispatch({ type: 'ACCEPT_CONTRACT', contractId: id });
      dispatch({ type: 'ASSIGN_CONTRACT', contractId: id, workerId: onIt, on: true });
      return;
    }
    case 'pickContractMan':
      // Which man the offer card is worked out for. He is not on anything: the card is showing
      // the player what it would be like with him on it (CLAUDE.md T20 2.1.1). It breaks and does
      // not return, because nothing is dispatched here and the card has to be drawn again for the
      // new man: the player picks through the men with the clock stopped.
      ui.contractMan = element.dataset.worker ?? null;
      break;
    // A click on a man's tile in Our team opens his card, the same card the hall's figure opens
    // (PIOTR, 20.09; CLAUDE.md T23 2.13). The Assign button of a waiting man opens it too: the
    // list he needs is on the card.
    case 'openPersonCard':
      openPersonCard(id);
      break;
    // The card's Assign: it opens the Work Plan on the job rows, where the Assign chips of
    // Turn 19 are, which is the one list in the game for putting a man on a job. Nothing is
    // dispatched: the click is free and the player makes the choice (CLAUDE.md T19 2.5, T23 2.1).
    case 'openPersonAssign':
      shutModal();
      ui.workPlanTab = 'jobs';
      openModal('workPlan');
      break;
    case 'openOffice':
      shutModal();
      walkTo('office');
      break;
    case 'letGo':
      // The week's notice: he works it out, he is paid for it, and the morning after his last day
      // his jobs and his contracts are short of a man (PIOTR, 18.09; CLAUDE.md T20 2.4).
      dispatch({ type: 'LET_GO', workerId: id });
      return;
    case 'endContract':
      dispatch({ type: 'END_CONTRACT', contractId: id });
      return;
    case 'setSecondShift':
      dispatch({ type: 'SET_SECOND_SHIFT', on: element.dataset.on === '1' });
      return;
    case 'assignShift':
      dispatch({
        type: 'ASSIGN_SHIFT',
        workerId: id,
        shift: element.dataset.shift === 'night' ? 'night' : 'day',
      });
      return;
    case 'takeHoliday':
      dispatch({ type: 'TAKE_HOLIDAY', days: Number(element.dataset.days ?? '5') });
      return;
    case 'setOwnerDraw':
      dispatch({ type: 'SET_OWNER_DRAW', tier: Number(id) });
      return;
    case 'buyJoineryCore':
      dispatch({ type: 'BUY_JOINERY_CORE' });
      return;
    case 'buyJoineryCoreExtension':
      dispatch({ type: 'BUY_JOINERY_CORE_EXTENSION' });
      return;
    case 'setWebsiteLevel':
      dispatch({ type: 'SET_WEBSITE_LEVEL', level: Number(id) });
      return;
    case 'restock':
      // What the player typed into the field, which the button carries (CLAUDE.md T17 2.20).
      dispatch({ type: 'RESTOCK', sheets: Number(element.dataset.sheets ?? '0') });
      return;
    case 'orderForJob':
      dispatch({ type: 'ORDER_FOR_JOB', jobId: id });
      return;
    case 'connectExtraction':
      dispatch({ type: 'CONNECT_EXTRACTION', equipmentId: id });
      return;
    case 'buyGate':
      dispatch({ type: 'BUY_GATE', equipmentId: id });
      return;
    case 'setSecurityLevel':
      dispatch({ type: 'SET_SECURITY_LEVEL', level: Number(id) });
      return;
    case 'accountingTab':
      ui.accountingTab = accountingTabFrom(id);
      ui.scrollModalTop = true;
      break;
    case 'accountingMonth':
      ui.accountingMonth = Number(id);
      ui.openDays = [];
      ui.scrollModalTop = true;
      break;
    case 'toggleDay': {
      const day = Number(id);
      ui.openDays = ui.openDays.includes(day)
        ? ui.openDays.filter((entry) => entry !== day)
        : [...ui.openDays, day];
      break;
    }
    case 'openDaySummary':
      // The evening's own summary, put back in front of him from the books (CLAUDE.md T6 3.9).
      ui.daySummary = Number(id);
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
      if (which === 'daySummary') {
        ui.daySummary = null;
        break;
      }
      // The cross on the drop card is "Keep the job": the card goes and the job stays
      // (CLAUDE.md T21 2.3).
      if (which === 'dropJob') {
        ui.dropConfirm = null;
        break;
      }
      shutModal();
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
    case 'tickTask': {
      // The tick on the laptop's Tasks page. The order he ticks them in is the order they are
      // done in, so a tick goes on the end and a second tick takes it off (T17 2.16).
      ui.tickedTasks = ui.tickedTasks.includes(id)
        ? ui.tickedTasks.filter((entry) => entry !== id)
        : [...ui.tickedTasks, id];
      break;
    }
    case 'doTheseTasks':
      if (ui.tickedTasks.length > 0) {
        dispatch({ type: 'QUEUE_TASKS', taskIds: ui.tickedTasks });
        ui.tickedTasks = [];
      }
      return;
    case 'queueTaskNext':
      // Behind the one he is on, without putting that one down (CLAUDE.md T19 2.12).
      dispatch({ type: 'QUEUE_TASK_NEXT', taskId: id });
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
      shutModal();
      walkTo('hall');
      dispatch({ type: 'WORK_HERE', jobId: id });
      return;
    case 'sawFallback':
      dispatch({ type: 'SET_SAW_FALLBACK', jobId: id, on: element.dataset.on === '1' });
      return;
    case 'dropJob':
      // The first click opens the card that says what it costs; the red button on the card is the
      // second and the only one that drops anything (CLAUDE.md T9 3.9, T21 2.3).
      if (element.dataset.confirm !== '1') {
        ui.dropConfirm = id;
        break;
      }
      ui.dropConfirm = null;
      dispatch({ type: 'DROP_JOB', jobId: id });
      return;
    case 'keepJob':
      ui.dropConfirm = null;
      break;
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
    // The men on a job, and no limit on how many of them (PIOTR, 17.09; CLAUDE.md T19 2.5). Every
    // one of these is a single click: the button that opened the list shuts it again.
    case 'openAssign':
      ui.assignOpen = ui.assignOpen === id ? null : id;
      break;
    case 'closeAssign':
      ui.assignOpen = null;
      break;
    case 'assignAdd':
      ui.assignOpen = null;
      dispatch({ type: 'ADD_TO_JOB', jobId: id, workerId: element.dataset.worker ?? 'owner' });
      return;
    // A man on another job comes here in one click: off that job, on to this one (PIOTR, 18.09).
    case 'assignMove': {
      ui.assignOpen = null;
      const who = element.dataset.worker ?? 'owner';
      const from = element.dataset.from ?? '';
      if (from !== '') dispatch({ type: 'REMOVE_FROM_JOB', jobId: from, workerId: who });
      dispatch({ type: 'ADD_TO_JOB', jobId: id, workerId: who });
      return;
    }
    case 'assignOff':
      dispatch({ type: 'REMOVE_FROM_JOB', jobId: id, workerId: element.dataset.worker ?? '' });
      return;
    // The evening is the owner's: he takes a man's job on himself and the man has it back in the
    // morning (CLAUDE.md T17 2.12).
    case 'takeOverJob':
      dispatch({ type: 'TAKE_OVER_JOB', jobId: id });
      return;
    case 'startCleaning':
      dispatch({ type: 'START_CLEANING' });
      return;
    // The bags, from the chip over the floor and from the extractor's own card: the one question
    // the hall has always asked, who empties them (CLAUDE.md T12 2.3, T17 2.5, 2.6).
    case 'emptyBags':
      dispatch({ type: 'ASK_EMPTY_BAGS' });
      return;
    case 'repairMachine':
      dispatch({ type: 'REPAIR_MACHINE', equipmentId: id });
      return;
    case 'serviceMachine':
      dispatch({ type: 'SERVICE_MACHINE', equipmentId: id });
      return;
    case 'resolveEvent': {
      ui.eventPosition = null;
      const kind = game().activeEvent?.kind;
      dispatch({ type: 'RESOLVE_EVENT', choiceId: id });
      // He has said yes to the move: the clock is run through it, so he is told when it lands.
      if (kind === 'moveConfirm' && id === 'do') {
        ui.toast = moveFinishNote(game());
        requestRender();
      }
      return;
    }
    case 'copyState':
      copyState();
      break;
    case 'saveToFile':
      ui.menuOpen = false;
      saveToFile();
      break;
    case 'loadFromFile': {
      // The picker is the browser's; the file arrives through onFileChosen.
      const picker = root?.querySelector('[data-field="saveFile"]');
      if (picker instanceof HTMLInputElement) picker.click();
      break;
    }
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
          resetWalkers();
          resetDoors();
          startedStore();
          writeStore();
          ui.saved = peekSave();
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
          resetWalkers();
          resetDoors();
        }
        return result.note;
      });
      break;
    default:
      break;
  }
  void point;
  requestRender();
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

/** The browser's own store, written as the game is played so a refreshed page is still the same
 *  company (PIOTR, 14.09; CLAUDE.md T11 3.2). Never more than once a second: the write itself is
 *  the whole state, and a morning of clicks would otherwise write it fifty times. */
export const AUTOSAVE_MIN_MS = 1000;
let storedAt = -Infinity;
let storePending: ReturnType<typeof setTimeout> | null = null;

function writeStore(): void {
  if (state === null) return;
  storedAt = nowMs();
  saveStore.write(encodeSaveFile(state));
}

function autosaveLocal(): void {
  if (state === null) return;
  if (storePending !== null) return;
  const since = nowMs() - storedAt;
  if (since >= AUTOSAVE_MIN_MS || typeof setTimeout !== 'function') {
    writeStore();
    return;
  }
  storePending = setTimeout(() => {
    storePending = null;
    writeStore();
  }, AUTOSAVE_MIN_MS - since);
}

/** The actions that are worth a save of their own: what he bought, who he took on and what he
 *  took off the board (CLAUDE.md T11 3.2). */
const AUTOSAVE_ACTIONS: ReadonlyArray<GameAction['type']> = [
  'BUY_EQUIPMENT',
  'BUY_SOFTWARE',
  'BUY_STOCK',
  'ACCEPT_ENQUIRY',
  'HIRE',
];

/** The two things that are not actions at all: the morning, once the day has settled, and a move
 *  of the hall that has just finished (CLAUDE.md T11 3.2). */
let storedDay = 0;
let wasMoving = false;

/** A game just opened: the watchers start from where it is, so the first minute of it is not
 *  mistaken for a new morning or a finished move. */
function startedStore(): void {
  storedDay = state === null ? 0 : state.clock.day;
  wasMoving = state !== null && movePending(state) !== null;
  storedAt = -Infinity;
}

function autosaveWatch(): void {
  if (state === null) return;
  const moving = movePending(state) !== null;
  const newDay = state.clock.day !== storedDay;
  const moveDone = wasMoving && !moving;
  storedDay = state.clock.day;
  wasMoving = moving;
  if (newDay || moveDone) autosaveLocal();
}

function newSeed(): number {
  // The engine needs a seed from outside: this is the one place a clock reading is allowed.
  return Math.floor(Date.now() % 2147483647);
}

/** The game as a file the browser downloads (PIOTR, 14.09). */
function saveToFile(): void {
  const text = encodeSaveFile(game());
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = saveFileName(game());
  link.click();
  URL.revokeObjectURL(url);
  setNote(`Saved as ${link.download}.`);
  requestRender();
}

/** A chosen save file, read and checked before it replaces the game. */
export function onFileChosen(file: File): Promise<void> {
  return file.text().then((text) => {
    const result = decodeSaveFile(text);
    if (result.state !== null) {
      state = result.state;
      ui.screen = 'game';
      ui.menuOpen = false;
      resetWalkers();
      resetDoors();
      // A file loaded is the game from now on, so the browser's store holds it too (T11 3.2).
      startedStore();
      writeStore();
      ui.saved = peekSave();
    }
    setNote(result.note);
    requestRender();
  });
}

function copyState(): void {
  const clipboard = typeof navigator === 'undefined' ? undefined : navigator.clipboard;
  if (!clipboard) {
    setNote('This browser gives no clipboard access.');
    return;
  }
  void clipboard.writeText(JSON.stringify(game()));
  setNote('State copied as JSON.');
}

/** The one way between the hall and the office: the top bar's button, the office block and its
 *  door in the hall, and the door of the room itself all come through here (CLAUDE.md T14 2.3).
 *  Leaving the hall ends setting it out, and walking out and back in shows the whole hall again
 *  [TUNE: reset or remember; REPORT-T6 says which was chosen]. */
function walkTo(view: 'hall' | 'office'): void {
  ui.view = view;
  if (view !== 'hall') endSetup();
  resetCamera();
  requestRender();
}

/** Walking into a room. The office is a view of its own; the other two are a line under the
 *  hall (CLAUDE.md T6 3.1). */
function handleRoomClick(room: RoomId): void {
  if (room === 'office') {
    walkTo('office');
  } else if (room === 'wc') {
    setNote(roomById('wc').tooltip);
  } else {
    setNote(roomById('canteen').tooltip);
  }
  requestRender();
}

function handleSceneClick(element: DataElement): boolean {
  // In setup mode a click on the kit is a drag, not a question about the bag.
  if (ui.setup) return true;
  // The office door of the hall walks into the office, exactly as the top bar's Office button
  // does and through the same function (PIOTR, 15.09; CLAUDE.md T14 2.3). The team is on the
  // laptop's Office tile.
  if (element.dataset.door === 'office') {
    walkTo('office');
    return true;
  }
  // A click on a man on the hall opens his card: his portrait, his day, what he is on and the
  // two buttons. It is the one way onto it beside his tile in Our team, and it takes the place of
  // nothing, because a figure on the hall answered no click at all before tonight
  // (PIOTR, 20.09; docs/mockups/t23/team-cards.png; CLAUDE.md T23 2.13).
  const man = element.dataset.worker;
  if (man !== undefined) {
    openPersonCard(man);
    requestRender();
    return true;
  }
  if (element.dataset.owner !== undefined) {
    openPersonCard(OWNER);
    requestRender();
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
    if (item === undefined) {
      // The outline of something bought and not here yet: it says when the lorry is due.
      const reserved = reservationById(game(), kit);
      if (reserved !== null) {
        setNote(`On order, due ${formatCalendarDay(reserved.dueDay)} at 08:00.`);
        requestRender();
      }
      return true;
    }
    // A click on a machine opens that machine's own card, with the same buttons the Owned tab
    // calls, and the extractor's carries the hall's bag store (PIOTR, 17.09; CLAUDE.md T17 2.6).
    // Anything that is not a machine keeps its note.
    const category = findSpec(item.specId)?.category;
    // The bench has a card of its own now, because it can be sold like a machine (T19 2.8), and the
    // tool cabinet has one from Turn 22: it is a ladder of five classes, its card says how many
    // men's tools it holds and how many are in use, and it can be turned and sold like anything
    // else on the floor [PIOTR, 19.09: "click it and a modal shows"] (CLAUDE.md T22 2.13). The rest
    // of the storage keeps its note: 2.13 names the cabinet and nothing else.
    if (
      category === 'machine' ||
      category === 'extraction' ||
      category === 'bench' ||
      item.specId === TOOL_CABINET
    ) {
      openMachineCard(item.id);
      requestRender();
      return true;
    }
    if (item.broken) {
      setNote('It has stopped. Nothing runs until it is fixed.');
    } else {
      setNote(`${hoursOfUse(item.hoursUsed)} of use on the clock.`);
    }
    requestRender();
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------

function onClick(event: MouseEvent): void {
  batched(() => runClick(event));
}

function runClick(event: MouseEvent): void {
  const target = event.target;
  if (!(target instanceof Element)) return;
  // The player has clicked something, so the browser will let a sound engine start. Nothing plays
  // before this, ever: that is the rule the browsers themselves enforce and the one the brief
  // sets (CLAUDE.md T19 2.10). After the first click it costs a comparison.
  unlockSound();
  if (state !== null) applySoundSettings(state.settings.sound);
  if (ui.panned) {
    // The pointer travelled: that was the player moving the hall, not pressing what it started on.
    ui.panned = false;
    return;
  }
  const point = { x: event.clientX, y: event.clientY };
  const doer = dataElement(target.closest('[data-do]'));
  // A click anywhere but inside the menu, or on the button that opens it, shuts the menu
  // (PIOTR; CLAUDE.md T13 3.1).
  if (ui.menuOpen && target.closest('.menu-pop') === null && doer?.dataset.do !== 'toggleMenu') {
    ui.menuOpen = false;
    requestRender();
  }
  // A click anywhere but inside the Assign list, or on the button that opens one, shuts it
  // (PIOTR, 18.09: every popover closes by its cross, Escape and a click outside).
  if (
    ui.assignOpen !== null &&
    target.closest('.assign-list') === null &&
    doer?.dataset.do !== 'openAssign'
  ) {
    ui.assignOpen = null;
    requestRender();
  }
  // And the same for the why popover, which the "i" link opens (PIOTR, 18.09).
  if (ui.why !== null && target.closest('.why-pop') === null && doer?.dataset.do !== 'showWhy') {
    ui.why = null;
    requestRender();
  }
  // A click anywhere but inside the drop card, or on the control that opens one, keeps the job:
  // the card is the warning and not the deed (PIOTR, 18.09; CLAUDE.md T21 2.3).
  if (
    ui.dropConfirm !== null &&
    target.closest('[data-modal="dropJob"]') === null &&
    doer?.dataset.do !== 'dropJob'
  ) {
    ui.dropConfirm = null;
    requestRender();
  }
  if (doer) {
    if (doer instanceof HTMLButtonElement && doer.disabled) return;
    handleAction(doer, point);
    return;
  }
  if (state === null) return;
  // The things on the hall a click can land on. The two figure hooks join them tonight, because a
  // click on a man opens his card (PIOTR, 20.09; CLAUDE.md T23 2.13); `data-worker` is the hook
  // the hall has carried on every man since Turn 19 and `data-owner` the one it carries on the
  // boss, so nothing new is drawn for this.
  const scene = dataElement(
    target.closest('[data-van],[data-kit],[data-door],[data-worker],[data-owner]'),
  );
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
  batched(() => runInput(event));
}

function runInput(event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  const filter = target.dataset.filter;
  if (filter !== undefined) {
    ui.filters[filter] = target.value;
    requestRender();
    return;
  }
  const field = target.dataset.field;
  if (field === 'cloudEmail') {
    ui.cloud.email = target.value;
    return;
  }
  if (field === 'showWhy') {
    ui.showWhy = target.checked;
    requestRender();
    return;
  }
  if (field === 'playerName') ui.playerName = target.value;
  if (field === 'companyName') ui.companyName = target.value;
  if (field === 'stockSheets') {
    ui.stockSheets = target.value;
    requestRender();
  }
  if (field === 'loanAmount') {
    ui.loanAmount = target.value;
    requestRender();
  }
  if (field === 'saveFile') {
    const file = target.files?.[0];
    if (file) void onFileChosen(file);
    target.value = '';
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

/** The five running speeds under the hand, `1` to `5` in the order `SPEEDS` has them: x1, x2, x4,
 *  x10, x30. `SPEEDS[0]` is Pause, which has its own key (CLAUDE.md T18 2.8). */
const SPEED_KEYS = ['1', '2', '3', '4', '5'] as const;

/** True while the caret is in a field. A key does nothing at all then: a "1" typed into the stock
 *  box is a number of sheets and not a speed, and a "p" is a letter (CLAUDE.md T18 2.8). */
function typingInAField(): boolean {
  const active = document.activeElement;
  if (active === null) return false;
  const tag = active.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select';
}

/** P stops the clock and starts it again where it was. The same dispatch the Pause knob makes, so
 *  there is one way the speed is ever set (CLAUDE.md T18 2.8). */
function togglePause(): void {
  const current = game().speed;
  if (current !== 0) {
    ui.speedBeforePause = current;
    dispatch({ type: 'SET_SPEED', speed: 0 });
    return;
  }
  dispatch({ type: 'SET_SPEED', speed: ui.speedBeforePause === 0 ? 1 : ui.speedBeforePause });
}

/** What Escape shuts, topmost first: the one open layer nearest the player and nothing under it
 *  (PIOTR, 18.09; CLAUDE.md T20 2.15). One table, so the key, the test and the report read the
 *  same order. The Assign list hangs off the modal under it and goes first; the why bubble is
 *  opened from a modal's body or an event's, never from inside an Assign list, so the two are
 *  never up together; the day summary sits over the modal that opened it; and the Menu is last,
 *  because it is the one popover that is not on the modal layer at all. */
export const ESCAPE_ORDER: ReadonlyArray<{
  /** What the report and the test call it. */
  name: string;
  isOpen: () => boolean;
  shut: () => void;
}> = [
  {
    name: 'assign list',
    isOpen: () => ui.assignOpen !== null,
    shut: () => {
      ui.assignOpen = null;
    },
  },
  {
    name: 'why',
    isOpen: () => ui.why !== null,
    shut: () => {
      ui.why = null;
    },
  },
  {
    name: 'day summary',
    isOpen: () => ui.daySummary !== null,
    shut: () => {
      ui.daySummary = null;
    },
  },
  {
    name: 'drop card',
    isOpen: () => ui.dropConfirm !== null,
    shut: () => {
      ui.dropConfirm = null;
    },
  },
  { name: 'modal', isOpen: () => ui.modal !== null, shut: shutModal },
  {
    name: 'menu',
    isOpen: () => ui.menuOpen,
    shut: () => {
      ui.menuOpen = false;
    },
  },
];

function onKeyDown(event: KeyboardEvent): void {
  batched(() => runKeyDown(event));
}

function runKeyDown(event: KeyboardEvent): void {
  if (event.key === ' ') spaceHeld = true;
  // R turns what is being dragged, or arms the turn for the next thing picked up
  // (PIOTR, CLAUDE.md T10 3.8).
  if (ui.setup && (event.key === 'r' || event.key === 'R')) {
    turnGhost();
    return;
  }
  // The clock under the hand: P stops it and starts it again, 1 to 5 are the top bar's own five
  // running knobs. They do exactly what a click on the knob does, and nothing at all while a
  // field has the caret or before there is a game to run (CLAUDE.md T18 2.8).
  if (state !== null && !typingInAField()) {
    if (event.key === 'p' || event.key === 'P') {
      togglePause();
      return;
    }
    const knob = SPEED_KEYS.indexOf(event.key as (typeof SPEED_KEYS)[number]);
    if (knob >= 0) {
      dispatch({ type: 'SET_SPEED', speed: SPEEDS[knob + 1] ?? 1 });
      return;
    }
  }
  if (event.key !== 'Escape') return;
  // Escape drops whatever is in hand before it closes anything (CLAUDE.md T2 3.10).
  if (ui.drag !== null) {
    ui.drag = null;
    requestRender();
    return;
  }
  // And then the topmost open popover, and only that one, off the one table below.
  for (const layer of ESCAPE_ORDER) {
    if (!layer.isOpen()) continue;
    layer.shut();
    requestRender();
    return;
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
  batched(() => runWheel(event));
}

function runWheel(event: WheelEvent): void {
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
  batched(() => runDoubleClick(event));
}

function runDoubleClick(event: MouseEvent): void {
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
  const kitId = target.closest('[data-kit]')?.getAttribute('data-kit') ?? null;
  if (kitId !== null) {
    const at =
      state.equipment.find((entry) => entry.id === kitId) ?? reservationById(state, kitId);
    const kit = kitOf(state, kitId);
    const spec = kit ? findSpec(kit.specId) : null;
    if (at && spec) {
      return centreOf(at.anchorX, at.anchorY, spec.width, spec.depth, spec.height);
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
  // The left button and no other: the right one belongs to the browser (CLAUDE.md T6 3.3).
  if (state === null || event.button !== 0) return false;
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
  const item =
    state.equipment.find((entry) => entry.id === itemId) ?? reservationById(state, itemId);
  if (item === null || item === undefined) return false;
  const at = cellUnder(event);
  if (at === null) return false;
  // He has hold of it where he took hold of it, not by its corner.
  const offsetX = item.anchorX - at.x;
  const offsetY = item.anchorY - at.y;
  let moved = false;
  // He picks it up the way it is standing, with the armed quarter turn applied to it once, and R
  // turns it from there (CLAUDE.md T10 3.8, T22 2.10). The arming is spent on the pick up, so the
  // next thing he lifts comes up square unless he arms it again.
  const stood: Orientation = 'orientation' in item ? item.orientation : 0;
  ui.rotate = ui.armTurn ? turnedFrom(itemId, stood) : stood;
  ui.armTurn = false;
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
    requestRender();
  };
  const up = (): void => {
    window.removeEventListener('mousemove', move);
    window.removeEventListener('mouseup', up);
    const drag = ui.drag;
    ui.drag = null;
    // A click that never moved is not a move: it leaves the hall exactly as it was. Turning it
    // where it stands is a move, though: the machine has been picked up and put down again
    // (CLAUDE.md T10 3.8).
    const turned = ui.rotate !== stood;
    if (drag === null || (!moved && !turned)) {
      requestRender();
      return;
    }
    dispatch({
      type: 'MOVE_ITEM',
      itemId: drag.itemId,
      x: drag.x,
      y: drag.y,
      orientation: ui.rotate,
    });
  };
  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', up);
  event.preventDefault();
  requestRender();
  return true;
}

/** Modals are dragged by their header (CLAUDE.md 3.9). */
function onPointerDown(event: MouseEvent): void {
  batched(() => runPointerDown(event));
}

function runPointerDown(event: MouseEvent): void {
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
  autosaveWatch();
  requestRender();
  return result.minutesRun;
}

/** The hall's own sound, once a frame and in real time like the figures (CLAUDE.md T19 2.10).
 *  The loops are set to exactly what the hall is running; the one shots are offered every frame
 *  and the engine thins them to one a second each, so x10 and x30 do not rattle. Nothing plays
 *  before the first click, because nothing is unlocked before it. */
function driveSound(now: number): void {
  if (state === null || ui.screen !== 'game') {
    stopAllSounds();
    return;
  }
  applySoundSettings(state.settings.sound);
  // A stopped clock is a stopped workshop: nothing is being cut while the player reads a modal.
  const running = state.speed > 0 && state.activeEvent === null && state.gameOver === null;
  if (!running) {
    stopAllSounds();
    return;
  }
  setLoops(hallLoops(state));
  for (const name of hallOneShots(state)) soundPlay(name, now);
}

function frame(now: number): void {
  // Whatever happens inside, the next frame is asked for. The loop asks for itself at the end of
  // itself, so anything that threw in here used to stop the game dead: no figure moved, no minute
  // ran and no page was written again, for the rest of the session (found by the Turn 19 review,
  // and true since the loop was written).
  try {
    runFrame(now);
  } catch (error) {
    console.error(error);
  }
  requestAnimationFrame(frame);
}

function runFrame(now: number): void {
  const elapsed = Math.min(1000, now - lastFrame);
  lastFrame = now;
  // The figures walk in real time and not in game minutes, so they are moved on before anything
  // else the frame does and whatever the clock is at (CLAUDE.md T9 3.13; T16 2.2): first along
  // the floor, then on to the frame of their animation.
  if (root !== null) {
    stepWalkers(root, now);
    // The doors swing on the renderer's own clock, beside the figures and for the same reason:
    // the page is written again under them and the swing is not game state (CLAUDE.md T19 2.3).
    stepDoors(root, now);
    playCharacters(root, now);
    driveSound(now);
  }
  // One frame, one writing of the page, whatever the clock did inside it: ten game minutes at
  // 10x used to be ten pages (CLAUDE.md T9 3.8, 3.11).
  batched(() => {
    if (state !== null && ui.screen === 'game' && state.gameOver === null) {
      const perSecond = gameMinutesPerRealSecond(state.speed);
      if (perSecond > 0 && state.activeEvent === null) {
        accumulator += (elapsed / 1000) * perSecond;
        const whole = Math.floor(accumulator);
        // Only what the engine actually ran leaves the accumulator: the rest waits for the modal.
        if (whole > 0) accumulator -= advanceMinutes(whole);
      }
    }
  });
}

export function mount(element: HTMLElement): void {
  root = element;
  // A page that has just been opened holds no game and nothing the player has clicked: the only
  // thing it knows is what the browser kept for him (CLAUDE.md T11 3.2).
  ui = freshUi();
  state = null;
  accumulator = 0;
  ui.saved = peekSave();
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

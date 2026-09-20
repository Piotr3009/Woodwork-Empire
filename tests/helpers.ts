// Shared test driver. One place clicks events away, so no test file grows its own copy.

import { WORKER_RATES } from '../src/engine/constants';
// Straight off the modules, not through the public API: these are the engine's own writes, and
// the tests use them to stand kit in the hall without sending the owner out for it.
import { buyEquipment, buySoftware } from '../src/engine/game';
import { hire } from '../src/engine/staff';
import { takeEnquiry } from '../src/engine/jobs';
import type { Orientation, WorkerRole, WorkerTier } from '../src/engine/types';
import {
  applyAction,
  bagStore,
  createGame,
  enduranceHoursFor,
  findSpec,
  isOvertime,
  runMinutes,
  tick,
  unconnectedMachines,
} from '../src/engine/index';
import { connectExtraction } from '../src/engine/pipes';
import type {
  Enquiry,
  Equipment,
  GameAction,
  GameEvent,
  GameState,
  Job,
  NewGameOptions,
  TaskInstance,
} from '../src/engine/index';

export const DEFAULT_OPTIONS: NewGameOptions = {
  seed: 20260911,
  difficulty: 'easy',
  playerName: 'Piotr',
  companyName: 'Woodwork Empire',
  showWhy: true,
};

export function newGame(options: Partial<NewGameOptions> = {}): GameState {
  // The clock runs from the first line of every test: nothing the player buys, orders or pays
  // for happens in stopped time, and a test about a stopped clock stops it itself (T7 3.10).
  return applyAction(createGame({ ...DEFAULT_OPTIONS, ...options }), {
    type: 'SET_SPEED',
    speed: 1,
  });
}

export interface Run {
  state: GameState;
  events: GameEvent[];
}

/** Clicks the first choice of every open event and keeps the ones it saw. */
export function clearEvents(state: GameState, seen: GameEvent[] = []): GameState {
  let next = state;
  let guard = 0;
  while (next.activeEvent && guard < 500) {
    seen.push(next.activeEvent);
    const choice = next.activeEvent.choices[0];
    next = applyAction(next, { type: 'RESOLVE_EVENT', choiceId: choice ? choice.id : 'ok' });
    guard += 1;
  }
  return next;
}

/** Runs the clock, taking the dinner hour whenever the day offers it: the break is not a decision
 *  any test but the break's own is about. Anything else the day asks stops the run, the way it
 *  stops the player (CLAUDE.md T6 3.4). */
export function runClock(state: GameState, minutes: number): GameState {
  let next = state;
  let left = minutes;
  let guard = 0;
  while (left > 0 && guard < 200) {
    guard += 1;
    const result = runMinutes(next, left);
    next = result.state;
    left -= result.minutesRun;
    if (left <= 0) break;
    if (next.activeEvent?.kind !== 'breakTime') break;
    next = applyAction(next, { type: 'RESOLVE_EVENT', choiceId: 'take' });
  }
  return next;
}

/** Answers an open event with a named choice. */
export function choose(state: GameState, choiceId: string): GameState {
  return applyAction(state, { type: 'RESOLVE_EVENT', choiceId });
}

export function act(state: GameState, action: GameAction): GameState {
  return applyAction(state, action);
}

/** Says yes to an enquiry and takes the client's number at the budget: the two clicks a job costs
 *  now, for a test that wants the job and is not about the answer (CLAUDE.md T13 3.24). The
 *  offer is set to the budget first so the old round prices hold, and the job is booked through
 *  the engine's own write, so an event already on the screen stays where it is. A test that is
 *  about the client's number dispatches `ACCEPT_ENQUIRY` itself. */
export function acceptNow(state: GameState, enquiryId: string, byHand = false): GameState {
  const next = copyOf(state);
  const enquiry = next.enquiries.find((entry) => entry.id === enquiryId);
  if (enquiry && enquiry.offer === null) enquiry.offer = enquiry.price;
  takeEnquiry(next, enquiryId, byHand);
  return settled(next);
}

/** Every machine in the hall that wants a pipe gets one, the way a careful owner clicks Connect
 *  on each card, for a test that is about something else (CLAUDE.md T13 3.19). The pipe is paid
 *  for like every purchase, out of the cash. */
export function connectAll(state: GameState): GameState {
  const next = copyOf(state);
  for (const item of unconnectedMachines(next)) connectExtraction(next, item.id);
  return settled(next);
}

/** One step of a driven day: run the clock, and once the owner has his day in, do what a player
 *  does and go home. The clock reads past the work by the length of the break, so the test driver
 *  asks the engine whether the work is done rather than reading the hands. */
function step(state: GameState, events: GameEvent[]): GameState {
  const next = clearEvents(tick(state, 60), events);
  if (isOvertime(next.clock.minute) && next.activeEvent === null && !next.owner.wentHome) {
    return clearEvents(applyAction(next, { type: 'END_DAY' }), events);
  }
  return next;
}

/** Plays to the start of the next day the way a player does: work, then home at five. */
export function nextDay(state: GameState, events: GameEvent[] = []): GameState {
  let next = clearEvents(state, events);
  const day = next.clock.day;
  let guard = 0;
  while (next.clock.day === day && !next.gameOver && guard < 200) {
    next = step(next, events);
    guard += 1;
  }
  return next;
}

/** Runs whole days, answering every event with its first choice. */
export function runDays(state: GameState, days: number): Run {
  const events: GameEvent[] = [];
  let next = clearEvents(state, events);
  const target = next.clock.day + days;
  let guard = 0;
  while (next.clock.day < target && !next.gameOver && guard < days * 40 + 200) {
    next = step(next, events);
    guard += 1;
  }
  return { state: next, events };
}

/** Runs until the given absolute day starts, or the game ends. */
export function runToDay(state: GameState, day: number): Run {
  const events: GameEvent[] = [];
  let next = clearEvents(state, events);
  let guard = 0;
  while (next.clock.day < day && !next.gameOver && guard < 20000) {
    next = step(next, events);
    guard += 1;
  }
  return { state: next, events };
}

/** Runs the clock, answering whatever the day throws up with its first choice, until the first
 *  job on the books has reached this stage. The client rings while the work goes on now, so a
 *  plain tick of the right number of minutes no longer finishes a job (CLAUDE.md T4 3.3). */
export function runToStage(state: GameState, stage: Job['stage'], most = 2000): GameState {
  let next = clearEvents(state);
  let guard = 0;
  while (next.jobs[0] !== undefined && next.jobs[0].stage !== stage && guard < most) {
    next = clearEvents(tick(next, 1));
    if (next.gameOver) break;
    guard += 1;
  }
  return next;
}

export function eventsOfKind(events: GameEvent[], kind: GameEvent['kind']): GameEvent[] {
  return events.filter((event) => event.kind === kind);
}

/** The day 1 shopping list from CLAUDE.md 15.3. */
export const STARTING_KIT = [
  'desk',
  'chair',
  'laptop',
  'tableSaw',
  'toolCabinet',
  'edgebander',
  'compressor',
  'extractor',
  'workbench',
  'sheetRack',
];

/** The class of each family the day 1 shopping buys. The bench, the rack and the edgebander are
 *  the budget ones, which are the Turn 1 items those families now hold as a class and whose
 *  factors are all 1.0 (CLAUDE.md T7 3.6). The saw is the used one at 1800, which is what the
 *  catalogue offers first; a test about the labour figures of CLAUDE.md 8.5 asks for the budget
 *  saw, which is the baseline those figures describe. */
export const STARTING_CLASS: Record<string, string> = {
  workbench: 'budget',
  sheetRack: 'budget',
  edgebander: 'budget',
};

/** A copy of the state, so a helper that writes to the engine's own functions leaves the caller's
 *  state alone, the way `applyAction` does. */
function copyOf(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

/** Lets the engine tidy up after a helper wrote to it: locks, stations and the rest of what
 *  `applyAction` does once the action itself is over. Setting the speed it is already on is the
 *  one action that changes nothing. */
function settled(state: GameState): GameState {
  return applyAction(state, { type: 'SET_SPEED', speed: state.speed });
}

/** Buys the way the shop books it once the owner is back, with no trip out. The trip is the rule
 *  of CLAUDE.md T7 3.10 and it has its own tests and its own scenarios; a test that only wants
 *  the saw standing in the hall should not have to spend an hour of the owner's day on it. */
export function buyNow(state: GameState, specId: string, variantId?: string): GameState {
  const next = copyOf(state);
  buyEquipment(next, specId, variantId);
  return settled(next);
}

/** The same short cut for the management software. */
export function softwareNow(state: GameState, mode: 'oneOff' | 'subscription'): GameState {
  const next = copyOf(state);
  buySoftware(next, mode);
  return settled(next);
}

/** And for taking somebody on, without the interview. */
export function hireNow(
  state: GameState,
  role: WorkerRole,
  tier: WorkerTier | null,
): GameState {
  const next = copyOf(state);
  hire(next, role, tier);
  return settled(next);
}

export function buyStartingKit(
  state: GameState,
  options: { sawVariant?: string } = {},
): GameState {
  let next = state;
  for (const specId of STARTING_KIT) {
    next = buyNow(
      next,
      specId,
      specId === 'tableSaw' ? options.sawVariant : STARTING_CLASS[specId],
    );
  }
  // The saw is on the extraction, the way the player clicks it (CLAUDE.md T13 3.19).
  return connectAll(softwareNow(next, 'oneOff'));
}

/** Stands a machine in the hall without paying for it or looking for a free tile, for tests that
 *  only need it to be there (CLAUDE.md T3 3.5 gave every item a variant). */
export function placeEquipment(
  state: GameState,
  specId: string,
  options: {
    variantId?: string;
    x?: number;
    y?: number;
    id?: string;
    orientation?: Orientation;
  } = {},
): Equipment {
  const spec = findSpec(specId);
  if (!spec) throw new Error(`unknown equipment: ${specId}`);
  const variantId = options.variantId ?? spec.variants[0]?.id ?? 'standard';
  const variant = spec.variants.find((entry) => entry.id === variantId);
  const item: Equipment = {
    id: options.id ?? `kit-${specId}-${state.equipment.length + 1}`,
    specId,
    variantId,
    spriteKey: spec.spriteKey,
    anchorX: options.x ?? 0,
    anchorY: options.y ?? 0,
    broken: false,
    serviceHours: 0,
    serviceCount: 0,
    inServiceUntilDay: null,
    hoursThisWeek: 0,
    hoursThisMonth: 0,
    enduranceHours: enduranceHoursFor(specId, variantId),
    hoursUsed: 0,
    takenBy: null,
    purchasePrice: variant ? variant.price : spec.price,
    soldOnDay: null,
    compressorId: null,
    orientation: options.orientation ?? 0,
  };
  state.equipment.push(item);
  // Connected without charge: a test that stands a machine in the hall for nothing wants it on
  // the extraction for nothing too, and the pipe rule has its own tests (CLAUDE.md T13 3.19).
  for (const machine of unconnectedMachines(state)) {
    const fan = state.equipment.find(
      (entry) => entry.specId === 'extractor' && entry.soldOnDay === null,
    );
    if (!fan) break;
    state.pipes.push({
      id: `pipe-${machine.id}`,
      equipmentId: machine.id,
      extractorId: fan.id,
      tiles: [],
      metres: Math.abs(machine.anchorX - fan.anchorX) + Math.abs(machine.anchorY - fan.anchorY),
    });
  }
  return item;
}

/** Extraction enough for whatever this hall is running, for a test that is about something else.
 *  A used or budget extractor pulls 1,000 m3/h and the sums leave a fifth of it spare, so a
 *  budget saw at 900 is already short of it and a standard one at 1,100 more so (PIOTR's tables,
 *  CLAUDE.md T10 3.1). A test about the earned rate, the minutes of a job or the queue at the saw
 *  should not be measuring the under extraction penalty by accident: it stands a big enough fan
 *  in the hall here, and the tests that are about the sums ask for too small a one on purpose. */
export function withExtraction(state: GameState, variantId = 'industrial'): GameState {
  placeEquipment(state, 'extractor', { variantId, x: 19, y: 0, id: `kit-extraction-${variantId}` });
  return state;
}

/** Air enough for whatever this hall is running, for a test that is about something else. The
 *  compressor the day 1 shopping buys is the used class at 150 l/min, which holds a couple of men
 *  at their benches and not one doing pneumatic sanding beside them (PIOTR's tables, CLAUDE.md
 *  T10 3.2). A test about the saws should not be measuring the low air penalty by accident. */
export function withAir(state: GameState, variantId = 'pro'): GameState {
  // The men at the benches draw on the first compressor in the hall, so a bigger second one
  // beside it would help nobody: the one they are on is the one that has to be big enough.
  const first = state.equipment.find((item) => item.specId === 'compressor');
  if (first) {
    first.variantId = variantId;
    first.enduranceHours = enduranceHoursFor('compressor', variantId);
    return state;
  }
  placeEquipment(state, 'compressor', { variantId, x: 19, y: 4, id: `kit-air-${variantId}` });
  return state;
}

/** Dry air for the whole hall: an air dryer on the first compressor, for a test that stands a CNC
 *  in the hall and is not about the dryer (CLAUDE.md T10 3.3). A CNC will not run on wet air at
 *  all, and the test that is about that rule leaves the dryer out on purpose. */
export function withDryAir(state: GameState): GameState {
  placeEquipment(state, 'airDryer', { x: 19, y: 2, id: 'kit-dryer' });
  return state;
}

/** Fills the hall's bags to the brim, so a test can start from a stopped workshop without
 *  running the saw for a month (CLAUDE.md T12 2.3). */
export function fillBags(state: GameState): GameState {
  state.bagFillM3 = bagStore(state).capacityM3;
  return state;
}

/** Puts sheets on the rack, so a job pushed straight to the bench has material to work with. */
export function fillRack(state: GameState, sheets = 20): GameState {
  state.stock.sheets = sheets;
  return state;
}

/** Puts an exact enquiry on the board, so a test can work with round numbers. */
export function placeEnquiry(state: GameState, partial: Partial<Enquiry> = {}): Enquiry {
  const price = partial.price ?? 400;
  const enquiry: Enquiry = {
    id: `enq-fixed-${state.enquiries.length + 1}`,
    templateId: 'garageShelves',
    name: 'Garage shelves',
    sizeMultiplier: 1,
    price,
    basePrice: price,
    kind: 'residential',
    budget: price,
    offer: null,
    finish: 'laminate',
    materialKind: 'sheet',
    deadlineDays: 15,
    express: false,
    bespokeMaterial: false,
    needsMeasure: false,
    createdDay: state.clock.day,
    expiresOnDay: state.clock.day + 2,
    lockReason: null,
    byHandAvailable: false,
    unreachable: false,
    blockReason: '',
    blockWhere: '',
    ...partial,
  };
  state.enquiries.push(enquiry);
  return enquiry;
}

/** Starts the named open task and runs the clock until it is done. */
export function doTask(state: GameState, kind: TaskInstance['kind']): GameState {
  const task = state.tasks.find((entry) => entry.kind === kind && !entry.done);
  if (!task) throw new Error(`no open task of kind ${kind}`);
  let next = applyAction(state, { type: 'START_TASK', taskId: task.id });
  if (next.owner.currentTaskId !== task.id) throw new Error(`could not start ${kind}`);
  let guard = 0;
  while (next.owner.currentTaskId === task.id && guard < 2000) {
    next = runClock(next, 1);
    guard += 1;
  }
  return next;
}

/** Answers every open email, the way an owner who cares about the rating would. */
export function doAllEmails(state: GameState): GameState {
  let next = state;
  let guard = 0;
  while (next.tasks.some((task) => task.kind === 'emails' && !task.done) && guard < 20) {
    next = doTask(next, 'emails');
    guard += 1;
  }
  return next;
}

/** The one job on the books, for tests that work with a single order. */
export function firstJob(state: GameState): Job {
  const job = state.jobs[0];
  if (!job) throw new Error('no job on the books');
  return job;
}

/** A desk, a laptop and a one off licence: the minimum to be allowed to draw. */
export function withLicence(state: GameState): GameState {
  return softwareNow(buyNow(buyNow(state, 'desk'), 'laptop'), 'oneOff');
}

/** A crew of six joiners with no experience, each at his own bench and his own job of sheet work, behind the
 *  number of saws the caller asks for. Piotr's claim of CLAUDE.md T7 3.1 in one hall: a machine
 *  serves one man at a time, so six men behind one saw stand at it. The office is not in the way
 *  here, because the queue at the saw is what the month is about: the jobs are drawn and ready
 *  and the rack is full. */
export function sixJoinersOnSheetWork(
  options: { saws?: number; price?: number; sawVariant?: string } = {},
): GameState {
  const sawVariant = options.sawVariant ?? 'standard';
  const state = withAir(
    withExtraction(
      fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' }), { sawVariant }), 400),
    ),
  );
  for (let bench = 1; bench < CREW; bench += 1) {
    placeEquipment(state, 'workbench', { variantId: 'budget', x: 4 + bench * 2, y: 6 });
  }
  for (let extra = 1; extra < (options.saws ?? 2); extra += 1) {
    placeEquipment(state, 'tableSaw', {
      variantId: sawVariant,
      x: 2 + extra * 4,
      y: 1,
      id: `kit-saw-${extra + 1}`,
    });
  }
  state.enquiries = [];
  let next = state;
  // Six jobs of different sizes, because six of the same size started in the same minute would
  // reach the saw in the same minute all month and the hall would be a lock step and not a
  // workshop. A real book of work is never in step.
  for (let man = 0; man < CREW; man += 1) {
    const price = (options.price ?? 6000) + man * (options.price ?? 6000) * 0.2;
    const enquiry = placeEnquiry(next, { price, deadlineDays: 40 });
    next = acceptNow(next, enquiry.id);
  }
  // Six jobs at six different points of their making, which is what a workshop with a book of
  // work looks like on any given morning. Six jobs started in the same minute would reach the
  // saw in the same minute all month, and the month would be about that and not about the saws.
  next.jobs.forEach((job, index) => {
    job.stage = 'ready';
    job.labourRemaining = job.labourValue * (1 - index / CREW);
  });
  for (let man = 0; man < CREW; man += 1) {
    next.workers.push({
      id: `staff-${man + 1}`,
      name: `Joiner ${man + 1}`,
      role: 'joiner',
      tier: 'novice',
      rate: WORKER_RATES.novice,
      monthlyWage: 1950,
      leavesOnDay: null,
      startDay: 1,
      jobId: null,
      taskId: null,
      minutesWorked: 0,
      ordersToday: 0,
    overtimeMinutes: 0,
    overtimeMinutesWeek: 0,
    overtimeDays: 0,
    tiredOfOvertime: false,
      station: 'idle',
      productionMinutes: 0,
      absentDaysRemaining: 0,
      shift: 'day',
      dayLog: [],
      monthMinutes: 0,
      monthDaysOff: 0,
      anchorX: 4 + man * 2,
      anchorY: 6,
    });
  }
  for (let man = 0; man < CREW; man += 1) {
    const job = next.jobs[man];
    if (!job) throw new Error('a job each is wanted here');
    next = act(next, { type: 'ASSIGN_JOB', jobId: job.id, workerId: `staff-${man + 1}` });
  }
  return next;
}

/** The crew Piotr's saw question is asked about (CLAUDE.md T7 3.1). */
export const CREW = 6;

/** Two men producing in the same minutes: the owner at one bench and a joiner with no experience at another,
 *  each on a job of sheet work. The one place a two man minute is set up, so the tests that ask
 *  what two men do to the books and to the machines both drive the same hall. */
export function twoMenOnSheetWork(
  options: { sawVariant?: string; saws?: number } = {},
): GameState {
  const state = withAir(
    withExtraction(
      fillRack(
        buyStartingKit(newGame({ difficulty: 'veryEasy' }), {
          sawVariant: options.sawVariant ?? 'standard',
        }),
        60,
      ),
    ),
  );
  placeEquipment(state, 'workbench', { x: 6, y: 6 });
  // A saw each by default: one machine takes one man at a time, so with one saw between them the
  // second would stand and wait, and this helper would be about the queue and not about two men
  // producing. A test about the queue asks for one saw (CLAUDE.md T7 3.1).
  for (let extra = 1; extra < (options.saws ?? 2); extra += 1) {
    placeEquipment(state, 'tableSaw', {
      variantId: options.sawVariant ?? 'standard',
      x: 10,
      y: 1,
      id: `kit-saw-${extra + 1}`,
    });
  }
  state.enquiries = [];
  const first = placeEnquiry(state, { price: 40000, deadlineDays: 90 });
  const second = placeEnquiry(state, { price: 40000, deadlineDays: 90 });
  let next = acceptNow(state, first.id);
  next = acceptNow(next, second.id);
  for (const job of next.jobs) job.stage = 'ready';
  next.workers.push({
    id: 'staff-1',
    name: 'Ben',
    role: 'joiner',
    tier: 'novice',
    rate: WORKER_RATES.novice,
    monthlyWage: 1950,
    leavesOnDay: null,
    startDay: 1,
    jobId: null,
    taskId: null,
    minutesWorked: 0,
    ordersToday: 0,
    overtimeMinutes: 0,
    overtimeMinutesWeek: 0,
    overtimeDays: 0,
    tiredOfOvertime: false,
    station: 'idle',
    productionMinutes: 0,
    absentDaysRemaining: 0,
    shift: 'day',
    dayLog: [],
    monthMinutes: 0,
    monthDaysOff: 0,
    anchorX: 0,
    anchorY: 4,
  });
  const ownerJob = next.jobs[0];
  const joinerJob = next.jobs[1];
  if (!ownerJob || !joinerJob) throw new Error('two jobs are wanted here');
  next = act(next, { type: 'ASSIGN_JOB', jobId: joinerJob.id, workerId: 'staff-1' });
  return act(next, { type: 'WORK_HERE', jobId: ownerJob.id });
}

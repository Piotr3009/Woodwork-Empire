// The one top bar every view shares: a machine cabinet in the darkest green of the workshop, with
// the money on a name plate, the clock and the knobs beside it, the boss's day in the middle and
// the push buttons on the right (CLAUDE.md T11 3.1). Nothing else lives here.

import {
  DAY_CATEGORIES,
  DAY_CATEGORY_LABELS,
  DAY_END_MINUTE,
  OVERTIME_END_MINUTE,
  OWNER_IDLE_REASONS,
  SPEEDS,
} from '../engine/constants';
import {
  booksBehind,
  dayMinutesByCategory,
  findTask,
  formatDate,
  has,
  isBreak,
  netOf,
  ownerIsAvailable,
  ownerJob,
  shoppingList,
  skippedTask,
  paceLines,
  workshopEfficiency,
  workshopOutputToday,
} from '../engine/index';
import type { DayCategory, GameState, Speed } from '../engine/index';
import { openJobs } from '../engine/jobs';
import { cadenceControl } from './dayEnd';
import { closeButton, escapeHtml, minutes, money, signedFigure, signedMoney } from './modal';

/** The five speed knobs. One place builds them, whatever else the top bar has to say. The Pause
 *  knob pulses once when the player asks for something stopped time will not give him
 *  (CLAUDE.md T7 3.10). */
function speedChips(state: GameState, pulse: boolean): string {
  return SPEEDS.map((speed) => {
    const label = speed === 0 ? 'Pause' : `${speed}x`;
    const active = state.speed === speed ? ' is-on' : '';
    const beat = speed === 0 && pulse ? ' is-pulse' : '';
    return (
      `<button class="chip knob${active}${beat}" data-do="setSpeed" data-speed="${speed}">` +
      `${escapeHtml(label)}</button>`
    );
  }).join('');
}

function speedButtons(state: GameState, pulse: boolean): string {
  // The clock is being run for the player, through the trip he is out on or through the move of
  // the hall he asked for: the speed is not his until it is over (CLAUDE.md T8 3.3, 3.4). This is
  // the one thing that ever takes the clock off him; the Turn 4 forced 4x of a move is this.
  if (skippedTask(state) !== null) {
    return '<span class="reason">Skipping ahead</span>';
  }
  // At dinner. The speeds stay as they are, so the player can run the clock through it.
  const dinner = isBreak(state.clock.minute)
    ? `<span class="reason">${state.owner.breakSkipped ? 'Working through' : 'Break'}</span>`
    : '';
  return dinner + speedChips(state, pulse);
}

/** The workshop's average output today, always on the bar: what a minute of production has been
 *  worth on average, the hall, every man, his manager and the class of machine at his stage in
 *  it (PIOTR, 21.09: one Output number, not one for the boss and one for the hall; v40). Red
 *  under 1, green over it, as every signed figure is. The boss's own multiplier, the overtime and
 *  the dinner he worked through, is his own minutes' and lives in the day meter's tip. */
function outputChip(state: GameState): string {
  const output = workshopOutputToday(state);
  const tone = output < 1 ? ' warn' : output > 1 ? ' good' : '';
  return (
    `<span class="output${tone}" data-output="today" ` +
    'title="Workshop output today: what a minute of production has been worth on average, everybody and every machine in it">' +
    `Output ${output.toFixed(2)}</span>`
  );
}

/** The boss's own multiplier, when he is paying for something: the overtime this week, or a
 *  dinner he worked through (CLAUDE.md T6 3.4). One row in the day meter's tip, so it is not a
 *  second Output on the bar (v40). */
function ownerFactorRow(state: GameState): string {
  const factor = state.owner.labourFactor;
  if (factor >= 1) return '';
  return (
    '<span class="tip-row" data-own-factor="1">' +
    '<span class="tip-key seg-idle"></span>' +
    '<span class="tip-name">Your own minutes, overtime and dinner</span>' +
    `<span class="tip-min warn">×${factor.toFixed(2)}</span></span>`
  );
}

/** The cream plate on the left: what is in the bank, and what today has come to under it. */
function namePlate(state: GameState): string {
  const net = netOf(state.finance.day);
  const blind = booksBehind(state);
  const netClass = blind ? 'flat' : net > 0 ? 'good' : net < 0 ? 'bad' : 'flat';
  // Books behind, so nobody knows what today came to (CLAUDE.md T2 3.5). The figure is the sum
  // of the day's ledger lines, signed the one way every signed pound is (T13 3.1, 10.2).
  const netText = blind ? '? today' : `${signedMoney(net)} today`;
  return (
    '<div class="name-plate">' +
    `<span class="cash">${money(state.cash)}</span>` +
    `<span class="net ${netClass}" title="${blind ? 'The books are behind' : 'Today'}">` +
    `${escapeHtml(netText)}</span>` +
    '</div>'
  );
}

/** Workshop efficiency, one live number next to the clock, and behind a click on it the plate
 *  with the four lines of what is pulling it down, each a share of the lost minutes (PIOTR;
 *  CLAUDE.md T13 3.5). A details element, so the click needs no handler and the plate keeps its
 *  state through the minute (the patch leaves a details' open attribute alone). The engine hands
 *  the number and the lines; this prints them. */
function efficiencyBlock(state: GameState): string {
  const efficiency = workshopEfficiency(state);
  const lines = efficiency.lines
    .map(
      (line) =>
        `<span class="efficiency-line" data-cause="${line.id}">` +
        `<span class="tip-name">${escapeHtml(line.label)}</span>` +
        `<span class="tip-min">${line.percent}%</span></span>`,
    )
    .join('');
  // Under the lost minutes, what the machines buy the hall: one line a family whose pace is not
  // 1.00, `Saw, industrial` and `+12%` (CLAUDE.md T25 2.4).
  const paces = paceLines(state)
    .map(
      (line) =>
        `<span class="efficiency-line" data-pace="${line.family}">` +
        `<span class="tip-name">${escapeHtml(line.label)}</span>` +
        `<span class="tip-min">${signedFigure(`${line.percent > 0 ? '+' : ''}${line.percent}%`, line.percent)}</span></span>`,
    )
    .join('');
  return (
    `<details class="efficiency" data-efficiency="${efficiency.percent}">` +
    '<summary class="efficiency-number" ' +
    'title="Production minutes worked, of the minutes the workshop could have worked">' +
    `Efficiency ${efficiency.percent}%</summary>` +
    '<div class="efficiency-plate">' +
    `<p class="hint">${minutes(efficiency.worked)} worked of ${minutes(efficiency.possible)}, ` +
    `${minutes(efficiency.lost)} lost</p>` +
    lines +
    paces +
    '</div></details>'
  );
}

/** The lamp over the meter: orange while he is on something, green while he is in and idle, grey
 *  while he is out or gone home (CLAUDE.md T11 3.1). */
function ownerLamp(state: GameState): string {
  if (!ownerIsAvailable(state)) return 'is-away';
  if (state.owner.currentTaskId !== null || ownerJob(state) !== null) return 'is-busy';
  return 'is-idle';
}

/** What he is doing, in the words the meter says it in. One line, whatever the day is like. The
 *  Our team page asks it of him too, so the owner's row and his meter say the same thing
 *  (CLAUDE.md T17 2.9). */
export function ownerDayLine(state: GameState): string {
  const owner = state.owner;
  if (!owner.present) return 'not in today';
  if (owner.wentHome) return 'gone home';
  if (isBreak(state.clock.minute) && !owner.breakSkipped) return 'at dinner';
  if (owner.currentTaskId !== null) {
    const task = findTask(state, owner.currentTaskId);
    if (task !== null && !task.done) {
      return `${task.label}, ${Math.max(0, Math.ceil(task.minutesRemaining))} min left`;
    }
  }
  const job = ownerJob(state);
  if (job !== null) return `at the bench, ${job.name}`;
  return 'idle';
}

/** The minutes of the day so far, per band, as a lookup the bar and its tooltip both read. */
function minutesPerBand(state: GameState): Map<DayCategory, number> {
  const found = new Map<DayCategory, number>();
  for (const part of dayMinutesByCategory(state.owner.dayLog)) {
    found.set(part.category, part.minutes);
  }
  return found;
}

/** The day itself, in bands: the last minutes of it are the evening's, in the overtime colour.
 *  The day log is written in the order the minutes happened, so the overtime is the tail of it,
 *  and an entry the evening began in the middle of is cut in two (CLAUDE.md T17 2.13). */
function bands(state: GameState): Array<{ band: string; minutes: number }> {
  const log = state.owner.dayLog.map((entry) => ({ band: String(entry.category), minutes: entry.minutes }));
  let evening = Math.min(state.owner.overtimeMinutes, dayMeterTotal(state) - DAY_END_MINUTE);
  for (let at = log.length - 1; at >= 0 && evening > 0; at -= 1) {
    const entry = log[at];
    if (entry === undefined) continue;
    const taken = Math.min(entry.minutes, evening);
    evening -= taken;
    if (taken >= entry.minutes) {
      entry.band = 'overtime';
      continue;
    }
    entry.minutes -= taken;
    log.splice(at + 1, 0, { band: 'overtime', minutes: taken });
  }
  return log;
}

/** The day itself: the 540 minutes of it, and the evening beyond them once it runs, painted in
 *  the order they happened, and then one grey run for the minutes he stood. The break is still
 *  unpainted (CLAUDE.md T11 3.1, T17 2.13, T21 2.8).
 *
 *  The grey goes between the worked colours and the empty rest, which is where the section puts it
 *  and the only place it can go: the day log is the day in the order the minutes happened and the
 *  minutes he stood are not in it, so there is nowhere in the run of bands to put them. A band of
 *  their own in the log would be a new `DayCategory`, which is a frozen file and a bigger change than
 *  the drawing asks for (docs/notes-t21-b2.md). */
function segmentBar(state: GameState, total: number): string {
  const runs = bands(state);
  const idle = Math.max(0, state.owner.idleMinutes);
  if (idle > 0) runs.push({ band: 'idle', minutes: idle });
  const segments = runs
    .map((entry) => {
      const width = (entry.minutes / total) * 100;
      return (
        `<span class="seg seg-${entry.band}" data-band="${entry.band}" ` +
        `style="width:${width.toFixed(4)}%"></span>`
      );
    })
    .join('');
  return `<div class="day-bar">${segments}</div>`;
}

/** The legend, on a small cream plate, with what each band has come to so far, and under it the
 *  four reasons he stood with their minutes. It is behind the pointer, so the bar itself carries no
 *  legend under it, and it is one plate and not two: the grey run is a run of the same bar and the
 *  plate behind the pointer is the same plate (CLAUDE.md T11 3.1, T21 2.8). */
function segmentTooltip(state: GameState): string {
  const found = minutesPerBand(state);
  const worked = DAY_CATEGORIES.map((category) => {
    const minutes = found.get(category) ?? 0;
    return (
      `<span class="tip-row" data-band="${category}">` +
      `<span class="tip-key seg-${category}"></span>` +
      `<span class="tip-name">${escapeHtml(DAY_CATEGORY_LABELS[category])}</span>` +
      `<span class="tip-min">${minutes} min</span></span>`
    );
  }).join('');
  const stood = OWNER_IDLE_REASONS.map((reason) => {
    const minutes = state.owner.idleByReason[reason.id] ?? 0;
    return (
      `<span class="tip-row" data-idle="${reason.id}">` +
      '<span class="tip-key seg-idle"></span>' +
      `<span class="tip-name">${escapeHtml(reason.label)}</span>` +
      `<span class="tip-min">${minutes} min</span></span>`
    );
  }).join('');
  return `<div class="day-tip">${worked}${stood}${ownerFactorRow(state)}</div>`;
}

/** How long the bar is: the working day on the clock, 08:00 to 17:00, and the evening on the end
 *  of it as it is worked, up to 19:00 when the tools go down (PIOTR, 17.09; CLAUDE.md T17 2.13).
 *  The figure beside the bar is read off the same number, so the two agree. */
function dayMeterTotal(state: GameState): number {
  const evening = Math.min(
    Math.max(0, state.owner.overtimeMinutes),
    OVERTIME_END_MINUTE - DAY_END_MINUTE,
  );
  return DAY_END_MINUTE + evening;
}

/** The boss's day, which is the middle of the bar and the point of it: a lamp, what he is on, how
 *  much of his day has gone, and the day itself in bands (CLAUDE.md T11 3.1). */
function dayMeter(state: GameState): string {
  const available = dayMeterTotal(state);
  const total = Math.max(available, 1);
  return (
    '<div class="day-meter" data-day-meter="1">' +
    '<div class="day-head">' +
    `<span class="lamp ${ownerLamp(state)}"></span>` +
    `<span class="day-line">${escapeHtml(state.playerName)}'s day · ` +
    `${escapeHtml(ownerDayLine(state))}</span>` +
    outputChip(state) +
    `<span class="day-count">${state.owner.minutesWorked} worked \u00b7 ` +
    `${state.owner.idleMinutes} idle \u00b7 ${available}</span>` +
    '</div>' +
    segmentBar(state, total) +
    segmentTooltip(state) +
    '</div>'
  );
}

/** A push button of the right hand block: a cream plate with a hard shadow, orange when there is
 *  something on it the player has not seen (CLAUDE.md T11 3.1). */
function pushButton(action: string, label: string, extra: string, fresh: boolean): string {
  return (
    `<button class="push${fresh ? ' is-new' : ''}" data-do="${action}"${extra}>` +
    `${escapeHtml(label)}</button>`
  );
}

/** What the player has not looked at yet: the enquiries he has not seen on the board, and the
 *  orders that landed while the list was shut (CLAUDE.md T11 3.1). */
export interface TopbarNews {
  board: boolean;
  orders: boolean;
  /** A job changed stage: the Projects chip pulses with it [TUNE] (CLAUDE.md T16 2.4). */
  projects?: boolean;
}

export function renderTopbar(
  state: GameState,
  view: 'hall' | 'office' | 'canteen' | 'sprites',
  pulse = false,
  news: TopbarNews = { board: false, orders: false },
): string {
  const orders = shoppingList(state).length;
  return (
    '<div class="topbar">' +
    namePlate(state) +
    '<div class="clock-block">' +
    `<span class="date">${escapeHtml(formatDate(state.clock))}</span>` +
    `<span class="speeds">${speedButtons(state, pulse)}</span>` +
    efficiencyBlock(state) +
    '</div>' +
    dayMeter(state) +
    '<span class="spacer"></span>' +
    '<div class="push-block">' +
    // The live jobs, one click away from every screen: the Work Plan, the same board as in the
    // office, and shown from day one at zero so the player learns where it is (PIOTR;
    // CLAUDE.md T16 2.4).
    pushButton(
      'openModal',
      `Projects: ${openJobs(state).length}`,
      ' data-modal="workPlan"',
      news.projects === true,
    ) +
    // Everything bought and not here yet, one click away from every screen (CLAUDE.md T8 3.2).
    pushButton(
      'openModal',
      `Orders: ${orders}`,
      ' data-modal="shopping"',
      news.orders,
    ) +
    // The order board is the management software's: no laptop, no board (CLAUDE.md T7 3.8).
    (has(state, 'laptop')
      ? pushButton(
          'openModal',
          `Board: ${state.enquiries.length}`,
          ' data-modal="board"',
          news.board,
        )
      : '<span class="reason">Board: buy a laptop</span>') +
    pushButton(
      'setView',
      view === 'hall' ? 'Office' : 'Hall',
      ` data-view="${view === 'hall' ? 'office' : 'hall'}"`,
      false,
    ) +
    pushButton('toggleMenu', 'Menu', '', false) +
    // The gear: the settings, which tonight are tips on and off (CLAUDE.md T13 3.22).
    '<button class="push gear" data-do="openSettings" title="Settings" aria-label="Settings">' +
    '&#9881;</button>' +
    '</div>' +
    '</div>'
  );
}

export interface MenuCloud {
  available: boolean;
  signedIn: string | null;
}

export function renderMenu(state: GameState, cloud: MenuCloud): string {
  const stayHome = state.owner.present
    ? '<button class="btn" data-do="skipDay">Stay home today</button>'
    : '<button class="btn" disabled title="Already a day off">Stay home today</button>';
  return (
    '<div class="menu-pop" data-popover="menu">' +
    // The menu shuts on a click outside it and on this cross; it did neither before (PIOTR;
    // CLAUDE.md T13 3.1). The cross is the one cross, the same helper every modal calls
    // (CLAUDE.md T18 2.5).
    closeButton('closeMenu') +
    '<button class="btn" data-do="endDay">End day</button>' +
    stayHome +
    `<button class="btn" data-do="toggleWhy">${
      state.showWhy ? 'Hide real-life notes' : 'Show real-life notes'
    }</button>` +
    '<button class="btn" data-do="showSprites">Sprite check</button>' +
    cadenceControl(state) +
    // A save on the player's own computer: a file down, a file up (PIOTR, 14.09).
    '<button class="btn" data-do="saveToFile">Save to file</button>' +
    '<button class="btn" data-do="loadFromFile">Load from file</button>' +
    '<input type="file" accept=".json" data-field="saveFile" ' +
    'aria-label="Load a save file" />' +
    (cloud.available && cloud.signedIn !== null
      ? '<button class="btn" data-do="saveGame">Save now</button>' +
        '<button class="btn" data-do="loadGame">Load</button>'
      : '') +
    '</div>'
  );
}

/** The speed a chip carries, read back off the one table: a value that is not on it is a stopped
 *  clock (CLAUDE.md T14 2.4). */
export function speedFromString(value: string): Speed {
  const parsed = Number(value);
  const found = SPEEDS.find((speed) => speed === parsed);
  return found ?? 0;
}

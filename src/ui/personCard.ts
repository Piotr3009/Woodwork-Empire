// A card for every person, and Our team made of them (PIOTR, 20.09: "made for an accountant, not
// a player"; docs/mockups/t23/team-cards.png; CLAUDE.md T23 2.13).
//
// Two things drawn by ONE function. The tile is the row of Our team; the card is the same tile
// grown into the machine card's skin, opened by a click on a figure on the hall or on a tile.
// Everything on either of them is a figure the game already counts: the day meter of Turn 21's
// 2.8, the week meters of Turn 17's 2.24, the month's days off of Turn 17's 2.9. Nothing here
// works anything out; it reads the engine and lays it out.
//
// The accountant's lines of Turn 17, the ones that read out a week's hours band by band and ended
// on an efficiency percentage, are gone: their figures live on the card, in words a player reads
// rather than a column a bookkeeper adds up.

import { TIER_WORDS, WORKING_DAYS_PER_MONTH } from '../engine/constants';
import {
  formatCalendarDay,
  jobProgress,
  ownerDrawPerDay,
  weekOfDay,
} from '../engine/index';
import type { GameState, Job, Worker } from '../engine/index';
// Straight off their own modules, not round the public API, which Turn 13 froze (REPORT-T13 10).
import { OWNER } from '../engine/machines';
import { stageLabel } from '../engine/stages';
import { jobStage } from '../engine/jobs';
import { placeLine } from '../engine/production';
import {
  ROLE_WORDS,
  dayMeterOf,
  shiftOf,
  letGoCheck,
  waitsForTheBoss,
  weekBeforeOf,
  weekNowOf,
  weekWorkedMinutes,
} from '../engine/staff';
import type { DayMeter, WeekHolder } from '../engine/staff';
import { bubbleFor } from '../engine/bubbles';
import { characterSheet, cellBox, rowFor } from '../render/characters';
import { button, escapeHtml, minutes, money, plural, reasonLabel } from './modal';
import { ownerDayLine } from './topbar';

/** The two things this one function draws: the row of Our team, and the card a click opens. */
export type PersonView = 'tile' | 'card';

/** The owner has been here since the company's first day: nobody took him on
 *  (CLAUDE.md T17 2.9). */
export const OWNER_START_DAY = 1;

/** One person, whoever he is: the owner or a man on the books. Everything below reads this and
 *  never `state.owner` and `state.workers` apart, so the two are drawn by the same lines. */
interface Person {
  /** `OWNER`, or the worker id. The card and the tile are keyed by it. */
  id: string;
  name: string;
  /** His trade in plain English, never the engine key (CLAUDE.md 3). */
  role: string;
  /** The role key the character sheets are delivered under. */
  sheetRole: string;
  /** His grade in the game's own words, and what a minute of his is worth. Null for a man with no
   *  grade and for the owner, who is the 1.00 every grade is measured against. */
  tier: { words: string; rate: number } | null;
  startDay: number;
  /** What he costs a month. The owner's is the draw he pays himself over a month of it. */
  monthlyWage: number;
  meter: DayMeter;
  week: WeekHolder;
  monthDaysOff: number;
  accidents: number;
  job: Job | null;
  /** The man himself, or null for the owner, who is on no books. */
  worker: Worker | null;
  /** True while nobody has put him on anything and there is no manager on duty to
   *  (CLAUDE.md T23 2.1). The owner never waits: he takes the oldest open job himself (2.3). */
  waiting: boolean;
}

function personOf(state: GameState, who: string): Person | null {
  if (who === OWNER) {
    const owner = state.owner;
    return {
      id: OWNER,
      name: state.playerName,
      role: 'owner',
      sheetRole: 'owner',
      tier: null,
      startDay: OWNER_START_DAY,
      monthlyWage: ownerDrawPerDay(state) * WORKING_DAYS_PER_MONTH,
      meter: dayMeterOf(state, owner),
      week: owner,
      monthDaysOff: owner.monthDaysOff,
      accidents: 0,
      job: state.jobs.find((entry) => entry.assignees.includes(OWNER)) ?? null,
      worker: null,
      waiting: false,
    };
  }
  const worker = state.workers.find((entry) => entry.id === who);
  if (worker === undefined) return null;
  return {
    id: worker.id,
    name: worker.name,
    role: ROLE_WORDS[worker.role],
    sheetRole: worker.role,
    tier: worker.tier === null ? null : { words: TIER_WORDS[worker.tier], rate: worker.rate },
    startDay: worker.startDay,
    monthlyWage: worker.monthlyWage,
    meter: dayMeterOf(state, worker),
    week: worker,
    monthDaysOff: worker.monthDaysOff,
    accidents: worker.accidents,
    job: worker.jobId === null ? null : state.jobs.find((entry) => entry.id === worker.jobId) ?? null,
    worker,
    waiting: waitsForTheBoss(state, worker),
  };
}

// ---------------------------------------------------------------------------
// The parts
// ---------------------------------------------------------------------------

/** His portrait: the idle frame of his role's sheet, facing the camera, held still. The hall's own
 *  picture of him and not a second one, through `characterSheet`, so a man looks the same on his
 *  card as he does at his bench. A role the art side has delivered no sheet for gets the capsule
 *  the hall draws for him, in the same placeholder colour (CLAUDE.md T9 3.13). */
export function portrait(sheetRole: string): string {
  const found = characterSheet(sheetRole, 'idle');
  const placed = found === null ? null : rowFor(found.sheet, 'se');
  if (found === null || placed === null) {
    return `<span class="person-portrait is-capsule" data-portrait="${escapeHtml(sheetRole)}"></span>`;
  }
  // Frame 0 and no fps: a portrait is a still, whatever the hall is playing.
  return (
    `<svg class="person-portrait" data-portrait="${escapeHtml(sheetRole)}" ` +
    `viewBox="${cellBox(found.sheet, placed.row, 0)}" preserveAspectRatio="xMidYMax meet">` +
    `<image href="${found.url}" x="0" y="0" /></svg>`
  );
}

/** A chip for his trade, and a chip for his grade with what a minute of his is worth. The words of
 *  a grade are `TIER_WORDS` and never the engine key: the mockup writes "novice" and the game has
 *  called that man "no experience" since Turn 21, so the game's own word wins (CLAUDE.md 3,
 *  T21 2.9). The multiplication sign is the one the rest of the game uses. */
function chips(person: Person): string {
  const grade =
    person.tier === null
      ? ''
      : `<span class="chip person-grade" data-grade>${escapeHtml(person.tier.words)} ` +
        `×${person.tier.rate.toFixed(2)}</span>`;
  return (
    '<span class="person-chips">' +
    `<span class="chip person-role" data-role>${escapeHtml(person.role)}</span>${grade}` +
    '</span>'
  );
}

/** What he is at this minute, in one line. A man nobody has put on anything says so in the red
 *  the rest of the game warns in, with the reason the mark over his head is carrying, so the hall
 *  and the card cannot disagree about him (CLAUDE.md T22 2.5, T23 2.1, 2.13). */
function nowLine(state: GameState, person: Person): string {
  const words = doingWords(state, person);
  const warn = person.waiting ? ' warn' : '';
  return `<p class="person-now${warn}" data-now>now: ${escapeHtml(words)}</p>`;
}

/** The words for a man nobody has put on anything, written once: the crew column of the Work
 *  Plan, the crew row of the trade tabs and the man's own tile all print them, and the Work Plan's
 *  test reads this and not a second copy of the sentence (CLAUDE.md T23 2.1). */
export const NEEDS_A_JOB = 'needs a job';

/** What this man is doing this minute, in the words the game says it in. The one answer: the crew
 *  row, the crew column of the Work Plan and his own tile all read it (CLAUDE.md T17 2.9,
 *  T23 2.1, 2.13). It moved here from team.ts in Turn 23, because the tile and the card are drawn
 *  in this file and a man cannot be said to be doing two different things on two screens. */
export function workerDoing(state: GameState, worker: Worker): string {
  const job = worker.jobId === null ? null : state.jobs.find((entry) => entry.id === worker.jobId);
  const night = shiftOf(state, worker) === 'night';
  if (worker.absentDaysRemaining > 0) {
    return `off for ${plural(worker.absentDaysRemaining, 'more day', 'more days')}`;
  }
  if (worker.startDay > state.clock.day) return `starts ${formatCalendarDay(worker.startDay)}`;
  if (worker.taskId !== null) return 'on a job of work';
  if (job) return `${night ? 'tonight on' : 'on'} ${job.name}`;
  // Nobody has put him on anything and there is no manager on duty to: the words the crew column
  // of the Work Plan, the mark over his head and his own tile all say (PIOTR, 20.09;
  // CLAUDE.md T23 2.1). He was called "free" until tonight, which read as a man at leisure and
  // not as a man the player has to do something about.
  if (waitsForTheBoss(state, worker)) return NEEDS_A_JOB;
  return night ? 'on the night shift, nothing to do yet' : 'free';
}

/** The words of the `now:` line. A man on the books is `workerDoing`, so his card, his tile, his
 *  crew row and the crew column of the Work Plan cannot disagree about him; a man at a job has
 *  the stage he is at added, which is what the card is for. The owner has no such row, so his
 *  line is the one the top bar already says of him. */
function doingWords(state: GameState, person: Person): string {
  if (person.waiting) return bubbleFor(state, person.id)?.text ?? NEEDS_A_JOB;
  if (person.job !== null) {
    const stage = jobStage(state, person.job);
    const where = stage === null ? '' : ` (${stageLabel(stage.id).toLowerCase()})`;
    return `${person.job.name}${where}`;
  }
  if (person.worker !== null) return workerDoing(state, person.worker);
  return ownerDayLine(state);
}

/** The bar of his day: what he worked in the green the game says good in, what he stood in the red
 *  it says bad in, the dinner hour in the grey the top bar's own idle run uses, and the rest of
 *  the day left empty. The day meter of Turn 21's 2.8 and nothing else (CLAUDE.md T23 2.13). */
function dayBar(meter: DayMeter): string {
  const total = Math.max(1, meter.total);
  const run = (band: string, value: number): string =>
    value <= 0
      ? ''
      : `<span class="seg seg-${band}" data-band="${band}" ` +
        `style="width:${((value / total) * 100).toFixed(4)}%"></span>`;
  return (
    '<div class="day-bar person-day" data-day-bar>' +
    run('worked', meter.worked) +
    run('stood', meter.idle) +
    run('idle', meter.breakMinutes) +
    '</div>'
  );
}

/** Hours, to a tenth, the way a stretch of a man's time reads on the page. */
function hoursText(minutesWorked: number): string {
  return `${Math.round(minutesWorked / 6) / 10} h`;
}

/** The three figures under the bar: what he worked, what he stood and what the week has had off
 *  him. The game's own separator between them (docs/ui-style.md 11). */
function dayFigures(state: GameState, person: Person): string {
  const week = weekNowOf(person.week, weekOfDay(state.clock.day));
  const worked = week === null ? 0 : weekWorkedMinutes(week);
  return (
    '<p class="tile-figures person-figures" data-figures>' +
    escapeHtml(
      `${hoursText(person.meter.worked)} worked · ${minutes(person.meter.idle)} idle · ` +
        `${hoursText(worked)} this week`,
    ) +
    '</p>'
  );
}

/** The one control a tile carries: Office on the owner, Assign on a man waiting for the boss, and
 *  Let go on everybody else, which is the click of Turn 20's 2.4 and unchanged. */
function tileAction(state: GameState, person: Person): string {
  if (person.id === OWNER) return button('openOffice', 'Office');
  if (person.waiting) return button('openPersonCard', 'Assign', `data-id="${person.id}"`);
  const check = letGoCheck(state, person.id);
  if (!check.ok) return reasonLabel(check.reason);
  return button('letGo', 'Let go', `data-id="${person.id}"`);
}

/** When he started and how long ago that is, in the days the player counts everything else in. */
function startedText(state: GameState, startDay: number): string {
  const since = state.clock.day - startDay;
  const ago =
    since > 0 ? `${plural(since, 'day', 'days')} ago` : since === 0 ? 'today' : `in ${plural(-since, 'day', 'days')}`;
  return `started ${formatCalendarDay(startDay)} · ${ago}`;
}

/** This week and last, in the two figures 2.13 asks for and no more: the hours he worked and the
 *  hours he stood. The six bands of Turn 20's row are not on this card; they are the week's own
 *  business and the card is about the man (CLAUDE.md T23 2.13). */
function weekLines(state: GameState, person: Person): string {
  const week = weekOfDay(state.clock.day);
  const line = (label: string, meters: ReturnType<typeof weekNowOf>): string => {
    if (meters === null || meters.paidMinutes === 0) {
      return `<p class="tile-figures" data-week="${label}">${label}: nothing yet</p>`;
    }
    const worked = weekWorkedMinutes(meters);
    const stood = Math.max(0, meters.paidMinutes - worked);
    // And what the standing was for, when the week knows: the one machine the hall had no place
    // for him at most, so the player reads off the card whether a second one would pay
    // (PIOTR, 20.09; v37; CLAUDE.md T25 2.3).
    let waitedFor: [string, number] | null = null;
    for (const [family, count] of Object.entries(meters.waitedFor ?? {})) {
      if (count !== undefined && count > 0 && (waitedFor === null || count > waitedFor[1])) {
        waitedFor = [family, count];
      }
    }
    const forWhat =
      waitedFor === null ? '' : `, ${hoursText(waitedFor[1])} of it ${placeLine(waitedFor[0])}`;
    return (
      `<p class="tile-figures" data-week="${label}">` +
      escapeHtml(`${label}: ${hoursText(worked)} worked · ${hoursText(stood)} idle${forWhat}`) +
      '</p>'
    );
  };
  return (
    line('this week', weekNowOf(person.week, week)) +
    line('last week', weekBeforeOf(person.week, week))
  );
}

/** What he is on, with the stage and how much of it is done. Nothing at all when he is on
 *  nothing: the `now:` line above has already said so. */
function onLine(state: GameState, person: Person): string {
  if (person.job === null) return '';
  const stage = jobStage(state, person.job);
  const where = stage === null ? '' : `${stageLabel(stage.id).toLowerCase()}, `;
  const done = Math.round(jobProgress(person.job) * 100);
  return (
    '<p class="tile-figures" data-on>' +
    escapeHtml(`on: ${person.job.name} (${where}${done}% done)`) +
    '</p>'
  );
}

/** The two figures at the foot of the card: the days he has had off this month, and the accidents
 *  against his name (CLAUDE.md T17 2.9, T23 2.13). */
function recordLine(person: Person): string {
  return (
    '<p class="tile-figures" data-record>' +
    escapeHtml(`days off this month: ${person.monthDaysOff} · accidents: ${person.accidents}`) +
    '</p>'
  );
}

/** The card's own two buttons: Assign, which opens the list of Turn 19 on the job he would go on,
 *  and Let go. The owner has Office and no Let go: nobody lets him go. */
function cardActions(state: GameState, person: Person): string {
  if (person.id === OWNER) {
    return `<div class="person-actions">${button('openOffice', 'Office')}</div>`;
  }
  const check = letGoCheck(state, person.id);
  const go = check.ok ? button('letGo', 'Let go', `data-id="${person.id}"`) : reasonLabel(check.reason);
  return (
    '<div class="person-actions">' +
    button('openPersonAssign', 'Assign', `data-id="${person.id}"`) +
    go +
    '</div>'
  );
}

// ---------------------------------------------------------------------------
// The one function
// ---------------------------------------------------------------------------

/** The tile and the card, drawn by the one function: the card is the tile with four more lines and
 *  a second button, in the machine card's skin (PIOTR, 20.09; CLAUDE.md T23 2.13). */
export function renderPerson(state: GameState, who: string, view: PersonView): string {
  const person = personOf(state, who);
  if (person === null) return '<p class="empty">Nobody by that name.</p>';
  const head =
    `<h3 class="tile-name" data-name>${escapeHtml(person.name)}</h3>` + chips(person);
  const body =
    view === 'card'
      ? `<p class="tile-figures" data-started>${escapeHtml(startedText(state, person.startDay))}</p>` +
        `<p class="tile-figures person-wage" data-wage>${escapeHtml(wageLine(person))}</p>` +
        '<hr class="person-rule" />' +
        nowLine(state, person) +
        dayBar(person.meter) +
        dayFigures(state, person) +
        weekLines(state, person) +
        onLine(state, person) +
        recordLine(person) +
        cardActions(state, person)
      : nowLine(state, person) +
        dayBar(person.meter) +
        dayFigures(state, person) +
        `<p class="tile-figures person-wage" data-wage>${escapeHtml(wageLine(person))}</p>` +
        `<div class="person-actions">${tileAction(state, person)}</div>`;
  // The whole tile is the way onto the card, because the mockup's tile is a thing the player
  // clicks. The buttons inside it keep their own click: `closest('[data-do]')` finds the
  // innermost, so Let go on a tile lets him go and does not open the card under it. The card
  // itself carries no such click: it is already open (CLAUDE.md T23 2.13).
  const open =
    view === 'tile' ? ` data-do="openPersonCard" data-id="${person.id}"` : '';
  return (
    `<div class="tile person-tile" data-person="${person.id}" data-view="${view}"${open}>` +
    portrait(person.sheetRole) +
    `<div class="person-body">${head}${body}</div>` +
    '</div>'
  );
}

/** What he costs a month, in the one form of pay the game has (CLAUDE.md T21 2.10). The owner's is
 *  the draw he pays himself, over a month of working days. */
function wageLine(person: Person): string {
  return `${money(person.monthlyWage)} a month`;
}

/** Everybody on the books, the owner first: Our team, as a column of these tiles
 *  (PIOTR, 20.09; CLAUDE.md T23 2.13). */
export function renderOurTeam(state: GameState): string {
  const tiles = [
    renderPerson(state, OWNER, 'tile'),
    ...state.workers.map((worker) => renderPerson(state, worker.id, 'tile')),
  ];
  return `<div class="person-column">${tiles.join('')}</div>`;
}

/** The head of the card, which is the man's own name and trade: "Callum, joiner". "Person" over a
 *  card the player opened by clicking that very man says nothing (CLAUDE.md T22 2.13). */
export function personCardTitle(state: GameState, who: string | null): string | null {
  if (who === null) return null;
  const person = personOf(state, who);
  return person === null ? null : `${person.name}, ${person.role}`;
}

/** True while this id names somebody the card can be opened on. */
export function isPerson(state: GameState, who: string): boolean {
  return personOf(state, who) !== null;
}

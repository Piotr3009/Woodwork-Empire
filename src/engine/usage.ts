// How much of each trade is used (PIOTR, 03.10; v72): the figure Our team is laid out on.
//
// "If the draftsman or the labourer is at ninety per cent, that is the sign a second one has to be
// taken on when the company grows." So the page says, a trade at a time, how much of the hours the
// company paid for were worked: last week's, because a whole week is a fair reading and this
// morning is not, and this week's so far for a man who was not on the books last week. The game
// has kept those hours a man and a week since Turn 20 (`weekNow`, `weekBefore`); nothing new is
// measured here.
//
// The production manager works no minutes of his own. What is used of him is how many men he
// carries out of the number his grade can, which is the very thing a better grade is bought for.
//
// Every word the page prints about a trade is written here, so the page computes nothing.

import { PRODUCTION_MANAGER_CARRIES, USAGE_LOW_PERCENT, USAGE_NEAR_FULL_PERCENT } from './constants';
import { weekOfDay } from './clock';
import { crewLimit } from './layout';
import { OWNER, lineLevel, lineModules } from './machines';
import { ROLE_WORDS, ROLE_WORDS_MANY, carriedByAManager, crewCount, weekBeforeOf, weekNowOf, weekWorkedMinutes } from './staff';
import { plural } from './text';
import type { GameState, Worker, WorkerRole } from './types';

/** A trade of Our team: the owner, who is a trade of one, and every role a man is hired in. */
export type UsageTrade = typeof OWNER | WorkerRole;

/** The trades in the order the page lays them out: the floor, the office, the drawing, the
 *  manager. */
export const USAGE_TRADES: readonly UsageTrade[] = [
  OWNER,
  'joiner',
  'helper',
  'officeAdmin',
  'salesman',
  'draftsman',
  'productionManager',
  // The line engineer last, after the manager: he keeps the line and is nobody's man (CLAUDE.md
  // T29 2.8) [TUNE: the place].
  'lineEngineer',
];

/** Where a figure sits: nobody to measure, under `USAGE_LOW_PERCENT`, near full, or between. */
export type UsageBand = 'none' | 'low' | 'fine' | 'full';

/** What a man's figure is a reading of: last week, this week so far for a man who has no last
 *  week, the men a manager carries, or nothing yet. */
export type UsageBasis = 'lastWeek' | 'thisWeek' | 'carried' | 'none';

export interface ManUsage {
  who: string;
  /** Whole per cent of his paid hours he worked, or null with nothing on the books yet. */
  percent: number | null;
  basis: UsageBasis;
  band: UsageBand;
  /** The line under his bar: `this week 46% so far`, `his first week, so far`,
   *  `carries 13 of 25 men`, `nothing on the books yet`. */
  words: string;
  /** The minutes behind the figure, for the trade's own sum. */
  worked: number;
  paid: number;
}

export interface TradeUsage {
  trade: UsageTrade;
  /** `Joiners`, `Labourer`, `You`: the trade as its tile is headed. */
  label: string;
  /** Who is in it, the ids in the order they were taken on. */
  men: string[];
  percent: number | null;
  band: UsageBand;
  /** The one sentence under the bar of the tile. */
  words: string;
}

/** The trades the shop keeps one or two of, where a full week is the sign to take on another. A
 *  joiner at a hundred per cent is a joiner doing what he is paid for, and so is the owner. */
function isSupport(trade: UsageTrade): boolean {
  return trade !== OWNER && trade !== 'joiner';
}

function bandOf(trade: UsageTrade, percent: number | null): UsageBand {
  if (percent === null) return 'none';
  // A line engineer keeps the line, and a full week of it asks for nobody: the game may refuse a
  // third (CLAUDE.md T29 2.8).
  if (trade === 'lineEngineer') return 'fine';
  // A manager with men to spare is not a man standing about: only the near full end is his.
  if (percent < USAGE_LOW_PERCENT && trade !== 'productionManager') return 'low';
  if (percent >= USAGE_NEAR_FULL_PERCENT && isSupport(trade)) return 'full';
  return 'fine';
}

function share(worked: number, paid: number): number | null {
  if (paid <= 0) return null;
  return Math.max(0, Math.min(100, Math.round((worked / paid) * 100)));
}

/** The men a manager of this grade carries, out of how many he can: everybody else on the books in
 *  the order they were taken on, as `menCarried` counts them, whatever the hour is. */
function carriedBy(state: GameState, manager: Worker): { carried: number; limit: number } {
  const limit = manager.tier === null ? 0 : PRODUCTION_MANAGER_CARRIES[manager.tier];
  const others = state.workers.filter((worker) => worker.id !== manager.id && carriedByAManager(worker)).length;
  return { carried: Math.min(others, limit), limit };
}

/** One man's figure, the owner's or a man's on the books. */
export function usageOfMan(state: GameState, who: string): ManUsage | null {
  const worker = who === OWNER ? null : state.workers.find((entry) => entry.id === who);
  if (who !== OWNER && worker === undefined) return null;
  const trade: UsageTrade = worker?.role ?? OWNER;
  if (worker !== null && worker !== undefined && worker.role === 'productionManager') {
    const { carried, limit } = carriedBy(state, worker);
    const percent = share(carried, limit);
    return {
      who,
      percent,
      basis: 'carried',
      band: bandOf(trade, percent),
      words: `carries ${carried} of ${plural(limit, 'man', 'men')}`,
      worked: carried,
      paid: limit,
    };
  }
  const holder = worker ?? state.owner;
  const week = weekOfDay(state.clock.day);
  const before = weekBeforeOf(holder, week);
  const now = weekNowOf(holder, week);
  const soFar = now === null ? null : share(weekWorkedMinutes(now), now.paidMinutes);
  if (before !== null && before.paidMinutes > 0) {
    const worked = weekWorkedMinutes(before);
    const percent = share(worked, before.paidMinutes);
    return {
      who,
      percent,
      basis: 'lastWeek',
      band: bandOf(trade, percent),
      words: soFar === null ? 'nothing this week yet' : `this week ${soFar}% so far`,
      worked,
      paid: before.paidMinutes,
    };
  }
  if (now !== null && soFar !== null) {
    return {
      who,
      percent: soFar,
      basis: 'thisWeek',
      band: bandOf(trade, soFar),
      words: who === OWNER ? 'the first week, so far' : 'his first week, so far',
      worked: weekWorkedMinutes(now),
      paid: now.paidMinutes,
    };
  }
  return { who, percent: null, basis: 'none', band: 'none', words: 'nothing on the books yet', worked: 0, paid: 0 };
}

/** What the tile of a trade nobody is hired in says: whose work it is meanwhile. */
const NOBODY_WORDS: Record<WorkerRole, string> = {
  joiner: 'Nobody. Every job is your own to make.',
  helper: 'Nobody. You unload, sweep and empty the bags yourself.',
  officeAdmin: 'Nobody. The emails, the orders and the material lists are yours.',
  salesman: 'Nobody. The client calls are yours.',
  draftsman: 'Nobody. You draw, measure and meet the clients yourself.',
  productionManager: 'Nobody. You put every man on his job yourself.',
  // [TUNE: chat] (CLAUDE.md T29 2.8).
  lineEngineer: 'Nobody. The line does not run without one.',
};

function labelOf(trade: UsageTrade, count: number): string {
  if (trade === OWNER) return 'You';
  if (trade === 'productionManager') return count > 1 ? 'Managers' : 'Manager';
  const words = count === 1 ? ROLE_WORDS[trade] : ROLE_WORDS_MANY[trade];
  // A trade with nobody in it is named as one man would be: `Draftsman`, none hired.
  const named = count === 0 ? ROLE_WORDS[trade] : words;
  return `${named.charAt(0).toUpperCase()}${named.slice(1)}`;
}

function wordsOf(state: GameState, trade: UsageTrade, men: readonly ManUsage[], band: UsageBand): string {
  if (trade === OWNER) return 'Your own hours on the floor and at the desk.';
  if (men.length === 0) return NOBODY_WORDS[trade];
  const count = plural(men.length, 'man', 'men');
  if (trade === 'joiner') {
    const left = crewLimit(state) - crewCount(state);
    return left > 0 ? `${count}, ${plural(left, 'place', 'places')} left in the unit.` : `${count}, the unit is full.`;
  }
  if (trade === 'lineEngineer') {
    // His tile's own sentence, as the manager's has: how much of the line runs (CLAUDE.md T29 2.8)
    // [TUNE: the words while no module stands].
    const standing = lineModules(state);
    return standing === 0
      ? 'The line is not built yet.'
      : `The line runs as ${lineLevel(state)} of its ${standing} modules.`;
  }
  if (trade === 'productionManager') {
    const first = men[0];
    const carries = first === undefined ? '' : `Carries ${first.worked} of the ${first.paid} men his grade can.`;
    return band === 'full' ? `${carries} Near full: a better grade carries more.` : carries;
  }
  if (band === 'full') {
    return men.length === 1
      ? 'Near full. More work of this kind wants a second man.'
      : 'Near full. More work of this kind wants another man.';
  }
  if (band === 'low') return `${count}, standing most of the week.`;
  if (band === 'none') return `${count}, nothing on the books yet.`;
  return `${count}, room for more work.`;
}

/** Every trade of Our team with how much of it is used, in the page's order. A trade nobody is
 *  hired in is in the list too, saying so: that the owner draws for himself is something the page
 *  has to be able to say. */
export function tradeUsage(state: GameState): TradeUsage[] {
  return USAGE_TRADES.map((trade) => {
    const ids = trade === OWNER ? [OWNER] : state.workers.filter((worker) => worker.role === trade).map((worker) => worker.id);
    const men = ids.map((who) => usageOfMan(state, who)).filter((entry): entry is ManUsage => entry !== null);
    const measured = men.filter((entry) => entry.percent !== null);
    const worked = measured.reduce((total, entry) => total + entry.worked, 0);
    const paid = measured.reduce((total, entry) => total + entry.paid, 0);
    const percent = measured.length === 0 ? null : share(worked, paid);
    const band = bandOf(trade, percent);
    return {
      trade,
      label: labelOf(trade, ids.length),
      men: ids,
      percent,
      band,
      words: wordsOf(state, trade, men, band),
    };
  });
}

/** The trade this value names, or the joiners for anything else: what a click on a tile hands the
 *  page. */
export function usageTradeFrom(value: string): UsageTrade {
  return (USAGE_TRADES as readonly string[]).includes(value) ? (value as UsageTrade) : 'joiner';
}

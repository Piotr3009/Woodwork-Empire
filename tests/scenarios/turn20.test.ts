// The Turn 20 months of CLAUDE.md T20 3, T20-C3: (cc) a contract month with an experienced joiner
// that ends in profit after his wages, (dd) the helper's dirty hall day, (ee) the fifty thousand
// pound bespoke job, and (ff) three services on one saw.
//
// The shape is the one Turns 13, 17 and 19 used: a month played through the scripted player of
// autopilot.ts, off a hall that is stood up by playing the opening days and not by writing the
// state out by hand, so what the assertions read is what a player would have seen. Every figure in
// a comment was measured on this build and every scenario prints the figures REPORT-T20.md quotes.

import { describe, expect, it } from 'vitest';
import { CAREFUL, type Policy, playDay, playUntilDay } from './autopilot';
import { acceptNow, act, newGame, placeEnquiry } from '../helpers';
import {
  DAYS_PER_WEEK,
  MINUTES_PER_WORKING_DAY,
  SERVICE_COST_FRACTION,
  WORKING_DAYS_PER_WEEK,
} from '../../src/engine/constants';
import {
  bagStore,
  cleanerAtWork,
  closingReport,
  drawContract,
  dustBand,
  formatMoney,
  formatTime,
  helperOnDuty,
  isWorkingDay,
  jobPace,
  joiners,
  lifeAfterServices,
  machineIsOut,
  machinesInService,
  originalLifeOf,
  rackCapacity,
  sawdustPiles,
  serviceCostFor,
  shortfallOf,
  weekday,
} from '../../src/engine/index';
import { nextWorkingDay } from '../../src/engine/clock';
import { contractPiece, contractPriceFor, contractResultFor } from '../../src/engine/contracts';
import { hallBlock, orderForJobCheck } from '../../src/engine/jobs';
import { hallProblems } from '../../src/render/hall';
import type { Contract, Equipment, GameEvent, GameState, Job, Worker } from '../../src/engine/index';

const SEED = 20260911;

/** Rounded the way money is read, so a printed figure and an asserted one are one number. */
function pounds(value: number): number {
  return Math.round(value * 100) / 100;
}

function theSaw(state: GameState): Equipment {
  const saw = state.equipment.find((item) => item.specId === 'tableSaw');
  if (saw === undefined) throw new Error('no saw in the hall');
  return saw;
}

// ---------------------------------------------------------------------------
// (cc) A contract month with an experienced joiner (CLAUDE.md T20 2.1, 2.2, 7)
// ---------------------------------------------------------------------------

/** One experienced joiner and nothing else: no job off the board, no second man, no helper, so
 *  every wage the month pays is his and every pound it takes is the contract's. The standing is
 *  20, which is what an experienced man answers an advert at (CLAUDE.md T20 2.5). */
const CONTRACT_MONTH: Policy = {
  ...CAREFUL,
  maxOpenJobs: 0,
  hireJoiner: true,
  joiners: 1,
  joinerTier: 'experienced',
  reputation: 20,
  stockSheets: 60,
};

/** A week's work the man can keep up with inside his own week on the card [TUNE: 40, the top of
 *  the board's own band of 20 to 40 cut sheet packs, which is a contract the board really offers].
 *  The card has him at eight a day behind the day 1 used saw against the eight a day the week asks
 *  for, and with no job of work of his own to go back to he spends the whole of each day on the
 *  contract (CLAUDE.md T20 2.1.4). v53 counted the owner beside him, two men at the used saw's one
 *  place, so every minute of the hall went at 0.83 of itself and he made 33 a week and not 40
 *  (PIOTR, 24.09; v53). From v54 the crew is the men at work, the owner has no job this month, and
 *  the man has the saw to himself (v54). */
const PACKS_A_WEEK = 40;
const TERM_WEEKS = 4;

interface ContractMonth {
  opened: GameState;
  ended: GameState;
  man: Worker;
  contractId: string;
}

/** The hall on the Monday the term opens: the day 1 kit bought, one experienced joiner on the
 *  books with his own bench, sheets on the rack, and one standing contract for cut sheet packs at
 *  the piece's own price, with him on it. */
function contractMonth(): ContractMonth {
  const seen: GameEvent[] = [];
  let state = playUntilDay(newGame({ seed: SEED, difficulty: 'veryEasy' }), 8, CONTRACT_MONTH, seen);
  // The term opens on a Monday, so its four weeks are four whole weeks: a term that opened mid
  // week would take a part week's quantity against a whole month of wages, and the profit this
  // month is about would be measuring the calendar instead of the contract.
  while (weekday(state.clock.day) !== 0) state = playDay(state, CONTRACT_MONTH, seen);
  const man = joiners(state)[0];
  if (man === undefined) throw new Error('no joiner on the books');
  state.enquiries = [];
  state.contracts = state.contracts.filter((contract) => contract.status !== 'offered');
  const drawn = drawContract(state);
  drawn.id = 'contract-month-cc';
  drawn.name = 'Cut sheet packs for Ashcombe Retail';
  drawn.pieceId = 'cutSheetPack';
  // The piece's own price, the entry point's of v40 without the client's answer, never a figure
  // this month made up.
  drawn.pricePerPiece = contractPriceFor(contractPiece(drawn));
  drawn.quantityPerWeek = PACKS_A_WEEK;
  drawn.termWeeks = TERM_WEEKS;
  state.contracts.push(drawn);
  state = act(state, { type: 'ACCEPT_CONTRACT', contractId: drawn.id });
  state = act(state, { type: 'ASSIGN_CONTRACT', contractId: drawn.id, workerId: man.id, on: true });
  const opened = state;
  // The whole term, and the Monday after it, so the last week is closed and the term is ended.
  const ended = playUntilDay(
    opened,
    opened.clock.day + TERM_WEEKS * DAYS_PER_WEEK + 1,
    CONTRACT_MONTH,
    seen,
  );
  return { opened, ended, man, contractId: drawn.id };
}

const CC = contractMonth();

function theContract(state: GameState): Contract {
  const contract = state.contracts.find((entry) => entry.id === CC.contractId);
  if (contract === undefined) throw new Error('the contract has gone off the books');
  return contract;
}

/** What the workshop really paid him over the month: the wage lines of the ledger over the four
 *  weeks the term was taken for, from its first day, and no other cost of the workshop. Everybody is
 *  paid by the month from Turn 21, so four weeks hold one pay day, on the month's last working day
 *  (CLAUDE.md T21 2.10). He is the only man on the books, so the wage bill is his wage and nobody
 *  else's. The four weeks are the term itself; v53 had the client end it after two of them, a week
 *  before the pay day, and paid him his month all the same (v54). */
function wagesOverTheMonth(state: GameState): { total: number; payDays: number[] } {
  const contract = theContract(state);
  const from = contract.startDay ?? 0;
  const to = from + TERM_WEEKS * DAYS_PER_WEEK - 1;
  const lines = state.ledger.filter(
    (entry) => entry.category === 'wages' && entry.day >= from && entry.day <= to,
  );
  return {
    total: pounds(lines.reduce((sum, entry) => sum + Math.abs(entry.amount), 0)),
    payDays: lines.map((entry) => entry.day),
  };
}

describe('(cc) a contract month with an experienced joiner, on Very easy', () => {
  it('puts the man the card costed on it, at the piece s own price, and keeps him there', () => {
    const contract = theContract(CC.opened);
    expect(CC.man.tier).toBe('experienced');
    // The entry point's price of v40, the way the month set it up.
    expect(contract.pricePerPiece).toBe(contractPriceFor(contractPiece(contract)));
    expect(contract.assigned).toEqual([CC.man.id]);
    // The card's own reading of him, which is what the player saw before he pressed Take it
    // (CLAUDE.md T20 2.1.1): 59 minutes a piece behind the day 1 used saw at his 0.8 of the owner,
    // which is what an experienced man is worth on Piotr's own ladder (CLAUDE.md T21 2.9). Eight
    // pieces a day against the eight the week asks for, so a whole week is exactly his week and
    // there is nothing in hand for the part weeks at either end of the term. Turn 20 read him at
    // 1.0 of the owner and 47 minutes a piece, and it is that step down the ladder, and not the
    // pay, that turns this month from comfortable into tight.
    const result = contractResultFor(CC.opened, contract, CC.man);
    expect(result.minutes).toBe(59);
    expect(result.piecesPerDay).toBe(Math.floor(MINUTES_PER_WORKING_DAY / result.minutes));
    expect(result.piecesPerDay).toBe(8);
    expect(result.piecesNeededPerDay).toBe(PACKS_A_WEEK / WORKING_DAYS_PER_WEEK);
    expect(result.piecesPerDay).toBe(result.piecesNeededPerDay);
    // The card reads him at the hall's pace for the saw and before the hall's own lines, so it
    // does not carry what a saw too few for the crew takes off (v53); the hall line of the offer
    // card does (CLAUDE.md T25 2.7). This month has no such line from v54: the owner has no job
    // and is not in the crew, the man has the used saw's one place to himself, and the floor is the
    // card's 59 minutes and forty a week (below). v53 counted the owner, and a piece took him about
    // 71 minutes on the floor, 33 a week (v54).
  });

  it('makes its forty in the first three weeks, one short in the last, and runs its term for one point (v57)', () => {
    const contract = theContract(CC.ended);
    expect(contract.status).toBe('ended');
    // The man alone at the used saw's one place: forty and forty, then thirty nine and thirty
    // nine: six on day 23, the day the extractor breaks down, and seven on day 30, against eight
    // on nearly every other day. Two short weeks in a row end it on the Monday after the second,
    // which is the day the term runs out (CLAUDE.md T20 2.1.6) [measured]. v53 counted
    // the owner in the crew though he has no job this month, (1 + 1 / 1.5) / 2 = 0.83 on every
    // minute, made thirty three and thirty three and lost it on day 22; the same month with v53's
    // count reads those figures exactly (v54). v52 ran the term out: forty, forty, thirty eight
    // and forty, one week short and one point down.
    //
    // From v57 the term runs out: forty, forty, forty and thirty nine, one week short and one point
    // down, and it ends on day 35 with its last week [measured]. The board draws no timber until
    // the timber branch (PIOTR, 25.09), its greyed offers are drawn from day 1 with the oak table
    // among them, and the random stream the month shares with them moves: the extractor that broke
    // on day 23 does not break inside the term, so week 4 is made in full.
    expect(contract.endedBy).toBe('term');
    expect(contract.endDay).toBe(35);
    expect(contract.weeks).toEqual([
      { week: 2, wanted: 40, made: 40 },
      { week: 3, wanted: 40, made: 40 },
      { week: 4, wanted: 40, made: 40 },
      { week: 5, wanted: 40, made: 39 },
    ]);
    // 159 of the term's 160 (158 on v54 to v56, v52's figure; v53 made 66 of the fortnight's 80).
    expect(contract.piecesMade).toBe(159);
    // One short week, one point of the workshop's standing, and the reason says the figures.
    const log = CC.ended.reputationLog.filter((entry) => entry.reason.startsWith(contract.name));
    expect(log).toHaveLength(1);
    expect(log.every((entry) => entry.points === -1)).toBe(true);
    expect(log.every((entry) => entry.reason.includes('39 of 40 this week'))).toBe(true);
    // The rack never ran dry under him and nobody stood him for want of a place.
    const man = CC.ended.workers.find((worker) => worker.id === CC.man.id);
    expect(man?.idleByReason.noMaterial).toBe(0);
    expect(man?.idleByReason.noPlace).toBe(0);
  });

  it('ends the month barely in profit after his wages, and the report quotes its own margin', () => {
    const contract = theContract(CC.ended);
    const wages = wagesOverTheMonth(CC.ended);
    const revenue = pounds(contract.revenue);
    const material = pounds(contract.materialCost);
    const profit = pounds(revenue - material - wages.total);
    // Four whole weeks hold one pay day, because everybody is paid by the month now and the month
    // pays on its last working day (CLAUDE.md T21 2.10). One line, and it is his month whole, paid
    // on day 30 inside the term (v54; v53 paid it a week after the client had walked away).
    expect(wages.payDays).toHaveLength(1);
    expect(wages.payDays[0] ?? 0).toBeLessThan(contract.endDay ?? 0);
    expect(wages.total).toBe(pounds(CC.man.monthlyWage));
    // 158 packs at the entry point's 69 (v51; 76 from v40, the typed 50 before that) is 10,902
    // taken; 158 packs of 0.15 of a sheet at 200 a sheet is 4,740 of stock off the rack; the one
    // pay day of the month is his 2,470 by the v38 ladder. The month is 3,692 above water, v52's
    // figures to the pound. v53 made 66 packs, 4,554 taken, 1,980 of stock and 104 after the
    // same 2,470: the two weeks the client took away were the difference, and a saw line that
    // counted the owner with no job was why he took them (v54). The line of the cross check of
    // CLAUDE.md T20 7, that a contract month with an experienced joiner ends in profit AFTER his
    // wages, holds; the saw's wear of v40 is on the closing report below, 60 on v54 against 30 on
    // v53 and 59.83 on v52.
    // From v57, 159 packs (the term above): 10,971 taken, 4,770 of stock, the same 2,470, and the
    // month is 3,731 above water [measured].
    expect(revenue).toBe(159 * contract.pricePerPiece);
    expect(revenue).toBe(10971);
    expect(material).toBe(4770);
    expect(wages.total).toBe(2470);
    expect(profit).toBe(3731);
    expect(profit).toBeGreaterThan(0);
    // The closing report the player is handed says the same thing in its own arithmetic: it costs
    // the minutes he actually stood at the contract and not the days he was paid for, which reads
    // higher than the month's own profit, and from v40 it takes the saw's wear off as well, which
    // the month's own sum above does not; both are above water. On v54 it is 3,796.67 over 160
    // hours; v53 read 1,391.33 over 80 and v52 3,803.56 over 159.5.
    const report = closingReport(CC.ended, contract);
    expect(report.machineWear).toBeGreaterThan(0);
    expect(report.margin).toBe(pounds(revenue - material - report.labourCost - report.machineWear));
    // 3,835.67 over the same 160 hours from v57, the one pack more of the term above.
    expect(report.margin).toBe(3835.67);
    expect(report.machineWear).toBe(60);
    expect(report.labourHours).toBe(160);
    expect(report.margin + report.machineWear).toBeGreaterThan(profit);
    expect(report.margin).toBeGreaterThan(0);
    console.log(
      '(cc) A CONTRACT MONTH WITH AN EXPERIENCED JOINER\n' +
        `piece: ${contractPiece(contract).name} at ${formatMoney(contract.pricePerPiece)}, ` +
        `${PACKS_A_WEEK} a week over ${TERM_WEEKS} weeks, ended by the ${contract.endedBy ?? ''} on day ${contract.endDay ?? 0}\n` +
        `the man: ${CC.man.name}, experienced, ${formatMoney(CC.man.monthlyWage)} a month\n` +
        `pieces made ${contract.piecesMade}, revenue ${formatMoney(revenue)}, ` +
        `material ${formatMoney(material)}, his wages ${formatMoney(wages.total)}\n` +
        `PROFIT AFTER HIS WAGES ${formatMoney(profit)}\n` +
        `the closing report's own margin ${formatMoney(report.margin)} over ` +
        `${report.labourHours} hours at the bench`,
    );
  });
});

// ---------------------------------------------------------------------------
// (dd) The helper's dirty hall day (PIOTR, 18.09; CLAUDE.md T20 2.8, 7)
// ---------------------------------------------------------------------------

/** A helper on the books and a cleaning threshold the dust can never reach, so the scripted player
 *  never presses Clean up and whatever sweeping happens is the engine's and the helper's. One
 *  joiner beside him with the piece on his bench, because a hall where nothing is cut fills no
 *  bag, and a joiner is at his saw from 8:00 where the owner is at his desk until the post is
 *  answered. */
const HELPER_DAY: Policy = {
  ...CAREFUL,
  maxOpenJobs: 0,
  cleanAbove: 101,
  hireJoiner: true,
  joiners: 1,
  hireHelper: true,
  stockSheets: 60,
};

/** 10:00, which is where the brief puts the dirt, and the band it is dirtied to: dirty to the eye
 *  and dirty to the engine, which is what the owner used to be asked about. The bags fill earlier,
 *  on the morning's cutting, once the lorry is off the yard: three jobs of work for one man in one
 *  day, which is what 2.8 is about. */
const DIRTY_AT_MINUTE = 120;
const DIRTIED_TO = 75;

interface HelperDay {
  morning: GameState;
  evening: GameState;
  helper: Worker;
  asked: string[];
  ownerHeld: string[];
  filledAt: number | null;
  bagsAt: number | null;
  broomAt: number | null;
  /** Every question the day put to the player, so the scenario can say which were never put. */
  seen: GameEvent[];
}

function theHelper(state: GameState): Worker {
  const helper = state.workers.find((worker) => worker.role === 'helper');
  if (helper === undefined) throw new Error('no helper on the books');
  return helper;
}

/** The day the brief asks for: a lorry in the yard from 8:00, a hall that stops being clean at
 *  10:00, and the bags on the edge of full so the next minute of the saw tips them over. */
function helperDay(): HelperDay {
  const seen: GameEvent[] = [];
  let state = playUntilDay(newGame({ seed: SEED, difficulty: 'veryEasy' }), 8, HELPER_DAY, seen);
  state.enquiries = [];
  const enquiry = placeEnquiry(state, { price: 20000, basePrice: 20000, deadlineDays: 200 });
  state = acceptNow(state, enquiry.id, false);
  const job = state.jobs[state.jobs.length - 1];
  if (job === undefined) throw new Error('no piece on the bench');
  job.stage = 'ready';
  // The joiner stands at it from 8:00, so the saw runs all morning and the hall fills its own bag.
  const man = joiners(state)[0];
  if (man === undefined) throw new Error('no joiner on the books');
  state = act(state, { type: 'ASSIGN_JOB', jobId: job.id, workerId: man.id });
  // The lorry is ordered for the next working day, so the day the scenario watches opens with the
  // pallet at the gate and the unloading on the list.
  const arriveDay = nextWorkingDay(state.clock.day);
  state.deliveries.push({
    id: 'del-dd',
    jobId: null,
    sheets: 12,
    orderedDay: state.clock.day,
    pricePaid: 0,
    arriveDay,
    arrived: false,
    unloaded: false,
    bespoke: false,
    overflowSheets: 0,
  });
  while (state.clock.day < arriveDay) state = playDay(state, HELPER_DAY, seen);
  const morning = state;
  const asked: string[] = [];
  let bagged = false;
  let dirtied = false;
  let filledAt: number | null = null;
  let bagsAt: number | null = null;
  const ownerHeld: string[] = [];
  let broomAt: number | null = null;
  const evening = playDay(morning, HELPER_DAY, seen, {
    step: 1,
    watch: (current) => {
      // The three things the day throws at him, in the order a day throws them. The lorry is
      // first and it is the engine's own; the bags go to the brim the minute he is done with it,
      // which is a morning of the saw running, and the hall stops being clean at 10:00. Each is
      // set a minute before the engine sees it, so the reading below starts the minute after:
      // what a scenario writes into the state in one go, a played day arrives at a fraction at a
      // time.
      if (!bagged) {
        const lorry = current.tasks.some((task) => task.kind === 'unload' && !task.done);
        if (!lorry && theHelper(current).taskId === null && current.clock.minute > 0) {
          // A hair under the brim: the next minute of the saw fills them, which is how a hall
          // really fills a bag, so `raiseBagsFull` is reached the way a played day reaches it.
          current.bagFillM3 = bagStore(current).capacityM3 - 0.005;
          filledAt = current.clock.minute;
          bagged = true;
        }
        return;
      }
      if (!dirtied && current.clock.minute >= DIRTY_AT_MINUTE) {
        current.dust = DIRTIED_TO;
        dirtied = true;
        return;
      }
      if (bagsAt === null && theHelper(current).taskId !== null) bagsAt = current.clock.minute;
      // Anything of the helper's the owner is holding this minute, which is the other half of
      // "the owner never asked": not a chip with a button, and not a job of work in his hands.
      const held = current.tasks.find((task) => task.id === current.owner.currentTaskId);
      if (held !== undefined && (held.kind === 'cleaning' || held.kind === 'emptyBags' || held.kind === 'unload')) {
        ownerHeld.push(`${formatTime(current.clock.minute)} ${held.label}`);
      }
      if (broomAt === null && cleanerAtWork(current) !== null) broomAt = current.clock.minute;
      // A chip that asks the owner is one the game draws a button on: the hall's own list says so
      // with `inHand`, and `chipAction` in src/ui/app.ts hangs the button on exactly that
      // (CLAUDE.md T19 2.7, T20 2.8). This counts every one the day drew.
      for (const problem of hallProblems(current)) {
        if (problem.kind !== 'dirty' && problem.kind !== 'bags') continue;
        if (problem.inHand === true) continue;
        asked.push(`${formatTime(current.clock.minute)} ${problem.text}`);
      }
    },
  });
  return { morning, evening, helper: theHelper(evening), asked, ownerHeld, filledAt, bagsAt, broomAt, seen };
}

const DD = helperDay();

describe('(dd) the helper s dirty hall day, with a lorry in the yard', () => {
  it('opens with him on duty, a pallet at the gate and a hall nobody has dirtied yet', () => {
    expect(helperOnDuty(DD.morning)).toBe(true);
    expect(isWorkingDay(DD.morning.clock.day)).toBe(true);
    expect(DD.morning.deliveries.some((delivery) => delivery.arrived && !delivery.unloaded)).toBe(
      true,
    );
    expect(dustBand(DD.morning.dust).label).toBe('clean');
  });

  it('is clean by the time the men go home, with the bags emptied and the lorry off the yard', () => {
    // Every one of the three is his, in the same day, without the player lifting a finger: the
    // cleaning threshold of the scripted player is out of the dust's reach all day.
    expect(dustBand(DD.evening.dust).label).toBe('clean');
    // Not a pile of sawdust on the floor, which is the dirt Piotr says he can see: the renderer
    // paints one pile per ten points of dust and the hall ends the day under the first of them.
    // It is not a flat nought, because the saw goes on cutting after the sweep and a working hall
    // makes dust all afternoon; it is the floor swept and then used (CLAUDE.md T20 2.8).
    expect(sawdustPiles(DD.evening.dust)).toBe(0);
    expect(DD.evening.dust).toBeLessThan(5);
    // Emptied, and used again after: the saw goes on cutting all afternoon, so the store holds a
    // fraction of one bag by five o'clock where it held the brim at nine. From v46 the helper
    // starts on the bags at 80% and the saw never stops for them, so the afternoon's dust is a
    // little more than it was (a tenth of a bag and a bit).
    expect(bagStore(DD.evening).full).toBe(false);
    expect(bagStore(DD.evening).fillM3).toBeLessThan(bagStore(DD.evening).capacityM3 / 8);
    expect(DD.evening.deliveries.every((delivery) => delivery.unloaded)).toBe(true);
    for (const kind of ['cleaning', 'emptyBags', 'unload'] as const) {
      const done = DD.evening.tasks.filter((task) => task.kind === kind && task.done);
      expect(done.length, kind).toBeGreaterThan(0);
      for (const task of done) expect(task.doneBy, `${kind} ${task.id}`).toBe(DD.helper.id);
    }
  });

  it('never asks the owner: not a job of work of his, not an event, not a chip with a button', () => {
    // Not one minute of the day with the broom, a bag or the lorry in his hands: every minute of
    // it was watched and the list of what he was holding is empty.
    expect(DD.ownerHeld).toEqual([]);
    expect(DD.evening.owner.currentTaskId).toBeNull();
    // The question the game used to put to him is not put at all: with a helper on duty
    // `raiseBagsFull` delegates instead of asking (CLAUDE.md T20 2.8.1).
    expect(DD.seen.some((event) => event.kind === 'bagsFull')).toBe(false);
    // And no chip over the floor asked him either, from the minute after the bags went to the
    // brim, which is the first minute the engine has seen either of them: the bags and then the
    // broom were in the helper's hands every minute they were a thing the hall wanted doing, so
    // every chip the day drew about them was a statement and not a question.
    expect(DD.asked).toEqual([]);
    expect(DD.bagsAt).not.toBeNull();
    expect(DD.broomAt).not.toBeNull();
    console.log(
      '(dd) THE HELPER S DIRTY HALL DAY\n' +
        `bags at the brim at ${formatTime(DD.filledAt ?? 0)}, in his hands at ` +
        `${formatTime(DD.bagsAt ?? 0)}; ` +
        `dirtied to ${DIRTIED_TO} at ${formatTime(DIRTY_AT_MINUTE)}, broom in hand at ` +
        `${formatTime(DD.broomAt ?? 0)}\n` +
        `dust at the end of the day ${DD.evening.dust}, band "${dustBand(DD.evening.dust).label}"\n` +
        `bags ${bagStore(DD.evening).fillM3} of ${bagStore(DD.evening).capacityM3} m3\n` +
        `${DD.helper.name} did: ${DD.evening.tasks
          .filter((task) => task.done && task.doneBy === DD.helper.id)
          .map((task) => task.label)
          .join(', ')}\n` +
        `chips that asked the owner: ${DD.asked.length}, ` +
        `minutes of it in the owner's hands: ${DD.ownerHeld.length}`,
    );
  });
});

// ---------------------------------------------------------------------------
// (ee) The fifty thousand pound bespoke job (PIOTR; CLAUDE.md T20 2.16, 7)
// ---------------------------------------------------------------------------

/** Nothing off the board and nothing on the rack: the month is the one job and its one lorry. */
const BESPOKE_MONTH: Policy = {
  ...CAREFUL,
  maxOpenJobs: 0,
  stockSheets: 0,
};

/** What the rack held, and what went into storage for the job, the minute the lorry was empty. */
interface Landed {
  day: number;
  rack: number;
  stored: number;
  shortfall: number;
  reserved: number;
  used: number;
}

interface BespokeRun {
  state: GameState;
  job: Job;
  orders: number;
  unloads: number;
  landed: Landed;
  seen: GameEvent[];
}

function bespokeRun(): BespokeRun {
  const seen: GameEvent[] = [];
  let state = playUntilDay(newGame({ seed: SEED, difficulty: 'veryEasy' }), 4, BESPOKE_MONTH, seen);
  state.enquiries = [];
  const enquiry = placeEnquiry(state, {
    price: 50000,
    basePrice: 50000,
    deadlineDays: 200,
    bespokeMaterial: true,
  });
  state = acceptNow(state, enquiry.id, false);
  const opened = state.jobs[state.jobs.length - 1];
  if (opened === undefined) throw new Error('no job on the books');
  const jobId = opened.id;
  // Played on until the job's own lorry has come and gone: the drawing, the take off, the order,
  // the road and the unloading are all the scripted player's own doing. What the rack and the
  // pallet held the minute the last sheet came off the lorry is written down as it happens: the
  // saw starts cutting into them the same afternoon, so a reading taken at the end of the day
  // would be measuring the cutting and not the unloading.
  let guard = 0;
  let landed: Landed | null = null;
  const takeStock = (current: GameState): void => {
    if (landed !== null) return;
    const delivery = current.deliveries.find(
      (entry) => entry.jobId === jobId && entry.unloaded,
    );
    if (delivery === undefined) return;
    const watched = current.jobs.find((entry) => entry.id === jobId);
    if (watched === undefined) return;
    landed = {
      day: current.clock.day,
      rack: current.stock.sheets,
      stored: current.stock.tempStorageSheets,
      shortfall: shortfallOf(watched),
      reserved: watched.sheetsReserved,
      used: watched.sheetsUsed,
    };
  };
  while (
    guard < 80 &&
    !state.deliveries.some((delivery) => delivery.jobId === jobId && delivery.unloaded)
  ) {
    state = playDay(state, BESPOKE_MONTH, seen, { step: 5, watch: takeStock });
    guard += 1;
  }
  takeStock(state);
  if (landed === null) throw new Error('the job s own lorry never came');
  const job = state.jobs.find((entry) => entry.id === jobId);
  if (job === undefined) throw new Error('the job has gone off the books');
  const orders = state.deliveries.filter((delivery) => delivery.jobId === jobId).length;
  const unloads = state.tasks.filter(
    (task) =>
      task.kind === 'unload' &&
      task.deliveryId !== null &&
      state.deliveries.some(
        (delivery) => delivery.id === task.deliveryId && delivery.jobId === jobId,
      ),
  ).length;
  return { state, job, orders, unloads, landed, seen };
}

const EE = bespokeRun();

describe('(ee) a fifty thousand pound bespoke job and a fifty place rack', () => {
  it('wants more sheets than the rack has places, and orders them once', () => {
    expect(EE.job.bespokeMaterial).toBe(true);
    expect(EE.job.price).toBe(50000);
    const places = rackCapacity(EE.state);
    expect(places).toBe(50);
    expect(EE.job.sheets).toBeGreaterThan(places);
    // One press of Order for this job, one lorry, one unloading, and the button was never offered
    // a second time while the first was on the road (CLAUDE.md T20 2.16).
    expect(EE.orders).toBe(1);
    expect(EE.unloads).toBe(1);
  });

  it('is whole after that one unload: nothing short, nothing written off, the rest in storage', () => {
    const places = rackCapacity(EE.state);
    // The reading the minute the lorry was empty: nothing short, and every sheet of it the job's.
    expect(EE.landed.shortfall).toBe(0);
    expect(EE.landed.rack).toBe(places);
    expect(EE.landed.stored).toBe(EE.job.sheets - places);
    expect(EE.landed.reserved + EE.landed.used).toBe(EE.job.sheets);
    // And it stays whole while the saw cuts into it: what would not fit went into storage for the
    // job and comes back on the morning fetch, so what it has cut plus what it holds is the load.
    expect(shortfallOf(EE.job)).toBe(0);
    expect(EE.job.sheetsReserved + EE.job.sheetsUsed).toBe(EE.job.sheets);
    expect(orderForJobCheck(EE.state, EE.job)).toEqual({ ok: false, reason: 'Nothing short' });
    // None of it was ever left standing in the yard to be lost by morning: from Turn 24 nothing
    // is, on a job's lorry or a stock one (CLAUDE.md T20 2.16, T24 2.8).
    expect(EE.state.deliveries.every((entry) => entry.overflowSheets === 0)).toBe(true);
    console.log(
      '(ee) THE FIFTY THOUSAND POUND BESPOKE JOB\n' +
        `sheets the job wants ${EE.job.sheets}, places on the rack ${places}\n` +
        `orders ${EE.orders}, unloads ${EE.unloads}, unloaded on day ${EE.landed.day}\n` +
        `the minute the lorry was empty: ${EE.landed.rack} on the rack, ${EE.landed.stored} in ` +
        `storage for it, shortfall ${EE.landed.shortfall}, written off in the yard 0`,
    );
  });
});

// ---------------------------------------------------------------------------
// (ff) Three services on one saw (PIOTR, 18.09; CLAUDE.md T20 2.9, 7)
// ---------------------------------------------------------------------------

/** One big piece at the cutting stage and nothing else: the saw is what makes the day's work, so
 *  the day it goes away is felt in the piece and not only in the cash. */
const SAW_MONTH: Policy = {
  ...CAREFUL,
  maxOpenJobs: 0,
  cleanAbove: 101,
  stockSheets: 80,
};

interface ServiceRound {
  day: number;
  cost: number;
  life: number;
  gain: number;
  outUntil: number;
  leftAtTheCall: number;
  leftThatEvening: number;
  leftTheNextEvening: number;
  blocked: string | null;
  /** The piece's one pace with the saw away, and the next working day with it back (v53). */
  paceAway: number;
  paceBack: number;
}

interface SawMonth {
  original: number;
  rounds: ServiceRound[];
  state: GameState;
  bills: number[];
}

function sawMonth(): SawMonth {
  const seen: GameEvent[] = [];
  let state = playUntilDay(newGame({ seed: SEED, difficulty: 'veryEasy' }), 4, SAW_MONTH, seen);
  state.enquiries = [];
  const enquiry = placeEnquiry(state, { price: 60000, basePrice: 60000, deadlineDays: 300 });
  state = acceptNow(state, enquiry.id, false);
  const job = state.jobs[state.jobs.length - 1];
  if (job === undefined) throw new Error('no piece on the bench');
  job.stage = 'ready';
  const jobId = job.id;
  const left = (current: GameState): number => {
    const watched = current.jobs.find((entry) => entry.id === jobId);
    if (watched === undefined) throw new Error('the piece has gone off the books');
    return watched.labourRemaining;
  };
  const watched = (current: GameState): Job => {
    const entry = current.jobs.find((one) => one.id === jobId);
    if (entry === undefined) throw new Error('the piece has gone off the books');
    return entry;
  };
  const original = originalLifeOf(theSaw(state));
  const rounds: ServiceRound[] = [];
  // The owner is at the bench and the piece is moving before the first service is called: a saw
  // taken away from a man who was not standing at it would prove nothing about the day it costs.
  let settling = 0;
  while (settling < 20 && watched(state).stage !== 'inProduction') {
    state = playDay(state, SAW_MONTH, seen);
    settling += 1;
  }
  for (let round = 1; round <= 3; round += 1) {
    // A working day with the saw on the floor: the player calls the service in from the Machines
    // page, which is the one path there is (CLAUDE.md T20 2.9).
    while (!isWorkingDay(state.clock.day) || machineIsOut(theSaw(state), state.clock.day)) {
      state = playDay(state, SAW_MONTH, seen);
    }
    const day = state.clock.day;
    const leftAtTheCall = left(state);
    state = act(state, { type: 'SERVICE_MACHINE', equipmentId: theSaw(state).id });
    const saw = theSaw(state);
    const outUntil = saw.inServiceUntilDay ?? 0;
    const life = saw.enduranceHours;
    const blocked = hallBlock(state, watched(state));
    const paceAway = jobPace(state, watched(state));
    // The rest of that day, and then the next working day beside it.
    state = playDay(state, SAW_MONTH, seen);
    const leftThatEvening = left(state);
    while (!isWorkingDay(state.clock.day)) state = playDay(state, SAW_MONTH, seen);
    const paceBack = jobPace(state, watched(state));
    state = playDay(state, SAW_MONTH, seen);
    rounds.push({
      day,
      cost: serviceCostFor(saw),
      life,
      gain: life - (rounds[rounds.length - 1]?.life ?? original),
      outUntil,
      leftAtTheCall,
      leftThatEvening,
      leftTheNextEvening: left(state),
      blocked,
      paceAway,
      paceBack,
    });
  }
  const bills = state.ledger
    .filter((entry) => entry.label.endsWith('service'))
    .map((entry) => pounds(Math.abs(entry.amount)));
  return { original, rounds, state, bills };
}

const FF = sawMonth();

describe('(ff) three services on one saw', () => {
  it('buys half of the original life, then a quarter of it, then an eighth', () => {
    const wanted = [0.5, 0.25, 0.125];
    for (const [index, round] of FF.rounds.entries()) {
      expect(round.life, `service ${index + 1}`).toBe(lifeAfterServices(FF.original, index + 1));
      // The extension is a share of the ORIGINAL life and of nothing else, to the hour the
      // rounding leaves it at, so the third service never buys as much as the first.
      expect(
        Math.abs(round.gain - FF.original * (wanted[index] ?? 0)),
        `extension ${index + 1}`,
      ).toBeLessThanOrEqual(1);
    }
    expect(theSaw(FF.state).serviceCount).toBe(3);
    // Three of them together are less than the original life again: it is halves all the way down.
    const bought = (FF.rounds[2]?.life ?? 0) - FF.original;
    expect(bought).toBeLessThan(FF.original);
  });

  it('costs a tenth of what the saw cost, every time, and the bill goes out at the call', () => {
    const saw = theSaw(FF.state);
    const tenth = pounds(saw.purchasePrice * SERVICE_COST_FRACTION);
    expect(FF.bills).toHaveLength(3);
    for (const bill of FF.bills) expect(bill).toBe(tenth);
    for (const round of FF.rounds) expect(pounds(round.cost)).toBe(tenth);
    // The used saw of the day 1 list cost 1,800, so a service is 180 and three of them are 540.
    expect(saw.purchasePrice).toBe(1800);
    expect(tenth).toBe(180);
  });

  it('takes the saw out for one working day each time, and the piece goes on without it', () => {
    for (const [index, round] of FF.rounds.entries()) {
      expect(round.outUntil, `service ${index + 1}`).toBe(nextWorkingDay(round.day));
      // Nothing stops the piece and the job card has nothing to say. v52 stopped the stage the saw
      // makes, 'table saw is in for a service', and not one minute of the piece was made until the
      // saw was back (PIOTR, 24.09: "they never wait for the saw"; v53).
      expect(round.blocked, `service ${index + 1}`).toBe('');
      // The saw's share of the piece goes at the by hand pace while it is away, so the whole piece
      // goes at 0.8 of the owner's minute, and at 0.88 with the saw back. 0.89 and 0.99 until v55:
      // from v55 the piece is four even quarters and this hall has no spindle moulder, so its
      // moulding quarter goes by hand whether the saw is in or out (PIOTR, 24.09).
      expect(round.paceAway, `service ${index + 1}`).toBeCloseTo(0.8, 4);
      expect(round.paceBack, `service ${index + 1}`).toBeCloseTo(0.8786, 4);
      // So the day the saw is away moves the piece on, by less than the day it is back.
      const away = round.leftAtTheCall - round.leftThatEvening;
      const back = round.leftThatEvening - round.leftTheNextEvening;
      expect(away, `service ${index + 1}`).toBeGreaterThan(0);
      expect(away, `service ${index + 1}`).toBeLessThan(back);
    }
    // The first of them in figures: 256.00 of the piece's labour the day the saw was away, 281.16
    // the day it was back, which is 0.8 against 0.88 (284.44 and 315.84 until v55, the paces
    // above). v52 made 0 and then 304.
    const first = FF.rounds[0];
    if (first === undefined) throw new Error('three services are wanted');
    expect(first.leftAtTheCall - first.leftThatEvening).toBeCloseTo(256.0, 2);
    expect(first.leftThatEvening - first.leftTheNextEvening).toBeCloseTo(281.16, 2);
    expect(machinesInService(FF.state)).toEqual([]);
    console.log(
      '(ff) THREE SERVICES ON ONE SAW\n' +
        `the used table saw: ${formatMoney(theSaw(FF.state).purchasePrice)}, ` +
        `${FF.original} h of life\n` +
        FF.rounds
          .map(
            (round, index) =>
              `service ${index + 1} on day ${round.day}: ${formatMoney(round.cost)}, ` +
              `life ${round.life} h (+${round.gain} h, ` +
              `${Math.round((round.gain / FF.original) * 1000) / 10}% of the original), ` +
              `out until day ${round.outUntil}, the piece went on at ` +
              `${Math.round(round.paceAway * 100) / 100} and not ${Math.round(round.paceBack * 100) / 100}`,
          )
          .join('\n'),
    );
  });
});

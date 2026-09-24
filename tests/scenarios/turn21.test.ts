// The Turn 21 scenarios of CLAUDE.md T21 3, T21-C2, as Turn 22 leaves them: (gg) four men, one saw
// and two jobs, with nobody moved between them (CLAUDE.md T22 2.6), (hh) a drop of a fifty thousand
// pound job that closes the company, and (ii) a company under the overdraft limit that the amount
// closes before the run of days can reach thirty. The arrears (ii) was written around are gone from
// the game tonight (T22 2.1), and the two played halls that answer for the new money are (jj) and
// (kk) of tests/scenarios/turn22.test.ts.
//
// The shape is the one Turns 13, 17, 19 and 20 used: a month, or a day, played through the scripted
// player of autopilot.ts, off a hall that is stood up by playing the opening days and never by
// writing the state out by hand, so what the assertions read is what a player would have seen. Where
// a scenario does write one figure onto the state it says which figure it is, whose figure it is and
// why the played route cannot reach it. Every figure in a comment was measured on this build.
//
// The unit tests of the same three rules are tests/engine/nobodyMoved.test.ts,
// tests/ui/dropCard.test.ts and tests/engine/bankruptcy.test.ts. Nothing here repeats them: they
// drive one function with a position written into it, and these three play the hall and read the
// meters, the cards and the words over the men's heads that the player is actually shown.

import { describe, expect, it } from 'vitest';
import { CAREFUL, IDLE, type Policy, playDay, playUntilDay } from './autopilot';
import { acceptNow, act, newGame, placeEnquiry, withOnlyCuttingLeft } from '../helpers';
import {
  BANKRUPTCY_DAYS_BELOW_LIMIT,
  BANKRUPTCY_LIMIT_FACTOR,
  MINUTES_PER_WORKING_DAY,
} from '../../src/engine/constants';
import {
  applyAction,
  currentStage,
  dropReputationCost,
  formatMoney,
  formatTime,
  joiners,
  stageText,
  STATION_HOME,
} from '../../src/engine/index';
import { bankruptcyFloor } from '../../src/engine/economy';
import { bubbleFor } from '../../src/engine/bubbles';
import { shortageLine } from '../../src/engine/machines';
import { canHire } from '../../src/engine/staff';
import {
  depositCanBePaid,
  dropCardTitle,
  materialWrittenOff,
  accountAfterDrop,
  renderDropCard,
} from '../../src/ui/dropCard';
import { renderBankruptcyCard } from '../../src/ui/eventModal';
import type { DaySummary, GameEvent, GameState, Job, Worker } from '../../src/engine/index';

const SEED = 20260911;

/** The day's own record, which is where the efficiency the top bar showed that day is kept
 *  (`recordDay` in src/engine/game.ts): a played day rolls into the next one and the live tally is
 *  cleared with the morning, so the figures are read off the record and not off `dayStats`. */
function recordOf(state: GameState, day: number): DaySummary {
  const record = state.days.find((entry) => entry.day === day);
  if (record === undefined) throw new Error(`no record of day ${day}`);
  return record;
}

function jobOn(state: GameState, jobId: string): Job {
  const job = state.jobs.find((entry) => entry.id === jobId);
  if (job === undefined) throw new Error(`the job ${jobId} has gone off the books`);
  return job;
}

// ---------------------------------------------------------------------------
// (gg) Four men, one saw, two jobs (PIOTR; CLAUDE.md T22 2.6, and T21 2.7 before it)
// ---------------------------------------------------------------------------

/** The fourth man. Three of the four adverts of day 1 come back with a joiner and the fourth is
 *  refused by the crew limit, in the hall's own words: `Crew 4 / 4, floor limited`, off a free floor
 *  that reads 112 m2 on day 1 at one person per 24 m2 (CLAUDE.md T13 3.10), which is the owner and
 *  his three men. From day 2 the same floor reads 124 m2, once the day 1 kit is off the lorry and
 *  standing where it belongs, and four men and the owner are inside the limit. So the fourth advert
 *  goes out again on day 3 and he is on the books on day 4. This is the hall doing the hiring and
 *  not the test: the one path is the player's own `HIRE`, and the engine's own gate takes it or
 *  refuses it. */
function topUpTheCrew(state: GameState, day: number): GameState {
  if (day < 3 || joiners(state).length >= 4) return state;
  const pending = state.tasks.filter((task) => task.kind === 'hiring' && !task.done).length;
  if (joiners(state).length + pending >= 4) return state;
  if (!canHire(state, 'joiner', 'novice').ok) return state;
  return applyAction(state, { type: 'HIRE', role: 'joiner', tier: 'novice' });
}

/** Four joiners with no experience, one saw between them, sheets on the rack and nothing taken off
 *  the board: the two jobs the scene wants are put on the books by hand at the end of the opening
 *  days, so the hall is the section's hall and not whatever the board happened to offer. Very easy,
 *  because four men and their kit is a lot of money on day 1 and the day is about the places at the saw. */
const FOUR_MEN_ONE_SAW: Policy = {
  ...CAREFUL,
  maxOpenJobs: 0,
  hireJoiner: true,
  joiners: 4,
  extraSaws: 0,
  stockSheets: 120,
  onDay: topUpTheCrew,
};

/** One reading of a man standing at a machine's waiting cell, taken every minute of the day. */
interface Stood {
  at: string;
  who: string;
  waitingFor: string | null;
}

interface FourMen {
  /** The hall at 08:00, the minute the scene is set and before a minute of it has been worked. */
  opening: GameState;
  /** The same hall when the men have gone home. */
  evening: GameState;
  cuttingId: string;
  benchId: string;
  men: Worker[];
  record: DaySummary;
  stood: Stood[];
  /** What the mark over each man's head said that day, each line once (CLAUDE.md T22 2.5). */
  said: Map<string, string[]>;
}

/** The scene of CLAUDE.md T21 2.7, played: four men, one saw, two jobs, two men on each. The first
 *  job stands at its cutting stage, which wants the one saw; the second stands at its assembly,
 *  which wants a bench and no machine at all, unless the run asks for both of them at the saw, which
 *  is the control and is the one line that differs between the two runs.
 *
 *  Nothing about the men, the saw or the benches is written: they were bought and taken on by the
 *  scripted player over the opening days. What is written is where each job stands in its own making
 *  (`labourRemaining`), which is how every scenario since Turn 13 has put a job at a chosen stage. */
function fourMenTwoJobs(benchWork: boolean): FourMen {
  const seen: GameEvent[] = [];
  let state = playUntilDay(
    newGame({ seed: SEED, difficulty: 'veryEasy' }),
    10,
    FOUR_MEN_ONE_SAW,
    seen,
  );
  state.enquiries = [];
  for (const [name, price] of [
    ['Small kitchen', 30000],
    ['Garage shelves', 30000],
  ] as const) {
    const enquiry = placeEnquiry(state, { name, price, basePrice: price, deadlineDays: 200 });
    state = acceptNow(state, enquiry.id, false);
  }
  const ids = state.jobs.map((job) => job.id);
  const cuttingId = ids[0];
  const benchId = ids[1];
  if (cuttingId === undefined || benchId === undefined) throw new Error('two jobs are wanted here');
  for (const job of state.jobs) job.stage = 'ready';
  const men = joiners(state);
  if (men.length < 4) throw new Error('four joiners are wanted here');
  const crew = men.map((worker) => worker.id);
  state = act(state, { type: 'ASSIGN_JOB', jobId: cuttingId, workerId: crew[0] ?? null });
  state = act(state, { type: 'ADD_TO_JOB', jobId: cuttingId, workerId: crew[1] ?? '' });
  state = act(state, { type: 'ASSIGN_JOB', jobId: benchId, workerId: crew[2] ?? null });
  state = act(state, { type: 'ADD_TO_JOB', jobId: benchId, workerId: crew[3] ?? '' });
  // `labourRemaining` counts what is left, so a twentieth of the way through its making is the
  // cutting stage and fifty five per cent of the way through is the assembly one, which is the
  // reading tests/engine/nobodyMoved.test.ts takes of the same two stages.
  jobOn(state, cuttingId).labourRemaining = jobOn(state, cuttingId).labourValue * 0.95;
  jobOn(state, benchId).labourRemaining =
    jobOn(state, benchId).labourValue * (benchWork ? 0.45 : 0.95);
  // The bag of work (v37) would send the second man of a cutting job to its machining, and from
  // v43 to its assembly, while the saw is taken; this scene is about the saw, so a job at its
  // cutting has nothing else left and the saw is its one open station. The bench job keeps its
  // assembly, which is where the scene wants it.
  withOnlyCuttingLeft(state, benchWork ? [cuttingId] : [cuttingId, benchId]);
  const opening = state;
  const played = opening.clock.day;
  const stood: Stood[] = [];
  const said = new Map<string, Set<string>>();
  const evening = playDay(opening, FOUR_MEN_ONE_SAW, seen, {
    step: 1,
    watch: (current) => {
      for (const worker of current.workers) {
        // A man with no place stands at his home cell and says which machine (CLAUDE.md T25 2.3).
        const waitingFor =
          worker.station === STATION_HOME && worker.noPlaceFor !== '' ? worker.noPlaceFor : null;
        if (waitingFor !== null) {
          stood.push({ at: formatTime(current.clock.minute), who: worker.name, waitingFor });
        }
        const bubble = bubbleFor(current, worker.id);
        if (bubble === null) continue;
        const words = said.get(worker.name) ?? new Set<string>();
        words.add(bubble.text);
        said.set(worker.name, words);
      }
    },
  });
  return {
    opening,
    evening,
    cuttingId,
    benchId,
    men: joiners(opening),
    record: recordOf(evening, played),
    stood,
    said: new Map([...said].map(([who, words]) => [who, [...words].sort()])),
  };
}

/** The section's own scene, and beside it the same hall with the second job at the saw as well:
 *  one line of difference, so what the two runs differ by is the work there was to be had and
 *  nothing else. */
const GG = fourMenTwoJobs(true);
const GG_QUEUE = fourMenTwoJobs(false);

/** The minutes one man put into the making of anything that day. */
function minutesOf(state: GameState, name: string): number {
  return joiners(state).find((worker) => worker.name === name)?.productionMinutes ?? -1;
}

describe('(gg) four men, one saw and two jobs, on Very easy', () => {
  it('stands the section s hall up by playing it: four men, one saw, two jobs, two men on each', () => {
    expect(GG.men).toHaveLength(4);
    // One saw in the hall and no second one, which is the whole of the scene: a machine serves one
    // man at a time (CLAUDE.md T7 3.1).
    expect(GG.opening.equipment.filter((item) => item.specId === 'tableSaw')).toHaveLength(1);
    expect(GG.opening.jobs).toHaveLength(2);
    const cutting = jobOn(GG.opening, GG.cuttingId);
    const bench = jobOn(GG.opening, GG.benchId);
    expect(cutting.name).toBe('Small kitchen');
    expect(bench.name).toBe('Garage shelves');
    expect(currentStage(GG.opening, cutting)?.id).toBe('cutting');
    expect(currentStage(GG.opening, bench)?.id).toBe('assembly');
    expect(cutting.assignees).toEqual([GG.men[0]?.id, GG.men[1]?.id]);
    expect(bench.assignees).toEqual([GG.men[2]?.id, GG.men[3]?.id]);
    // The control is the same hall with one line changed: its second job stands at its cutting
    // stage too, so there is nothing in the hall that does not want the saw.
    expect(currentStage(GG_QUEUE.opening, jobOn(GG_QUEUE.opening, GG_QUEUE.benchId))?.id).toBe(
      'cutting',
    );
    expect(GG_QUEUE.opening.cash).toBe(GG.opening.cash);
  });

  it('works all four all day, and nobody waits for the one saw', () => {
    // The day's own meters, which are the ones the top bar showed him: five seats (the owner and
    // his four men) over the 480 minutes of the working day is 2,400 possible, and 1,920 of them
    // were worked, which is four men times every minute of the day. From v53 nobody waits for the
    // saw: the second man of the cutting job works wherever the hall has a free place, and the one
    // saw costs the hall its pace instead (PIOTR, 24.09). On v52 his whole day, 480 minutes, was
    // lost to no place and the day worked 1,440.
    expect(GG.record.efficiency.possible).toBe(2400);
    expect(GG.record.efficiency.worked).toBe(1920);
    expect(GG.record.efficiency.lost.noPlace).toBe(0);
    expect(GG.record.efficiency.lost.noMaterial).toBe(0);
    // The 480 left over is the owner's own seat. He worked the whole of his day, all 480 minutes of
    // it, but on the jobs of work on his own list and never at a bench, so the seat at the benches
    // is nobody at a station and not a man standing about.
    expect(GG.record.efficiency.lost.noPeople).toBe(480);
    expect(GG.record.minutesWorked).toBe(MINUTES_PER_WORKING_DAY);
    for (const man of GG.men) {
      expect(minutesOf(GG.evening, man.name), man.name).toBe(MINUTES_PER_WORKING_DAY);
    }
  });

  it('leaves every man on the job he was assigned to, all day', () => {
    const cutting = jobOn(GG.evening, GG.cuttingId);
    const bench = jobOn(GG.evening, GG.benchId);
    // Nobody was moved: the two men of the cutting job are still its two men at the end of the day,
    // and the two at the bench are still its own [PIOTR, 19.09] (CLAUDE.md T22 2.6).
    expect(cutting.assignees).toEqual([GG.men[0]?.id, GG.men[1]?.id]);
    expect(bench.assignees).toEqual([GG.men[2]?.id, GG.men[3]?.id]);
    expect(GG.evening.workers.find((worker) => worker.id === GG.men[1]?.id)?.jobId).toBe(GG.cuttingId);
    // Two men's day into each job, 960 minutes apiece (v53; on v52 the cutting job had 480, one
    // man's, because its second man stood).
    expect(cutting.productionMinutes).toBe(960);
    expect(bench.productionMinutes).toBe(960);
  });

  it('has nobody at his home cell for want of a place, any minute of the day', () => {
    // Every minute of the day was watched and the men were read where they stood: not one reading
    // of a man with no place (v53; 480 on v52, all of them the second man of the cutting job).
    expect(GG.stood).toEqual([]);
    expect(jobOn(GG.evening, GG.cuttingId).blockedBy).toBe('');
    expect(jobOn(GG.evening, GG.benchId).blockedBy).toBe('');
    // The bar still says where each job has got to (PIOTR, 24.09: "the bar shows the stages").
    expect(stageText(GG.evening, jobOn(GG.evening, GG.cuttingId))).toBe('Cutting');
    expect(stageText(GG.evening, jobOn(GG.evening, GG.benchId))).toBe('Assembly');
  });

  it('marks nobody, and says on the saw what one saw costs the crew', () => {
    // Nothing was wrong with any of the four, so nobody carried a mark all day (v53; on v52 the
    // second man of the cutting job carried `no place at the saw` all day). What the one saw
    // costs is written on the saw and on the Output sheet: the four men at work and one place
    // (PIOTR, 24.09: "me and two men is three"). v53 counted five, the owner among them though he
    // spends the day on his own list and never at a bench (below); from v54 the crew is the men at
    // work (v54).
    for (const man of GG.men) expect(GG.said.get(man.name), man.name).toBeUndefined();
    expect(shortageLine(GG.opening, 'tableSaw')).toBe('Too few saws for the crew: 4 men, 1 place, 3 work at 67%');
    console.log(
      '(gg) FOUR MEN, ONE SAW, TWO JOBS\n' +
        `the hall on day ${GG.opening.clock.day}: ${GG.men.length} joiners, ` +
        `${GG.opening.equipment.filter((item) => item.specId === 'tableSaw').length} saw, ` +
        `${GG.opening.stock.sheets} sheets on the rack\n` +
        `the day's meters: ${GG.record.efficiency.worked} minutes worked of ` +
        `${GG.record.efficiency.possible} possible, ` +
        `${GG.record.efficiency.lost.noPlace} lost to no place\n` +
        `Small kitchen took ${jobOn(GG.evening, GG.cuttingId).productionMinutes} minutes, ` +
        `Garage shelves ${jobOn(GG.evening, GG.benchId).productionMinutes}\n` +
        `on the saw: ${shortageLine(GG.opening, 'tableSaw')}`,
    );
  });
});

describe('(gg) the same hall with nothing in it but the saw s own work', () => {
  it('works all four men all day, and moves nobody', () => {
    // The control: both jobs at their cutting stage. On v52 one man cut and three stood, 480
    // minutes worked and 1,440 lost to no place. From v53 the job's stages are its bar and nobody
    // waits for one: the three the saw has no place for work the jobs at the edgebander and the
    // benches, 1,920 minutes worked and nothing lost (PIOTR, 24.09).
    expect(GG_QUEUE.record.efficiency.possible).toBe(2400);
    expect(GG_QUEUE.record.efficiency.worked).toBe(1920);
    expect(GG_QUEUE.record.efficiency.lost.noPlace).toBe(0);
    const cutting = jobOn(GG_QUEUE.evening, GG_QUEUE.cuttingId);
    const bench = jobOn(GG_QUEUE.evening, GG_QUEUE.benchId);
    expect(cutting.assignees).toEqual([GG_QUEUE.men[0]?.id, GG_QUEUE.men[1]?.id]);
    expect(bench.assignees).toEqual([GG_QUEUE.men[2]?.id, GG_QUEUE.men[3]?.id]);
    expect(cutting.productionMinutes).toBe(960);
    expect(bench.productionMinutes).toBe(960);
    for (const man of GG_QUEUE.men) {
      expect(minutesOf(GG_QUEUE.evening, man.name), man.name).toBe(MINUTES_PER_WORKING_DAY);
    }
  });

  it('says nothing over their heads, and nobody stands', () => {
    const cutting = jobOn(GG_QUEUE.evening, GG_QUEUE.cuttingId);
    const bench = jobOn(GG_QUEUE.evening, GG_QUEUE.benchId);
    expect(cutting.blockedBy).toBe('');
    expect(bench.blockedBy).toBe('');
    // Not one mark and not one reading of a man with no place, all day (v53; on v52 the three men
    // the saw had no place for said `no place at the saw` over their heads, 1,440 readings).
    expect([...GG_QUEUE.said.values()].flat()).toEqual([]);
    expect(GG_QUEUE.stood).toEqual([]);
    console.log(
      '(gg) THE SAME HALL WITH NOTHING BUT THE SAW S OWN WORK\n' +
        `the day's meters: ${GG_QUEUE.record.efficiency.worked} minutes worked of ` +
        `${GG_QUEUE.record.efficiency.possible} possible, ` +
        `${GG_QUEUE.record.efficiency.lost.noPlace} lost to no place\n` +
        `Small kitchen took ${cutting.productionMinutes} minutes, ` +
        `Garage shelves ${bench.productionMinutes}`,
    );
  });
});

// ---------------------------------------------------------------------------

/** Piotr's own evening of 18.09: he dropped a fifty thousand pound job with seven thousand in the
 *  bank, the deposit he owed went to arrears, the top bar kept saying -7,259 and the game played on.
 *  This is that evening, played, and it is line one of the cross check of CLAUDE.md T21 7. */
const DROP_MONTH: Policy = { ...CAREFUL, maxOpenJobs: 0, stockSheets: 0, reputation: 60 };

/** What Piotr had in the bank when he pressed Drop project [PIOTR, 18.09]. It is the one figure this
 *  scenario writes. The hall around it is played: the kit was bought, the job was taken, drawn and
 *  costed, its material was ordered and unloaded, and 39,714 of the deposit and the starting money
 *  was still in the account on the morning of the drop. Playing that 39,714 down to his 7,000 would
 *  mean buying a month of things nobody asked for, and the scenario would then be measuring the
 *  shopping and not the drop; the position is his and how it got there is not what the scene is
 *  about, which is the reading tests/engine/bankruptcy.test.ts takes of the same rule. */
const IN_THE_BANK = 7000;

interface DroppedJob {
  /** The hall on the morning of the drop, with his money in the account. */
  morning: GameState;
  /** The state the click left behind, still trading. */
  clicked: GameState;
  /** The next look the bank took, which is the close of the day he dropped it on. */
  closed: GameState;
  job: Job;
  dropDay: number;
  card: string;
}

function fiftyThousandDropped(): DroppedJob {
  const seen: GameEvent[] = [];
  let state = playUntilDay(newGame({ seed: SEED, difficulty: 'veryEasy' }), 4, DROP_MONTH, seen);
  state.enquiries = [];
  const enquiry = placeEnquiry(state, {
    name: 'Kitchen for the Hedges',
    price: 50000,
    basePrice: 50000,
    deadlineDays: 200,
  });
  state = acceptNow(state, enquiry.id, false);
  const opened = state.jobs[state.jobs.length - 1];
  if (opened === undefined) throw new Error('no job on the books');
  const jobId = opened.id;
  // Played on until the job's own lorry has come and gone, the way (ee) of Turn 20 does it: the
  // drawing, the take off, the order, the road and the unloading are all the scripted player's own
  // doing, so the material the card writes off is material that was really bought for this job.
  let guard = 0;
  while (
    guard < 80 &&
    !state.deliveries.some((delivery) => delivery.jobId === jobId && delivery.unloaded)
  ) {
    state = playDay(state, DROP_MONTH, seen);
    guard += 1;
  }
  state.cash = IN_THE_BANK;
  const morning = state;
  const dropDay = morning.clock.day;
  const clicked = act(morning, { type: 'DROP_JOB', jobId });
  // The rest of that day, and then the bank's own look at the company at the close of it.
  const closed = playDay(clicked, DROP_MONTH, seen);
  const event = closed.activeEvent;
  return {
    morning,
    clicked,
    closed,
    job: jobOn(morning, jobId),
    dropDay,
    card: event === null ? '' : renderBankruptcyCard(closed, event),
  };
}

const HH = fiftyThousandDropped();

/** The label and the figure of every row of the drop card, read out of the markup the card prints:
 *  these scenarios run without a DOM, so the rows are pulled with a pattern where
 *  tests/ui/dropCard.test.ts queries them. */
function cardRows(html: string): Array<[string, string]> {
  return [...html.matchAll(/<div class="row">(.*?)<\/div>/g)].map((match) => {
    const row = match[1] ?? '';
    const label = /<span class="row-main">(.*?)<\/span>/.exec(row)?.[1] ?? '';
    const figure = row.slice(row.indexOf('<span class="row-figure">')).replace(/<[^>]*>/g, '');
    return [label, figure];
  });
}

function dangerBoxOf(html: string): string {
  return /<p class="warn drop-danger">(.*?)<\/p>/.exec(html)?.[1] ?? '';
}

describe('(hh) a fifty thousand pound job dropped with seven thousand in the bank', () => {
  it('stands his evening up: the job taken, its material in the hall, and his 7,000 in the bank', () => {
    expect(HH.job.price).toBe(50000);
    // Half the price up front, which is the deposit the client paid and the deposit the drop has to
    // hand back (CLAUDE.md 8.3).
    expect(HH.job.depositPaid).toBe(25000);
    // 100 sheets ordered in for it and unloaded, at 20,000: material bought for this job and for
    // nothing else, which is what a drop writes off (`dropJob`).
    expect(HH.job.sheets).toBe(100);
    expect(HH.job.materialCost).toBe(20000);
    expect(materialWrittenOff(HH.morning, HH.job)).toBe(20000);
    expect(
      HH.morning.deliveries.filter(
        (delivery) => delivery.jobId === HH.job.id && delivery.unloaded,
      ),
    ).toHaveLength(1);
    expect(HH.morning.cash).toBe(IN_THE_BANK);
    expect(HH.morning.finance.overdraftLimit).toBe(-10000);
    // The morning after the lorry, day 11, with the whole working day still in front of him: the
    // click is made at 08:00 and the company trades the rest of the day either way.
    expect(HH.dropDay).toBe(11);
    expect(formatTime(HH.morning.clock.minute)).toBe('08:00');
  });

  it('puts the price of the drop on the card, before the click', () => {
    // The card of CLAUDE.md T21 2.3 and docs/mockups/t21/debt.html part 2, rendered off the played
    // hall: the deposit to return, the material written off, the reputation at the cap of 2.4, and
    // where the account stands against the overdraft.
    expect(dropCardTitle(HH.job)).toBe('Drop Kitchen for the Hedges?');
    expect(cardRows(renderDropCard(HH.morning, HH.job))).toEqual([
      ['Deposit to return to the client', '-£25,000'],
      ['Material bought for it, written off', '-£20,000'],
      ['Reputation', '-50'],
      ['You have', '£7,000 of -£10,000 overdraft'],
    ]);
    // 10 points and a point for every 1,000 over 5,000 is 55 on a 50,000 job, and the cap is 50
    // [PIOTR, 19.09: "up to 50 max"]. A fifty thousand pound job is the price the scale stops at.
    expect(dropReputationCost(HH.job)).toBe(50);
  });

  it('says in the red box that the drop closes the company, and it is telling the truth', () => {
    // The deposit cannot be paid out of 7,000 and a 10,000 overdraft, and from Turn 22 it is paid
    // anyway: the account goes to -18,000, which is past the -15,000 one and a half times the
    // overdraft the bank allows (CLAUDE.md T22 2.1, 2.2, 2.3).
    expect(depositCanBePaid(HH.morning, HH.job)).toBe(false);
    expect(accountAfterDrop(HH.morning, HH.job)).toEqual({ account: -18000, allowed: -15000 });
    expect(bankruptcyFloor(HH.morning)).toBe(
      HH.morning.finance.overdraftLimit * BANKRUPTCY_LIMIT_FACTOR,
    );
    expect(dangerBoxOf(renderDropCard(HH.morning, HH.job))).toBe(
      'You cannot pay the deposit back from the overdraft. The account goes to -£18,000 ' +
        "against the bank's -£15,000. Dropping this job closes the company at tomorrow's check.",
    );
  });

  it('closes the company at that day s close on the click, which is the cross check of section 7', () => {
    // CLAUDE.md T21 7, line one: "A GBP 50,000 drop with GBP 7,000 in the bank closes the company at
    // that day's close, asserted." This is that assertion.
    //
    // The click itself takes the job off the books, hands the deposit back out of the account
    // because a deposit returned is not a cost the player can decline, writes the material off and
    // charges the 50 points. The game does not end in the middle of the day: the bank looks once a
    // calendar day, at the point the day's money is settled (`runDayCosts`), so the look that
    // closes him is the next morning's.
    expect(HH.clicked.jobs).toHaveLength(0);
    expect(HH.clicked.cash).toBe(IN_THE_BANK - HH.job.depositPaid);
    expect(HH.clicked.cash).toBe(-18000);
    expect(HH.clicked.cash).toBeLessThanOrEqual(bankruptcyFloor(HH.clicked));
    // The standing of 60 the company took a job of this size on is 10 by the time the click is over.
    expect(HH.clicked.reputation).toBe(10);
    expect(HH.clicked.reputationLog.at(-1)).toEqual({
      day: HH.dropDay,
      reason: 'Dropped: Kitchen for the Hedges',
      points: -50,
    });
    const lines = HH.clicked.ledger.filter((entry) => entry.day === HH.dropDay);
    const deposit = lines.find(
      (entry) => entry.label === 'Deposit returned: Kitchen for the Hedges',
    );
    expect(deposit).not.toBeUndefined();
    // The money really left the account: the line is not a note on the books any more.
    expect(deposit?.unpaid).toBe(false);
    expect(deposit?.amount).toBe(-HH.job.depositPaid);
    expect(lines.map((entry) => entry.label)).toContain(
      'Material written off: Kitchen for the Hedges',
    );
    expect(HH.clicked.gameOver).toBeNull();
    // And then the close of that day. The company traded the whole of the day it dropped the job on,
    // and not one minute of the day after it: the day of the drop is the last day on the record and
    // the clock has not moved off the top of the next one.
    expect(HH.closed.gameOver).not.toBeNull();
    expect(HH.closed.gameOver?.reason).toContain('cannot pay');
    expect(HH.closed.gameOver?.day).toBe(HH.dropDay + 1);
    expect(HH.closed.clock.minute).toBe(0);
    expect(recordOf(HH.closed, HH.dropDay).day).toBe(HH.dropDay);
    expect(HH.closed.days.some((entry) => entry.day > HH.dropDay)).toBe(false);
  });

  it('hands him the bank s card with the figures the engine closed him on', () => {
    // The event is the bankruptcy event the game always had, with the figures of the drawing riding
    // on it so the card cannot work a different sum out a minute later (CLAUDE.md T21 2.2, T22 2.2;
    // docs/mockups/t21/debt.html part 3). The cash is -18,307 and not the -18,000 the click left,
    // because the day the bank looked at had its own rent, rates, power and owner's draw to pay
    // first: 307 of them, and from Turn 22 they are paid whatever the balance.
    const event = HH.closed.activeEvent;
    expect(event?.kind).toBe('bankruptcy');
    expect(event?.data).toEqual({
      day: 12,
      month: 1,
      cash: -18307,
      allowed: -15000,
      // The other rule's reading, which the card prints as its third figure: the account went under
      // the limit on the click, so the morning that closed him is the first day of the thirty, and
      // it was the amount and not the days that did it (CLAUDE.md T22 2.2).
      daysBelow: 1,
      daysAllowed: BANKRUPTCY_DAYS_BELOW_LIMIT,
    });
    expect(Number(event?.data.cash)).toBeLessThanOrEqual(Number(event?.data.allowed));
    expect(HH.card).toContain('The bank has closed you');
    for (const figure of ['-£18,307', '-£15,000']) {
      expect(HH.card, figure).toContain(figure);
    }
    // The epitaph of the drawing: the working days he kept the workshop, and the orders taken and
    // built. He took one order of 50,000 and dropped it, so he built none of it.
    expect(HH.card).toContain('You kept the workshop 10 working days');
    console.log(
      '(hh) A FIFTY THOUSAND POUND JOB DROPPED WITH SEVEN THOUSAND IN THE BANK\n' +
        `the job: ${HH.job.name}, ${formatMoney(HH.job.price)}, deposit ` +
        `${formatMoney(HH.job.depositPaid)}, ${HH.job.sheets} sheets at ` +
        `${formatMoney(HH.job.materialCost)} ordered in for it\n` +
        `the card before the click: deposit back ${formatMoney(HH.job.depositPaid)}, material ` +
        `written off ${formatMoney(materialWrittenOff(HH.morning, HH.job))}, reputation ` +
        `-${dropReputationCost(HH.job)}, in the bank ${formatMoney(HH.morning.cash)} of ` +
        `${formatMoney(HH.morning.finance.overdraftLimit)} overdraft\n` +
        `the red box: ${dangerBoxOf(renderDropCard(HH.morning, HH.job))}\n` +
        `dropped on day ${HH.dropDay}: the account ${formatMoney(HH.clicked.cash)} against the ` +
        `bank's ${formatMoney(bankruptcyFloor(HH.clicked))}\n` +
        `CLOSED at the close of day ${HH.dropDay}, on the bank's look of day ` +
        `${HH.closed.gameOver?.day}: "${HH.closed.gameOver?.reason}"`,
    );
  });
});

// ---------------------------------------------------------------------------
// (ii) A month under the overdraft limit, and the thirtieth day below it
//      (PIOTR, 18.09: "thirty days below the limit"; CLAUDE.md T21 2.2, 3, T22 2.1, 2.2)
// ---------------------------------------------------------------------------

/** A hall with the day 1 kit in it, nothing off the board and nobody on the books: the month is
 *  about the money, so there is no job and no wage in the way of it. */
const PAST_THE_LIMIT: Policy = { ...CAREFUL, maxOpenJobs: 0, stockSheets: 0 };

/** How far past the limit the account is put: a hundred pounds. From Turn 22 every cost the player
 *  did not choose goes through the limit, so a company gets under it by simply standing still, and
 *  the hundred is only where these runs start counting from (CLAUDE.md T22 2.1). */
const PAST_BY = 100;

/** The hall of the section's second rule, played, with two figures written onto it and named:
 *
 *  1. the cash, a hundred pounds past the overdraft limit;
 *  2. the run of days below it, when the test wants the thirtieth day.
 *
 *  The second one cannot be played up to by a company that stands still: its bills now come out of
 *  the account at 307 a working day and 107 a weekend one, so the 5,000 of room between the limit
 *  and the one and a half times it the bank allows is used up on the twenty first of those days,
 *  and rule one closes it before the thirtieth day arrives. A company that keeps earning while it
 *  is under the limit does reach it, which is what tests/engine/bankruptcy.test.ts plays; here the
 *  count the bank is keeping is written and the two days that matter are played. */
function pastTheLimit(counter: number): GameState {
  const state = playUntilDay(
    newGame({ seed: SEED, difficulty: 'veryEasy' }),
    8,
    PAST_THE_LIMIT,
    [],
  );
  state.cash = state.finance.overdraftLimit - PAST_BY;
  state.finance.daysBelowOverdraft = counter;
  return state;
}

/** A played month of a company that does nothing at all on Hard: the cheapest company the game can
 *  hold, which is the one that would reach the thirtieth day if any standing still could. Every day
 *  of it is read as it closes: what the account had in it against the limit, and what the bank's
 *  count of days stood at. */
interface IdleMonth {
  readings: string[];
  /** What the account was above the overdraft limit at the close of each day. */
  gaps: number[];
  /** The count of days past the limit at the close of each day. */
  counts: number[];
  closed: GameState;
}

function idleMonth(): IdleMonth {
  const readings: string[] = [];
  const gaps: number[] = [];
  const counts: number[] = [];
  let state = newGame({ seed: SEED, difficulty: 'hard' });
  let guard = 0;
  while (state.gameOver === null && guard < 40) {
    state = playDay(state, IDLE, []);
    guard += 1;
    readings.push(
      `day ${state.clock.day}: cash ${Math.round(state.cash)}, the limit ` +
        `${Math.round(state.finance.overdraftLimit)}, days below it ` +
        `${state.finance.daysBelowOverdraft}`,
    );
    gaps.push(state.cash - state.finance.overdraftLimit);
    counts.push(state.finance.daysBelowOverdraft);
  }
  return { readings, gaps, counts, closed: state };
}

const II_MONTH = idleMonth();

/** The same position played to the end: how far the bank's count of days actually gets before the
 *  standing costs take the account past what the bank allows. */
function playedToTheEnd(): { closed: GameState; counter: number } {
  let state = pastTheLimit(0);
  let guard = 0;
  let counter = 0;
  while (state.gameOver === null && guard < 45) {
    state = playDay(state, PAST_THE_LIMIT, []);
    guard += 1;
    counter = Math.max(counter, state.finance.daysBelowOverdraft);
  }
  return { closed: state, counter };
}

const II_END = playedToTheEnd();

/** Two days off the position the rule is about: the twenty ninth day below the limit and the
 *  thirtieth. */
const II_TWENTY_NINE = playDay(
  pastTheLimit(BANKRUPTCY_DAYS_BELOW_LIMIT - 2),
  PAST_THE_LIMIT,
  [],
);
const II_THIRTY = playDay(II_TWENTY_NINE, PAST_THE_LIMIT, []);

/** The control, off its own opening so nothing is shared with the run above: the same company on
 *  the same twenty ninth day, with one client's job taken and his deposit in the account. */
function dayAboveTheLimit(): { paid: GameState; next: GameState; after: GameState } {
  const twentyNine = playDay(pastTheLimit(BANKRUPTCY_DAYS_BELOW_LIMIT - 2), PAST_THE_LIMIT, []);
  const enquiry = placeEnquiry(twentyNine, {
    name: 'Garage shelves',
    price: 4000,
    basePrice: 4000,
    deadlineDays: 60,
  });
  const paid = acceptNow(twentyNine, enquiry.id, false);
  const next = playDay(paid, PAST_THE_LIMIT, []);
  return { paid, next, after: playDay(next, PAST_THE_LIMIT, []) };
}

const II_RESET = dayAboveTheLimit();

describe('(ii) a played month under the limit, on Hard, doing nothing', () => {
  it('gets the bank s count of days off nought, and is closed on the amount before the days', () => {
    // The month Piotr's rule two is written for, played. Turn 21 stopped every bill at the 5,000
    // overdraft of Hard and put the rest in a second pot, so the account parked on the limit and
    // the bank's count of days never started; from Turn 22 the bills come out of the account, so it
    // goes under the limit and keeps going, and the count climbs a day at a time. It is still rule
    // one that closes the company, because at 307 a working day the 2,500 of room between the limit
    // and the -7,500 the bank allows runs out long before the thirtieth day
    // (CLAUDE.md T22 2.1, 2.2; REPORT-T21.md section 0 item 23).
    expect(II_MONTH.gaps.filter((gap) => gap < 0).length).toBeGreaterThan(0);
    expect(Math.max(...II_MONTH.counts)).toBeGreaterThan(0);
    const closed = II_MONTH.closed;
    expect(closed.gameOver?.day).toBe(22);
    expect(closed.gameOver?.reason).toContain('cannot pay');
    expect(closed.finance.daysBelowOverdraft).toBeGreaterThan(0);
    expect(closed.finance.daysBelowOverdraft).toBeLessThan(BANKRUPTCY_DAYS_BELOW_LIMIT);
    expect(closed.cash).toBeLessThanOrEqual(bankruptcyFloor(closed));
    expect(closed.ledger.some((entry) => entry.unpaid)).toBe(false);
    console.log(
      '(ii) A PLAYED MONTH UNDER THE LIMIT, ON HARD, DOING NOTHING\n' +
        `${II_MONTH.readings.slice(-4).join('\n')}\n` +
        `CLOSED on day ${closed.gameOver?.day}: "${closed.gameOver?.reason}"\n` +
        'the count of days below the overdraft limit at the close: ' +
        `${closed.finance.daysBelowOverdraft} of ${BANKRUPTCY_DAYS_BELOW_LIMIT}`,
    );
  });
});

describe('(ii) a company below the overdraft limit, played to the end', () => {
  it('is closed on the amount before the thirtieth day, while it stands still', () => {
    // The company of `pastTheLimit`, played from the day its account first closes below the limit
    // until the bank shuts it. The count climbs a day at a time, as it should, and it gets most of
    // the way to the thirty: every one of those days takes its standing costs out of the account,
    // 307 of them on a working day and 107 on a weekend one, and the 5,000 of room between the
    // limit and the -15,000 the bank allows runs out first. So for a company that stands still it
    // is rule one that gets there, and the thirtieth day belongs to a company that keeps earning
    // while it is under the limit, which is what tests/engine/bankruptcy.test.ts plays out
    // (CLAUDE.md T22 2.2).
    expect(II_END.closed.gameOver).not.toBeNull();
    expect(II_END.closed.gameOver?.reason).toContain('cannot pay');
    expect(II_END.closed.gameOver?.reason).not.toContain('30 days');
    expect(II_END.counter).toBeGreaterThan(0);
    expect(II_END.counter).toBeLessThan(BANKRUPTCY_DAYS_BELOW_LIMIT);
    expect(II_END.closed.cash).toBeLessThanOrEqual(bankruptcyFloor(II_END.closed));
    console.log(
      '(ii) A COMPANY BELOW THE OVERDRAFT LIMIT, PLAYED TO THE END\n' +
        `cash ${formatMoney(II_END.closed.cash)} against a limit of ` +
        `${formatMoney(II_END.closed.finance.overdraftLimit)} and the bank's ` +
        `${formatMoney(bankruptcyFloor(II_END.closed))}\n` +
        `the count of days below the limit reached ${II_END.counter} of ` +
        `${BANKRUPTCY_DAYS_BELOW_LIMIT}, and the amount closed the company on day ` +
        `${II_END.closed.gameOver?.day}`,
    );
  });
});

describe('(ii) the thirtieth day below the overdraft limit', () => {
  it('leaves the company trading on the twenty ninth day, with the account well inside', () => {
    expect(II_TWENTY_NINE.finance.daysBelowOverdraft).toBe(BANKRUPTCY_DAYS_BELOW_LIMIT - 1);
    expect(II_TWENTY_NINE.finance.daysBelowOverdraft).toBe(29);
    expect(II_TWENTY_NINE.gameOver).toBeNull();
    // Nothing but the run of days can close this company: the account is a few hundred past a
    // 10,000 limit, which is nowhere near the -15,000 the bank allows.
    expect(II_TWENTY_NINE.cash).toBeLessThan(II_TWENTY_NINE.finance.overdraftLimit);
    expect(II_TWENTY_NINE.cash).toBeGreaterThan(bankruptcyFloor(II_TWENTY_NINE));
  });

  it('closes it on the thirtieth day, and the reason says the thirty days', () => {
    expect(II_THIRTY.finance.daysBelowOverdraft).toBe(BANKRUPTCY_DAYS_BELOW_LIMIT);
    expect(II_THIRTY.gameOver).not.toBeNull();
    expect(II_THIRTY.gameOver?.reason).toBe(
      '30 days in a row past the overdraft limit, and the bank has pulled it.',
    );
    // The amount is not the test: the account is a few hundred past a 10,000 limit with -15,000
    // allowed. It is the run of days and nothing else
    // [PIOTR, 18.09: "thirty days below the limit"].
    expect(II_THIRTY.cash).toBeGreaterThan(bankruptcyFloor(II_THIRTY));
    const event = II_THIRTY.activeEvent;
    expect(event?.kind).toBe('bankruptcy');
    expect(event?.data).toEqual({
      day: II_THIRTY.gameOver?.day,
      month: 1,
      cash: Math.round(II_THIRTY.cash),
      allowed: -15000,
      daysBelow: BANKRUPTCY_DAYS_BELOW_LIMIT,
      daysAllowed: BANKRUPTCY_DAYS_BELOW_LIMIT,
    });
  });

  it('would have started the count again on one day back above the limit', () => {
    // The control, and it is one client's job: a 4,000 job's deposit is 2,000, and the account goes
    // from a few hundred past the limit to a good way inside it. That is all it takes. The day that
    // follows closes above the limit, so the count goes back to nought, and the company that was
    // closed on the thirtieth day in the run above is still trading two days later
    // (CLAUDE.md T21 2.2 rule 2, T22 2.2: "a day at or above the limit resets the count").
    expect(II_RESET.paid.cash).toBeGreaterThan(II_RESET.paid.finance.overdraftLimit);
    expect(II_RESET.paid.finance.daysBelowOverdraft).toBe(BANKRUPTCY_DAYS_BELOW_LIMIT - 1);
    expect(II_RESET.next.finance.daysBelowOverdraft).toBe(0);
    expect(II_RESET.next.gameOver).toBeNull();
    expect(II_RESET.after.finance.daysBelowOverdraft).toBe(0);
    expect(II_RESET.after.gameOver).toBeNull();
    // The same day of the same hall: the run above was closed on it and this one was not.
    expect(II_RESET.next.clock.day).toBe(II_THIRTY.clock.day);
    console.log(
      '(ii) THE THIRTIETH DAY BELOW THE OVERDRAFT LIMIT\n' +
        `calendar day ${II_TWENTY_NINE.clock.day}, the ` +
        `${II_TWENTY_NINE.finance.daysBelowOverdraft}th in a row below the limit: cash ` +
        `${formatMoney(II_TWENTY_NINE.cash)}, still trading\n` +
        `calendar day ${II_THIRTY.clock.day}, the ${II_THIRTY.finance.daysBelowOverdraft}th: cash ` +
        `${formatMoney(II_THIRTY.cash)} against the bank's ` +
        `${formatMoney(bankruptcyFloor(II_THIRTY))}, CLOSED: "${II_THIRTY.gameOver?.reason}"\n` +
        `the control, one client's deposit on calendar day ${II_TWENTY_NINE.clock.day}: cash ` +
        `${formatMoney(II_RESET.paid.cash)}, and the count back to ` +
        `${II_RESET.next.finance.daysBelowOverdraft} on day ${II_RESET.next.clock.day}`,
    );
  });
});

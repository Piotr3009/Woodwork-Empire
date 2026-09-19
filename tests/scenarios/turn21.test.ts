// The Turn 21 scenarios of CLAUDE.md T21 3, T21-C2: (gg) four men, one saw and two jobs, (hh) a
// drop of a fifty thousand pound job that closes the company, and (ii) a month in arrears that ends
// on the thirtieth day below the overdraft limit.
//
// The shape is the one Turns 13, 17, 19 and 20 used: a month, or a day, played through the scripted
// player of autopilot.ts, off a hall that is stood up by playing the opening days and never by
// writing the state out by hand, so what the assertions read is what a player would have seen. Where
// a scenario does write one figure onto the state it says which figure it is, whose figure it is and
// why the played route cannot reach it. Every figure in a comment was measured on this build.
//
// The unit tests of the same three rules are tests/engine/nobodyWaits.test.ts,
// tests/ui/dropCard.test.ts and tests/engine/bankruptcy.test.ts. Nothing here repeats them: they
// drive one function with a position written into it, and these three play the hall and read the
// meters, the cards and the words over the men's heads that the player is actually shown.

import { describe, expect, it } from 'vitest';
import { CAREFUL, IDLE, type Policy, playDay, playUntilDay } from './autopilot';
import { acceptNow, act, newGame, placeEnquiry } from '../helpers';
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
  stationWaitingFor,
} from '../../src/engine/index';
import { bankruptcyFloor, netPosition } from '../../src/engine/economy';
import { bubbleFor } from '../../src/engine/bubbles';
import { canHire } from '../../src/engine/staff';
import {
  depositCanBePaid,
  dropCardTitle,
  materialWrittenOff,
  netAfterDrop,
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
// (gg) Four men, one saw, two jobs (PIOTR; CLAUDE.md T21 2.7, 3, 7)
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
 *  because four men and their kit is a lot of money on day 1 and the day is about the queue. */
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
  /** What each man said over his head that day, in the words of 2.6, each word once. */
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
  // reading tests/engine/nobodyWaits.test.ts takes of the same two stages.
  jobOn(state, cuttingId).labourRemaining = jobOn(state, cuttingId).labourValue * 0.95;
  jobOn(state, benchId).labourRemaining =
    jobOn(state, benchId).labourValue * (benchWork ? 0.45 : 0.95);
  const opening = state;
  const played = opening.clock.day;
  const stood: Stood[] = [];
  const said = new Map<string, Set<string>>();
  const evening = playDay(opening, FOUR_MEN_ONE_SAW, seen, {
    step: 1,
    watch: (current) => {
      for (const worker of current.workers) {
        const waitingFor = stationWaitingFor(worker.station);
        if (waitingFor !== null) {
          stood.push({ at: formatTime(current.clock.minute), who: worker.name, waitingFor });
        }
        const bubble = bubbleFor(current, worker.id);
        if (bubble === null) continue;
        const words = said.get(worker.name) ?? new Set<string>();
        words.add(`${bubble.tone}: ${bubble.text}`);
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

  it('works every man of the four all day while the second job has bench work', () => {
    // The day's own meters, which are the ones the top bar showed him: five seats (the owner and
    // his four men) over the 480 minutes of the working day is 2,400 possible, and 1,920 of them
    // were worked, which is four men times every minute of the day. Not one minute was lost to a
    // machine, in a hall with one saw and two men whose stage wants it. This is the line of the
    // cross check of CLAUDE.md T21 7: nobody stands while bench work exists.
    expect(GG.record.efficiency.possible).toBe(2400);
    expect(GG.record.efficiency.worked).toBe(1920);
    expect(GG.record.efficiency.lost.noMachine).toBe(0);
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

  it('moves the man who could not have the saw to the other job s bench, and keeps him there', () => {
    const cutting = jobOn(GG.evening, GG.cuttingId);
    const bench = jobOn(GG.evening, GG.benchId);
    // One man keeps the saw and the man behind him is at the other job by the end of the first
    // minute of the day, through the game's own `addToJob`, so his chip on the Work Plan and the
    // cell he stands on are the one fact (CLAUDE.md T21 2.7).
    expect(cutting.assignees).toEqual([GG.men[0]?.id]);
    expect(bench.assignees).toContain(GG.men[1]?.id);
    expect(bench.assignees).toHaveLength(3);
    // 480 minutes into the cutting job, one man's day; 1,440 into the assembly job, three men's.
    expect(cutting.productionMinutes).toBe(480);
    expect(bench.productionMinutes).toBe(1440);
    // And the job that has the saw is never left with nobody on it, which is what the scheduler
    // refuses to do (CLAUDE.md T21 2.7, and the note in docs/notes-t21-b2.md on the last man).
    expect(cutting.assignees.length).toBeGreaterThan(0);
  });

  it('has nobody at a waiting cell all day but the two minutes before the scheduler s first look', () => {
    // Every minute of the day was watched and the men were read where they stood. Two readings in
    // the whole day, and both are of the man who holds the saw, in the minute before the hall's
    // first production minute of a spell: 08:00, when the day opens with both men of the cutting job
    // stood at the saw the stations were written for, and 13:00, the first minute back from the
    // dinner hour. The watch reads the station the settle before it wrote, so the minute the
    // scheduler sorts out is read as it was at the top of it; both minutes were worked in full,
    // which is what the 480 minutes a man above says.
    const first = GG.men[0];
    if (first === undefined) throw new Error('the man on the saw is wanted here');
    expect(GG.stood).toEqual([
      { at: '08:00', who: first.name, waitingFor: 'tableSaw' },
      { at: '13:00', who: first.name, waitingFor: 'tableSaw' },
    ]);
    // Neither job says it is waiting for anything by the end of the day, which is what the Work
    // Plan's bar and the job card print (CLAUDE.md T21 2.7).
    expect(jobOn(GG.evening, GG.cuttingId).blockedBy).toBe('');
    expect(jobOn(GG.evening, GG.benchId).blockedBy).toBe('');
    expect(stageText(GG.evening, jobOn(GG.evening, GG.cuttingId))).toBe('Cutting');
    expect(stageText(GG.evening, jobOn(GG.evening, GG.benchId))).toBe('Assembly');
  });

  it('says over their heads what they are doing, and only says the queue in its first minute', () => {
    // The bubbles of CLAUDE.md T21 2.6, as they were said on the played day: three men at the
    // assembly of the second job and one cutting the first, in the drawing's own words, and the
    // dinner hour behind the canteen door for all four (CLAUDE.md T21 2.12).
    const moved = GG.men[1]?.name ?? '';
    expect(GG.said.get(GG.men[0]?.name ?? '')).toEqual([
      'away: at lunch',
      'wait: waiting for the saw',
      'work: cutting Small kitchen',
    ]);
    expect(GG.said.get(moved)).toEqual([
      'away: at lunch',
      'wait: no cut parts yet',
      'work: assembling Garage shelves',
    ]);
    for (const man of GG.men.slice(2)) {
      expect(GG.said.get(man.name), man.name).toEqual([
        'away: at lunch',
        'work: assembling Garage shelves',
      ]);
    }
    console.log(
      '(gg) FOUR MEN, ONE SAW, TWO JOBS\n' +
        `the hall on day ${GG.opening.clock.day}: ${GG.men.length} joiners, ` +
        `${GG.opening.equipment.filter((item) => item.specId === 'tableSaw').length} saw, ` +
        `${GG.opening.stock.sheets} sheets on the rack\n` +
        `Small kitchen at its cutting stage with ${GG.men[0]?.name} and ${moved} on it; ` +
        `Garage shelves at its assembly with ${GG.men[2]?.name} and ${GG.men[3]?.name}\n` +
        `the day's meters: ${GG.record.efficiency.worked} minutes worked of ` +
        `${GG.record.efficiency.possible} possible, ` +
        `${GG.record.efficiency.lost.noMachine} lost to a machine\n` +
        `Small kitchen took ${jobOn(GG.evening, GG.cuttingId).productionMinutes} minutes, ` +
        `Garage shelves ${jobOn(GG.evening, GG.benchId).productionMinutes}; ` +
        `${moved} spent his day at the second job's bench\n` +
        `readings of a man at a waiting cell, all day: ${GG.stood.length}`,
    );
  });
});

describe('(gg) the same hall with nothing in it but the saw s own work', () => {
  it('stands three of the four men at the saw, and moves nobody', () => {
    // The control: both jobs at their cutting stage, so there is no bench work in the hall to be
    // had. One saw, one man cutting, and the other three stand: 480 minutes worked of the same
    // 2,400, and 1,440 lost to a machine, which is three men times every minute of the day. That is
    // the other half of 2.7, and it is what says the scheduler moves a man to work and never to
    // another queue.
    expect(GG_QUEUE.record.efficiency.possible).toBe(2400);
    expect(GG_QUEUE.record.efficiency.worked).toBe(480);
    expect(GG_QUEUE.record.efficiency.lost.noMachine).toBe(1440);
    const cutting = jobOn(GG_QUEUE.evening, GG_QUEUE.cuttingId);
    const bench = jobOn(GG_QUEUE.evening, GG_QUEUE.benchId);
    expect(cutting.assignees).toEqual([GG_QUEUE.men[0]?.id, GG_QUEUE.men[1]?.id]);
    expect(bench.assignees).toEqual([GG_QUEUE.men[2]?.id, GG_QUEUE.men[3]?.id]);
    expect(cutting.productionMinutes).toBe(480);
    expect(bench.productionMinutes).toBe(0);
    expect(minutesOf(GG_QUEUE.evening, GG_QUEUE.men[0]?.name ?? '')).toBe(480);
    for (const man of GG_QUEUE.men.slice(1)) {
      expect(minutesOf(GG_QUEUE.evening, man.name), man.name).toBe(0);
    }
  });

  it('says why they stand, on the bar and over their heads', () => {
    const cutting = jobOn(GG_QUEUE.evening, GG_QUEUE.cuttingId);
    const bench = jobOn(GG_QUEUE.evening, GG_QUEUE.benchId);
    // The work plan's bar and the job card say what the job is waiting for where they say its stage
    // (CLAUDE.md T21 2.7), in the trade's own short word for the machine and not the catalogue's.
    expect(cutting.blockedBy).toBe('waiting for the saw');
    expect(bench.blockedBy).toBe('waiting for the saw');
    expect(stageText(GG_QUEUE.evening, cutting)).toBe('Cutting, waiting for the saw');
    expect(stageText(GG_QUEUE.evening, bench)).toBe('Cutting, waiting for the saw');
    // Over their heads: the men at the saw's waiting cell say they are waiting for it and the man
    // behind the first of a queue says what is really stopping him, which is the parts nobody has
    // cut yet (docs/mockups/t21/bubbles.html; CLAUDE.md T21 2.6).
    const words = [...GG_QUEUE.said.values()].flat();
    expect(words).toContain('wait: waiting for the saw');
    expect(words).toContain('wait: no cut parts yet');
    expect(words.filter((line) => line.startsWith('work:'))).toEqual([]);
    // 962 readings of a man at a waiting cell: two of the three standing men are at the saw's own
    // waiting cell every one of the 480 minutes of the day, and the two left over are the man who
    // holds the saw at the top of his two spells, at 08:00 and 13:00, exactly as in the run beside
    // this one. The third standing man is the second man of the other job's own queue, who is short
    // of cut parts rather than standing at the machine, so he is not at its cell.
    expect(GG_QUEUE.stood).toHaveLength(962);
    expect(new Set(GG_QUEUE.stood.map((reading) => reading.who)).size).toBe(3);
    for (const reading of GG_QUEUE.stood) expect(reading.waitingFor).toBe('tableSaw');
    console.log(
      '(gg) THE SAME HALL WITH NOTHING BUT THE SAW S OWN WORK\n' +
        `the day's meters: ${GG_QUEUE.record.efficiency.worked} minutes worked of ` +
        `${GG_QUEUE.record.efficiency.possible} possible, ` +
        `${GG_QUEUE.record.efficiency.lost.noMachine} lost to the saw\n` +
        `Small kitchen took ${cutting.productionMinutes} minutes, ` +
        `Garage shelves ${bench.productionMinutes}\n` +
        `readings of a man at a waiting cell, all day: ${GG_QUEUE.stood.length}\n` +
        `what they said: ${[...new Set(words)].sort().join(' | ')}`,
    );
  });
});

// ---------------------------------------------------------------------------
// (hh) A fifty thousand pound job dropped with seven thousand in the bank
//      (PIOTR, 18.09; CLAUDE.md T21 0, 2.2, 2.3, 2.4, 3, 7)
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
    expect(HH.morning.finance.arrearsAmount).toBe(0);
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

  it('says in the red box that the drop closes the company today, and it is telling the truth', () => {
    // The deposit cannot be paid out of 7,000 and a 10,000 overdraft, so the whole 25,000 of it goes
    // to arrears, and the net position that leaves, -18,000, is past the -15,000 one and a half
    // times the overdraft the bank allows (CLAUDE.md T21 2.2, 2.3).
    expect(depositCanBePaid(HH.morning, HH.job)).toBe(false);
    expect(netAfterDrop(HH.morning, HH.job)).toEqual({ net: -18000, allowed: -15000 });
    expect(bankruptcyFloor(HH.morning)).toBe(
      HH.morning.finance.overdraftLimit * BANKRUPTCY_LIMIT_FACTOR,
    );
    expect(dangerBoxOf(renderDropCard(HH.morning, HH.job))).toBe(
      'You cannot pay the deposit back. It goes to arrears: -£18,000 against the ' +
        "bank's -£15,000 limit. Dropping this job closes the company today.",
    );
  });

  it('closes the company at that day s close on the click, which is the cross check of section 7', () => {
    // CLAUDE.md T21 7, line one: "A GBP 50,000 drop with GBP 7,000 in the bank closes the company at
    // that day's close, asserted." This is that assertion.
    //
    // The click itself takes the job off the books, hands the deposit back as arrears because there
    // is nothing to hand it back out of, writes the material off and charges the 50 points. The game
    // does not end in the middle of the day: the bank looks once a calendar day, at the point the
    // day's money is settled (`runDayCosts`), so the look that closes him is the one at the close of
    // the day he dropped it on, which is the reading of "as today" the brief and
    // docs/notes-t21-b1.md both take.
    expect(HH.clicked.jobs).toHaveLength(0);
    expect(HH.clicked.cash).toBe(IN_THE_BANK);
    expect(HH.clicked.finance.arrearsAmount).toBe(25000);
    expect(HH.clicked.finance.arrearsMonths).toBe(1);
    expect(netPosition(HH.clicked)).toBe(-18000);
    expect(netPosition(HH.clicked)).toBeLessThanOrEqual(bankruptcyFloor(HH.clicked));
    // The standing of 60 the company took a job of this size on is 10 by the time the click is over.
    expect(HH.clicked.reputation).toBe(10);
    expect(HH.clicked.reputationLog.at(-1)).toEqual({
      day: HH.dropDay,
      reason: 'Dropped: Kitchen for the Hedges',
      points: -50,
    });
    const lines = HH.clicked.ledger.filter((entry) => entry.day === HH.dropDay);
    expect(lines.map((entry) => entry.label)).toContain(
      'Deposit returned: Kitchen for the Hedges (unpaid)',
    );
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

  it('hands him the bank s card with the four figures the engine closed him on', () => {
    // The event is the bankruptcy event the game always had, with the four figures of the drawing
    // riding on it so the card cannot work a different sum out a minute later (CLAUDE.md T21 2.2;
    // docs/mockups/t21/debt.html part 3). The cash is 6,693 and not the 7,000 of the morning,
    // because the day the bank looked at had its own rent, rates, power and owner's draw to pay
    // first: 307 of them, and they were paid, because the cash was still above the overdraft.
    const event = HH.closed.activeEvent;
    expect(event?.kind).toBe('bankruptcy');
    expect(event?.data).toEqual({
      day: 12,
      month: 1,
      cash: 6693,
      arrears: 25000,
      net: -18307,
      allowed: -15000,
    });
    expect(Number(event?.data.net)).toBeLessThanOrEqual(Number(event?.data.allowed));
    expect(HH.card).toContain('The bank has closed you');
    for (const figure of ['£6,693', '-£25,000', '-£18,307', '-£15,000']) {
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
        `dropped on day ${HH.dropDay}: arrears ${formatMoney(HH.clicked.finance.arrearsAmount)}, ` +
        `net ${formatMoney(netPosition(HH.clicked))} against the bank's ` +
        `${formatMoney(bankruptcyFloor(HH.clicked))}\n` +
        `CLOSED at the close of day ${HH.dropDay}, on the bank's look of day ` +
        `${HH.closed.gameOver?.day}: "${HH.closed.gameOver?.reason}"`,
    );
  });
});

// ---------------------------------------------------------------------------
// (ii) A month in arrears, and the thirtieth day below the overdraft limit
//      (PIOTR, 18.09: "thirty days below the limit"; CLAUDE.md T21 2.2, 3)
// ---------------------------------------------------------------------------

/** A hall with the day 1 kit in it, nothing off the board and nobody on the books: the month is
 *  about the money, so there is no job and no wage in the way of it. */
const PAST_THE_LIMIT: Policy = { ...CAREFUL, maxOpenJobs: 0, stockSheets: 0 };

/** How far past the limit the account is put: a hundred pounds, which is under what the two costs
 *  in the game that are paid without the overdraft floor come to (a repair bill at the end of a
 *  repair, and the 150 of temporary storage when a lorry brings more sheets than the rack holds).
 *  Those two, and nothing else, are how a played company's cash ever closes a day below the limit:
 *  every other cost in the game either fits inside the overdraft or goes to the arrears, which is
 *  what the first test below measures. */
const PAST_BY = 100;

/** The hall of the section's second rule, played, with two figures written onto it and named:
 *
 *  1. the cash, a hundred pounds past the overdraft limit;
 *  2. the run of days below it, when the test wants the thirtieth day.
 *
 *  The second one cannot be played up to, and the test after this one is the measurement of why: a
 *  company below the limit can pay nothing at all, so its bills go to the arrears at 307 a working
 *  day and 107 a weekend one, and the 5,000 of room between the limit and the one and a half times
 *  it the bank allows is used up on the twenty first of those days. So a real company is closed by
 *  its arrears nine days before the thirtieth, and the only honest way to watch the thirtieth day
 *  arrive is to write the count the bank is keeping and play the two days that matter. */
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
 *  hold, which is the one that would reach the thirtieth day if any could. Every day of it is read
 *  as it closes: what the account had in it against the limit, and what the bank's count of days
 *  stood at. */
interface ArrearsMonth {
  readings: string[];
  /** What the account was above the overdraft limit at the close of each day. */
  gaps: number[];
  /** The count of days past the limit at the close of each day. */
  counts: number[];
  closed: GameState;
}

function arrearsMonth(): ArrearsMonth {
  const readings: string[] = [];
  const gaps: number[] = [];
  const counts: number[] = [];
  let state = newGame({ seed: SEED, difficulty: 'hard' });
  let guard = 0;
  while (state.gameOver === null && guard < 40) {
    state = playDay(state, IDLE, []);
    guard += 1;
    readings.push(
      `day ${state.clock.day}: cash ${Math.round(state.cash)}, arrears ` +
        `${Math.round(state.finance.arrearsAmount)}, net ${Math.round(netPosition(state))}, ` +
        `days below the limit ${state.finance.daysBelowOverdraft}`,
    );
    gaps.push(state.cash - state.finance.overdraftLimit);
    counts.push(state.finance.daysBelowOverdraft);
  }
  return { readings, gaps, counts, closed: state };
}

const II_MONTH = arrearsMonth();

/** The same position played to the end: how far the bank's count of days actually gets before the
 *  arrears take the net position past what it allows. */
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

describe('(ii) a played month in arrears, on Hard, doing nothing', () => {
  it('never gets the bank s count of days off nought, because the cash stops at the limit', () => {
    // The month Piotr's rule two is written for, played: the 5,000 overdraft of Hard fills by day
    // 11, every bill after that goes unpaid, and the arrears climb about 299 a working day. The
    // account itself never closes a day below the limit, so the count of days past it is nought on
    // every one of the twenty two days the company lasts. The closure itself is rule one, and the
    // day 22 of it is also asserted in tests/scenarios/thirtyDays.test.ts; what is asserted here is
    // the count, which is the thing 2.2 rule 2 reads.
    // Not one day of the month closes with the account below the overdraft limit: a bill that
    // cannot be paid inside it is not paid at all and goes to the arrears instead, so the cash stops
    // dead at the limit and the count of days past it never starts (CLAUDE.md T21 2.2 rule 2,
    // against `canAfford` and `chargeUnavoidable` in src/engine/economy.ts).
    expect(II_MONTH.gaps.filter((gap) => gap < 0)).toEqual([]);
    expect([...new Set(II_MONTH.counts)]).toEqual([0]);
    const closed = II_MONTH.closed;
    expect(closed.gameOver?.day).toBe(22);
    expect(closed.gameOver?.reason).toContain('cannot pay');
    expect(closed.finance.daysBelowOverdraft).toBe(0);
    expect(closed.finance.arrearsAmount).toBeGreaterThan(0);
    expect(closed.finance.arrearsMonths).toBeGreaterThanOrEqual(1);
    expect(Math.round(closed.cash)).toBe(-4998);
    expect(netPosition(closed)).toBeLessThanOrEqual(bankruptcyFloor(closed));
    console.log(
      '(ii) A PLAYED MONTH IN ARREARS, ON HARD, DOING NOTHING\n' +
        `${II_MONTH.readings.slice(-4).join('\n')}\n` +
        `CLOSED on day ${closed.gameOver?.day}: "${closed.gameOver?.reason}"\n` +
        'the count of days below the overdraft limit, every day of it: 0',
    );
  });
});

describe('(ii) a company below the overdraft limit, played to the end', () => {
  it('is closed by its arrears nine days short of the thirtieth', () => {
    // The company of `pastTheLimit`, played from the day its account first closes below the limit
    // until the bank shuts it. The count climbs a day at a time, as it should, and it reaches 21 of
    // the 30: every one of those days puts its unpaid bills on the arrears, 307 of them on a
    // working day and 107 on a weekend one, and by the twenty first the arrears, 5,247, have taken
    // the net position to -15,347 against the -15,000 the bank allows. The bank closes the company
    // on calendar day 28, which is the weekend day its money passed the line on. So rule one always
    // gets there first, and the thirtieth day is out of the reach of any company whose bills are
    // going unpaid. One line for Piotr: the thirty day rule as it stands can only bite a company
    // that is below the limit and still paying its way, and nothing in the game produces one.
    expect(II_END.closed.gameOver).not.toBeNull();
    expect(II_END.closed.gameOver?.reason).toContain('cannot pay');
    expect(II_END.closed.gameOver?.reason).not.toContain('30 days');
    expect(II_END.counter).toBe(21);
    expect(II_END.counter).toBeLessThan(BANKRUPTCY_DAYS_BELOW_LIMIT);
    expect(netPosition(II_END.closed)).toBeLessThanOrEqual(bankruptcyFloor(II_END.closed));
    console.log(
      '(ii) A COMPANY BELOW THE OVERDRAFT LIMIT, PLAYED TO THE END\n' +
        `cash ${formatMoney(II_END.closed.cash)} against a limit of ` +
        `${formatMoney(II_END.closed.finance.overdraftLimit)}, arrears ` +
        `${formatMoney(II_END.closed.finance.arrearsAmount)}, net ` +
        `${formatMoney(netPosition(II_END.closed))} against the bank's ` +
        `${formatMoney(bankruptcyFloor(II_END.closed))}\n` +
        `the count of days below the limit reached ${II_END.counter} of ` +
        `${BANKRUPTCY_DAYS_BELOW_LIMIT}, and the arrears closed the company on day ` +
        `${II_END.closed.gameOver?.day}`,
    );
  });
});

describe('(ii) the thirtieth day below the overdraft limit', () => {
  it('leaves the company trading on the twenty ninth day, with the net position well inside', () => {
    expect(II_TWENTY_NINE.finance.daysBelowOverdraft).toBe(BANKRUPTCY_DAYS_BELOW_LIMIT - 1);
    expect(II_TWENTY_NINE.finance.daysBelowOverdraft).toBe(29);
    expect(II_TWENTY_NINE.gameOver).toBeNull();
    // Nothing but the run of days can close this company: the account is 100 past a 10,000 limit
    // and two days of unpaid bills is 614 of arrears, so the net position, -10,407 on the twenty
    // ninth day, is nowhere near the -15,000 the bank allows.
    expect(Math.round(netPosition(II_TWENTY_NINE))).toBe(-10407);
    expect(netPosition(II_TWENTY_NINE)).toBeGreaterThan(bankruptcyFloor(II_TWENTY_NINE));
    expect(Math.round(II_TWENTY_NINE.cash)).toBe(-10100);
  });

  it('closes it on the thirtieth day, and the reason says the thirty days', () => {
    expect(II_THIRTY.finance.daysBelowOverdraft).toBe(BANKRUPTCY_DAYS_BELOW_LIMIT);
    expect(II_THIRTY.gameOver).not.toBeNull();
    expect(II_THIRTY.gameOver?.reason).toBe(
      '30 days in a row past the overdraft limit, and the bank has pulled it.',
    );
    // The amount is not the test: 614 of arrears on an account 100 past the limit, and the net
    // position -10,714 with -15,000 allowed. It is the run of days and nothing else
    // [PIOTR, 18.09: "thirty days below the limit"].
    expect(netPosition(II_THIRTY)).toBeGreaterThan(bankruptcyFloor(II_THIRTY));
    const event = II_THIRTY.activeEvent;
    expect(event?.kind).toBe('bankruptcy');
    expect(event?.data).toEqual({
      day: II_THIRTY.gameOver?.day,
      month: 1,
      cash: -10100,
      arrears: 614,
      net: -10714,
      allowed: -15000,
    });
  });

  it('would have started the count again on one day back above the limit', () => {
    // The control, and it is one client's job: a 4,000 job's deposit is 2,000, and the account goes
    // from 100 past the limit to 1,900 inside it. That is all it takes. The day that follows closes
    // above the limit, so the count goes back to nought, and the company that was closed on the
    // thirtieth day in the run above is still trading two days later (CLAUDE.md T21 2.2 rule 2: "A
    // day above the limit resets the count").
    expect(Math.round(II_RESET.paid.cash)).toBe(-8100);
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
        `${formatMoney(II_TWENTY_NINE.cash)}, net ${formatMoney(netPosition(II_TWENTY_NINE))}, ` +
        'still trading\n' +
        `calendar day ${II_THIRTY.clock.day}, the ${II_THIRTY.finance.daysBelowOverdraft}th: net ` +
        `${formatMoney(netPosition(II_THIRTY))} against the bank's ` +
        `${formatMoney(bankruptcyFloor(II_THIRTY))}, CLOSED: "${II_THIRTY.gameOver?.reason}"\n` +
        `the control, one client's deposit on calendar day ${II_TWENTY_NINE.clock.day}: cash ` +
        `${formatMoney(II_RESET.paid.cash)}, and the count back to ` +
        `${II_RESET.next.finance.daysBelowOverdraft} on day ${II_RESET.next.clock.day}`,
    );
  });
});

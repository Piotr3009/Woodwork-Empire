// @vitest-environment jsdom
// The hall's places decide where a man works, and nobody waits for a machine (PIOTR, 21.09 and
// 24.09; CLAUDE.md T25 2.3; v53). Every man on a job takes a free place at one of the families
// his job is made on: from v55 the one whose turn it is for him this half hour first (the men go
// round their job's machines, each starting one further on than the man hired before him), then
// the other families of its plan, then a bench. The places are given out in the order the men were
// hired, the owner first. A man stands only when every place he could take is taken: he stands at
// his home cell with the red mark, says `no free machines`, his card says the same, and his
// minutes are idle with `noPlace`. A family that does not run has no places and its share of the
// job goes at the by hand pace; nothing stops the job but the whole hall.
//
// The six joiner hall these tests stand four men in has a saw, the day one hand bander out of the
// cabinet and no spindle moulder, so a job's round is the saw and a bench: in the first half hour
// the first man hired goes to a bench, the second to the saw, the third to a bench, the fourth to
// the saw (v55).

import { describe, expect, it } from 'vitest';
import { dayPlan, hands, planPlaces, workMinute } from '../../src/engine/production';
import {
  OWNER,
  hallPlaces,
  hallProductivityFactor,
  menAtMachine,
  menAtPlaces,
  outputBreakdown,
} from '../../src/engine/machines';
import { STATION_HOME, machineStation } from '../../src/engine/stations';
import { bubbleFor } from '../../src/engine/bubbles';
import { acceptContract, assignContract, drawContract } from '../../src/engine/contracts';
import { currentStage, jobOnCnc, jobPace } from '../../src/engine/stages';
import { renderPerson } from '../../src/ui/personCard';
import { tick } from '../../src/engine/index';
import type { Equipment, GameState, WorkerIdleReason } from '../../src/engine/index';
import {
  acceptNow,
  act,
  buyStartingKit,
  fillRack,
  newGame,
  placeEnquiry,
  placeEquipment,
  sixJoinersOnSheetWork,
  testJoiner,
  twoMenOnSheetWork,
  withAir,
  withDryAir,
  withExtraction,
  withOnlyCuttingLeft,
} from '../helpers';

/** The six joiner hall with only the first four men on jobs, every job at its cutting, and the
 *  hall's one saw of the class named: four men whose jobs' bars all stand at the saw. */
function fourAtOneSaw(sawVariant: string): GameState {
  const state = sixJoinersOnSheetWork({ saws: 1, sawVariant });
  for (const worker of state.workers.slice(4)) {
    const job = state.jobs.find((entry) => entry.id === worker.jobId);
    if (job) job.assignees = job.assignees.filter((who) => who !== worker.id);
    worker.jobId = null;
  }
  state.jobs = state.jobs.filter((job) => job.assignees.length > 0);
  // Every job back at the start of its cutting, so the bar of all four stands at the saw.
  for (const job of state.jobs) {
    job.stageLabour = {};
    job.labourRemaining = job.labourValue;
    job.sheetsUsed = 0;
  }
  return withOnlyCuttingLeft(state);
}

/** The owner and three joiners on ONE sheet job at its cutting, in a hall with one used saw of one
 *  place, a standard edgebander on the floor, benches with a place for every man (the day one
 *  budget bench and an industrial one of three), and a fan and a compressor big enough for all of
 *  it, so the hall is clean and its extraction works. */
function fourOnOneJob(): GameState {
  const state = withAir(
    withExtraction(
      fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' }), { sawVariant: 'used' }), 60),
    ),
  );
  const bander = state.equipment.find((item) => item.specId === 'edgebander');
  if (!bander) throw new Error('an edgebander is wanted');
  // The day one bander is the hand one out of the cabinet; this one stands on the floor.
  bander.variantId = 'standard';
  placeEquipment(state, 'workbench', { variantId: 'industrial', x: 12, y: 6, id: 'kit-bench-big' });
  state.enquiries = [];
  const enquiry = placeEnquiry(state, { price: 40000, deadlineDays: 90 });
  let next = acceptNow(state, enquiry.id);
  const job = next.jobs[0];
  if (!job) throw new Error('a job is wanted');
  job.stage = 'ready';
  for (let man = 1; man <= 3; man += 1) {
    next.workers.push(testJoiner(`staff-${man}`, `Joiner ${man}`, 4 + man * 2, 6));
  }
  next = act(next, { type: 'WORK_HERE', jobId: job.id });
  for (let man = 1; man <= 3; man += 1) {
    next = act(next, { type: 'ADD_TO_JOB', jobId: job.id, workerId: `staff-${man}` });
  }
  return next;
}

function saw(state: GameState): Equipment {
  const found = state.equipment.find((item) => item.specId === 'tableSaw');
  if (!found) throw new Error('a saw is wanted');
  return found;
}

function workingMen(state: GameState): string[] {
  return state.workers.filter((worker) => worker.working).map((worker) => worker.id);
}

function stationsOf(state: GameState, men: number): string[] {
  return state.workers.slice(0, men).map((worker) => worker.station);
}

const AT_THE_SAW = machineStation('tableSaw');
const AT_A_BENCH = machineStation('workbench');

describe('who stands where (CLAUDE.md T25 2.3; v53)', () => {
  it('gives the saw s places to the men whose turn it is, and the rest work at a bench', () => {
    const state = fourAtOneSaw('standard');
    const plan = planPlaces(state);
    expect(plan.map((entry) => entry.who)).toEqual(['staff-1', 'staff-2', 'staff-3', 'staff-4']);
    // A standard saw has two places: the second and the fourth man hired, whose turn the saw is
    // in the first half hour, have them, and the other two work the same jobs at a bench and do
    // not stand (PIOTR, 24.09; v53, v55).
    expect(workingMen(state)).toEqual(['staff-1', 'staff-2', 'staff-3', 'staff-4']);
    expect(stationsOf(state, 4)).toEqual([AT_A_BENCH, AT_THE_SAW, AT_A_BENCH, AT_THE_SAW]);
    for (const worker of state.workers.slice(0, 4)) expect(worker.noPlaceFor, worker.id).toBe('');
  });

  it('puts the owner first, whoever was hired before him', () => {
    const state = fourAtOneSaw('budget');
    const first = state.jobs[0];
    if (!first) throw new Error('a job is wanted');
    first.assignees = [...first.assignees, OWNER];
    const plan = planPlaces(state);
    expect(plan[0]?.who).toBe(OWNER);
    expect(state.owner.working).toBe(true);
    expect(menAtMachine(state, saw(state))).toEqual([OWNER]);
  });

  it('gives the same answer every minute while nothing it is made of changes', () => {
    let state = fourAtOneSaw('standard');
    planPlaces(state);
    const first = workingMen(state);
    for (let minute = 0; minute < 30; minute += 1) {
      state = tick(state, 1);
      expect(workingMen(state), `minute ${minute}`).toEqual(first);
    }
  });

  it('hands the saw s place to the next man the minute a man is taken off his job', () => {
    let state = fourAtOneSaw('budget');
    state = tick(state, 1);
    // One place at a budget saw: the second man hired has it, the fourth, whose turn it is too,
    // finds it taken and works at a bench, and so do the other two (v55).
    expect(workingMen(state)).toEqual(['staff-1', 'staff-2', 'staff-3', 'staff-4']);
    expect(stationsOf(state, 4)).toEqual([AT_A_BENCH, AT_THE_SAW, AT_A_BENCH, AT_A_BENCH]);
    const job = state.jobs.find((entry) => entry.assignees.includes('staff-2'));
    if (!job) throw new Error('the second man s job is wanted');
    state = act(state, { type: 'REMOVE_FROM_JOB', jobId: job.id, workerId: 'staff-2' });
    // The click re plans the hall, and the fourth man goes from his bench to the saw.
    expect(workingMen(state)).toEqual(['staff-1', 'staff-3', 'staff-4']);
    expect(stationsOf(state, 4)).toEqual([AT_A_BENCH, 'bench', AT_A_BENCH, AT_THE_SAW]);
    const before = state.workers.find((worker) => worker.id === 'staff-4')?.productionMinutes ?? 0;
    state = tick(state, 1);
    expect(state.workers.find((worker) => worker.id === 'staff-4')?.productionMinutes).toBe(before + 1);
  });

  it('gives a second saw s places out the minute it stands in the hall', () => {
    let state = fourAtOneSaw('budget');
    state = tick(state, 1);
    expect(stationsOf(state, 4)).toEqual([AT_A_BENCH, AT_THE_SAW, AT_A_BENCH, AT_A_BENCH]);
    placeEquipment(state, 'tableSaw', { variantId: 'budget', x: 14, y: 1, id: 'kit-saw-second' });
    state = tick(state, 1);
    // The fourth man hired, whose turn the saw is, goes from his bench to the second saw's one
    // place.
    expect(stationsOf(state, 4)).toEqual([AT_A_BENCH, AT_THE_SAW, AT_A_BENCH, AT_THE_SAW]);
    expect(menAtPlaces(state).find((entry) => entry.who === 'staff-4')?.item.id).toBe('kit-saw-second');
    expect(hallPlaces(state, 'tableSaw')).toBe(2);
  });

  it('stops no job for a broken saw: the men work at a bench, and the cutting goes at the by hand pace', () => {
    let state = fourAtOneSaw('standard');
    state = tick(state, 1);
    expect(stationsOf(state, 4)).toEqual([AT_A_BENCH, AT_THE_SAW, AT_A_BENCH, AT_THE_SAW]);
    const job = state.jobs[0];
    if (!job) throw new Error('a job is wanted');
    // The job's one pace with the standard saw: the cutting's quarter at 1.05, the edging's on the
    // hand bander at 1.00, the moulding's by hand, the hall having no spindle moulder, and the
    // assembly's at 1.00 (v55).
    expect(jobPace(state, job)).toBeCloseTo(1 / (0.25 / 1.05 + 0.25 + 0.25 * 1.5 + 0.25), 10);
    saw(state).broken = true;
    const before = state.jobs.map((entry) => entry.labourRemaining);
    state = tick(state, 1);
    // A broken saw has no places, so nobody is at it, and nobody stands either: every man works
    // his job at a bench (PIOTR, 24.09: "they never wait for the saw"; v53).
    expect(workingMen(state)).toEqual(['staff-1', 'staff-2', 'staff-3', 'staff-4']);
    expect(stationsOf(state, 4)).toEqual([AT_A_BENCH, AT_A_BENCH, AT_A_BENCH, AT_A_BENCH]);
    for (const worker of state.workers.slice(0, 4)) expect(worker.noPlaceFor, worker.id).toBe('');
    state.jobs.forEach((entry, index) => {
      expect(entry.blockedBy, entry.name).toBe('');
      expect(entry.labourRemaining, entry.name).toBeLessThan(before[index] ?? 0);
    });
    // The job is slower, not stopped: its cutting's quarter goes at 1 / 1.5 by hand too, 0.80 in
    // all.
    const slowed = state.jobs[0];
    if (!slowed) throw new Error('a job is wanted');
    expect(jobPace(state, slowed)).toBeCloseTo(1 / (0.25 * 1.5 + 0.25 + 0.25 * 1.5 + 0.25), 10);
    saw(state).broken = false;
    state = tick(state, 1);
    expect(stationsOf(state, 4)).toEqual([AT_A_BENCH, AT_THE_SAW, AT_A_BENCH, AT_THE_SAW]);
  });

  it('sends the men round their job s machines a half hour at a time, whatever the bar says', () => {
    let state = fourAtOneSaw('standard');
    planPlaces(state);
    // The first half hour: the second and the fourth man at the saw.
    expect(stationsOf(state, 4)).toEqual([AT_A_BENCH, AT_THE_SAW, AT_A_BENCH, AT_THE_SAW]);
    // The second half hour: everybody one machine on, so the first and the third are at the saw
    // and the other two at the benches (v55).
    state = tick(state, 30);
    expect(state.clock.minute).toBe(30);
    expect(stationsOf(state, 4)).toEqual([AT_THE_SAW, AT_A_BENCH, AT_THE_SAW, AT_A_BENCH]);
    // The bar of a job says where its work has got to and nothing about where its men stand: the
    // first man's job past its cutting, and he is at the saw all the same, the round being the
    // job's machines and not its bar (PIOTR, 24.09: "the stages are only on the bar"; v55).
    const job = state.jobs.find((entry) => entry.assignees.includes('staff-1'));
    if (!job) throw new Error('the first man s job is wanted');
    job.stageLabour = {};
    job.labourRemaining = job.labourValue * 0.5;
    planPlaces(state);
    expect(currentStage(state, job)?.id).toBe('moulding');
    expect(stationsOf(state, 4)).toEqual([AT_THE_SAW, AT_A_BENCH, AT_THE_SAW, AT_A_BENCH]);
    expect(workingMen(state)).toEqual(['staff-1', 'staff-2', 'staff-3', 'staff-4']);
  });

  it('wants no saw place in a hall with no saw: the cutting goes by hand and every man works at a bench', () => {
    const state = fourAtOneSaw('budget');
    state.equipment = state.equipment.filter((item) => item.specId !== 'tableSaw');
    const plan = planPlaces(state);
    // The saw is not one of the families his job is made on here, so the bench is the one place
    // he takes (v53: every job has a bench in it somewhere).
    for (const entry of plan) {
      expect(entry.family, entry.who).toBe('workbench');
      expect(entry.working, entry.who).toBe(true);
    }
    expect(stationsOf(state, 4)).toEqual([AT_A_BENCH, AT_A_BENCH, AT_A_BENCH, AT_A_BENCH]);
    const job = state.jobs[0];
    if (!job) throw new Error('a job is wanted');
    // The cutting's quarter by hand, and the moulding's, the hall having no spindle moulder (v55).
    expect(jobPace(state, job)).toBeCloseTo(1 / (0.25 * 1.5 + 0.25 + 0.25 * 1.5 + 0.25), 10);
  });

  it('gives a man on a standing contract a place of his piece s family or a bench, in the same order', () => {
    const state = fourAtOneSaw('standard');
    const contract = drawContract(state);
    contract.pieceId = 'cutSheetPack';
    state.contracts.push(contract);
    expect(acceptContract(state, contract.id).ok).toBe(true);
    // The fifth man on the contract, behind the four on the jobs in the hiring order.
    expect(assignContract(state, contract.id, 'staff-5', true).ok).toBe(true);
    const plan = dayPlan(state);
    const him = plan.find((entry) => entry.who === 'staff-5');
    expect(him?.contract?.id).toBe(contract.id);
    // The saw's two places are the second and the fourth man's, whose turn it is, so he works his
    // piece at a bench (v53, v55).
    expect(him?.family).toBe('workbench');
    expect(him?.working).toBe(true);
    // The first man off his job, and the contract man is not first in line for a place at the
    // saw: the men whose turn it is are (CLAUDE.md T25 2.3; v55).
    const first = state.jobs.find((entry) => entry.assignees.includes('staff-1'));
    if (!first) throw new Error('a job is wanted');
    first.assignees = [];
    const worker = state.workers.find((entry) => entry.id === 'staff-1');
    if (worker) worker.jobId = null;
    const again = planPlaces(state);
    expect(again.filter((entry) => entry.family === 'tableSaw').map((entry) => entry.who)).toEqual([
      'staff-2',
      'staff-4',
    ]);
    expect(again.find((entry) => entry.who === 'staff-5')?.family).toBe('workbench');
  });
});

describe('four men on one job and one saw of one place (PIOTR, 24.09; v53)', () => {
  it('works every man, one at the saw, the others spread over the job s machines, nobody on another s place', () => {
    const state = tick(fourOnOneJob(), 1);
    const men = [state.owner, ...state.workers];
    expect(men.map((man) => man.working)).toEqual([true, true, true, true]);
    expect(men.map((man) => man.noPlaceFor)).toEqual(['', '', '', '']);
    const places = menAtPlaces(state);
    expect(places).toHaveLength(4);
    expect(places.filter((entry) => entry.item.specId === 'tableSaw').map((entry) => entry.who)).toEqual([
      OWNER,
    ]);
    // The owner at the saw, the first joiner at the edgebander, the other two at the benches.
    expect(places.map((entry) => `${entry.who} ${entry.item.specId}`)).toEqual([
      'owner tableSaw',
      'staff-1 edgebander',
      'staff-2 workbench',
      'staff-3 workbench',
    ]);
    const cells = places.map((entry) => `${entry.item.id}#${entry.place}`);
    expect(new Set(cells).size).toBe(4);
  });

  it('says on the Output sheet what the one saw costs the hall: a quarter off every minute', () => {
    const state = tick(fourOnOneJob(), 1);
    const hall = outputBreakdown(state).lines.filter((line) => line.hall);
    // Four men and a used saw that keeps one busy: three work at 1 / 1.5, so (1 + 3 / 1.5) / 4 =
    // 0.75. The standard bander keeps four, so it is not short (v55).
    expect(hall.map((line) => `${line.label} ${line.points}`)).toEqual([
      'Hall clean 0',
      'Extraction working 0',
      'Too few saws: capacity 1, 4 men -0.25',
    ]);
    expect(hallProductivityFactor(state)).toBeCloseTo(0.75, 10);
  });
});

describe('a man with every place taken (CLAUDE.md T25 2.3; v53)', () => {
  /** The four at a budget saw of one place with one bench left in the hall: two places for four
   *  men, the saw's and the bench's, and the hand edgebander wants none. */
  function twoPlacesForFour(): GameState {
    const state = fourAtOneSaw('budget');
    const keep = state.equipment.find((item) => item.specId === 'workbench');
    state.equipment = state.equipment.filter((item) => item.specId !== 'workbench' || item === keep);
    return state;
  }

  it('stands only when every place he could take is taken, and works the minute one frees', () => {
    const state = twoPlacesForFour();
    planPlaces(state);
    // The first man's turn is the bench and the second's the saw; the third and the fourth find
    // both taken and stand (v55).
    expect(stationsOf(state, 4)).toEqual([AT_A_BENCH, AT_THE_SAW, STATION_HOME, STATION_HOME]);
    // The first family he could have used is the one whose turn it was.
    expect(state.workers.slice(0, 4).map((worker) => worker.noPlaceFor)).toEqual([
      '',
      '',
      'workbench',
      'tableSaw',
    ]);
    // One more bench place, and the third man hired takes it; the fourth still has none.
    placeEquipment(state, 'workbench', { variantId: 'budget', x: 16, y: 8, id: 'kit-bench-more' });
    planPlaces(state);
    expect(stationsOf(state, 4)).toEqual([AT_A_BENCH, AT_THE_SAW, AT_A_BENCH, STATION_HOME]);
  });

  it('stands at his home cell with the mark, says why on his card, and books his minute to noPlace', () => {
    const state = twoPlacesForFour();
    const report = workMinute(state, hands(state));
    expect(report.lost.noPlace).toBe(2);
    const man = state.workers.find((worker) => worker.id === 'staff-3');
    expect(man?.station).toBe(STATION_HOME);
    expect(bubbleFor(state, 'staff-3')?.text).toBe('no free machines');
    const holder = document.createElement('div');
    holder.innerHTML = renderPerson(state, 'staff-3', 'card');
    const now = holder.querySelector('[data-now]');
    expect(now?.classList.contains('warn')).toBe(true);
    expect(now?.textContent).toContain('no free machines');
  });
});

describe('a whole morning of four men and one saw (v53)', () => {
  it('works all four at a used saw of one place, and not a minute of noPlace', () => {
    // The fixture's first minute is sampled before its men were put on their jobs, so the day is
    // counted from the second minute on.
    let state = tick(fourAtOneSaw('used'), 1);
    const before = state.workers.slice(0, 4).map((worker) => worker.productionMinutes);
    const idle: Record<string, number>[] = state.workers.slice(0, 4).map((worker) => ({ ...worker.idleByReason }));
    state = tick(state, 60 * 8);
    const worked = state.workers.slice(0, 4).map((worker, index) => worker.productionMinutes - (before[index] ?? 0));
    // The clock stops at the dinner hour's question, so this is the morning: 239 minutes each.
    // Until v53 only the man at the saw worked and the other three stood with noPlace; now the
    // three work their jobs at the benches (PIOTR, 24.09; v53).
    expect(worked).toEqual([239, 239, 239, 239]);
    state.workers.slice(0, 4).forEach((worker, index) => {
      const was = idle[index] ?? {};
      const stood = (reason: WorkerIdleReason): number => (worker.idleByReason[reason] ?? 0) - (was[reason] ?? 0);
      for (const reason of ['waitingForBoss', 'noPlace', 'noMaterial', 'noCompressor', 'hallStopped'] as const) {
        expect(stood(reason), `${worker.id} ${reason}`).toBe(0);
      }
    });
  });

  it('works all four at a standard saw, two at its places and two at the benches', () => {
    let state = fourAtOneSaw('standard');
    const before = state.workers.slice(0, 4).map((worker) => worker.productionMinutes);
    state = tick(state, 60);
    const worked = state.workers.slice(0, 4).map((worker, index) => worker.productionMinutes - (before[index] ?? 0));
    // Until v53 two of the four worked; now all four do, a full hour each. At the top of the third
    // half hour the round is where it started: the second and the fourth at the saw (v55).
    expect(worked).toEqual([60, 60, 60, 60]);
    expect(stationsOf(state, 4)).toEqual([AT_A_BENCH, AT_THE_SAW, AT_A_BENCH, AT_THE_SAW]);
  });
});

describe('the CNC and the booth in the day plan (v53)', () => {
  it('plans a sheet job on the saw while the CNC is broken, and never on the CNC', () => {
    let state = withDryAir(twoMenOnSheetWork({ saws: 1 }));
    placeEquipment(state, 'cnc', { x: 2, y: 6, id: 'kit-cnc' });
    for (const job of state.jobs) expect(jobOnCnc(state, job), job.name).toBe(true);
    const cnc = state.equipment.find((item) => item.id === 'kit-cnc');
    if (!cnc) throw new Error('the CNC is wanted');
    cnc.broken = true;
    for (let minute = 0; minute < 30; minute += 1) {
      state = tick(state, 1);
      for (const job of state.jobs) {
        expect(jobOnCnc(state, job), `${job.name} minute ${minute}`).toBe(false);
        expect(currentStage(state, job)?.id, `${job.name} minute ${minute}`).toBe('cutting');
        expect(job.blockedBy, job.name).toBe('');
      }
    }
    // At minute 30 the round has moved one on: the joiner's turn is the saw and the owner's the
    // bench, so the saw's two places hold the one man whose turn it is (v55).
    expect(state.clock.minute).toBe(30);
    expect(menAtMachine(state, saw(state))).toEqual(['staff-1']);
    expect(state.owner.station).toBe(machineStation('workbench'));
  });

  it('sends a sprayer on a lacquered job to the booth first, while the saw still has a place', () => {
    const state = withAir(
      withExtraction(
        fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' }), { sawVariant: 'standard' }), 60),
      ),
    );
    placeEquipment(state, 'sprayBooth', { variantId: 'standard', x: 12, y: 6, id: 'kit-booth' });
    state.enquiries = [];
    const enquiry = placeEnquiry(state, { price: 40000, deadlineDays: 90, finish: 'lacquer' });
    let next = acceptNow(state, enquiry.id);
    const job = next.jobs[0];
    if (!job) throw new Error('a job is wanted');
    job.stage = 'ready';
    const sprayer = testJoiner('staff-1', 'Sam');
    sprayer.role = 'sprayer';
    next.workers.push(sprayer);
    next = act(next, { type: 'WORK_HERE', jobId: job.id });
    next = act(next, { type: 'ADD_TO_JOB', jobId: job.id, workerId: 'staff-1' });
    next = tick(next, 1);
    const lacquered = next.jobs[0];
    if (!lacquered) throw new Error('a job is wanted');
    // The bar stands at the cutting and the standard saw has two places, one of them free, and
    // still the sprayer goes to the booth: it is his trade (CLAUDE.md T19 2.6; v53).
    expect(currentStage(next, lacquered)?.id).toBe('cutting');
    expect(menAtMachine(next, saw(next))).toEqual([OWNER]);
    expect(next.workers[0]?.station).toBe(machineStation('sprayBooth'));
    expect(menAtPlaces(next).find((entry) => entry.who === 'staff-1')?.item.id).toBe('kit-booth');
  });
});

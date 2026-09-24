// A man on a contract is the contract's all day (PIOTR, 21.09; v42), and the client who has had
// two short weeks ends it himself (CLAUDE.md T20 2.1.6).
//
// Putting a man on a contract takes him off every job of work and shuts the jobs to him while he
// is on it: "if you put a man on a contract he has to vanish from the jobs, even from the
// possibility of being assigned to one, then we know we have four men on the jobs and that is
// that". He makes pieces from 8:00 to 17:00, past the day's share and past the week that was
// ordered, because the client takes every piece he makes. Turn 20's split day, where the contract
// had his morning and a job the rest, is gone with its daily line `piecesDueBy`.

import { describe, expect, it } from 'vitest';
import { CONTRACT_FREE_END_DAYS, DAY_END_MINUTE, JOINER_MONTHLY_WAGE, WORKER_RATES } from '../../src/engine/constants';
import { crewHasGoneHome } from '../../src/engine/staff';
import {
  CONTRACT_SHORT_WEEKS_ALLOWED,
  acceptContract,
  activeContracts,
  assignContract,
  contractMarker,
  contractWaitingForMaterial,
  contractWantsToday,
  drawContract,
  endContractNow,
  endedContracts,
  runContractDay,
  weekWanted,
} from '../../src/engine/contracts';
import { addToJob, assignJob, canBuild, isOnJob } from '../../src/engine/jobs';
import { dayPlan } from '../../src/engine/production';
import { menAtMachine } from '../../src/engine/machines';
import type { Contract, GameState, Job, Worker } from '../../src/engine/index';
import {
  acceptNow,
  act,
  buyStartingKit,
  fillRack,
  newGame,
  placeEnquiry,
  placeEquipment,
  runClock,
  withAir,
  withExtraction,
} from '../helpers';

function joiner(id: string, name: string): Worker {
  return {
    id,
    name,
    role: 'joiner',
    tier: 'experienced',
    rate: WORKER_RATES.experienced,
    monthlyWage: JOINER_MONTHLY_WAGE.experienced,
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
    idleMinutes: 0,
    idleByReason: { waitingForBoss: 0, noPlace: 0, noMaterial: 0, noCompressor: 0, hallStopped: 0 },
    working: false,
    noPlaceFor: '',
    accidents: 0,
    anchorX: 6,
    anchorY: 6,
  };
}

/** The day 1 kit, the air and the fan, sheets on the rack and one joiner, at 09:00 on a Monday. */
function joinerHall(): GameState {
  const state = withAir(
    withExtraction(fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 60)),
  );
  placeEquipment(state, 'workbench', { variantId: 'budget', x: 6, y: 6 });
  state.enquiries = [];
  state.workers.push(joiner('staff-1', 'Ben'));
  state.clock.minute = 60;
  return state;
}

/** A contract for cut sheet packs, running from today, with the joiner on it. */
function running(state: GameState, quantityPerWeek: number): Contract {
  const contract = drawContract(state);
  contract.pieceId = 'cutSheetPack';
  contract.quantityPerWeek = quantityPerWeek;
  state.contracts.push(contract);
  expect(acceptContract(state, contract.id).ok).toBe(true);
  expect(assignContract(state, contract.id, 'staff-1', true).ok).toBe(true);
  return contract;
}

/** A job of work in production with the same man on it. */
function jobUnderHim(state: GameState): { state: GameState; job: Job } {
  const enquiry = placeEnquiry(state, { price: 6000, deadlineDays: 40 });
  const next = acceptNow(state, enquiry.id);
  const job = next.jobs[0];
  if (!job) throw new Error('a job is wanted');
  job.stage = 'inProduction';
  job.assignees = ['staff-1'];
  return { state: next, job };
}

function theContract(state: GameState): Contract {
  const contract = activeContracts(state)[0];
  if (!contract) throw new Error('a running contract is wanted');
  return contract;
}

function theJob(state: GameState): Job {
  const job = state.jobs[0];
  if (!job) throw new Error('a job is wanted');
  return job;
}

/** The men on a contract the day plan has at work this minute (CLAUDE.md T25 2.3). */
function contractMenPlaced(state: GameState): string[] {
  return dayPlan(state)
    .filter((entry) => entry.contract !== null && entry.working)
    .map((entry) => entry.who);
}

/** Who is at the hall's saw this minute, the first of its places, or null. */
function atTheSaw(state: GameState): string | null {
  const saw = state.equipment.find((item) => item.specId === 'tableSaw');
  return saw === undefined ? null : (menAtMachine(state, saw)[0] ?? null);
}

describe("a man on a contract is the contract's all day (PIOTR, 21.09; v42)", () => {
  it('spreads the week over the working days of it', () => {
    const state = joinerHall();
    const contract = running(state, 60);
    expect(weekWanted(contract, 1)).toBe(60);
    // The week's quantity is what the client asks for, not a ceiling on the man: Turn 20's daily
    // line he worked to, `piecesDueBy`, is gone with the split day (PIOTR, 21.09; v42).
  });

  it('takes him off every job when he goes on it, and will not let him be put on one', () => {
    let state = joinerHall();
    const under = jobUnderHim(state);
    state = under.state;
    expect(isOnJob(theJob(state), 'staff-1')).toBe(true);
    const contract = running(state, 60);
    // On the contract, off the job, in the one action (PIOTR, 21.09: "he has to vanish from the
    // jobs, even from the possibility of being assigned to one").
    expect(contract.assigned).toEqual(['staff-1']);
    expect(isOnJob(theJob(state), 'staff-1')).toBe(false);
    expect(canBuild(state, 'staff-1')).toBe(false);
    // And the two doors every assignment goes through are shut on him.
    expect(assignJob(state, theJob(state).id, 'staff-1')).toBe(false);
    expect(addToJob(state, theJob(state).id, 'staff-1')).toBe(false);
    expect(isOnJob(theJob(state), 'staff-1')).toBe(false);
    // Taken off the contract, he is a free man again and the jobs can have him.
    expect(assignContract(state, contract.id, 'staff-1', false).ok).toBe(true);
    expect(canBuild(state, 'staff-1')).toBe(true);
    expect(state.workers.find((worker) => worker.id === 'staff-1')?.jobId).toBe(null);
  });

  it('wants him every minute, whatever the week has already made', () => {
    const state = joinerHall();
    const contract = running(state, 5);
    expect(contractWantsToday(state, 'staff-1')).toBe(true);
    // The week's order is made twice over and he carries on: the client takes every piece
    // (PIOTR, 21.09: "he takes as many as we can make, week after week").
    contract.piecesThisWeek = 10;
    expect(contractWantsToday(state, 'staff-1')).toBe(true);
  });

  it('gives no minute of his day to a job, and makes pieces past the week that was ordered', () => {
    let state = joinerHall();
    // One piece is the whole of a Monday's share of the old line: under Turn 20 the job would
    // have had the rest of the day. It has none of it now.
    state = jobUnderHim(state).state;
    running(state, 5);
    // He came off the job the moment he went on the contract, so the job has nobody.
    expect(theJob(state).assignees).toEqual([]);
    state = runClock(state, 300);
    const contract = theContract(state);
    expect(contract.piecesMade).toBeGreaterThan(1);
    expect(theJob(state).productionMinutes).toBe(0);
    expect(contract.assigned).toEqual(['staff-1']);
    expect(state.workers.find((worker) => worker.id === 'staff-1')?.jobId).toBe(
      contractMarker(contract.id),
    );
  });

  it('puts the marker back on him at the open of every day', () => {
    const state = joinerHall();
    const contract = running(state, 5);
    const ben = state.workers.find((worker) => worker.id === 'staff-1');
    if (!ben) throw new Error('a man is wanted');
    ben.jobId = null;
    contract.piecesThisWeek = 0;
    state.clock.day = 2;
    runContractDay(state);
    expect(ben.jobId).toBe(contractMarker(contract.id));
  });

  it('stands him while the rack cannot cover the next piece, gives the saw up, and takes a bench when the sheets come', () => {
    let state = joinerHall();
    running(state, 60);
    state = runClock(state, 10);
    const saw = (): string | null => atTheSaw(state);
    expect(saw()).toBe('staff-1');
    state.stock.sheets = 0;
    theContract(state).sheetsReserved = 0;
    expect(contractWaitingForMaterial(state, theContract(state))).toBe(true);
    // Nowhere else to go, because a contract man has no job: he waits for the delivery.
    expect(contractWantsToday(state, 'staff-1')).toBe(true);
    const made = theContract(state).piecesMade;
    state = runClock(state, 5);
    expect(theContract(state).piecesMade).toBe(made);
    // And the saw's place is not his while he waits: until v45 he kept the saw, and every job's
    // man stood behind a saw nobody was at (PIOTR, 22.09: "everyone waits for the saw and nobody
    // does anything"); from v52 a man with no work wants no place (CLAUDE.md T25 2.3).
    expect(saw()).toBe(null);
    expect(contractMenPlaced(state)).toEqual([]);
    // The owner takes a job that wants the saw, with sheets of its own on the rack: it is his.
    const enquiry = placeEnquiry(state, { price: 4000, deadlineDays: 30 });
    state = acceptNow(state, enquiry.id);
    const job = theJob(state);
    job.stage = 'ready';
    state.stock.sheets = job.sheets;
    job.sheetsReserved = job.sheets;
    expect(contractWaitingForMaterial(state, theContract(state))).toBe(true);
    state = act(state, { type: 'WORK_HERE', jobId: job.id });
    state = runClock(state, 30);
    expect(saw()).toBe('owner');
    expect(theJob(state).productionMinutes).toBe(30);
    // A delivery lands and the contract has him back. The saw's one place is the owner's, first in
    // the day plan's order, so he takes a free bench and works there: nobody waits for the saw.
    // v52 stood him at his home cell with no place at the saw (PIOTR, 24.09; v53).
    state.stock.sheets += 20;
    expect(contractWaitingForMaterial(state, theContract(state))).toBe(false);
    const him = dayPlan(state).find((entry) => entry.who === 'staff-1');
    expect(him?.family).toBe('workbench');
    expect(him?.working).toBe(true);
    const before = theContract(state).piecesMade;
    state = runClock(state, 120);
    expect(saw()).toBe('owner');
    expect(state.workers.find((worker) => worker.id === 'staff-1')?.station).toBe('machine:workbench');
    expect(theContract(state).piecesMade).toBeGreaterThan(before);
  });

  it('wants no place at the saw at five, when the crew have gone home', () => {
    let state = joinerHall();
    running(state, 60);
    state = runClock(state, 10);
    expect(atTheSaw(state)).toBe('staff-1');
    expect(contractMenPlaced(state)).toEqual(['staff-1']);
    state.clock.minute = DAY_END_MINUTE;
    state.owner.homeAsked = true;
    expect(crewHasGoneHome(state)).toBe(true);
    expect(contractMenPlaced(state)).toEqual([]);
  });
});

describe('the client who ends it himself (CLAUDE.md T20 2.1.6)', () => {
  it('lets the first short week go for a point of reputation and ends it on the second', () => {
    const state = joinerHall();
    const contract = running(state, 60);
    const reputation = state.reputation;
    // Nobody makes anything: week one is short and costs the point it always cost.
    state.clock.day = 8;
    runContractDay(state);
    expect(contract.status).toBe('active');
    expect(contract.weeks).toHaveLength(1);
    expect(state.reputation).toBe(reputation - 1);
    // Week two is short as well, and the client walks away.
    state.clock.day = 15;
    runContractDay(state);
    expect(contract.weeks).toHaveLength(CONTRACT_SHORT_WEEKS_ALLOWED);
    expect(contract.status).toBe('ended');
    expect(contract.endedBy).toBe('client');
    expect(contract.endDay).toBe(15);
    expect(endedContracts(state)).toHaveLength(1);
    expect(contract.assigned).toEqual([]);
    const event = state.eventQueue.find((entry) => entry.kind === 'contractEnded');
    expect(event?.title).toContain('the client has ended it after 2 short weeks');
    expect(event?.body).toContain('the client has ended it');
    // No third: the day after brings no more weeks and no second report.
    state.clock.day = 22;
    runContractDay(state);
    expect(contract.weeks).toHaveLength(CONTRACT_SHORT_WEEKS_ALLOWED);
    expect(state.eventQueue.filter((entry) => entry.kind === 'contractEnded')).toHaveLength(1);
  });

  it('marks a term that simply ran out as the term, and the end the player calls as his own', () => {
    const state = joinerHall();
    const contract = running(state, 60);
    contract.piecesThisWeek = 60;
    contract.endDay = 7;
    state.clock.day = 8;
    runContractDay(state);
    expect(contract.status).toBe('ended');
    expect(contract.endedBy).toBe('term');
    const event = state.eventQueue.find((entry) => entry.kind === 'contractEnded');
    expect(event?.title).toContain('the term is over');
    // The player walks away after the free month: the report says it was him.
    const his = joinerHall();
    const mine = running(his, 60);
    his.clock.day = 1 + CONTRACT_FREE_END_DAYS;
    expect(endContractNow(his, mine.id).ok).toBe(true);
    expect(mine.endedBy).toBe('player');
    expect(his.eventQueue.find((entry) => entry.kind === 'contractEnded')?.title).toContain(
      'you ended it',
    );
  });
});

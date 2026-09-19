// The contract fills the day first (PIOTR; CLAUDE.md T20 2.1.4), and the client who has had two
// short weeks ends it himself (CLAUDE.md T20 2.1.6).
//
// A man is on a contract and on a job at once from tonight. He books his pieces from 8:00 until
// the day's share of the week is made, and only then goes to the job he is also on. The day's
// share is the week's quantity spread over the working days of the week, and with no job to go to
// he stays on the contract, because the client pays for every piece he makes.

import { describe, expect, it } from 'vitest';
import { CONTRACT_FREE_END_DAYS, JOINER_MONTHLY_WAGE, WORKER_RATES } from '../../src/engine/constants';
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
  jobBesideContract,
  piecesDueBy,
  runContractDay,
  weekWanted,
} from '../../src/engine/contracts';
import type { Contract, GameState, Job, Worker } from '../../src/engine/index';
import {
  acceptNow,
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

describe('the day is the contract first and the job second (CLAUDE.md T20 2.1.4)', () => {
  it('spreads the week over the working days of it', () => {
    const state = joinerHall();
    const contract = running(state, 60);
    expect(weekWanted(contract, 1)).toBe(60);
    // Monday to Friday, twelve a day, and the line is what he works to.
    expect([1, 2, 3, 4, 5].map((day) => piecesDueBy(contract, day))).toEqual([12, 24, 36, 48, 60]);
    // Never more than the week itself.
    expect(piecesDueBy(contract, 5)).toBe(weekWanted(contract, 5));
  });

  it('wants him while the line is ahead of him, and hands him to the job once it is met', () => {
    let state = joinerHall();
    const contract = running(state, 5);
    // No job to go to: the client pays for every piece, so the contract keeps him all day.
    expect(piecesDueBy(contract, 1)).toBe(1);
    contract.piecesThisWeek = 5;
    expect(contractWantsToday(state, 'staff-1')).toBe(true);
    // With a job under him, the day's share is the whole of the contract's claim on him.
    const under = jobUnderHim(state);
    state = under.state;
    expect(jobBesideContract(state, 'staff-1')?.id).toBe(under.job.id);
    expect(contractWantsToday(state, 'staff-1')).toBe(false);
    theContract(state).piecesThisWeek = 0;
    expect(contractWantsToday(state, 'staff-1')).toBe(true);
  });

  it('takes him back when the job he is on cannot use the minute (T20 2.1)', () => {
    // The last thing asked before a man on a contract stands: his contract's pieces. His day's
    // share is made and he has a job to go to, so the job has him; the minute the job cannot use him,
    // because the saw its stage wants is taken, the contract has him again, because the client pays
    // for every piece he makes (PIOTR; CLAUDE.md T20 2.1, T22 2.6).
    let state = joinerHall();
    const contract = running(state, 5);
    contract.piecesThisWeek = 5;
    state = jobUnderHim(state).state;
    expect(contractWantsToday(state, 'staff-1')).toBe(false);
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    if (!saw) throw new Error('a saw is wanted');
    saw.takenBy = 'owner';
    expect(contractWantsToday(state, 'staff-1')).toBe(true);
    // And the minute the saw is free again the job has him back: the question is asked fresh off the
    // hall every minute and never off a flag written down last minute.
    saw.takenBy = null;
    expect(contractWantsToday(state, 'staff-1')).toBe(false);
  });

  it('books his pieces from the morning and gives the job what is left of the day', () => {
    let state = joinerHall();
    // One piece is the whole of Monday's share of the week, so the changeover lands inside a day
    // of the clock.
    running(state, 5);
    state = jobUnderHim(state).state;
    let jobMinutesBeforeThePiece = 0;
    let handedOver = false;
    for (let minute = 0; minute < 300; minute += 1) {
      state = runClock(state, 1);
      const contract = theContract(state);
      const job = theJob(state);
      if (contract.piecesMade === 0) {
        // The contract has him: the job has not had a minute of him yet.
        jobMinutesBeforeThePiece = job.productionMinutes;
        expect(jobMinutesBeforeThePiece).toBe(0);
        continue;
      }
      if (job.productionMinutes > 0) {
        handedOver = true;
        break;
      }
    }
    const contract = theContract(state);
    expect(contract.piecesMade).toBe(1);
    expect(jobMinutesBeforeThePiece).toBe(0);
    expect(handedOver).toBe(true);
    // He is the job's now, and still on the contract: assigned once, he stays on it.
    expect(contract.assigned).toEqual(['staff-1']);
    expect(state.workers.find((worker) => worker.id === 'staff-1')?.jobId).toBe(theJob(state).id);
  });

  it('takes the morning back the next day, before the job has a minute of him', () => {
    const state = joinerHall();
    const contract = running(state, 5);
    const under = jobUnderHim(state);
    const next = under.state;
    // Yesterday ended with him on the job: the day's open puts the marker back on him.
    const ben = next.workers.find((worker) => worker.id === 'staff-1');
    if (!ben) throw new Error('a man is wanted');
    ben.jobId = under.job.id;
    theContract(next).piecesThisWeek = 0;
    next.clock.day = 2;
    runContractDay(next);
    expect(ben.jobId).toBe(contractMarker(contract.id));
  });

  it('gives him to the job under him while the rack cannot cover the next piece', () => {
    let state = joinerHall();
    // The line is well ahead of him all day, so nothing but the empty rack can let the job have
    // him.
    running(state, 60);
    state = jobUnderHim(state).state;
    const job = theJob(state);
    const contract = theContract(state);
    // Every sheet on the rack is the job's own: the contract can hold none and cannot make a
    // piece.
    contract.sheetsReserved = 0;
    job.sheetsReserved = job.sheets - job.sheetsUsed;
    state.stock.sheets = job.sheetsReserved;
    expect(contractWaitingForMaterial(state, contract)).toBe(true);
    expect(contract.piecesThisWeek).toBeLessThan(piecesDueBy(contract, state.clock.day));
    expect(contractWantsToday(state, 'staff-1')).toBe(false);
    state = runClock(state, 60);
    // The contract made nothing, because it could not; the job had his hour, and he is still on
    // both.
    expect(theContract(state).piecesMade).toBe(0);
    expect(theJob(state).productionMinutes).toBeGreaterThan(0);
    expect(theContract(state).assigned).toEqual(['staff-1']);
    // A delivery lands and the contract has him back the next minute.
    state.stock.sheets += 20;
    expect(contractWaitingForMaterial(state, theContract(state))).toBe(false);
    expect(contractWantsToday(state, 'staff-1')).toBe(true);
  });

  it('stands a man with no job to go to at his bench while the rack is empty', () => {
    const state = joinerHall();
    const contract = running(state, 60);
    state.stock.sheets = 0;
    expect(contractWaitingForMaterial(state, contract)).toBe(true);
    // Nowhere else to go: the contract keeps him, as it always did.
    expect(contractWantsToday(state, 'staff-1')).toBe(true);
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

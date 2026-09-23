// @vitest-environment jsdom
// The Turn 25 scenarios of CLAUDE.md T25 section 3: (qq), (rr) and (ss). The letters follow Turn
// 24's (pp).
//
// (qq) Four men and one used saw: one works, three say `no place at the saw`, and the month's
//      output is one man's.
// (rr) The same four with an industrial saw: three work at 1.12 and the fourth says the line.
// (ss) A contract the hall cannot keep up with is red on its card before it is signed.
//
// The hall is the one the engine tests stand four men in (`sixJoinersOnSheetWork` less two men),
// every job put back to the start of its cutting and made big enough that its cutting outlasts the
// month, so that what the month measures is the saw's places and nothing else. The days are played
// through with every event answered by its first choice (`runDays`), as a player who clicks OK.

import { describe, expect, it } from 'vitest';
import type { Contract, GameState } from '../../src/engine/index';
import { bubbleFor } from '../../src/engine/bubbles';
import { contractHallCapacity, drawContract } from '../../src/engine/contracts';
import { MACHINE_PACE, MINUTES_PER_WORKING_DAY } from '../../src/engine/constants';
import { hallPace, menAtMachine } from '../../src/engine/machines';
import { planPlaces } from '../../src/engine/production';
import { renderContracts } from '../../src/ui/contracts';
import { renderWorkPlan } from '../../src/ui/workPlan';
import { runDays, sixJoinersOnSheetWork, withOnlyCuttingLeft } from '../helpers';

/** How many calendar days each month is played for. */
const MONTH_DAYS = 30;
/** How much bigger than the fixture's own each job is made, so its cutting outlasts the month. */
const BIG = 20;

/** Four men on four big jobs at the start of their cutting, and one saw of the class named. */
function fourMenOneSaw(sawVariant: string): GameState {
  const state = sixJoinersOnSheetWork({ saws: 1, sawVariant });
  for (const worker of state.workers.slice(4)) {
    const job = state.jobs.find((entry) => entry.id === worker.jobId);
    if (job) job.assignees = job.assignees.filter((who) => who !== worker.id);
    worker.jobId = null;
  }
  state.workers = state.workers.slice(0, 4);
  state.jobs = state.jobs.filter((job) => job.assignees.length > 0);
  for (const job of state.jobs) {
    job.labourValue *= BIG;
    job.labourRemaining = job.labourValue;
    job.stageLabour = {};
    job.sheetsUsed = 0;
    job.dueDay = state.clock.day + 365;
  }
  withOnlyCuttingLeft(state);
  planPlaces(state);
  return state;
}

interface Month {
  start: GameState;
  end: GameState;
  /** Production minutes each of the four put in over the month, in the order they were hired. */
  worked: number[];
  /** The month's minutes lost to no place, off the closed days. */
  noPlace: number;
  /** One man's month: the working days it ran, at a full day each. */
  oneMan: number;
}

function playMonth(sawVariant: string): Month {
  const start = fourMenOneSaw(sawVariant);
  const before = start.workers.map((worker) => worker.productionMinutes);
  const daysBefore = start.days.length;
  const end = runDays(start, MONTH_DAYS).state;
  const closed = end.days.slice(daysBefore);
  return {
    start,
    end,
    worked: end.workers.map((worker, index) => worker.productionMinutes - (before[index] ?? 0)),
    noPlace: closed.reduce((sum, day) => sum + day.efficiency.lost.noPlace, 0),
    oneMan: closed.filter((day) => day.efficiency.possible > 0).length * MINUTES_PER_WORKING_DAY,
  };
}

const used = playMonth('used');
const industrial = playMonth('industrial');

describe('(qq) four men and one used saw (CLAUDE.md T25 section 3)', () => {
  it('works one man and says `no place at the saw` over the other three', () => {
    const state = used.start;
    expect(menAtMachine(state, state.equipment.find((item) => item.specId === 'tableSaw') ?? { id: '' })).toEqual([
      'staff-1',
    ]);
    for (const who of ['staff-2', 'staff-3', 'staff-4']) {
      expect(bubbleFor(state, who)?.text, who).toBe('no place at the saw');
    }
  });

  it('makes one man s month, and books the other three s to no place', () => {
    // Every job's cutting outlasts the month, so the saw's one place is the month's whole output:
    // the four men between them put in one man's minutes. Measured on v52: 22 working days of 480
    // minutes, 10,560, all of them the first man hired's; the other three nought, and their three
    // months, 31,680 minutes, all no place.
    const total = used.worked.reduce((sum, minutes) => sum + minutes, 0);
    expect(used.oneMan).toBe(22 * MINUTES_PER_WORKING_DAY);
    expect(used.worked).toEqual([used.oneMan, 0, 0, 0]);
    expect(total).toBe(used.oneMan);
    expect(used.noPlace).toBe(3 * used.oneMan);
    console.log(
      `(qq) four men, one used saw, ${MONTH_DAYS} days: worked ${used.worked.join(', ')} min; ` +
        `no place ${used.noPlace} min; one man's month ${used.oneMan} min`,
    );
  });
});

describe('(rr) the same four with an industrial saw (CLAUDE.md T25 section 3)', () => {
  it('works three at 1.12 and says the line over the fourth', () => {
    const state = industrial.start;
    expect(hallPace(state, 'tableSaw')).toBe(MACHINE_PACE.industrial);
    expect(MACHINE_PACE.industrial).toBe(1.12);
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    expect(menAtMachine(state, saw ?? { id: '' })).toEqual(['staff-1', 'staff-2', 'staff-3']);
    expect(bubbleFor(state, 'staff-4')?.text).toBe('no place at the saw');
    for (const who of ['staff-1', 'staff-2', 'staff-3']) expect(bubbleFor(state, who), who).toBeNull();
  });

  it('makes three men s month and the fourth s is no place', () => {
    // Three places: three men's months, 10,560 minutes each, three times the used saw's, and the
    // fourth man's month all no place. Measured on v52. The minutes are the same at either saw; what
    // the industrial class adds on top is its pace, 1.12, on every one of them (asserted above).
    expect(industrial.worked).toEqual([industrial.oneMan, industrial.oneMan, industrial.oneMan, 0]);
    expect(industrial.oneMan).toBe(used.oneMan);
    expect(industrial.noPlace).toBe(industrial.oneMan);
    console.log(
      `(rr) four men, one industrial saw, ${MONTH_DAYS} days: worked ${industrial.worked.join(', ')} min; ` +
        `no place ${industrial.noPlace} min`,
    );
  });
});

describe('(ss) a contract the hall cannot keep up with (CLAUDE.md T25 section 3, 2.7)', () => {
  function offeredTo(state: GameState, wanted: number): Contract {
    const contract = drawContract(state);
    contract.pieceId = 'cutSheetPack';
    contract.quantityPerWeek = wanted;
    contract.status = 'offered';
    state.contracts = [contract];
    return contract;
  }

  function line(html: string): Element | null {
    const holder = document.createElement('div');
    holder.innerHTML = html;
    return holder.querySelector('[data-hall-makes]');
  }

  it('is red on its card before it is signed, and green in the hall that can', () => {
    const small = fourMenOneSaw('used');
    const big = fourMenOneSaw('industrial');
    const smallMakes = contractHallCapacity(small, offeredTo(small, 1)).perWeek;
    const bigMakes = contractHallCapacity(big, offeredTo(big, 1)).perWeek;
    // A term between the two: the used saw's one place cannot keep up with it, the industrial
    // saw's three can.
    const wanted = smallMakes + 1;
    expect(bigMakes).toBeGreaterThanOrEqual(wanted);
    offeredTo(small, wanted);
    offeredTo(big, wanted);
    for (const html of [renderContracts(small), renderWorkPlan(small, 'contracts')]) {
      expect(line(html)?.classList.contains('bad')).toBe(true);
      expect(line(html)?.textContent).toBe(
        `Your hall makes about ${smallMakes} of these a week at full crew; this term wants ${wanted}.`,
      );
    }
    for (const html of [renderContracts(big), renderWorkPlan(big, 'contracts')]) {
      expect(line(html)?.classList.contains('good')).toBe(true);
    }
    // Nothing has been signed: the line is read before the click.
    expect(small.contracts[0]?.status).toBe('offered');
    console.log(`(ss) cut sheet packs: one used saw makes ${smallMakes} a week, one industrial ${bigMakes}`);
  });
});

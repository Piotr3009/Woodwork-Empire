// @vitest-environment jsdom
// The Turn 25 scenarios of CLAUDE.md T25 section 3: (qq), (rr) and (ss). The letters follow Turn
// 24's (pp).
//
// (qq) Four men and one used saw: from v53 all four work, one at the saw and three wherever the
//      hall has a free place, nobody is marked, and the one saw costs the hall its pace instead:
//      `Too few saws: capacity 1, 4 men` on the Output sheet (PIOTR, 24.09; v55). On v52 one worked
//      and three stood with `no place at the saw`.
// (rr) The same four with an industrial saw: the men whose half hour at the saw it is work at it at
//      1.12, the others at their benches, and from v55 an industrial saw keeps four men busy, so
//      the crew of four is not short of saws at all.
// (ss) A contract the hall cannot keep up with is red on its card before it is signed.
//
// The hall is the one the engine tests stand four men in (`sixJoinersOnSheetWork` less two men),
// every job put back to the start of its cutting and made big enough that it outlasts the month,
// so that what the month measures is the saw and nothing else. The crew the saw's capacity is
// counted against is the men at work whose job goes through a saw (`crewAtFamily`, v55), which is
// the four: the owner has no job here. v53 counted him as well, a crew of five, at work or not
// (v54). From v55 a man goes round his job's machines a half hour at a time, one machine further
// on than the man hired before him (PIOTR, 24.09), so which of the four stand at the saw in a
// given half hour is the round's. The days are played through with every event answered by its
// first choice (`runDays`), as a player who clicks OK.

import { describe, expect, it } from 'vitest';
import type { Contract, GameState } from '../../src/engine/index';
import { bubbleFor } from '../../src/engine/bubbles';
import { contractHallCapacity, drawContract } from '../../src/engine/contracts';
import { BY_HAND_DURATION_FACTOR, MACHINE_PACE, MINUTES_PER_WORKING_DAY } from '../../src/engine/constants';
import { hallPace, menAtMachine, placeShortages, shortageLine } from '../../src/engine/machines';
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

/** What the hall's minutes are multiplied by for a saw that keeps this many men busy and the crew
 *  of four at work: the men past its capacity work at the by hand pace (PIOTR, 24.09; v53, v55). A
 *  crew of five until v54, the owner counted with no job. */
function sawFactor(capacity: number): number {
  return (capacity + (4 - capacity) / BY_HAND_DURATION_FACTOR) / 4;
}

describe('(qq) four men and one used saw (CLAUDE.md T25 section 3; v53)', () => {
  it('works all four, one at the saw and three elsewhere, and marks nobody', () => {
    const state = used.start;
    const saw = state.equipment.find((item) => item.specId === 'tableSaw') ?? { id: '' };
    // The round's first half hour: the second and the fourth man's turn is the saw and the first
    // and the third man's the bench (v55). The used saw has one place, so the second man, hired
    // first of the two, has it and the fourth goes on to his bench. staff-1 until v55.
    expect(menAtMachine(state, saw)).toEqual(['staff-2']);
    for (const worker of state.workers) {
      expect(worker.working, worker.id).toBe(true);
      expect(worker.noPlaceFor, worker.id).toBe('');
      expect(bubbleFor(state, worker.id), worker.id).toBeNull();
    }
  });

  it('says what the one saw costs, on the saw and on the Output sheet', () => {
    const state = used.start;
    // Four men at work and a used saw that keeps one busy: three past it (v54, v55; five men and
    // four past it on v53).
    expect(shortageLine(state, 'tableSaw')).toBe('Too few saws for the crew: 4 men, capacity 1, 3 work at 67%');
    const short = placeShortages(state).find((entry) => entry.family === 'tableSaw');
    expect(short?.capacity).toBe(1);
    expect(short?.men).toBe(4);
    expect(short?.factor).toBeCloseTo(sawFactor(1), 10);
  });

  it('makes four men s month, and books nothing to no place', () => {
    // Nobody waits for the saw from v53: every one of the four puts in the month's working days,
    // 22 of 480 minutes, 10,560 each. On v52 the first man hired had all of it and the other three
    // nought, 31,680 minutes of no place. What the one saw costs now is the pace, above.
    expect(used.oneMan).toBe(22 * MINUTES_PER_WORKING_DAY);
    expect(used.worked).toEqual([used.oneMan, used.oneMan, used.oneMan, used.oneMan]);
    expect(used.noPlace).toBe(0);
    console.log(
      `(qq) four men, one used saw, ${MONTH_DAYS} days: worked ${used.worked.join(', ')} min; ` +
        `no place ${used.noPlace} min; ${shortageLine(used.start, 'tableSaw')}`,
    );
  });
});

describe('(rr) the same four with an industrial saw (CLAUDE.md T25 section 3; v53)', () => {
  it('works the men of the saw s half hour at it at 1.12 and the others at their benches, and marks nobody', () => {
    const state = industrial.start;
    expect(hallPace(state, 'tableSaw')).toBe(MACHINE_PACE.industrial);
    expect(MACHINE_PACE.industrial).toBe(1.12);
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    // Both men whose half hour it is at the saw are at it, the industrial saw having the places
    // for them; the other two are at their benches (v55). staff-1 to staff-3 until v55, when the
    // first three hired filled its three places.
    expect(menAtMachine(state, saw ?? { id: '' })).toEqual(['staff-2', 'staff-4']);
    for (const worker of state.workers) {
      expect(worker.working, worker.id).toBe(true);
      expect(bubbleFor(state, worker.id), worker.id).toBeNull();
    }
    // An industrial saw keeps four men busy from v55 [PIOTR, 24.09: "one man to four, the best
    // saw"], so the four are not short of saws: no line and no factor. One man past three places
    // on v54, two on v53 with the owner counted.
    expect(shortageLine(state, 'tableSaw')).toBe('');
    expect(placeShortages(state).some((entry) => entry.family === 'tableSaw')).toBe(false);
  });

  it('makes four men s month, the same minutes as the used saw s hall and a better pace', () => {
    // The minutes are the same at either saw from v53, 10,560 a man; what the industrial saw buys
    // is its pace, 1.12, and nobody past its capacity instead of three (asserted above; one on v54).
    // On v52 it was three men's months and the fourth's all no place.
    expect(industrial.worked).toEqual([industrial.oneMan, industrial.oneMan, industrial.oneMan, industrial.oneMan]);
    expect(industrial.oneMan).toBe(used.oneMan);
    expect(industrial.noPlace).toBe(0);
    console.log(
      `(rr) four men, one industrial saw, ${MONTH_DAYS} days: worked ${industrial.worked.join(', ')} min; ` +
        `no place ${industrial.noPlace} min; ${shortageLine(industrial.start, 'tableSaw')}`,
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
      expect(line(html)?.querySelector('.row-figure')?.classList.contains('bad')).toBe(true);
      expect(line(html)?.querySelector('.row-main')?.textContent).toBe(
        `Your hall makes about ${smallMakes} of these a week at full crew;`,
      );
      expect(line(html)?.querySelector('.row-figure')?.textContent).toBe(`this term wants ${wanted}`);
    }
    for (const html of [renderContracts(big), renderWorkPlan(big, 'contracts')]) {
      expect(line(html)?.querySelector('.row-figure')?.classList.contains('good')).toBe(true);
    }
    // Nothing has been signed: the line is read before the click.
    expect(small.contracts[0]?.status).toBe('offered');
    console.log(`(ss) cut sheet packs: one used saw makes ${smallMakes} a week, one industrial ${bigMakes}`);
  });
});

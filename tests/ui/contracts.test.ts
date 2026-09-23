// @vitest-environment jsdom
// The Contracts tab beside Orders and the standing bar on the Work Plan (CLAUDE.md T13 3.16).

import { describe, expect, it } from 'vitest';
import {
  CONTRACT_FREE_END_DAYS,
  WORKER_RATES,
} from '../../src/engine/constants';
import {
  acceptContract,
  assignContract,
  contractPiece,
  contractPriceFor,
  contractResultFor,
  drawContract,
  endContract,
  reserveContractSheets,
} from '../../src/engine/contracts';
import { renderContracts } from '../../src/ui/contracts';
import { money, signedMoney } from '../../src/ui/modal';
import { renderWorkPlan } from '../../src/ui/workPlan';
import type { Contract, GameState, Worker } from '../../src/engine/index';
import { buyStartingKit, fillRack, newGame, withAir, withExtraction } from '../helpers';

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

function joiner(id: string, name: string): Worker {
  return {
    id,
    name,
    role: 'joiner',
    tier: 'novice',
    rate: WORKER_RATES.novice,
    monthlyWage: 1950,
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

function hall(): GameState {
  const state = withAir(withExtraction(fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 60)));
  state.enquiries = [];
  state.workers.push(joiner('staff-1', 'Ben'));
  return state;
}

/** An offer on the board for the cut sheet pack, whatever the stream drew: this file is about
 *  what the tab prints, and the board offers three lengths of work now (CLAUDE.md T17 2.22). */
function offered(state: GameState): Contract {
  const contract = drawContract(state);
  contract.pieceId = 'cutSheetPack';
  contract.name = 'Cut sheet packs for a shop';
  // The entry point's price (v40).
  contract.pricePerPiece = contractPriceFor(contractPiece(contract));
  contract.quantityPerWeek = 60;
  state.contracts.push(contract);
  return contract;
}

describe('the Contracts tab', () => {
  it('says where contracts come from when there are none', () => {
    const page = parse(renderContracts(newGame()));
    expect(page.querySelector('.empty')?.textContent).toContain('No contract on offer');
    const low = newGame();
    low.reputation = -10;
    expect(parse(renderContracts(low)).querySelector('.empty')?.textContent).toContain('from the second tier up');
  });

  it('shows the offer as a tile with Accept and Decline and the figures', () => {
    const state = hall();
    const contract = offered(state);
    const page = parse(renderContracts(state));
    const tile = page.querySelector(`.tile[data-contract="${contract.id}"]`);
    expect(tile?.querySelector('.tile-name')?.textContent).toBe(contract.name);
    // The cut sheet pack at the entry point's price (v40).
    expect(tile?.querySelector('.tile-price')?.textContent).toBe(`${money(contract.pricePerPiece)} a piece`);
    expect(tile?.textContent).toContain('60 a week for');
    expect(tile?.textContent).toContain('£30 of material');
    expect(tile?.querySelector('[data-do="acceptContract"]')?.getAttribute('data-id')).toBe(contract.id);
    expect(tile?.querySelector('[data-do="declineContract"]')?.getAttribute('data-id')).toBe(contract.id);
  });

  it('shows the active contract with its counter, its people and the assign controls', () => {
    const state = hall();
    const contract = offered(state);
    acceptContract(state, contract.id);
    contract.piecesThisWeek = 31;
    const page = parse(renderContracts(state));
    const block = page.querySelector(`.contract-active[data-contract="${contract.id}"]`);
    expect(block?.querySelector('.contract-count')?.textContent).toBe('31 / 60 this week');
    expect(block?.querySelector('.warn')?.textContent).toContain('Nobody is on it');
    const put = block?.querySelector('[data-do="assignContract"]');
    expect(put?.getAttribute('data-worker')).toBe('staff-1');
    expect(put?.getAttribute('data-on')).toBe('1');
    expect(put?.getAttribute('data-id')).toBe(contract.id);
    assignContract(state, contract.id, 'staff-1', true);
    const after = parse(renderContracts(state));
    const off = after.querySelector('[data-do="assignContract"]');
    expect(off?.getAttribute('data-on')).toBe('0');
    expect(off?.textContent).toBe('Take off');
    expect(after.querySelector('.contract-active .warn')).toBeNull();
    contract.weeks.push({ week: 1, wanted: 60, made: 40 });
    const history = parse(renderContracts(state));
    const week = Array.from(history.querySelectorAll('.contract-active .row')).find((row) =>
      row.textContent?.includes('Week 1'),
    );
    expect(week?.querySelector('.row-figure')?.textContent).toBe('40 / 60, short');
    expect(week?.querySelector('.row-figure')?.className).toContain('bad');
  });

  it('shows the closing report and the renew question at the end of the term', () => {
    const state = hall();
    const contract = offered(state);
    acceptContract(state, contract.id);
    contract.weeks = [{ week: 1, wanted: 60, made: 60 }];
    contract.piecesMade = 60;
    contract.revenue = 2280;
    contract.materialCost = 1800;
    contract.labourMinutes = 600;
    contract.endDay = 7;
    state.clock.day = 8;
    contract.piecesThisWeek = 60;
    endContract(state, contract);
    const page = parse(renderContracts(state));
    const block = page.querySelector(`.contract-ended[data-contract="${contract.id}"]`);
    const figures = Array.from(block?.querySelectorAll('.row-figure') ?? []).map((figure) => [
      figure.textContent,
      figure.className,
    ]);
    expect(figures[0]).toEqual(['60', 'row-figure']);
    expect(figures[1]).toEqual(['+£2,280', 'row-figure good']);
    expect(figures[2]).toEqual(['-£1,800', 'row-figure bad']);
    expect(figures[3]?.[1]).toBe('row-figure bad');
    expect(block?.textContent).toContain('10 hours at cost');
    expect(block?.textContent).toContain('2 full weeks, 0 short');
    const renew = block?.querySelector('[data-do="renewContract"][data-accept="1"]');
    const go = block?.querySelector('[data-do="renewContract"][data-accept="0"]');
    expect(renew?.getAttribute('data-id')).toBe(contract.id);
    // Two full weeks put two per cent on the price (CLAUDE.md T17 2.22, T20 2.2).
    expect(renew?.textContent).toContain(`Renew at ${money(Math.round(contract.pricePerPiece * 1.02))}`);
    expect(go?.textContent).toBe('Let it go');
  });

  it('says how it ended, in the words the engine has for it (CLAUDE.md T20 2.1.6)', () => {
    const state = hall();
    const contract = offered(state);
    acceptContract(state, contract.id);
    contract.weeks = [
      { week: 1, wanted: 60, made: 40 },
      { week: 2, wanted: 60, made: 40 },
    ];
    contract.endDay = 7;
    state.clock.day = 8;
    contract.piecesThisWeek = 60;
    endContract(state, contract);
    // The client walked away after two short weeks: the page the closing event sends the player
    // to says so, and does not call it the end of the term.
    contract.endedBy = 'client';
    const block = parse(renderContracts(state)).querySelector(
      `.contract-ended[data-contract="${contract.id}"]`,
    );
    expect(block?.querySelector('h3')?.textContent).toBe(
      `${contract.name}: the client has ended it after 2 short weeks`,
    );
    expect(block?.querySelector('h3')?.textContent).not.toContain('the term is over');
  });
});

describe('the material and the way out (CLAUDE.md T17 2.22)', () => {
  it('shows what the contract makes with each man on it, on his own row', () => {
    const state = hall();
    const contract = offered(state);
    acceptContract(state, contract.id);
    const page = parse(renderContracts(state));
    const row = page.querySelector(`.contract-active [data-worker="staff-1"]`);
    const result = contractResultFor(state, contract, state.workers[0] as Worker);
    // The prices of T20 2.2 make a cut sheet pack pay by hand, so the line is his own figures and
    // not a loss typed into the test (CLAUDE.md T20 2.2).
    expect(row?.querySelector('small')?.textContent).toBe(
      `${result.minutes} minutes a piece, ${money(result.labourCost)} of his time` +
        `${result.wear > 0 ? ` and ${money(result.wear)} of wear` : ''}: ` +
        `${signedMoney(result.margin)} a piece, ${signedMoney(result.dayResult)} a day`,
    );
    expect(result.margin).toBeGreaterThan(0);
    expect(row?.querySelector('.row-figure')?.className).toContain('good');
  });

  it('says the material is off the rack, and how much of it a week takes', () => {
    const state = hall();
    const contract = offered(state);
    const tile = parse(renderContracts(state)).querySelector('.tile');
    expect(tile?.textContent).toContain('It comes off the rack: about 9 sheets a week');
    acceptContract(state, contract.id);
    reserveContractSheets(state, contract);
    const block = parse(renderContracts(state)).querySelector('.contract-active');
    expect(block?.textContent).toContain('9 sheets held on the rack');
  });

  it('locks End it inside the first month with the days to go, and offers it after', () => {
    const state = hall();
    const contract = offered(state);
    acceptContract(state, contract.id);
    const locked = parse(renderContracts(state)).querySelector('.contract-active .row-action');
    expect(locked?.textContent).toContain('End it');
    expect(locked?.querySelector('[data-do="endContract"]')).toBeNull();
    expect(locked?.querySelector('[title]')?.getAttribute('title')).toContain('The first month stands');
    state.clock.day += CONTRACT_FREE_END_DAYS;
    const open = parse(renderContracts(state)).querySelector('.contract-active .row-action');
    const end = open?.querySelector('[data-do="endContract"]');
    expect(end?.getAttribute('data-id')).toBe(contract.id);
    expect(end?.textContent).toBe('End it');
  });
});

describe('the contract bar has left the Jobs tab (CLAUDE.md T20 2.1.5)', () => {
  it('draws no contract on the Jobs tab and puts its chips and its button into Running', () => {
    const state = hall();
    const contract = offered(state);
    acceptContract(state, contract.id);
    assignContract(state, contract.id, 'staff-1', true);
    contract.piecesThisWeek = 15;
    // The Jobs tab is the plan and nothing else now.
    const jobs = parse(renderWorkPlan(state, 'jobs'));
    expect(jobs.querySelector('.contract-bar')).toBeNull();
    expect(jobs.querySelector('.plan-row[data-plan]')).toBeNull();
    // Running carries the same chips and the same button it carried on the plan in v28.
    const running = parse(renderWorkPlan(state, 'contracts'));
    const bar = running.querySelector(`.contract-bar[data-contract="${contract.id}"]`);
    expect(bar).not.toBeNull();
    expect(bar?.querySelector('.contract-fill')?.getAttribute('style')).toBe('width:25%');
    expect(bar?.querySelector('.assign-chip')?.textContent).toBe('Ben×');
    expect(bar?.querySelector('[data-do="assignContract"][data-on="0"]')?.getAttribute('data-worker')).toBe(
      'staff-1',
    );
    expect(bar?.querySelector('[data-do="openAssign"]')?.textContent).toBe('Assign to this contract');
  });

  it('opens the same list, with the cross every popover has', () => {
    const state = hall();
    const contract = offered(state);
    acceptContract(state, contract.id);
    const shut = parse(renderWorkPlan(state, 'contracts'));
    expect(shut.querySelector('.assign-list')).toBeNull();
    expect(shut.querySelector('.contract-bar')?.textContent).toContain('Nobody is on it');
    const open = parse(renderWorkPlan(state, 'contracts', contract.id));
    const list = open.querySelector(`.contract-bar[data-contract="${contract.id}"] .assign-list`);
    expect(list).not.toBeNull();
    expect(list?.getAttribute('data-popover')).toBe('assign-contract');
    expect(list?.querySelector('.modal-close[data-do="closeAssign"]')).not.toBeNull();
    const add = list?.querySelector('[data-do="assignContract"][data-on="1"]');
    expect(add?.getAttribute('data-worker')).toBe('staff-1');
  });
});

// @vitest-environment jsdom
// The Contracts tab beside Orders and the standing bar on the Work Plan (CLAUDE.md T13 3.16).

import { describe, expect, it } from 'vitest';
import { WORKER_RATES } from '../../src/engine/constants';
import {
  acceptContract,
  assignContract,
  drawContract,
  endContract,
} from '../../src/engine/contracts';
import { renderContractBar, renderContracts } from '../../src/ui/contracts';
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
    tier: 'poor',
    rate: WORKER_RATES.poor,
    weeklyWage: 480,
    monthlyWage: 0,
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

function offered(state: GameState): Contract {
  const contract = drawContract(state);
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
    expect(tile?.querySelector('.tile-price')?.textContent).toBe('£38 a piece');
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
    expect(renew?.textContent).toContain('Renew at £39');
    expect(go?.textContent).toBe('Let it go');
  });
});

describe('the standing bar on the work plan', () => {
  it('is a bar apart from the jobs, with the piece counter and the people on it', () => {
    const state = hall();
    expect(renderContractBar(state)).toBe('');
    const contract = offered(state);
    acceptContract(state, contract.id);
    assignContract(state, contract.id, 'staff-1', true);
    contract.piecesThisWeek = 15;
    const bar = parse(renderContractBar(state)).querySelector('.contract-bar');
    expect(bar?.getAttribute('data-contract')).toBe(contract.id);
    expect(bar?.querySelector('.contract-count')?.textContent).toBe('15 / 60 this week');
    expect(bar?.querySelector('.contract-fill')?.getAttribute('style')).toBe('width:25%');
    expect(bar?.textContent).toContain('Ben');
    expect(bar?.textContent).toContain('week 1 of');
    const plan = parse(renderWorkPlan(state));
    expect(plan.querySelector('.contract-bar')).not.toBeNull();
    expect(plan.querySelector('.plan-row[data-plan]')).toBeNull();
  });
});

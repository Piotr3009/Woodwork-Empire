/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// @vitest-environment jsdom
// Turn 29, 2.3: a standing contract takes four joiners at the most [PIOTR, 05.10: "three or four
// at the most; today on sheet goods as many go on as I like and the profit is fantastic, which
// does not happen in life"], asked at the one door every path goes through, counted on both tabs,
// and never a limit on a job of work ("do not touch the normal jobs") (CLAUDE.md T29 2.3, 7).

import { beforeAll, describe, expect, it } from 'vitest';
import {
  CONTRACT_MAX_JOINERS,
  MINUTES_PER_WORKING_DAY,
  WORKER_RATES,
  WORKING_DAYS_PER_WEEK,
} from '../../src/engine/constants';
import {
  acceptContract,
  assignContract,
  contractAssignCheck,
  contractCrewFullLine,
  contractCrewLine,
  contractHallCapacity,
  contractHallLine,
  contractMenNeeded,
  contractPiece,
  contractPriceFor,
  drawContract,
} from '../../src/engine/contracts';
import type { Contract, GameState } from '../../src/engine/index';
import { addToJob } from '../../src/engine/jobs';
import { fullCrew, hallPace, placeShortages } from '../../src/engine/machines';
import { manPace } from '../../src/engine/stages';
import { joiners } from '../../src/engine/staff';
import { renderContracts } from '../../src/ui/contracts';
import { renderWorkPlan } from '../../src/ui/workPlan';
import { currentState, mount, render } from '../../src/ui/app';
import { sixJoinersOnSheetWork, testJoiner } from '../helpers';

const FULL = 'A contract takes four joiners at the most';

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

/** A running contract for cut sheet packs, signed in a hall of six joiners who are on nothing. */
function running(state: GameState, name = 'Cut sheet packs for Northgate Interiors'): Contract {
  const contract = drawContract(state);
  // An offer is named by its day; a second signed the same day is given a name of its own.
  contract.id = `contract-${state.clock.day}-${state.contracts.length + 1}`;
  contract.pieceId = 'cutSheetPack';
  contract.name = name;
  contract.pricePerPiece = contractPriceFor(contractPiece(contract));
  contract.quantityPerWeek = 40;
  state.contracts.push(contract);
  expect(acceptContract(state, contract.id).ok).toBe(true);
  return contract;
}

/** Six joiners on the books, every one of them free: no job, no contract. */
function sixFree(): GameState {
  const state = sixJoinersOnSheetWork();
  state.jobs = [];
  for (const worker of state.workers) worker.jobId = null;
  state.contracts = [];
  return state;
}

function putOn(state: GameState, contract: Contract, ...ids: string[]): void {
  for (const id of ids) expect(assignContract(state, contract.id, id, true), id).toEqual({ ok: true, reason: '' });
}

describe('four joiners to a contract, at the one door (CLAUDE.md T29 2.3)', () => {
  it('is four, and the engine words the refusal', () => {
    expect(CONTRACT_MAX_JOINERS).toBe(4);
    expect(contractCrewFullLine()).toBe(FULL);
  });

  it('takes four and refuses a fifth in its own words, and the fifth stays where he was', () => {
    const state = sixFree();
    const contract = running(state);
    putOn(state, contract, 'staff-1', 'staff-2', 'staff-3');
    expect(contractCrewLine(contract)).toBe('3 of 4');
    putOn(state, contract, 'staff-4');
    expect(contractCrewLine(contract)).toBe('4 of 4, the most a contract takes');
    expect(contractAssignCheck(state, contract, 'staff-5')).toEqual({ ok: false, reason: FULL });
    expect(assignContract(state, contract.id, 'staff-5', true)).toEqual({ ok: false, reason: FULL });
    expect(contract.assigned).toEqual(['staff-1', 'staff-2', 'staff-3', 'staff-4']);
    expect(state.workers.find((worker) => worker.id === 'staff-5')?.jobId).toBeNull();
    // The man on it always passes the door, so he can be taken off a full contract.
    expect(contractAssignCheck(state, contract, 'staff-2').ok).toBe(true);
    expect(assignContract(state, contract.id, 'staff-2', false).ok).toBe(true);
    expect(contractCrewLine(contract)).toBe('3 of 4');
    // And another put on in his place.
    putOn(state, contract, 'staff-5');
    expect(contract.assigned).toEqual(['staff-1', 'staff-3', 'staff-4', 'staff-5']);
  });

  it('leaves a man refused a full contract on the contract he was on', () => {
    const state = sixFree();
    const first = running(state, 'Drawer boxes for a shop');
    const full = running(state, 'Cut sheet packs for Northgate Interiors');
    putOn(state, first, 'staff-5');
    putOn(state, full, 'staff-1', 'staff-2', 'staff-3', 'staff-4');
    expect(assignContract(state, full.id, 'staff-5', true)).toEqual({ ok: false, reason: FULL });
    expect(first.assigned).toEqual(['staff-5']);
    expect(state.workers.find((worker) => worker.id === 'staff-5')?.jobId).toBe(`contract:${first.id}`);
  });

  it('counts the men put on it, whether or not they are in today', () => {
    const state = sixFree();
    const contract = running(state);
    putOn(state, contract, 'staff-1', 'staff-2', 'staff-3', 'staff-4');
    // One off after an accident and one on the second shift hold their places.
    const hurt = state.workers.find((worker) => worker.id === 'staff-2');
    const night = state.workers.find((worker) => worker.id === 'staff-3');
    if (hurt === undefined || night === undefined) throw new Error('the men are wanted');
    hurt.absentDaysRemaining = 3;
    night.shift = 'night';
    expect(contractAssignCheck(state, contract, 'staff-5')).toEqual({ ok: false, reason: FULL });
  });

  it('never says a contract is for more men than it takes', () => {
    const state = sixFree();
    const contract = running(state);
    contract.quantityPerWeek = 5000;
    expect(contractMenNeeded(state, contract, state.workers[0] ?? null)).toBe(CONTRACT_MAX_JOINERS);
    const html = renderWorkPlan(state, 'contracts', null, null);
    expect(html).toContain('This contract is for 4 men at the least');
    expect(html).not.toMatch(/for ([5-9]|\d\d+) men at the least/);
  });

  it('takes a fifth, a ninth and a twentieth man on a job of work, as it always did', () => {
    const state = sixJoinersOnSheetWork();
    for (let man = 7; man <= 20; man += 1) state.workers.push(testJoiner(`staff-${man}`, `Man ${man}`));
    const job = state.jobs[0];
    if (job === undefined) throw new Error('a job is wanted');
    for (const worker of state.workers) addToJob(state, job.id, worker.id);
    expect(job.assignees).toHaveLength(20);
  });
});

describe('the hall line of an offer, with four on it (CLAUDE.md T29 2.3)', () => {
  /** The pieces a week of these men at the saw, at the hall's pace and what too few saws for this
   *  many men take off it, by the arithmetic of T25 2.7. */
  function weekOf(state: GameState, contract: Contract, ids: string[], atTheSaw: number): number {
    const week = MINUTES_PER_WORKING_DAY * WORKING_DAYS_PER_WEEK;
    const shortages = placeShortages(state, 'day', (family) => (family === 'tableSaw' ? atTheSaw : 0));
    const factors = shortages.map((short) => short.factor);
    return ids.reduce((total, id) => {
      const rate = state.workers.find((worker) => worker.id === id)?.rate ?? 1;
      const minutes = Math.max(1, Math.round(contractPiece(contract).minutes / manPace(rate, hallPace(state, 'tableSaw'), ...factors)));
      return total + Math.floor(week / minutes);
    }, 0);
  }

  it('counts the four with the highest rate, the earlier hired winning a tie, with four at the saw', () => {
    const state = sixFree();
    const senior = state.workers.find((worker) => worker.id === 'staff-6');
    const experienced = state.workers.find((worker) => worker.id === 'staff-5');
    if (senior === undefined || experienced === undefined) throw new Error('the men are wanted');
    senior.rate = WORKER_RATES.senior;
    experienced.rate = WORKER_RATES.experienced;
    const contract = drawContract(state);
    contract.pieceId = 'cutSheetPack';
    contract.quantityPerWeek = 20;
    const capacity = contractHallCapacity(state, contract);
    expect(capacity.capped).toBe(true);
    expect(capacity.perWeek).toBe(weekOf(state, contract, ['staff-6', 'staff-5', 'staff-1', 'staff-2'], 4));
    expect(contractHallLine(state, contract).hall).toBe(
      `Your hall makes about ${capacity.perWeek} of these a week with four on it`,
    );
  });

  it('is what it was on v83 for a company of three joiners, to the figure and the words', () => {
    const state = sixFree();
    state.workers = state.workers.slice(0, 3);
    expect(joiners(state)).toHaveLength(3);
    const contract = drawContract(state);
    contract.pieceId = 'cutSheetPack';
    contract.quantityPerWeek = 20;
    // v83's sum: every joiner on the books, the full crew (the owner and the three) at the saw.
    const v83 = weekOf(state, contract, ['staff-1', 'staff-2', 'staff-3'], fullCrew(state));
    expect(contractHallCapacity(state, contract)).toEqual({ perWeek: v83, wanted: 20, short: v83 < 20, capped: false });
    expect(contractHallLine(state, contract).hall).toBe(`Your hall makes about ${v83} of these a week at full crew`);
  });
});

describe('the count and the refusal on both tabs (CLAUDE.md T29 2.3)', () => {
  it('counts the men on the Orders board s tab and locks Put on it for a full contract', () => {
    const state = sixFree();
    const contract = running(state);
    putOn(state, contract, 'staff-1', 'staff-2', 'staff-3');
    const rowOf = (html: HTMLElement): string =>
      Array.from(html.querySelectorAll('.contract-active .row'))
        .find((row) => row.querySelector('.row-main')?.textContent === 'On it')
        ?.querySelector('.row-figure')?.textContent ?? '';
    expect(rowOf(parse(renderContracts(state)))).toBe('3 of 4');
    putOn(state, contract, 'staff-4');
    const full = parse(renderContracts(state));
    expect(rowOf(full)).toBe('4 of 4, the most a contract takes');
    const fifth = full.querySelector('.contract-active .row[data-worker="staff-5"] .row-action');
    expect(fifth?.innerHTML).toBe(`<button class="btn" disabled="" title="${FULL}">Put on it</button>`);
    // A man on it still has his Take off.
    expect(full.querySelector('.contract-active .row[data-worker="staff-1"] [data-do="assignContract"]')?.textContent).toBe('Take off');
  });

  it('puts the reason in place of the Work Plan s button and never opens the list for a full contract', () => {
    const state = sixFree();
    const contract = running(state);
    putOn(state, contract, 'staff-1', 'staff-2', 'staff-3');
    const three = parse(renderWorkPlan(state, 'contracts', contract.id, null));
    const card = three.querySelector('.contract-bar');
    expect(card?.textContent).toContain('3 of 4');
    expect(card?.querySelector('.assign-open')?.textContent).toBe('Assign to this contract');
    expect(card?.querySelector('.assign-list')).not.toBeNull();
    putOn(state, contract, 'staff-4');
    // The list asked open on a full contract: not drawn, and its false sentence never said.
    const four = parse(renderWorkPlan(state, 'contracts', contract.id, null));
    const fullCard = four.querySelector('.contract-bar');
    expect(fullCard?.textContent).toContain('4 of 4, the most a contract takes');
    expect(fullCard?.querySelector('.assign-open')).toBeNull();
    expect(fullCard?.querySelector('.assign-line .reason')?.textContent).toBe(FULL);
    expect(fullCard?.querySelector('.assign-list')).toBeNull();
    expect(four.textContent).not.toContain('Nobody is free');
  });
});

describe('the fourth man put on through the real DOM (CLAUDE.md T29 2.3)', () => {
  function root(): HTMLElement {
    const element = document.querySelector('#app');
    if (!(element instanceof HTMLElement)) throw new Error('no root');
    return element;
  }

  function game(): GameState {
    const state = currentState();
    if (state === null) throw new Error('no game');
    return state;
  }

  function click(selector: string): void {
    const element = root().querySelector(selector);
    if (element === null) throw new Error(`nothing to click: ${selector}`);
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    render();
  }

  beforeAll(() => {
    document.body.innerHTML = '<div id="app"></div>';
    mount(root());
    click('[data-do="startGame"]');
    const state = sixFree();
    const contract = running(state);
    putOn(state, contract, 'staff-1', 'staff-2', 'staff-3');
    Object.assign(game(), state);
    game().speed = 0;
    render();
  });

  it('shuts the list with the fourth, so the next Escape shuts the Work Plan and not a list nobody sees', () => {
    const toOffice = root().querySelector('[data-do="setView"][data-view="office"]');
    if (toOffice !== null) toOffice.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    click('[data-office="workPlan"]');
    click('[data-do="workPlanTab"][data-id="contracts"]');
    click('[data-do="openAssign"]');
    expect(root().querySelector('.assign-list[data-popover="assign-contract"]')).not.toBeNull();
    click('.assign-list [data-do="assignContract"][data-worker="staff-4"]');
    expect(game().contracts[0]?.assigned).toHaveLength(4);
    expect(root().querySelector('.assign-list')).toBeNull();
    expect(root().querySelector('.contract-bar .assign-line .reason')?.textContent).toBe(FULL);
    expect(root().textContent).not.toContain('Nobody is free');
    expect(root().querySelector('.modal-body .contract-bar')).not.toBeNull();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    render();
    expect(root().querySelector('.contract-bar')).toBeNull();
  });
});

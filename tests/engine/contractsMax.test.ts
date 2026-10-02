// At most three standing contracts (PIOTR, 02.10; CLAUDE.md T26 2.12): no offer is drawn while
// three run, the weekly one of v51 included, and an offer already on the board cannot be taken as a
// fourth, its card saying so in one line where the take button was.

import { describe, expect, it } from 'vitest';
import { CONTRACTS_MAX, CONTRACT_WEEKLY_OFFER_REPUTATION } from '../../src/engine/constants';
import {
  acceptContract,
  acceptContractCheck,
  activeContracts,
  contractsFull,
  contractsFullLine,
  drawContract,
  offerContract,
  offeredContract,
  renewContract,
  weeklyOfferOwed,
} from '../../src/engine/contracts';
import { isWorkingDay } from '../../src/engine/clock';
import { renderContracts, renderContractsTab } from '../../src/ui/contracts';
import type { GameState } from '../../src/engine/index';
import { newGame } from '../helpers';

/** A shop with the name for a weekly ring and so many contracts running. */
function shopRunning(running: number): GameState {
  const state = newGame({ difficulty: 'veryEasy' });
  state.reputation = CONTRACT_WEEKLY_OFFER_REPUTATION + 10;
  for (let index = 0; index < running; index += 1) {
    const contract = { ...drawContract(state), id: `running-${index}` };
    state.contracts.push(contract);
    expect(acceptContract(state, contract.id).ok).toBe(true);
  }
  expect(activeContracts(state)).toHaveLength(running);
  return state;
}

/** The first working day from today. */
function toAWorkingDay(state: GameState): void {
  while (!isWorkingDay(state.clock.day)) state.clock.day += 1;
}

describe('the most contracts a shop runs', () => {
  it('is three, Piotr s figure', () => {
    expect(CONTRACTS_MAX).toBe(3);
    expect(contractsFull(shopRunning(2))).toBe(false);
    expect(contractsFull(shopRunning(3))).toBe(true);
  });

  it('draws no fourth offer while three run, the weekly one owed or not', () => {
    const three = shopRunning(3);
    toAWorkingDay(three);
    expect(weeklyOfferOwed(three)).toBe(true);
    for (let day = three.clock.day; day < three.clock.day + 60; day += 1) {
      const probe = structuredClone(three);
      probe.clock.day = day;
      offerContract(probe);
      expect(offeredContract(probe)).toBeNull();
    }
    // Two running, and the weekly offer comes as it always did.
    const two = shopRunning(2);
    toAWorkingDay(two);
    offerContract(two);
    expect(offeredContract(two)).not.toBeNull();
  });

  it('refuses a fourth already on the board, and its card says so in one line', () => {
    const state = shopRunning(3);
    const fourth = { ...drawContract(state), id: 'fourth' };
    state.contracts.push(fourth);
    const check = acceptContractCheck(state, fourth.id);
    expect(check).toEqual({ ok: false, reason: '3 contracts running: the most the shop takes on' });
    expect(contractsFullLine()).toBe(check.reason);
    expect(acceptContract(state, fourth.id)).toEqual(check);
    expect(fourth.status).toBe('offered');
    expect(activeContracts(state)).toHaveLength(3);
    const tab = renderContractsTab(state);
    expect(tab).toContain(`<span class="reason">${check.reason}</span>`);
    expect(tab).not.toContain('data-do="takeContract"');
    expect(tab).not.toContain('data-do="acceptContract"');
  });

  it('refuses a renewal that would be a fourth, and keeps the ended contract and its history', () => {
    const state = shopRunning(3);
    const ended = { ...drawContract(state), id: 'ended', status: 'ended' as const, renegotiatedPrice: 70 };
    state.contracts.push(ended);
    expect(renewContract(state, ended.id, true)).toEqual({ ok: false, reason: contractsFullLine() });
    expect(state.contracts.find((contract) => contract.id === ended.id)?.status).toBe('ended');
    expect(activeContracts(state)).toHaveLength(3);
    // And its renew question on the Orders page says so in the line where the renew button was.
    const orders = renderContracts(state);
    expect(orders).toContain(`<span class="reason">${contractsFullLine()}</span>`);
    expect(orders).not.toContain('data-accept="1"');
    // With two running it is renewed as it always was.
    const two = shopRunning(2);
    two.contracts.push({ ...ended });
    expect(renewContract(two, ended.id, true).ok).toBe(true);
    expect(activeContracts(two)).toHaveLength(3);
    expect(two.contracts.some((contract) => contract.id === ended.id)).toBe(false);
  });
});

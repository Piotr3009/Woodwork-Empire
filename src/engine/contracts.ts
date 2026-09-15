// Standing contracts (CLAUDE.md T13 3.16). Phase A: the shape and the entry points, stubbed;
// phase B1 fills them: the offer, the weekly counter, the people only assignment, the short week,
// the renegotiation and the closing report.

import type { Contract, GameState } from './types';

export interface ContractCheck {
  ok: boolean;
  reason: string;
}

export function findContract(state: GameState, contractId: string): Contract | null {
  return state.contracts.find((contract) => contract.id === contractId) ?? null;
}

export function offeredContract(state: GameState): Contract | null {
  return state.contracts.find((contract) => contract.status === 'offered') ?? null;
}

export function activeContracts(state: GameState): Contract[] {
  return state.contracts.filter((contract) => contract.status === 'active');
}

/** The day's open: one offer on the board at a time, from the second reputation tier up. Phase B1. */
export function offerContract(state: GameState): void {
  void state;
}

export function acceptContract(state: GameState, contractId: string): ContractCheck {
  const contract = findContract(state, contractId);
  if (!contract) return { ok: false, reason: 'No such contract' };
  return { ok: false, reason: 'Not built yet' };
}

export function declineContract(state: GameState, contractId: string): ContractCheck {
  const contract = findContract(state, contractId);
  if (!contract) return { ok: false, reason: 'No such contract' };
  state.contracts = state.contracts.filter((entry) => entry.id !== contractId);
  return { ok: true, reason: '' };
}

export function assignContract(
  state: GameState,
  contractId: string,
  workerId: string,
  on: boolean,
): ContractCheck {
  const contract = findContract(state, contractId);
  if (!contract) return { ok: false, reason: 'No such contract' };
  void workerId;
  void on;
  return { ok: false, reason: 'Not built yet' };
}

export function renewContract(state: GameState, contractId: string, accept: boolean): ContractCheck {
  const contract = findContract(state, contractId);
  if (!contract) return { ok: false, reason: 'No such contract' };
  void accept;
  return { ok: false, reason: 'Not built yet' };
}

/** One production minute of every man on a contract: the piece in hand moves on, the machines it
 *  uses stay in the general queue (CLAUDE.md T13 3.16). Phase B1. */
export function runContractMinute(state: GameState): void {
  void state;
}

/** The day's open: the week's counter, the short week, the end of the term. Phase B1. */
export function runContractDay(state: GameState): void {
  void state;
}

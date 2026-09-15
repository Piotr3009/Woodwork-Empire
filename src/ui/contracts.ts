// The Contracts tab beside Orders, and the standing bar on the Work Plan (CLAUDE.md T13 3.16).
// Phase A: stubs; phase B1 builds both.

import type { GameState } from '../engine/index';
import { emptyLine } from './modal';

export function renderContracts(state: GameState): string {
  if (state.contracts.length === 0) return emptyLine('No contracts on offer.');
  return emptyLine(`${state.contracts.length} on the books.`);
}

/** The standing bar on the Work Plan, separate from the jobs, with its piece counter. */
export function renderContractBar(state: GameState): string {
  void state;
  return '';
}

// @vitest-environment jsdom
// v65 (PIOTR, 02.10): the ended term of a standing contract in a shop that already runs as many
// as it may says so where its Renew button was, and keeps the button that lets it go. Until v65 the
// button was there, the click took the ended term off the books and the new one was refused, so a
// shop that came into Turn 26 with four contracts lost one without a word.

import { describe, expect, it } from 'vitest';
import { CONTRACTS_MAX } from '../../src/engine/constants';
import { acceptContract, contractsFullLine, drawContract } from '../../src/engine/contracts';
import type { GameState } from '../../src/engine/index';
import { renderContracts } from '../../src/ui/contracts';
import { newGame } from '../helpers';

/** A shop with one contract ended, its offer open, and so many others running. */
function shop(others: number): GameState {
  const state = newGame({ difficulty: 'veryEasy' });
  for (let index = 0; index < others; index += 1) {
    const contract = drawContract(state);
    contract.id = `contract-running-${index}`;
    state.contracts.push(contract);
    expect(acceptContract(state, contract.id).ok).toBe(true);
  }
  const ended = drawContract(state);
  ended.id = 'contract-ended';
  ended.status = 'ended';
  ended.renegotiatedPrice = ended.pricePerPiece;
  state.contracts.push(ended);
  return state;
}

function page(state: GameState): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = renderContracts(state);
  return host;
}

describe('the ended term on the Contracts page', () => {
  it('says the shop is full where its Renew button was, and can still be let go', () => {
    const host = page(shop(CONTRACTS_MAX));
    const block = host.querySelector('[data-contract="contract-ended"]');
    if (block === null) throw new Error('the ended term is wanted on the page');
    expect(block.querySelector('[data-do="renewContract"][data-accept="1"]')).toBeNull();
    expect(block.textContent).toContain(contractsFullLine());
    expect(block.querySelector('[data-do="renewContract"][data-accept="0"]')?.textContent).toBe('Let it go');
  });

  it('has its Renew button while the shop has room for another term', () => {
    const host = page(shop(CONTRACTS_MAX - 1));
    const block = host.querySelector('[data-contract="contract-ended"]');
    if (block === null) throw new Error('the ended term is wanted on the page');
    expect(block.querySelector('[data-do="renewContract"][data-accept="1"]')?.textContent).toContain('Renew at');
    expect(block.textContent).not.toContain(contractsFullLine());
  });
});

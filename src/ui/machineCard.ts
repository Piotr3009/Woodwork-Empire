// One machine's own card, opened by a click on the machine on the hall (PIOTR, 17.09;
// CLAUDE.md T17 2.6).
//
// Piotr never found Connect to extraction, because the only card a machine had was inside the
// catalogue's Owned tab and a click on the machine itself wrote a line of text under the hall.
// The card is the Owned tab's card: one function draws both, so the buttons cannot differ.

import { findSpec } from '../engine/index';
import type { GameState } from '../engine/types';
import { ownedTile } from './catalogue';

/** The card of the machine the player clicked, or the one line that says it has gone. */
export function renderMachineCard(
  state: GameState,
  equipmentId: string | null,
  sellConfirm: string | null,
): string {
  const item = equipmentId === null ? undefined : state.equipment.find((entry) => entry.id === equipmentId);
  if (item === undefined) return '<p class="hint">That machine is not in the hall any more.</p>';
  const spec = findSpec(item.specId);
  if (spec === undefined || spec === null) {
    return '<p class="hint">That machine is not in the hall any more.</p>';
  }
  return `<div class="machine-card">${ownedTile(state, item, spec, sellConfirm)}</div>`;
}

// The Machines page of the laptop: one row per machine and extractor standing in the hall, with
// its picture, its class, the green bar of its life and the Service button with its price on it
// (PIOTR; CLAUDE.md T20 2.9).
//
// Phase A gives the page its route and nothing else. The rows, the bar and the service are
// CLAUDE.md T20 2.9, and they are filled in this turn's hall step.

import type { GameState } from '../engine/index';
import { emptyLine } from './modal';

export function renderMachinesPage(state: GameState): string {
  // The hall is read in this turn's next step; the page is here so the tile has somewhere to go.
  void state;
  return emptyLine('The machines and their service come here.');
}

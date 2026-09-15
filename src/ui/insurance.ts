// The Insurance tab of the laptop, under Admin (CLAUDE.md T13 3.15). Phase A: a stub; phase B1.

import type { GameState } from '../engine/index';
import { money } from './modal';

export function renderInsurance(state: GameState): string {
  return (
    `<p class="figures">Property cover ${state.insurance.property ? 'held' : 'not held'}, ` +
    `public liability ${state.insurance.liability ? 'held' : 'not held'}. ` +
    `Insured value ${money(state.insurance.insuredValue)}.</p>`
  );
}

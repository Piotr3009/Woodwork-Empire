// The Settings modal, off the gear on the top bar: tips on and off, and nothing else tonight
// (PIOTR; CLAUDE.md T13 3.22).
//
// Turn 11's autosave (T11 3.2) has no control: the game is written down at every morning, every
// purchase and every closed modal, never more than once a second, and the player was never asked
// about it. So nothing moves in here from it. The summary cadence (T4 3.6) is not an autosave
// setting; it stays on the summary and in the Menu, where Piotr put it.

import type { GameState } from '../engine/index';

/** The one row: two chips, one lit. A click on the lit one does nothing more (CLAUDE.md T13 1). */
export function renderSettings(state: GameState): string {
  const on = state.settings.tips;
  return (
    '<div class="settings">' +
    '<div class="row" data-setting="tips"><span class="row-main">Tips</span>' +
    '<span class="row-action">' +
    `<button class="chip${on ? ' is-on' : ''}" data-do="setTips" data-on="1">On</button>` +
    `<button class="chip${on ? '' : ' is-on'}" data-do="setTips" data-on="0">Off</button>` +
    '</span></div>' +
    '<p class="hint">The first use bubbles on every screen. Off, and every one of them goes; on, ' +
    'and the ones you have not dismissed come back.</p>' +
    '</div>'
  );
}

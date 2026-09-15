// The Settings modal, off the gear on the top bar: tips on and off, and nothing else tonight
// (CLAUDE.md T13 3.22). Phase A: the one control; phase B5 finishes it and moves the autosave
// controls in if they have one.

import type { GameState } from '../engine/index';

export function renderSettings(state: GameState): string {
  const on = state.settings.tips;
  return (
    '<div class="settings">' +
    `<div class="row"><span class="row-main">Tips</span><span class="row-action">` +
    `<button class="chip${on ? ' is-on' : ''}" data-do="setTips" data-on="1">On</button>` +
    `<button class="chip${on ? '' : ' is-on'}" data-do="setTips" data-on="0">Off</button>` +
    '</span></div></div>'
  );
}

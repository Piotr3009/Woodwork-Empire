// Tips in two layers (CLAUDE.md T13 3.22): the first use bubble on a screen, and the warning
// strip under the top bar. Phase A: the two entry points over the tables; phase B5 finishes them.

import { TIPS } from '../engine/constants';
import { warnings } from '../engine/warnings';
import type { GameState } from '../engine/index';
import { escapeHtml } from './modal';

/** The one sentence a screen shows the first time it is opened, with tips on, until it is
 *  dismissed. Empty when there is nothing to say or it has been said. */
export function renderTip(state: GameState, key: string): string {
  if (!state.settings.tips) return '';
  const text = TIPS[key];
  if (text === undefined || state.tips.seen.includes(key)) return '';
  return (
    `<div class="tip-bubble" data-tip="${escapeHtml(key)}"><span>${escapeHtml(text)}</span>` +
    `<button class="tip-close" data-do="dismissTip" data-id="${escapeHtml(key)}" title="Right">Right</button></div>`
  );
}

/** The strip under the top bar: one line, one problem at a time, the most urgent first. */
export function renderWarningStrip(state: GameState): string {
  const first = warnings(state)[0];
  if (first === undefined) return '';
  return `<div class="warning-strip" data-warning="${escapeHtml(first.key)}">${escapeHtml(first.text)}</div>`;
}

// The Settings modal, off the gear on the top bar: the tips, and the workshop's own noise
// (PIOTR; CLAUDE.md T13 3.22, T19 2.10).
//
// Turn 11's autosave (T11 3.2) has no control: the game is written down at every morning, every
// purchase and every closed modal, never more than once a second, and the player was never asked
// about it. So nothing moves in here from it. The summary cadence (T4 3.6) is not an autosave
// setting; it stays on the summary and in the Menu, where Piotr put it.
//
// Turn 19 adds the sound, which the brief puts here and nowhere else: a mute, and a volume. Both
// are in the shape of the tips row above them, because a slider is not a control this game has
// anywhere. Every control in it is one click, the stylesheet carries no rule for a range input,
// and the page is written again every frame, which a thumb held on a thumbnail does not enjoy.
// So the volume is a step down, the figure, and a step up, and the figure is the setting itself
// rather than the nearest of a handful of named steps: nothing on the row is a rounded lie.

import type { GameState } from '../engine/index';
import { lockedButton } from './modal';

/** What one press of Quieter or Louder moves the master volume by [TUNE]: nought to full in ten
 *  presses, fine enough to find a level and coarse enough to reach both ends. It belongs in
 *  `constants.ts`, which is frozen for phase B; see NOTES-B3.md. */
const VOLUME_STEP = 0.1;

/** The volume as the row prints it: whole percent of the master, off the setting itself. */
function volumeFigure(volume: number): string {
  return `${Math.round(volume * 100)}%`;
}

/** A volume off two decimal places, so a step never leaves a float's tail on the attribute. */
function stepped(volume: number): number {
  return Math.round(Math.min(1, Math.max(0, volume)) * 100) / 100;
}

/** One end of the volume row. At the end of its travel it is the one allowed disabled button,
 *  with the reason on it, rather than a click that would do nothing (CLAUDE.md 9.2). */
function volumeStep(label: string, to: number, reason: string, spent: boolean): string {
  if (spent) return lockedButton(label, reason);
  return `<button class="chip" data-do="setVolume" data-volume="${to}">${label}</button>`;
}

/** Three rows, two chips or two steps each, one lit or one figure between. A click on the lit one
 *  does nothing more (CLAUDE.md T13 1). */
export function renderSettings(state: GameState): string {
  const on = state.settings.tips;
  const sound = state.settings.sound;
  return (
    '<div class="settings">' +
    '<div class="row" data-setting="tips"><span class="row-main">Tips</span>' +
    '<span class="row-action">' +
    `<button class="chip${on ? ' is-on' : ''}" data-do="setTips" data-on="1">On</button>` +
    `<button class="chip${on ? '' : ' is-on'}" data-do="setTips" data-on="0">Off</button>` +
    '</span></div>' +
    '<p class="hint">The first use bubbles on every screen. Off, and every one of them goes; on, ' +
    'and the ones you have not dismissed come back.</p>' +
    '<div class="row sound-row" data-setting="sound"><span class="row-main">Sound</span>' +
    '<span class="row-action">' +
    `<button class="chip${sound.muted ? '' : ' is-on'}" data-do="setSound" data-muted="0">` +
    'On</button>' +
    `<button class="chip${sound.muted ? ' is-on' : ''}" data-do="setSound" data-muted="1">` +
    'Off</button>' +
    '</span></div>' +
    '<div class="row sound-volume" data-setting="volume"><span class="row-main">Volume</span>' +
    '<span class="row-action">' +
    volumeStep(
      'Quieter',
      stepped(sound.volume - VOLUME_STEP),
      'It is as quiet as it goes',
      sound.volume <= 0,
    ) +
    `<span class="row-figure" data-figure="volume">${volumeFigure(sound.volume)}</span>` +
    volumeStep(
      'Louder',
      stepped(sound.volume + VOLUME_STEP),
      'It is as loud as it goes',
      sound.volume >= 1,
    ) +
    '</span></div>' +
    '<p class="hint">The hall is heard from your first click on the page: the saw while somebody ' +
    'is at it, the extraction while it pulls, a door, a hammer. Off silences the lot and leaves ' +
    'the volume where you set it.</p>' +
    '</div>'
  );
}

// The house card the owner sees when he goes home (CLAUDE.md T13 3.18): a full width still
// picture of where the money he pays himself has put him, the tier's name, and one line. No
// animation. "This is the only place the player sees the benefit of the hard work: the numbers on
// the account turn into something he feels" (PIOTR). The day end flow shows it for
// HOUSE_CARD_SECONDS or until a click (app.ts, B5's); this module only draws it.

import { HOUSE_TIER_NAMES } from '../engine/constants';
import { houseTierFor } from '../engine/owner';
import type { GameState } from '../engine/index';
import { placeholderSvg } from '../render/placeholder';
import { spriteUrl } from '../render/sprites';
import { escapeHtml } from './modal';

/** The one line under the picture, word for word (PIOTR; CLAUDE.md T13 3.18). */
export const HOUSE_LINE = 'Resting at home now. See you at the workshop in the morning.';

/** The picture is three to one: the art request asks for 900 by 300 at 1x, so 1800 by 600 in the
 *  file (docs/art/REQUESTS-HOUSE.md 5), and the five of 03.10 came at 2172 by 724, the same shape.
 *  Until a file lands the placeholder function draws the card. */
export const HOUSE_PICTURE_SIZE = { width: 900, height: 300 };

/** The picture key of a tier, `house.1` to `house.8`: the file the art side delivers under that
 *  name (`house.1.png` in `public/sprites/`, on the manifest) replaces the placeholder. */
export function housePictureKey(tier: number): string {
  return `house.${tier}`;
}

/** The tier's picture: the delivered file off the manifest, the same way a room's layer is found
 *  (v48: the eight rooms of REQUESTS-HOUSE.md landed), or the placeholder until one lands. */
function housePicture(tier: number, name: string): string {
  const key = housePictureKey(tier);
  const url = spriteUrl(key);
  if (url !== null) {
    return (
      `<img class="house-picture" data-house-picture="${key}" src="${url}" ` +
      `alt="${escapeHtml(name)}" draggable="false" />`
    );
  }
  return placeholderSvg(key, HOUSE_PICTURE_SIZE, { label: name, className: 'house-picture' });
}

/** The card: the picture, and under it a sill with the tier, the one line and whatever button the
 *  caller hangs on its right (the day end's `The summary`). From v76 the picture is the card
 *  (PIOTR, 03.10: "bigger"), so the words sit under it and not round it. */
export function renderHouseCard(state: GameState, action = ''): string {
  const tier = houseTierFor(state);
  const name = HOUSE_TIER_NAMES[tier - 1] ?? HOUSE_TIER_NAMES[0] ?? '';
  return (
    `<div class="house-card" data-house-tier="${tier}">` +
    housePicture(tier, name) +
    '<div class="house-bar">' +
    '<div class="house-words">' +
    `<p class="house-name">Tier ${tier}: ${escapeHtml(name)}</p>` +
    `<p class="house-line">${escapeHtml(HOUSE_LINE)}</p>` +
    '</div>' +
    action +
    '</div>' +
    '</div>'
  );
}

/** Where the picture of the owner's house is, for the page to fetch ahead of the evening: the
 *  files are two megabytes and the card is up for three seconds, so the one he is living in is
 *  asked for while the day is still running (v76). Null while there is no file. */
export function housePictureUrl(state: GameState): string | null {
  return spriteUrl(housePictureKey(houseTierFor(state)));
}

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

/** The picture is the width of the day end card; the art request asks for 900 by 300 at 1x, so
 *  1800 by 600 in the file (docs/art/REQUESTS-HOUSE.md 5). Until it lands the placeholder helper
 *  draws the card. */
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

export function renderHouseCard(state: GameState): string {
  const tier = houseTierFor(state);
  const name = HOUSE_TIER_NAMES[tier - 1] ?? HOUSE_TIER_NAMES[0] ?? '';
  return (
    `<div class="house-card" data-house-tier="${tier}">` +
    housePicture(tier, name) +
    `<p class="house-name">Tier ${tier}: ${escapeHtml(name)}</p>` +
    `<p class="house-line">${escapeHtml(HOUSE_LINE)}</p>` +
    '</div>'
  );
}

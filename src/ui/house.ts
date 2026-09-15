// The house card the owner sees when he goes home (CLAUDE.md T13 3.18). Phase A: a stub over the
// placeholder helper; phase B2 builds the card and the tier arithmetic.

import { HOUSE_TIER_NAMES } from '../engine/constants';
import { houseTierFor } from '../engine/owner';
import type { GameState } from '../engine/index';
import { placeholderSvg } from '../render/placeholder';
import { escapeHtml } from './modal';

export function renderHouseCard(state: GameState): string {
  const tier = houseTierFor(state);
  const name = HOUSE_TIER_NAMES[tier - 1] ?? HOUSE_TIER_NAMES[0] ?? '';
  return (
    '<div class="house-card" data-house-tier="' + tier + '">' +
    placeholderSvg(`house.${tier}`, { width: 900, height: 300 }, { label: name, className: 'house-picture' }) +
    `<p class="house-line">${escapeHtml(name)}. Resting at home now. See you at the workshop in the morning.</p>` +
    '</div>'
  );
}

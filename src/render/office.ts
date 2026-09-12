// The office desk, drawn from the fixed layout in constants. Every object on it is a way into one
// modal, and nothing else is on the screen (CLAUDE.md 10.1).

import { DESK_LAYOUT, OFFICE_TILES } from '../engine/constants';
import { findSpec, has } from '../engine/machines';
import type { GameState } from '../engine/types';
import { box, escapeText, label, polygon } from './hall';
import { boxPolygons, centreOf, depthKey, footprintPolygon, gridBounds } from './iso';

const FILLS: Record<string, [string, string]> = {
  desk: ['var(--kit-furniture)', 'var(--kit-furniture-dark)'],
  laptop: ['var(--kit-tools)', 'var(--kit-tools-dark)'],
  accounting: ['var(--kit-stock)', 'var(--kit-stock-dark)'],
  materials: ['var(--kit-bench)', 'var(--kit-bench-dark)'],
  catalogue: ['var(--kit-vehicle)', 'var(--kit-vehicle-dark)'],
  hiring: ['var(--room)', 'var(--room-dark)'],
  phone: ['var(--kit-welfare)', 'var(--kit-welfare-dark)'],
};

export function renderOffice(state: GameState): string {
  const bounds = gridBounds(OFFICE_TILES, OFFICE_TILES, 4);
  const pad = 24;
  const parts: string[] = [
    polygon(footprintPolygon(0, 0, OFFICE_TILES, OFFICE_TILES), 'var(--room-floor)'),
  ];
  const drawables = DESK_LAYOUT.map((object) => {
    const faces = boxPolygons(object.x, object.y, object.width, object.depth, object.height);
    const missing = object.needs !== null && !has(state, object.needs);
    const lockReason = missing ? `Buy a ${(findSpec(object.needs ?? '')?.name ?? '').toLowerCase()}` : '';
    const [fill, shade] = FILLS[object.id] ?? ['var(--room)', 'var(--room-dark)'];
    const attrs =
      `data-office="${object.id}" data-sprite="${object.spriteKey}" ` +
      `class="clickable${missing ? ' locked' : ''}"` +
      (missing ? ` data-lock="${escapeText(lockReason)}"` : '');
    const text = missing ? `${object.name}: ${lockReason}` : object.name;
    return {
      depth: depthKey(object.x, object.y),
      svg:
        `<g ${attrs}><title>${escapeText(text)}</title>` +
        box(faces, missing ? 'var(--locked)' : fill, missing ? 'var(--locked-dark)' : shade) +
        label(
          centreOf(object.x, object.y, object.width, object.depth, object.height),
          text,
        ) +
        '</g>',
    };
  }).sort((left, right) => left.depth - right.depth);
  parts.push(drawables.map((drawable) => drawable.svg).join(''));
  const viewBox = [
    Math.round(bounds.minX - pad),
    Math.round(bounds.minY - pad),
    Math.round(bounds.width + pad * 2),
    Math.round(bounds.height + pad * 2),
  ].join(' ');
  return (
    `<svg class="office-view" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" ` +
    `role="img" aria-label="Office desk">${parts.join('')}</svg>` +
    `<p class="view-note">The desk. Everything on it opens something.</p>`
  );
}

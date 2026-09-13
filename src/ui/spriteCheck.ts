// The sprite check page: every key the game can draw, its footprint on a tile grid, the
// placeholder box, and the picture beside it when the art side has delivered one. This page is
// the acceptance tool of docs/art/SPRITES.md item 7 (CLAUDE.md T3 3.6).

import {
  DELIVERY_VAN_SPRITE,
  EQUIPMENT_SPECS,
  GATE_LAYOUT,
  ROOM_LAYOUT,
} from '../engine/constants';
import { box, escapeText, label, polygon } from '../render/hall';
import { OFFICE_CANVAS, OFFICE_LAYERS } from '../render/office';
import { boxPolygons, centreOf, footprintPolygon, gridBounds, tileToScreen } from '../render/iso';
import { spriteCanvas, spriteFileSize, spriteUrl } from '../render/sprites';
import { escapeHtml } from './modal';

export interface SpriteTarget {
  /** The file name without .png: the family key, or the family key and the class. */
  name: string;
  spriteKey: string;
  tier: string | null;
  width: number;
  depth: number;
  height: number;
  /** Where in the game this object is drawn. */
  where: string;
}

/** Every key the game can ask for, once each: the catalogue families and their classes, the three
 *  rooms, and the lorry at the gate. The office is a room of full width layers now, which the
 *  page shows on its own below (CLAUDE.md T4 3.1). */
export function spriteTargets(): SpriteTarget[] {
  const targets: SpriteTarget[] = [];
  const seen = new Set<string>();
  const add = (target: SpriteTarget): void => {
    if (seen.has(target.name)) return;
    seen.add(target.name);
    targets.push(target);
  };
  for (const spec of EQUIPMENT_SPECS) {
    add({
      name: spec.spriteKey,
      spriteKey: spec.spriteKey,
      tier: null,
      width: spec.width,
      depth: spec.depth,
      height: spec.height,
      where: 'catalogue',
    });
    if (spec.variants.length < 2) continue;
    for (const variant of spec.variants) {
      add({
        name: `${spec.spriteKey}.${variant.id}`,
        spriteKey: spec.spriteKey,
        tier: variant.id,
        width: spec.width,
        depth: spec.depth,
        height: spec.height,
        where: variant.name.toLowerCase(),
      });
    }
  }
  for (const room of ROOM_LAYOUT) {
    add({
      name: room.spriteKey,
      spriteKey: room.spriteKey,
      tier: null,
      width: room.width,
      depth: room.depth,
      height: room.height,
      where: 'hall room',
    });
  }
  add({
    name: DELIVERY_VAN_SPRITE,
    spriteKey: DELIVERY_VAN_SPRITE,
    tier: null,
    // The lorry is not in the catalogue, so its size comes from where it stands.
    width: GATE_LAYOUT.width,
    depth: GATE_LAYOUT.depth,
    height: GATE_LAYOUT.height,
    where: 'at the gate',
  });
  return targets;
}

/** The footprint diamond on a tile grid with the placeholder box standing on it. */
function proof(target: SpriteTarget): string {
  const pad = 14;
  const bounds = gridBounds(target.width, target.depth, target.height);
  const lines: string[] = [];
  for (let x = 0; x <= target.width; x += 1) {
    const from = tileToScreen(x, 0);
    const to = tileToScreen(x, target.depth);
    lines.push(
      `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="var(--grid)" />`,
    );
  }
  for (let y = 0; y <= target.depth; y += 1) {
    const from = tileToScreen(0, y);
    const to = tileToScreen(target.width, y);
    lines.push(
      `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="var(--grid)" />`,
    );
  }
  const faces = boxPolygons(0, 0, target.width, target.depth, target.height);
  const viewBox = [
    Math.round(bounds.minX - pad),
    Math.round(bounds.minY - pad),
    Math.round(bounds.width + pad * 2),
    Math.round(bounds.height + pad * 2),
  ].join(' ');
  return (
    `<svg class="sprite-proof" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" ` +
    `role="img" aria-label="${escapeText(target.name)} footprint">` +
    polygon(footprintPolygon(0, 0, target.width, target.depth), 'var(--concrete)') +
    lines.join('') +
    box(faces, 'var(--kit-machine)', 'var(--kit-machine-dark)') +
    label(centreOf(0, 0, target.width, target.depth, target.height), target.name) +
    '</svg>'
  );
}

function shot(target: SpriteTarget): string {
  const url = spriteUrl(target.spriteKey, target.tier);
  if (url === null) return '<div class="sprite-shot is-missing"><span>no file</span></div>';
  const file = spriteFileSize(target.width, target.depth, target.height);
  return (
    '<div class="sprite-shot">' +
    `<img src="${url}" alt="${escapeHtml(target.name)}" ` +
    `width="${file.width / 2}" height="${file.height / 2}" /></div>`
  );
}

function cell(target: SpriteTarget): string {
  const canvas = spriteCanvas(target.width, target.depth, target.height);
  const file = spriteFileSize(target.width, target.depth, target.height);
  const url = spriteUrl(target.spriteKey, target.tier);
  return (
    `<div class="sprite-cell" data-sprite-target="${escapeHtml(target.name)}">` +
    `<div class="sprite-pair">${proof(target)}${shot(target)}</div>` +
    `<p class="sprite-key">${escapeHtml(`${target.name}.png`)}</p>` +
    `<p class="sprite-figures">${target.width} by ${target.depth} by ${target.height} m · ` +
    `${escapeHtml(target.where)}</p>` +
    `<p class="sprite-figures">canvas ${canvas.width} by ${canvas.height} · ` +
    `file ${file.width} by ${file.height}</p>` +
    `<p class="sprite-figures">${url === null ? 'no file yet' : escapeHtml(url)}</p>` +
    '</div>'
  );
}

/** The office is not a sprite on a tile: it is three full width layers on one canvas, so the page
 *  shows each one as it is, scaled to fit, for the art PR to be checked against
 *  (docs/art/SPRITES.md 8.1 and 8.5). */
function officeSection(): string {
  const cells = OFFICE_LAYERS.map((layer) => {
    const url = spriteUrl(layer.key);
    const shot =
      url === null
        ? '<div class="sprite-shot is-missing"><span>no file</span></div>'
        : `<div class="office-preview"><img src="${url}" ` +
          `alt="${escapeHtml(layer.name)}" /></div>`;
    return (
      `<div class="sprite-cell is-wide" data-sprite-target="${escapeHtml(layer.key)}">` +
      shot +
      `<p class="sprite-key">${escapeHtml(`${layer.key}.png`)}</p>` +
      `<p class="sprite-figures">${escapeHtml(layer.name)} · ` +
      `${OFFICE_CANVAS.width} by ${OFFICE_CANVAS.height}</p>` +
      `<p class="sprite-figures">${url === null ? 'no file yet' : escapeHtml(url)}</p>` +
      '</div>'
    );
  }).join('');
  const delivered = OFFICE_LAYERS.filter((layer) => spriteUrl(layer.key) !== null).length;
  return (
    `<h3>The office room, ${delivered} of ${OFFICE_LAYERS.length} layers delivered</h3>` +
    '<p class="hint">One canvas, three layers, stacked at the origin. They reproduce the ' +
    'review composite when they are laid over each other.</p>' +
    `<div class="sprite-wide-grid">${cells}</div>`
  );
}

export function renderSpriteCheck(): string {
  const targets = spriteTargets();
  const delivered = targets.filter(
    (target) => spriteUrl(target.spriteKey, target.tier) !== null,
  ).length;
  return (
    '<div class="sprite-page">' +
    `<p class="hint">Sprite check: ${targets.length} keys, ${delivered} with a file. ` +
    'Every cell shows the footprint the game expects, the placeholder box, and the picture ' +
    'beside it. A picture that floats or sinks has the wrong anchor.</p>' +
    `<div class="sprite-grid">${targets.map((target) => cell(target)).join('')}</div>` +
    officeSection() +
    '</div>'
  );
}

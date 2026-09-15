// The sprite check page: every key the game can draw, its footprint on a tile grid, the
// placeholder box, and the picture beside it when the art side has delivered one. This page is
// the acceptance tool of docs/art/SPRITES.md item 7 (CLAUDE.md T3 3.6).

import { EQUIPMENT_SPECS, PIPE_TILE_KEYS } from '../engine/constants';
import {
  HALL_CANVAS,
  HALL_LAYERS,
  PALLET_LAYOUT,
  PALLET_SPRITE,
  box,
  escapeText,
  label,
  pipeCellArt,
  polygon,
} from '../render/hall';
import { OFFICE_CANVAS, OFFICE_LAYERS } from '../render/office';
import { boxPolygons, centreOf, footprintPolygon, gridBounds, tileToScreen } from '../render/iso';
import {
  SPRITE_SCALE,
  placeholderKindFor,
  spriteAnchorIn,
  spriteCanvas,
  spriteFileSize,
  spriteFiles,
  spriteUrl,
} from '../render/sprites';
import { placeholderSvg } from '../render/placeholder';
import { footprintOf, standsInTheHall, zoneOf } from '../engine/machines';
import { metresBy } from '../engine/text';
import {
  type Animation,
  ANIMATIONS,
  characterArt,
  characterKey,
  characterSheet,
} from '../render/characters';
import { escapeHtml } from './modal';

export interface SpriteTarget {
  /** The file name without .png: the family key, or the family key and the class. */
  name: string;
  spriteKey: string;
  tier: string | null;
  width: number;
  depth: number;
  height: number;
  /** The floor this class reserves, which contains the footprint (CLAUDE.md T7 3.3). Zero when
   *  the class holds no floor at all, because it is kept in a tool cabinet. */
  zoneWidth: number;
  zoneDepth: number;
  /** Where in the game this object is drawn. */
  where: string;
}

/** Every key the game can ask for, once each: the catalogue families and their classes, and the
 *  lorry at the gate. Both rooms are sets of full width layers now, which the page shows on their
 *  own below (CLAUDE.md T4 3.1, docs/art/SPRITES.md 9.3). */
export function spriteTargets(): SpriteTarget[] {
  const targets: SpriteTarget[] = [];
  const seen = new Set<string>();
  const add = (target: SpriteTarget): void => {
    if (seen.has(target.name)) return;
    seen.add(target.name);
    targets.push(target);
  };
  for (const spec of EQUIPMENT_SPECS) {
    // Every class of every family is a picture of its own, at its own footprint: the classes are
    // what the loader asks for (CLAUDE.md T7 3.5). A hand tool holds no cell of the floor and is
    // still drawn, in the cabinet it is kept in (CLAUDE.md T7 3.6).
    if (spec.variants.length > 1) {
      for (const variant of spec.variants) {
        const stands = footprintOf(spec.id, variant.id);
        const zone = zoneOf(spec.id, variant.id);
        add({
          name: `${spec.spriteKey}.${variant.id}`,
          spriteKey: spec.spriteKey,
          tier: variant.id,
          width: stands.width,
          depth: stands.depth,
          height: stands.height,
          zoneWidth: zone.width,
          zoneDepth: zone.depth,
          where: variant.name.toLowerCase(),
        });
      }
      continue;
    }
    if (!standsInTheHall(spec.id)) continue;
    add({
      name: spec.spriteKey,
      spriteKey: spec.spriteKey,
      tier: null,
      width: spec.width,
      depth: spec.depth,
      height: spec.height,
      zoneWidth: spec.zoneWidth,
      zoneDepth: spec.zoneDepth,
      where: 'catalogue',
    });
  }
  // The pallet of sheets at the gate is not in the catalogue, so its size comes from where it
  // stands; the lorry it replaced is gone from the hall (CLAUDE.md T13 3.21).
  add({
    name: PALLET_SPRITE,
    spriteKey: PALLET_SPRITE,
    tier: null,
    width: PALLET_LAYOUT.width,
    depth: PALLET_LAYOUT.depth,
    height: PALLET_LAYOUT.height,
    zoneWidth: PALLET_LAYOUT.width,
    zoneDepth: PALLET_LAYOUT.depth,
    where: 'at the gate',
  });
  return targets;
}

/** The working zone on a tile grid, with the footprint diamond centred inside it and the
 *  placeholder box standing on that: the two things a class says about the floor, drawn together
 *  (CLAUDE.md T7 3.3). A class that holds no floor is drawn on its footprint alone. */
function proof(target: SpriteTarget): string {
  const pad = 14;
  const zone = {
    width: target.zoneWidth > 0 ? target.zoneWidth : target.width,
    depth: target.zoneDepth > 0 ? target.zoneDepth : target.depth,
  };
  // The picture stands in the middle of the room the class reserves.
  const at = { x: (zone.width - target.width) / 2, y: (zone.depth - target.depth) / 2 };
  const bounds = gridBounds(zone.width, zone.depth, target.height);
  const lines: string[] = [];
  for (let x = 0; x <= zone.width; x += 1) {
    const from = tileToScreen(x, 0);
    const to = tileToScreen(x, zone.depth);
    lines.push(
      `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="var(--grid)" />`,
    );
  }
  for (let y = 0; y <= zone.depth; y += 1) {
    const from = tileToScreen(0, y);
    const to = tileToScreen(zone.width, y);
    lines.push(
      `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="var(--grid)" />`,
    );
  }
  const faces = boxPolygons(at.x, at.y, target.width, target.depth, target.height);
  const viewBox = [
    Math.round(bounds.minX - pad),
    Math.round(bounds.minY - pad),
    Math.round(bounds.width + pad * 2),
    Math.round(bounds.height + pad * 2),
  ].join(' ');
  return (
    `<svg class="sprite-proof" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" ` +
    `role="img" aria-label="${escapeText(target.name)} footprint and zone">` +
    polygon(footprintPolygon(0, 0, zone.width, zone.depth), 'var(--zone)', 'data-zone="1"') +
    lines.join('') +
    polygon(
      footprintPolygon(at.x, at.y, target.width, target.depth),
      'var(--concrete)',
      'data-footprint="1"',
    ) +
    box(faces, 'var(--kit-machine)', 'var(--kit-machine-dark)') +
    label(centreOf(at.x, at.y, target.width, target.depth, target.height), target.name) +
    '</svg>'
  );
}

/** The delivered picture with the anchor marked on it, by the same rule the hall places it with:
 *  `8 + w x 48` from the left edge of the file and 8 px above the bottom, halved
 *  (docs/art/SPRITES.md 2; CLAUDE.md T10 3.12). A file whose object does not sit on that dot is
 *  the file that makes a machine stand off its tile in the hall. */
function shot(target: SpriteTarget): string {
  const url = spriteUrl(target.spriteKey, target.tier);
  const at = spriteAnchorIn(target.width, target.depth, target.height);
  if (url === null) {
    // A Turn 13 picture the art side owes is shown as the placeholder the hall draws for it, at
    // the size of the file that will replace it (CLAUDE.md T13 1, 3.13).
    const kind = placeholderKindFor(target.spriteKey, target.tier);
    if (kind !== null) {
      return (
        '<div class="sprite-shot is-placeholder">' +
        placeholderSvg(kind, { width: at.width, height: at.height }, { dimetric: true }) +
        '</div>'
      );
    }
    return '<div class="sprite-shot is-missing"><span>no file</span></div>';
  }
  return (
    '<div class="sprite-shot">' +
    `<svg class="sprite-shot-art" viewBox="0 0 ${at.width} ${at.height}" ` +
    `width="${at.width}" height="${at.height}" role="img" ` +
    `aria-label="${escapeText(target.name)}">` +
    `<image href="${url}" x="0" y="0" width="${at.width}" height="${at.height}" />` +
    `<circle class="sprite-anchor" cx="${at.x}" cy="${at.y}" r="2" /></svg></div>`
  );
}

/** What the class says about the floor, in the words the catalogue uses (CLAUDE.md T7 3.7). */
function zoneLine(target: SpriteTarget): string {
  if (target.zoneWidth <= 0 || target.zoneDepth <= 0) return 'kept in a tool cabinet';
  return `works in ${metresBy({ width: target.zoneWidth, depth: target.zoneDepth })}`;
}

function cell(target: SpriteTarget): string {
  const canvas = spriteCanvas(target.width, target.depth, target.height);
  const file = spriteFileSize(target.width, target.depth, target.height);
  const url = spriteUrl(target.spriteKey, target.tier);
  return (
    `<div class="sprite-cell" data-sprite-target="${escapeHtml(target.name)}">` +
    `<div class="sprite-pair">${proof(target)}${shot(target)}</div>` +
    `<p class="sprite-key">${escapeHtml(`${target.name}.png`)}</p>` +
    `<p class="sprite-figures">${metresBy(target)}, ${target.height} m high · ` +
    `${zoneLine(target)} · ${escapeHtml(target.where)}</p>` +
    `<p class="sprite-figures">canvas ${canvas.width} by ${canvas.height} · ` +
    `file ${file.width} by ${file.height}</p>` +
    `<p class="sprite-figures">${url === null ? 'no file yet' : escapeHtml(url)}</p>` +
    '</div>'
  );
}

/** A room is not a sprite on a cell: it is a set of full width layers on one canvas, so the page
 *  shows each one as it is, scaled to fit, for the art PR to be checked against
 *  (docs/art/SPRITES.md 8.1 and 8.5 for the office, 9.3 and 9.6 for the hall). One builder does
 *  both rooms: a third set of layers is data, not code. */
function layerSection(
  title: string,
  hint: string,
  layers: ReadonlyArray<{ key: string; name: string }>,
  canvas: { width: number; height: number },
): string {
  const cells = layers
    .map((layer) => {
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
        `${canvas.width} by ${canvas.height}</p>` +
        `<p class="sprite-figures">${url === null ? 'no file yet' : escapeHtml(url)}</p>` +
        '</div>'
      );
    })
    .join('');
  const delivered = layers.filter((layer) => spriteUrl(layer.key) !== null).length;
  return (
    `<h3>${escapeHtml(title)}, ${delivered} of ${layers.length} layers delivered</h3>` +
    `<p class="hint">${escapeHtml(hint)}</p>` +
    `<div class="sprite-wide-grid">${cells}</div>`
  );
}

/** The keys of the pipe layer the art side owes, each one cell (CLAUDE.md T13 3.11, 3.19;
 *  docs/art/REQUESTS-T13.md 1 and 2). */
export const PIPE_LAYER_KEYS: readonly string[] = [...PIPE_TILE_KEYS, 'gate.collar'];

/** One key of the pipe layer as the hall draws it: the placeholder in the 2:1 dimetric, or the
 *  delivered file, on one cell at the height of the ducting. The view box is the cell with room
 *  above it for the lift. */
function pipeKeyCell(key: string): string {
  const drawn = pipeCellArt(key, { x: 0, y: 0 }, spriteFiles());
  const url = spriteUrl(key);
  return (
    `<div class="sprite-cell" data-pipe-key="${escapeHtml(key)}">` +
    `<svg class="sprite-proof" viewBox="-40 -110 80 140" width="80" height="140" ` +
    `role="img" aria-label="${escapeText(key)}">${drawn}</svg>` +
    `<p class="sprite-key">${escapeHtml(`${key}.png`)}</p>` +
    `<p class="sprite-figures">${url === null ? 'no file yet, the placeholder stands' : escapeHtml(url)}</p>` +
    '</div>'
  );
}

function pipeSection(): string {
  const delivered = PIPE_LAYER_KEYS.filter((key) => spriteUrl(key) !== null).length;
  return (
    `<h3>The pipe layer, ${delivered} of ${PIPE_LAYER_KEYS.length} tiles delivered</h3>` +
    '<p class="hint">Eight pipe tiles and the gate collar, one cell each, drawn in the hall\u2019s ' +
    '2:1 dimetric at the height of the ducting and never straight on. Until a file lands the ' +
    'placeholder stands in for it, here and in the hall.</p>' +
    `<div class="sprite-grid">${PIPE_LAYER_KEYS.map((key) => pipeKeyCell(key)).join('')}</div>`
  );
}

/** Every role the game draws a figure for: the owner and every WorkerRole, the two of Turn 13
 *  among them. The joiner and the owner have their sheets; the rest fall back to the capsule
 *  until theirs are delivered (CLAUDE.md T9 3.13, T13 3.23). */
export const CHARACTER_ROLES: readonly string[] = [
  'owner',
  'joiner',
  'helper',
  'officeAdmin',
  'purchasingClerk',
  'salesman',
  'draftsman',
  'estimator',
  'productionManager',
];

/** One character sheet as a strip, with the anchor marked and the frames playing. The acceptance
 *  page for the art side: a sheet whose anchor is wrong is obvious here (CLAUDE.md T9 3.13). */
function characterCell(role: string, animation: Animation): string {
  const found = characterSheet(role, animation);
  const key = characterKey(role, animation);
  if (found === null) {
    return (
      `<div class="sprite-cell" data-character-key="${escapeHtml(key)}">` +
      '<div class="sprite-box"><span>no sheet yet</span></div>' +
      `<p class="sprite-key">${escapeHtml(`${key}.sheet.png`)}</p>` +
      '<p class="sprite-figures">and its numbers beside it, in ' +
      `${escapeHtml(`${key}.json`)}</p></div>`
    );
  }
  const { sheet, url } = found;
  const directions = Object.keys(sheet.rows).join(', ');
  // The whole strip, so every frame of the first row is on the page at once, with the anchor of
  // the first cell marked on it.
  const width = (sheet.cellWidth * sheet.frames) / SPRITE_SCALE;
  const height = sheet.cellHeight / SPRITE_SCALE;
  const anchorX = sheet.anchorX / SPRITE_SCALE;
  const anchorY = sheet.anchorY / SPRITE_SCALE;
  const strip =
    `<svg class="sprite-strip" viewBox="0 0 ${width} ${height}" width="${width}" ` +
    `height="${height}"><image href="${url}" x="0" y="0" width="${width}" height="${height}" />` +
    `<circle class="sprite-anchor" cx="${anchorX}" cy="${anchorY}" r="2" /></svg>`;
  const playing = characterArt(role, animation, 'sw') ?? '';
  return (
    `<div class="sprite-cell is-wide" data-character-key="${escapeHtml(key)}">` +
    strip +
    `<svg class="sprite-play" viewBox="-24 -48 48 56" width="48" height="56">` +
    `<g transform="translate(0,0)">${playing}</g></svg>` +
    `<p class="sprite-key">${escapeHtml(`${key}.sheet.png`)}</p>` +
    `<p class="sprite-figures">${sheet.frames} frames at ${sheet.fps} fps · ` +
    `cell ${sheet.cellWidth} by ${sheet.cellHeight} · anchor ${sheet.anchorX}, ` +
    `${sheet.anchorY} · rows: ${escapeHtml(directions)}</p>` +
    `<p class="sprite-figures">${escapeHtml(url)}</p></div>`
  );
}

function characterSection(): string {
  const cells = CHARACTER_ROLES.flatMap((role) =>
    ANIMATIONS.map((animation) => characterCell(role, animation)),
  ).join('');
  const delivered = CHARACTER_ROLES.flatMap((role) =>
    ANIMATIONS.map((animation) => characterSheet(role, animation)),
  ).filter((found) => found !== null).length;
  return (
    `<h3>The figures, ${delivered} sheets delivered</h3>` +
    '<p class="hint">One row a direction, one column a frame, at 2x like every sprite. The dot ' +
    'is the anchor: it goes on the tile the figure stands on, so a sheet whose anchor is wrong ' +
    'makes him float. A direction the sheet has no row for is mirrored from its opposite. The ' +
    'small square beside the strip plays it at the sheet\u2019s own frames a second.</p>' +
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
    layerSection(
      'The painted hall',
      'One canvas at 2x, three layers, all of them laid down at the origin: the background with ' +
        'the floor, the walls, the kerbs, the shutter and the WC, then the office block and the ' +
        'canteen block on their own cells. The game halves them.',
      HALL_LAYERS,
      { width: HALL_CANVAS.width * SPRITE_SCALE, height: HALL_CANVAS.height * SPRITE_SCALE },
    ) +
    layerSection(
      'The office room',
      'One canvas, three layers, stacked at the origin. They reproduce the review composite when ' +
        'they are laid over each other.',
      OFFICE_LAYERS,
      OFFICE_CANVAS,
    ) +
    pipeSection() +
    characterSection() +
    '</div>'
  );
}

// The hall, drawn from the state as flat placeholder boxes. No memory of its own: give it a state
// and it hands back an SVG string (CLAUDE.md 10.3).

import {
  GATE_LAYOUT,
  ROOM_LAYOUT,
  STOCK_RACK_LAYOUT,
  YARD_WIDTH_TILES,
} from '../engine/constants';
import { dustBand, findSpec, machinesStopped } from '../engine/machines';
import { ownerJob } from '../engine/jobs';
import type { GameState } from '../engine/types';
import {
  type BoxFaces,
  type Point,
  type Polygon,
  boxPolygons,
  centreOf,
  depthKey,
  footprintPolygon,
  gridBounds,
} from './iso';

// ---------------------------------------------------------------------------
// SVG primitives. office.ts uses these too: one place builds the strings.
// ---------------------------------------------------------------------------

export function escapeText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function points(polygon: Polygon): string {
  return polygon.map((point) => `${round(point.x)},${round(point.y)}`).join(' ');
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function polygon(shape: Polygon, fill: string, extra = ''): string {
  return `<polygon points="${points(shape)}" fill="${fill}"${extra ? ` ${extra}` : ''} />`;
}

export function label(at: Point, text: string, extra = ''): string {
  return (
    `<text x="${round(at.x)}" y="${round(at.y)}" text-anchor="middle" class="iso-label"` +
    `${extra ? ` ${extra}` : ''}>${escapeText(text)}</text>`
  );
}

/** A placeholder box: top lighter, right darker, with a label under it. */
export function box(faces: BoxFaces, fill: string, shade: string, extra = ''): string {
  return [
    polygon(faces.left, shade, extra),
    polygon(faces.right, shade, extra),
    polygon(faces.top, fill, extra),
  ].join('');
}

interface Drawable {
  depth: number;
  svg: string;
}

const CATEGORY_FILL: Record<string, string> = {
  machine: 'var(--kit-machine)',
  bench: 'var(--kit-bench)',
  welfare: 'var(--kit-welfare)',
  tools: 'var(--kit-tools)',
  vehicle: 'var(--kit-vehicle)',
  extraction: 'var(--kit-extraction)',
  furniture: 'var(--kit-furniture)',
};

const CATEGORY_SHADE: Record<string, string> = {
  machine: 'var(--kit-machine-dark)',
  bench: 'var(--kit-bench-dark)',
  welfare: 'var(--kit-welfare-dark)',
  tools: 'var(--kit-tools-dark)',
  vehicle: 'var(--kit-vehicle-dark)',
  extraction: 'var(--kit-extraction-dark)',
  furniture: 'var(--kit-furniture-dark)',
};

/** Sawdust piles, one per ten points of dust, in a fixed pattern so the view never jitters. */
function sawdust(state: GameState): Drawable[] {
  const piles = Math.round(state.dust / 10);
  const drawables: Drawable[] = [];
  for (let index = 0; index < piles; index += 1) {
    const x = 1 + ((index * 7) % Math.max(1, state.unit.widthTiles - 2));
    const y = 6 + (index % 3);
    const at = centreOf(x, y, 1, 1);
    const radius = 8 + state.dust / 12;
    drawables.push({
      depth: depthKey(x, y) + 0.1,
      svg:
        `<ellipse cx="${Math.round(at.x)}" cy="${Math.round(at.y)}" rx="${Math.round(radius)}" ` +
        `ry="${Math.round(radius / 2)}" fill="var(--sawdust)" />`,
    });
  }
  return drawables;
}

/** A worker is a capsule with his name under it. The owner is the green one. */
function figure(x: number, y: number, name: string, isOwner: boolean, extra: string): Drawable {
  const feet = centreOf(x, y, 1, 1);
  const fill = isOwner ? 'var(--owner)' : 'var(--worker)';
  return {
    depth: depthKey(x, y) + 0.2,
    svg:
      `<g ${extra}><ellipse cx="${Math.round(feet.x)}" cy="${Math.round(feet.y)}" rx="9" ry="4" ` +
      `fill="var(--shadow)" />` +
      `<rect x="${Math.round(feet.x - 6)}" y="${Math.round(feet.y - 30)}" width="12" height="26" ` +
      `rx="6" fill="${fill}" />` +
      `<text x="${Math.round(feet.x)}" y="${Math.round(feet.y + 14)}" text-anchor="middle" ` +
      `class="iso-label">${escapeText(name)}</text></g>`,
  };
}

export function renderHall(state: GameState): string {
  const unit = state.unit;
  const bounds = gridBounds(unit.widthTiles + YARD_WIDTH_TILES, unit.depthTiles, 5);
  const pad = 24;
  const parts: string[] = [];

  // Floor, yard and the grid.
  parts.push(polygon(footprintPolygon(0, 0, unit.widthTiles, unit.depthTiles), 'var(--concrete)'));
  parts.push(
    polygon(
      footprintPolygon(unit.widthTiles, 0, YARD_WIDTH_TILES, unit.depthTiles),
      'var(--yard)',
    ),
  );
  const lines: string[] = [];
  for (let x = 0; x <= unit.widthTiles; x += 1) {
    lines.push(
      `<line ${lineAttrs(x, 0, x, unit.depthTiles)} stroke="var(--grid)" stroke-width="1" />`,
    );
  }
  for (let y = 0; y <= unit.depthTiles; y += 1) {
    lines.push(
      `<line ${lineAttrs(0, y, unit.widthTiles, y)} stroke="var(--grid)" stroke-width="1" />`,
    );
  }
  parts.push(lines.join(''));

  const drawables: Drawable[] = [];

  // The three small rooms along the back wall.
  for (const room of ROOM_LAYOUT) {
    const faces = boxPolygons(room.x, room.y, room.width, room.depth, 2);
    drawables.push({
      depth: depthKey(room.x, room.y),
      svg:
        box(faces, 'var(--room)', 'var(--room-dark)', `data-room="${room.id}" class="clickable"`) +
        label(centreOf(room.x, room.y, room.width, room.depth, 2), room.name),
    });
  }

  // The sheet rack, with what is on it.
  const rack = STOCK_RACK_LAYOUT;
  const rackFaces = boxPolygons(rack.x, rack.y, rack.width, rack.depth, 2);
  drawables.push({
    depth: depthKey(rack.x, rack.y),
    svg:
      box(rackFaces, 'var(--kit-stock)', 'var(--kit-stock-dark)', 'data-rack="1"') +
      label(
        centreOf(rack.x, rack.y, rack.width, rack.depth, 2),
        `${state.stock.sheets} / ${unit.sheetCapacity}`,
      ),
  });

  // Everything the player has bought, except the office furniture, which lives in the office view.
  for (const item of state.equipment) {
    const spec = findSpec(item.specId);
    if (!spec || spec.category === 'furniture') continue;
    const broken = item.specId === 'extractor' && item.broken;
    const faces = boxPolygons(item.anchorX, item.anchorY, spec.width, spec.depth, spec.height);
    const fill = broken ? 'var(--stopped)' : CATEGORY_FILL[spec.category] ?? 'var(--kit-machine)';
    const shade = broken
      ? 'var(--stopped-dark)'
      : CATEGORY_SHADE[spec.category] ?? 'var(--kit-machine-dark)';
    const bagLine = item.bagFull ? ' (bag full)' : '';
    drawables.push({
      depth: depthKey(item.anchorX, item.anchorY),
      svg:
        box(faces, fill, shade, `data-kit="${item.id}" class="clickable"`) +
        label(
          centreOf(item.anchorX, item.anchorY, spec.width, spec.depth, spec.height),
          `${spec.name}${bagLine}`,
        ),
    });
  }

  // The crew, and the owner when he is at a bench.
  for (const worker of state.workers) {
    if (worker.startDay > state.clock.day) continue;
    const away = worker.absentDaysRemaining > 0;
    drawables.push(
      figure(
        worker.anchorX,
        worker.anchorY,
        away ? `${worker.name} (off)` : worker.name,
        false,
        `data-worker="${worker.id}"`,
      ),
    );
  }
  const job = ownerJob(state);
  if (state.owner.present && !state.owner.wentHome) {
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    const atBench = job !== null && saw !== undefined;
    const x = atBench && saw ? saw.anchorX + 1 : 2;
    const y = atBench && saw ? saw.anchorY - 1 : 5;
    drawables.push(figure(x, y, state.playerName, true, 'data-owner="1"'));
  }

  // A lorry at the gate while something is waiting to be unloaded.
  const waiting = state.deliveries.find((delivery) => delivery.arrived && !delivery.unloaded);
  if (waiting) {
    const gateX = unit.widthTiles + GATE_LAYOUT.x;
    const faces = boxPolygons(gateX, GATE_LAYOUT.y, 4, 2, 2);
    drawables.push({
      depth: depthKey(gateX, GATE_LAYOUT.y),
      svg:
        box(
          faces,
          'var(--kit-vehicle)',
          'var(--kit-vehicle-dark)',
          `data-van="${waiting.id}" class="clickable"`,
        ) + label(centreOf(gateX, GATE_LAYOUT.y, 4, 2, 2), `Delivery: ${waiting.sheets} sheets`),
    });
  }

  drawables.push(...sawdust(state));
  drawables.sort((left, right) => left.depth - right.depth);
  parts.push(drawables.map((drawable) => drawable.svg).join(''));

  const viewBox = [
    Math.round(bounds.minX - pad),
    Math.round(bounds.minY - pad),
    Math.round(bounds.width + pad * 2),
    Math.round(bounds.height + pad * 2),
  ].join(' ');
  const stateLine = machinesStopped(state)
    ? 'Hall: everything stopped, the extractor is broken'
    : `Hall: ${dustBand(state.dust).label}`;
  return (
    `<svg class="hall-view" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" ` +
    `role="img" aria-label="Workshop hall">${parts.join('')}</svg>` +
    `<p class="view-note">${escapeText(stateLine)}</p>`
  );
}

function lineAttrs(x1: number, y1: number, x2: number, y2: number): string {
  const from = centreOf(x1, y1, 0, 0);
  const to = centreOf(x2, y2, 0, 0);
  return `x1="${Math.round(from.x)}" y1="${Math.round(from.y)}" x2="${Math.round(to.x)}" y2="${Math.round(to.y)}"`;
}

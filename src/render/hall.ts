// The hall, drawn from the state as flat placeholder boxes. No memory of its own: give it a state
// and it hands back an SVG string (CLAUDE.md 10.3).

import {
  DELIVERY_VAN_SPRITE,
  FINISHED_GOODS_LAYOUT,
  GATE_CROWD_LIMIT,
  GATE_LAYOUT,
  ROOM_LAYOUT,
  YARD_WIDTH_TILES,
} from '../engine/constants';
import {
  brokenMachines,
  dustBand,
  extractorBroken,
  findSpec,
  gateIsCrowded,
  hasExtraction,
  machinesDueService,
  serviceIsDue,
} from '../engine/machines';
import { jobsAtGate } from '../engine/jobs';
import { rackCapacity, stockIsLow } from '../engine/materials';
import {
  STATION_BENCH,
  STATION_GATE,
  STATION_IDLE,
  STATION_OFFICE,
  STATION_RACK,
  stationMachine,
} from '../engine/stations';
import { ownerIsAvailable, staffOutputFactor } from '../engine/owner';
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
  storage: 'var(--kit-stock)',
  machine: 'var(--kit-machine)',
  bench: 'var(--kit-bench)',
  welfare: 'var(--kit-welfare)',
  tools: 'var(--kit-tools)',
  vehicle: 'var(--kit-vehicle)',
  extraction: 'var(--kit-extraction)',
  furniture: 'var(--kit-furniture)',
};

const CATEGORY_SHADE: Record<string, string> = {
  storage: 'var(--kit-stock-dark)',
  machine: 'var(--kit-machine-dark)',
  bench: 'var(--kit-bench-dark)',
  welfare: 'var(--kit-welfare-dark)',
  tools: 'var(--kit-tools-dark)',
  vehicle: 'var(--kit-vehicle-dark)',
  extraction: 'var(--kit-extraction-dark)',
  furniture: 'var(--kit-furniture-dark)',
};

/** Grey sawdust piles near the machines, one per ten points of dust, in a fixed pattern so the
 *  view never jitters (CLAUDE.md 10.3). */
function sawdust(state: GameState): Drawable[] {
  const piles = Math.round(state.dust / 10);
  const drawables: Drawable[] = [];
  const machines = state.equipment.filter((item) => {
    const spec = findSpec(item.specId);
    return spec !== null && spec.category === 'machine';
  });
  for (let index = 0; index < piles; index += 1) {
    const machine = machines[index % Math.max(1, machines.length)];
    const spec = machine ? findSpec(machine.specId) : null;
    const x = machine && spec
      ? machine.anchorX + (index % spec.width)
      : 1 + ((index * 7) % Math.max(1, state.unit.widthTiles - 2));
    const y = machine && spec ? machine.anchorY + spec.depth : 6 + (index % 3);
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

/** The tile a station puts a figure on. Anything the workshop has not bought falls back to the
 *  middle of the floor (CLAUDE.md T2 3.3). */
export function stationTile(
  state: GameState,
  station: string,
  bench: { x: number; y: number },
): { x: number; y: number } {
  const specId = stationMachine(station);
  if (specId !== null) {
    const item = state.equipment.find((entry) => entry.specId === specId);
    const spec = item ? findSpec(item.specId) : null;
    if (item && spec) return { x: item.anchorX, y: item.anchorY + spec.depth };
  }
  if (station === STATION_RACK) {
    const rack = state.equipment.find((entry) => findSpec(entry.specId)?.sheetCapacity ?? 0);
    const spec = rack ? findSpec(rack.specId) : null;
    if (rack && spec) return { x: rack.anchorX, y: rack.anchorY + spec.depth };
  }
  if (station === STATION_GATE) {
    return { x: state.unit.widthTiles + GATE_LAYOUT.x + 1, y: GATE_LAYOUT.y + GATE_LAYOUT.depth };
  }
  if (station === STATION_OFFICE) {
    const office = ROOM_LAYOUT[0];
    return { x: office.x + 2, y: office.y + office.depth };
  }
  if (station === STATION_IDLE) {
    const canteen = ROOM_LAYOUT[2];
    return { x: canteen.x + 2, y: canteen.y + canteen.depth };
  }
  return bench;
}

/** The line under a figure's name: where he is standing, in words. */
function stationLabel(station: string): string {
  const specId = stationMachine(station);
  if (specId !== null) return (findSpec(specId)?.name ?? specId).toLowerCase();
  if (station === STATION_RACK) return 'the rack';
  if (station === STATION_GATE) return 'the gate';
  if (station === STATION_OFFICE) return 'the office';
  if (station === STATION_BENCH) return 'the bench';
  return 'waiting';
}

/** A worker is a capsule with his name under it. The owner is the green one. The group carries
 *  its position as a transform, so a change of station slides instead of jumping. */
function figure(
  key: string,
  tile: { x: number; y: number },
  name: string,
  isOwner: boolean,
  extra: string,
): Drawable {
  const feet = centreOf(tile.x, tile.y, 1, 1);
  const fill = isOwner ? 'var(--owner)' : 'var(--worker)';
  return {
    depth: depthKey(tile.x, tile.y) + 0.2,
    svg:
      `<g class="figure" data-figure="${key}" ` +
      `transform="translate(${Math.round(feet.x)},${Math.round(feet.y)})" ${extra}>` +
      `<title>${escapeText(name)}</title>` +
      '<rect x="-6" y="-30" width="12" height="26" rx="6" ' +
      `fill="${fill}" />` +
      '<text x="0" y="14" text-anchor="middle" ' +
      `class="iso-label">${escapeText(name.split(',')[0] ?? name)}</text></g>`,
  };
}

/** What the player is dragging, and whether it can go where the mouse is (CLAUDE.md T2 3.10). */
export interface Ghost {
  x: number;
  y: number;
  width: number;
  depth: number;
  ok: boolean;
  reason: string;
}

export function renderHall(state: GameState, ghost: Ghost | null = null): string {
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
    const faces = boxPolygons(room.x, room.y, room.width, room.depth, room.height);
    drawables.push({
      depth: depthKey(room.x, room.y),
      svg:
        `<g data-room="${room.id}" class="clickable"><title>${escapeText(room.tooltip)}</title>` +
        box(faces, 'var(--room)', 'var(--room-dark)') +
        label(centreOf(room.x, room.y, room.width, room.depth, room.height), room.name) +
        '</g>',
    });
  }

  // Everything the player has bought, except the office furniture, which lives in the office view.
  for (const item of state.equipment) {
    const spec = findSpec(item.specId);
    if (!spec || spec.category === 'furniture') continue;
    const broken = item.broken;
    const faces = boxPolygons(item.anchorX, item.anchorY, spec.width, spec.depth, spec.height);
    const fill = broken ? 'var(--stopped)' : CATEGORY_FILL[spec.category] ?? 'var(--kit-machine)';
    const shade = broken
      ? 'var(--stopped-dark)'
      : CATEGORY_SHADE[spec.category] ?? 'var(--kit-machine-dark)';
    const bagLine = item.bagFull ? ' (bag full)' : '';
    const serviceLine = !item.broken && serviceIsDue(state, item) ? ' (service due)' : '';
    const rackLine =
      spec.category === 'storage' ? `: ${state.stock.sheets} / ${rackCapacity(state)}` : '';
    const atThisBench =
      spec.category === 'bench'
        ? state.workers.find(
            (worker) => worker.anchorX === item.anchorX && worker.anchorY === item.anchorY,
          )
        : undefined;
    const benchLine =
      spec.category !== 'bench' ? '' : atThisBench ? `: ${atThisBench.name}` : ' (free)';
    drawables.push({
      depth: depthKey(item.anchorX, item.anchorY),
      svg:
        `<g data-kit="${item.id}"${spec.category === 'storage' ? ' data-rack="1"' : ''} ` +
        `data-sprite="${item.spriteKey}" class="clickable">` +
        `<title>${escapeText(spec.effect)}</title>` +
        box(faces, fill, shade) +
        label(
          centreOf(item.anchorX, item.anchorY, spec.width, spec.depth, spec.height),
          `${spec.name}${bagLine}${serviceLine}${benchLine}${rackLine}`,
        ) +
        '</g>',
    });
  }

  // The crew, and the owner, each at the station the engine put him on.
  for (const worker of state.workers) {
    if (worker.startDay > state.clock.day) continue;
    const away = worker.absentDaysRemaining > 0;
    const bench = { x: worker.anchorX, y: worker.anchorY };
    const where = stationLabel(worker.station);
    drawables.push(
      figure(
        `worker-${worker.id}`,
        stationTile(state, worker.station, bench),
        away ? `${worker.name} (off)` : `${worker.name}, ${where}`,
        false,
        `data-worker="${worker.id}"`,
      ),
    );
  }
  if (ownerIsAvailable(state)) {
    const bench = state.equipment.find((item) => item.specId === 'workbench');
    const ownerBench = bench ? { x: bench.anchorX + 1, y: bench.anchorY + 2 } : { x: 2, y: 5 };
    drawables.push(
      figure(
        'owner',
        stationTile(state, state.owner.station, ownerBench),
        `${state.playerName}, ${stationLabel(state.owner.station)}`,
        true,
        'data-owner="1"',
      ),
    );
  }

  // A lorry at the gate while something is waiting to be unloaded.
  const waiting = state.deliveries.find((delivery) => delivery.arrived && !delivery.unloaded);
  if (waiting) {
    const gate = GATE_LAYOUT;
    const gateX = unit.widthTiles + gate.x;
    const faces = boxPolygons(gateX, gate.y, gate.width, gate.depth, gate.height);
    drawables.push({
      depth: depthKey(gateX, gate.y),
      svg:
        `<g data-van="${waiting.id}" data-sprite="${DELIVERY_VAN_SPRITE}" class="clickable">` +
        '<title>Click the van to decide who unloads it</title>' +
        box(faces, 'var(--kit-vehicle)', 'var(--kit-vehicle-dark)') +
        label(
          centreOf(gateX, gate.y, gate.width, gate.depth, gate.height),
          `Delivery: ${waiting.sheets} sheets`,
        ) +
        '</g>',
    });
  }

  // Finished pieces stand on the apron beside the gate until transport is ordered.
  const waitingPieces = jobsAtGate(state);
  if (waitingPieces.length > 0) {
    const apron = FINISHED_GOODS_LAYOUT;
    const apronX = unit.widthTiles + apron.x;
    const shown = Math.min(waitingPieces.length, apron.width);
    for (let index = 0; index < shown; index += 1) {
      const x = apronX + index;
      const faces = boxPolygons(x, apron.y, 1, apron.depth, apron.height);
      drawables.push({
        depth: depthKey(x, apron.y),
        svg:
          `<g data-finished="${index}"><title>Finished, waiting for transport</title>` +
          box(faces, 'var(--kit-stock)', 'var(--kit-stock-dark)') +
          '</g>',
      });
    }
    drawables.push({
      depth: depthKey(apronX, apron.y) + 0.3,
      svg: label(
        centreOf(apronX, apron.y, apron.width, apron.depth, apron.height),
        `At the gate: ${waitingPieces.length}`,
      ),
    });
  }

  drawables.push(...sawdust(state));
  drawables.sort((left, right) => left.depth - right.depth);
  parts.push(drawables.map((drawable) => drawable.svg).join(''));

  // The ghost footprint of whatever is being dragged, on top of everything else.
  if (ghost !== null) {
    const colour = ghost.ok ? 'var(--good)' : 'var(--bad)';
    parts.push(
      `<g data-ghost="1">` +
        `<polygon points="${points(footprintPolygon(ghost.x, ghost.y, ghost.width, ghost.depth))}" ` +
        `fill="none" stroke="${colour}" stroke-width="3" />` +
        `<text x="${Math.round(centreOf(ghost.x, ghost.y, ghost.width, ghost.depth).x)}" ` +
        `y="${Math.round(centreOf(ghost.x, ghost.y, ghost.width, ghost.depth).y)}" ` +
        `text-anchor="middle" class="iso-label ghost-label" fill="${colour}">` +
        `${escapeText(ghost.ok ? 'Drop it here' : ghost.reason)}</text></g>`,
    );
  }

  const viewBox = [
    Math.round(bounds.minX - pad),
    Math.round(bounds.minY - pad),
    Math.round(bounds.width + pad * 2),
    Math.round(bounds.height + pad * 2),
  ].join(' ');
  const output = `${Math.round(staffOutputFactor(state) * 100)}%`;
  const ownerLine = !state.owner.present
    ? `. The owner is not in today, so everyone works at ${output}`
    : state.owner.wentHome
      ? `. The owner has gone home, so everyone works at ${output}`
      : '';
  const band = dustBand(state.dust);
  // 9.7: from the dirty band on, the player is warned that somebody can get hurt.
  const riskLine =
    band.label === 'dirty' || band.label === 'dangerous' ? ', somebody will get hurt in this' : '';
  const stateLine = extractorBroken(state)
    ? `Hall: the extractor is broken, everything runs at a quarter speed${ownerLine}`
    : `Hall: ${band.label}${riskLine}${ownerLine}`;
  const machines = state.equipment.filter((item) => findSpec(item.specId)?.category === 'machine');
  const extractionLine =
    machines.length > 0 && !hasExtraction(state)
      ? '<p class="view-note warn">No extraction in the hall, so no machine will run. ' +
        'Buy an extractor.</p>'
      : '';
  const brokenLine =
    brokenMachines(state).length > 0
      ? '<p class="view-note warn">Broken: ' +
        escapeText(
          brokenMachines(state)
            .map((item) => (findSpec(item.specId)?.name ?? item.specId).toLowerCase())
            .join(', '),
        ) +
        '.</p>'
      : '';
  const serviceLine =
    machinesDueService(state).length > 0
      ? '<p class="view-note warn">Service due: ' +
        escapeText(
          machinesDueService(state)
            .map((item) => (findSpec(item.specId)?.name ?? item.specId).toLowerCase())
            .join(', '),
        ) +
        '.</p>'
      : '';
  const gateLine = gateIsCrowded(state)
    ? `<p class="view-note warn">Order transport, no room at the gate: ${jobsAtGate(state).length}` +
      ` finished pieces against a limit of ${GATE_CROWD_LIMIT}. Everything in the hall is 30% ` +
      'slower.</p>'
    : '';
  const lowStock = stockIsLow(state)
    ? `<p class="view-note warn">The rack is nearly empty: ${state.stock.sheets} of ` +
      `${rackCapacity(state)} sheets left.</p>`
    : rackCapacity(state) === 0
      ? '<p class="view-note warn">No shelving in the hall, so nothing can be unloaded.</p>'
      : '';
  return (
    `<svg class="hall-view" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" ` +
    `role="img" aria-label="Workshop hall">${parts.join('')}</svg>` +
    `<p class="view-note">${escapeText(stateLine)}</p>` +
    `${extractionLine}${brokenLine}${serviceLine}${gateLine}${lowStock}`
  );
}

function lineAttrs(x1: number, y1: number, x2: number, y2: number): string {
  const from = centreOf(x1, y1, 0, 0);
  const to = centreOf(x2, y2, 0, 0);
  return `x1="${Math.round(from.x)}" y1="${Math.round(from.y)}" x2="${Math.round(to.x)}" y2="${Math.round(to.y)}"`;
}

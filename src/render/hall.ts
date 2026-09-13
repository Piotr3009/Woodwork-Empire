// The hall, drawn from the state as flat placeholder boxes. No memory of its own: give it a state
// and it hands back an SVG string (CLAUDE.md 10.3).

import {
  DELIVERY_VAN_SPRITE,
  FINISHED_GOODS_LAYOUT,
  GATE_CROWD_LIMIT,
  GATE_LAYOUT,
  ROOM_LAYOUT,
  YARD_WIDTH_CELLS,
  roomDoorCell,
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
import { machineInUse } from '../engine/game';
import { rackCapacity, stockIsLow } from '../engine/materials';
import {
  STATION_BENCH,
  STATION_GATE,
  STATION_IDLE,
  STATION_NO_BENCH,
  STATION_OFFICE,
  STATION_RACK,
  stationMachine,
} from '../engine/stations';
import { ownerIsAvailable, staffOutputFactor } from '../engine/owner';
import { plural } from '../engine/text';
import type { RoomId } from '../engine/constants';
import type { Equipment, EquipmentSpec, GameState } from '../engine/types';
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
import {
  SPRITE_SCALE,
  contactShadow,
  pickSprite,
  spriteBox,
  spriteFiles,
  spriteImage,
  spriteUrl,
} from './sprites';

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

/** What an object on the floor looks like: its picture when the art side has delivered one, the
 *  placeholder box when it has not, and the contact shadow under either (CLAUDE.md T3 3.6).
 *  When there is a picture the name is a tooltip only: no text over the art. */
export function objectArt(art: {
  spriteKey: string;
  tier?: string | null;
  x: number;
  y: number;
  width: number;
  depth: number;
  height: number;
  fill: string;
  shade: string;
  label: string;
}): string {
  const shadow = contactShadow(art.x, art.y, art.width, art.depth);
  const url = spriteUrl(art.spriteKey, art.tier);
  if (url !== null) {
    const at = spriteBox(art.x, art.y, art.width, art.depth, art.height);
    return shadow + spriteImage(url, at);
  }
  const faces = boxPolygons(art.x, art.y, art.width, art.depth, art.height);
  return (
    shadow +
    box(faces, art.fill, art.shade) +
    label(centreOf(art.x, art.y, art.width, art.depth, art.height), art.label)
  );
}

interface Drawable {
  depth: number;
  svg: string;
}

// ---------------------------------------------------------------------------
// The painted hall (docs/art/SPRITES.md 9). Three layers on one canvas, registered to the grid by
// where world (0, 0, 0) sits on that canvas, with the sprites and the figures on top of them.
// ---------------------------------------------------------------------------

/** The canvas every hall layer is drawn on, at the 1x scale the game draws at: the art is 2x, so
 *  1680 by 1128 in the file is half that here. `originX` and `originY` are where world (0, 0, 0)
 *  sits on it, which is the whole of the registration (docs/art/SPRITES.md 9.2). */
export const HALL_CANVAS = {
  width: 1680 / SPRITE_SCALE,
  height: 1128 / SPRITE_SCALE,
  originX: 600 / SPRITE_SCALE,
  originY: 288 / SPRITE_SCALE,
};

export interface HallLayer {
  /** The sprite key, which is the file name in public/sprites. */
  key: string;
  /** What a flat placeholder says while the art is not there yet. */
  name: string;
  /** The room block this layer paints. The WC is painted into the background. */
  room: RoomId;
}

/** Back to front (docs/art/SPRITES.md 9.3). */
export const HALL_LAYERS: HallLayer[] = [
  { key: 'hallBackground', name: 'Hall background', room: 'wc' },
  { key: 'hallOffice', name: 'Office block', room: 'office' },
  { key: 'hallCanteen', name: 'Canteen block', room: 'canteen' },
];

/** Where a layer goes in the hall's own coordinates: the canvas, shifted so its origin pixel
 *  lands on world (0, 0, 0). */
export function hallLayerBox(): { x: number; y: number; width: number; height: number } {
  return {
    x: -HALL_CANVAS.originX,
    y: -HALL_CANVAS.originY,
    width: HALL_CANVAS.width,
    height: HALL_CANVAS.height,
  };
}

// ---------------------------------------------------------------------------
// What a machine looks like while it is running (CLAUDE.md T3 3.7). All of it is presentation on
// top of whatever the machine is drawn with, and all of it moves through CSS on SVG groups: the
// renderer starts no timer of its own.
// ---------------------------------------------------------------------------

/** Particles in a chip stream [TUNE: the brief asks for 3 to 6 and the renderer never guesses]. */
const FX_CHIPS = 4;

function at(point: Point): string {
  return `transform="translate(${round(point.x)},${round(point.y)})"`;
}

/** The disc of a saw blade, with the spokes that make the spin visible. */
function blade(point: Point): string {
  const spokes = [0, 45, 90, 135]
    .map((angle) => `<line x1="0" y1="-9" x2="0" y2="9" transform="rotate(${angle})" />`)
    .join('');
  return (
    `<g class="fx fx-blade" ${at(point)}><circle r="10" />` +
    `<g class="fx-blade-spin">${spokes}</g></g>`
  );
}

/** Dust and chips thrown down-right from a cutter, over and over while it runs. */
function chipStream(point: Point): string {
  const parts: string[] = [];
  for (let index = 0; index < FX_CHIPS; index += 1) {
    parts.push(
      `<circle class="fx-chip" r="2" style="animation-delay:${(index * 0.3).toFixed(1)}s" />`,
    );
  }
  return `<g class="fx fx-chips" ${at(point)}>${parts.join('')}</g>`;
}

/** A lamp on the machine: amber while it works, red when it has given up. */
function lamp(point: Point, tone: 'amber' | 'red'): string {
  return `<circle class="fx fx-lamp fx-${tone}" cx="${round(point.x)}" cy="${round(point.y)}" r="4" />`;
}

export interface MachineFx {
  /** Goes on the object's own group: the extractor breathes as a whole. */
  className: string;
  svg: string;
}

const NO_FX: MachineFx = { className: '', svg: '' };

export function machineFx(state: GameState, item: Equipment, spec: EquipmentSpec): MachineFx {
  // The top of the object, where a lamp or a blade would sit on the real thing.
  const point = centreOf(item.anchorX, item.anchorY, spec.width, spec.depth, spec.height);
  if (spec.category === 'extraction') {
    if (item.broken) return { className: '', svg: lamp(point, 'red') };
    return machineInUse(state, item) ? { className: ' fx-breathe', svg: '' } : NO_FX;
  }
  if (!machineInUse(state, item)) return NO_FX;
  if (item.specId === 'tableSaw') {
    return { className: '', svg: blade(point) + chipStream(point) };
  }
  if (item.specId === 'thicknesser') return { className: '', svg: chipStream(point) };
  if (item.specId === 'edgebander') return { className: '', svg: lamp(point, 'amber') };
  return NO_FX;
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
      : 1 + ((index * 7) % Math.max(1, state.unit.widthCells - 2));
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

/** The cell a station puts a figure on. Anything the workshop has not bought falls back to the
 *  middle of the floor (CLAUDE.md T2 3.3). */
export function stationCell(
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
    // At the back of the lorry, inside the shutter.
    return { x: GATE_LAYOUT.x, y: GATE_LAYOUT.y + GATE_LAYOUT.depth };
  }
  if (station === STATION_OFFICE) return roomDoorCell('office');
  if (station === STATION_IDLE || station === STATION_NO_BENCH) return roomDoorCell('canteen');
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
  if (station === STATION_NO_BENCH) return 'no bench';
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
      `class="iso-label figure-label">${escapeText(name.split(',')[0] ?? name)}</text></g>`,
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

export interface HallOptions {
  /** The footprint following the mouse while the hall is being set out. */
  ghost?: Ghost | null;
  /** True while the hall is being set out: the grid comes out over the painting. */
  setup?: boolean;
  /** What the art side has delivered. A parameter so a test can ask for the hall before the art
   *  arrived, which is what the placeholders are for. */
  files?: readonly string[];
}

export function renderHall(state: GameState, options: HallOptions = {}): string {
  const unit = state.unit;
  const ghost = options.ghost ?? null;
  const files = options.files ?? spriteFiles();
  const layerUrl = (key: string): string | null => pickSprite(files, key);
  // The background carries the floor, the walls and the kerbs. Without it the game draws its own
  // flat floor, so the hall is playable and testable before the art arrives.
  const painted = layerUrl('hallBackground') !== null;
  const bounds = gridBounds(unit.widthCells + YARD_WIDTH_CELLS, unit.depthCells, 5);
  const pad = 24;
  const parts: string[] = [];

  if (painted) {
    // The layers sit at the canvas origin, every one of them, which is what keeps the two room
    // blocks on their own cells (docs/art/SPRITES.md 9.3).
    const at = hallLayerBox();
    for (const layer of HALL_LAYERS) {
      const url = layerUrl(layer.key);
      if (url === null) continue;
      parts.push(
        `<image class="hall-layer" data-layer="${layer.key}" href="${url}" ` +
          `x="${at.x}" y="${at.y}" width="${at.width}" height="${at.height}" ` +
          'preserveAspectRatio="none" />',
      );
    }
  } else {
    // Floor and yard.
    parts.push(
      polygon(footprintPolygon(0, 0, unit.widthCells, unit.depthCells), 'var(--concrete)'),
    );
    parts.push(
      polygon(
        footprintPolygon(unit.widthCells, 0, YARD_WIDTH_CELLS, unit.depthCells),
        'var(--yard)',
      ),
    );
  }

  // The grid is the painting's business once the painting is there, except while the player is
  // setting the hall out, when he needs to see the cells he is dropping on.
  if (!painted || options.setup === true) {
    const lines: string[] = [];
    for (let x = 0; x <= unit.widthCells; x += 1) {
      lines.push(
        `<line ${lineAttrs(x, 0, x, unit.depthCells)} stroke="var(--grid)" stroke-width="1" />`,
      );
    }
    for (let y = 0; y <= unit.depthCells; y += 1) {
      lines.push(
        `<line ${lineAttrs(0, y, unit.widthCells, y)} stroke="var(--grid)" stroke-width="1" />`,
      );
    }
    parts.push(lines.join(''));
  }

  const drawables: Drawable[] = [];

  // The three room blocks. Each is a layer of the painting, or a placeholder box while that layer
  // is missing; either way its footprint is what the player clicks on.
  for (const room of ROOM_LAYOUT) {
    const layer = HALL_LAYERS.find((entry) => entry.room === room.id);
    const drawn = layer !== undefined && layerUrl(layer.key) !== null;
    drawables.push({
      depth: depthKey(room.x, room.y),
      svg:
        `<g data-room="${room.id}" data-sprite="${room.spriteKey}" class="clickable">` +
        `<title>${escapeText(room.tooltip)}</title>` +
        (drawn
          ? polygon(
              footprintPolygon(room.x, room.y, room.width, room.depth),
              'transparent',
              'class="room-hit"',
            )
          : objectArt({
              spriteKey: room.spriteKey,
              x: room.x,
              y: room.y,
              width: room.width,
              depth: room.depth,
              height: room.height,
              fill: 'var(--room)',
              shade: 'var(--room-dark)',
              label: room.name,
            })) +
        '</g>',
    });
  }

  // Everything the player has bought, except the office furniture, which lives in the office view.
  for (const item of state.equipment) {
    const spec = findSpec(item.specId);
    if (!spec || spec.category === 'furniture') continue;
    const broken = item.broken;
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
    const name = `${spec.name}${bagLine}${serviceLine}${benchLine}${rackLine}`;
    const fx = machineFx(state, item, spec);
    drawables.push({
      depth: depthKey(item.anchorX, item.anchorY),
      svg:
        `<g data-kit="${item.id}"${spec.category === 'storage' ? ' data-rack="1"' : ''} ` +
        `data-sprite="${item.spriteKey}" data-tier="${item.variantId}" ` +
        `class="clickable${fx.className}">` +
        `<title>${escapeText(`${name}. ${spec.effect}`)}</title>` +
        objectArt({
          spriteKey: item.spriteKey,
          tier: item.variantId,
          x: item.anchorX,
          y: item.anchorY,
          width: spec.width,
          depth: spec.depth,
          height: spec.height,
          fill,
          shade,
          label: name,
        }) +
        fx.svg +
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
        stationCell(state, worker.station, bench),
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
        stationCell(state, state.owner.station, ownerBench),
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
    // The shutter is in a far wall, so the lorry is only ever seen once it is in the hall, which
    // is what the lane is kept clear for (docs/art/SPRITES.md 9.3).
    const gateX = gate.x;
    drawables.push({
      depth: depthKey(gateX, gate.y),
      svg:
        `<g data-van="${waiting.id}" data-sprite="${DELIVERY_VAN_SPRITE}" class="clickable">` +
        '<title>Click the van to decide who unloads it</title>' +
        objectArt({
          spriteKey: DELIVERY_VAN_SPRITE,
          x: gateX,
          y: gate.y,
          width: gate.width,
          depth: gate.depth,
          height: gate.height,
          fill: 'var(--kit-vehicle)',
          shade: 'var(--kit-vehicle-dark)',
          label: `Delivery: ${plural(waiting.sheets, 'sheet', 'sheets')}`,
        }) +
        '</g>',
    });
  }

  // Finished pieces stand on the apron beside the gate until transport is ordered.
  const waitingPieces = jobsAtGate(state);
  if (waitingPieces.length > 0) {
    const apron = FINISHED_GOODS_LAYOUT;
    const apronX = apron.x;
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

  // With the painting there, the frame is the canvas: the view box is the art's own edges, so the
  // registration cannot drift whatever else is in the hall. Without it, the grid sets the frame.
  const layerAt = hallLayerBox();
  const size = painted
    ? {
        x: layerAt.x,
        y: layerAt.y,
        width: layerAt.width,
        height: layerAt.height,
      }
    : {
        x: Math.round(bounds.minX - pad),
        y: Math.round(bounds.minY - pad),
        width: Math.round(bounds.width + pad * 2),
        height: Math.round(bounds.height + pad * 2),
      };
  const viewBox = [size.x, size.y, size.width, size.height].join(' ');
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
    `<svg class="hall-view" viewBox="${viewBox}" width="${size.width}" height="${size.height}" ` +
    `xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Workshop hall">` +
    `${parts.join('')}</svg>` +
    `<p class="view-note">${escapeText(stateLine)}</p>` +
    `${extractionLine}${brokenLine}${serviceLine}${gateLine}${lowStock}`
  );
}

function lineAttrs(x1: number, y1: number, x2: number, y2: number): string {
  const from = centreOf(x1, y1, 0, 0);
  const to = centreOf(x2, y2, 0, 0);
  return `x1="${Math.round(from.x)}" y1="${Math.round(from.y)}" x2="${Math.round(to.x)}" y2="${Math.round(to.y)}"`;
}

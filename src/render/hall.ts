// The hall, drawn from the state as flat placeholder boxes. No memory of its own: give it a state
// and it hands back an SVG string (CLAUDE.md 10.3).

import {
  DELIVERY_VAN_SPRITE,
  FINISHED_GOODS_LAYOUT,
  GATE_CROWD_LIMIT,
  GATE_LAYOUT,
  ROOM_DOOR,
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
import { orderName, reservedItems, shoppingList } from '../engine/orders';
import {
  footprintOf,
  itemStandsInTheHall,
  sheetCapacityOf,
  zoneOf,
} from '../engine/machines';
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
  stationWaitingFor,
} from '../engine/stations';
import { ownerIsAvailable, staffOutputFactor } from '../engine/owner';
import { plural } from '../engine/text';
import type { RoomId } from '../engine/constants';
import type { Equipment, EquipmentSpec, GameState, OnOrderItem } from '../engine/types';
import {
  type BoxFaces,
  type Point,
  type Polygon,
  TILE_RISE,
  blockSilhouette,
  boxPolygons,
  centreOf,
  depthKey,
  footprintPolygon,
  gridBounds,
  pointInPolygon,
  tileToScreen,
} from './iso';
import { formatTime } from '../engine/clock';
import {
  type CharacterOptions,
  type Facing,
  animationForStation,
  characterArt,
} from './characters';
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

/** The matrix that lays lettering into a wall that runs along world x, which is the rear wall and
 *  every room front (CLAUDE.md T6 3.2). One metre along that wall is (+24, +12) on the screen and
 *  one metre of height is (0, -24), so a pixel of the text box goes (1, 0.5) across and (0, 1)
 *  down: the letters keep their height and lean with the wall. */
export function wallMatrix(at: Point): string {
  return `matrix(1,0.5,0,1,${round(at.x)},${round(at.y)})`;
}

/** The same for the left wall, which runs along world y: one metre of it is (-24, +12) on the
 *  screen, so a pixel of the box goes (1, -0.5) across and (0, 1) down and the lettering leans the
 *  other way. Local x therefore runs towards falling y, which is why anything drawn with it is
 *  anchored at the high y end of its span (CLAUDE.md T9 3.2). */
export function leftWallMatrix(at: Point): string {
  return `matrix(1,-0.5,0,1,${round(at.x)},${round(at.y)})`;
}

/** Text the game letters onto the painting: the room names and the company name. Its own class,
 *  because the painting is not the flat grey the placeholder boxes are (docs/art/SPRITES.md 9.5).
 *  `at` is where the middle of the baseline sits, projected from the wall it is painted on. */
export function paintedText(
  at: Point,
  text: string,
  className: string,
  fontSize: number,
): string {
  return (
    `<text x="0" y="0" text-anchor="middle" transform="${wallMatrix(at)}" ` +
    `class="${className}" font-size="${round(fontSize)}">${escapeText(text)}</text>`
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
  /** What the art side has delivered; the manifest when not given, so a test can draw the hall
   *  as if a file had not landed yet (the placeholders are for exactly that). */
  files?: readonly string[];
}): string {
  const shadow = contactShadow(art.x, art.y, art.width, art.depth);
  const url = art.files === undefined ? spriteUrl(art.spriteKey, art.tier) : pickSprite(art.files, art.spriteKey, art.tier);
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

/** The box docs/art/SPRITES.md 9.5 leaves on the wall for the company name, given there in
 *  canvas pixels at 2x: x 300 to 560, y 130 to 200. Its width is what the name is fitted to. */
export const HALL_NAME_BOX = { x: 300, y: 130, width: 260, height: 70 };

/** Where the name is lettered on the rear wall: the middle of the lettering, in metres along the
 *  wall and up it. The run of blockwork past the canteen block is the only clear one, and 2 m up
 *  is clear of everything standing in front of it [TUNE: both].
 *
 *  The box of 9.5 does not place it. Measured on the delivered background, canvas x 300 to 560 is
 *  beside the left wall, not the rear one, and y 130 to 200 is above its roofline: the strip is
 *  the dark sky over the building, which is REPORT-T5 open question 1, still unanswered. */
export const HALL_NAME_WALL = { x: 9, z: 2 };

/** How far the clock stands from the edge of the name's box, in metres along the wall [TUNE]. */
const HALL_CLOCK_GAP = 0.8;

/** How high the digits are lettered, in scene pixels [TUNE]: smaller than the name beside them,
 *  because it is a clock and not the sign over the door. */
export const HALL_CLOCK_SIZE = 12;

/** The biggest and the smallest the name is ever lettered, in scene pixels. The floor is the
 *  repository's readable minimum (CLAUDE.md T2 3.11), so a long name shrinks to it and is cut
 *  short only below it [TUNE sizes]. */
const NAME_SIZE_MAX = 18;
const NAME_SIZE_MIN = 11;
/** Rough width of a letter as a share of its size, for fitting a name to its box. */
const LETTER_WIDTH = 0.55;

/** Room names are small text on the face that looks into the hall (docs/art/SPRITES.md 9.5). */
const ROOM_LABEL_SIZE = 11;
/** How far the name stands above the door head, in metres [TUNE]. */
const ROOM_LABEL_CLEARANCE = 0.1;

/** How wide the name may be lettered, in scene pixels: the box of docs/art/SPRITES.md 9.5 is
 *  given at 2x and the scene is 1x. */
export const HALL_NAME_WIDTH = HALL_NAME_BOX.width / SPRITE_SCALE;

/** Where the clock is lettered on the rear wall: right of the name's box and 1.6 m up, which is
 *  clear of everything standing in front of it (PIOTR, 13.09: "there is no clock in the hall";
 *  CLAUDE.md T9 3.5). Taken off the name's own box, so the two cannot drift into each other. */
export const HALL_CLOCK_WALL = {
  x: HALL_NAME_WALL.x + HALL_NAME_WIDTH / TILE_RISE / 2 + HALL_CLOCK_GAP,
  z: 1.6,
};

/** A box on a wall, in metres across the face and up it. The two the hall cares about are the
 *  door and the name over it, which must not touch (CLAUDE.md T6 3.2). */
export interface FaceBox {
  across: number;
  from: number;
  bottom: number;
  top: number;
}

/** The door in a room's front face, centred on it (docs/art/SPRITES.md 9.3). */
export function roomDoorBox(room: { width: number }): FaceBox {
  return {
    across: ROOM_DOOR.width,
    from: room.width / 2 - ROOM_DOOR.width / 2,
    bottom: 0,
    top: ROOM_DOOR.height,
  };
}

/** The name over it: the top third of the face, clear of the door head. A metre of the face is
 *  the same number of pixels across it as up it, so both sides of the box divide by one number. */
export function roomLabelBox(room: { name: string; width: number }): FaceBox {
  const across = (room.name.length * LETTER_WIDTH * ROOM_LABEL_SIZE) / TILE_RISE;
  const bottom = roomDoorBox(room).top + ROOM_LABEL_CLEARANCE;
  return {
    across,
    from: room.width / 2 - across / 2,
    bottom,
    top: bottom + ROOM_LABEL_SIZE / TILE_RISE,
  };
}

export interface FittedName {
  text: string;
  fontSize: number;
}

/** The company name lettered to fit a box: it shrinks before it is cut, and it is only cut when
 *  even the smallest readable lettering will not hold it. The hall's wall and the office board
 *  both come through here, at their own sizes (CLAUDE.md T6 3.10). */
export function fitName(
  name: string,
  boxWidth: number,
  sizes: { max: number; min: number } = { max: NAME_SIZE_MAX, min: NAME_SIZE_MIN },
): FittedName {
  const trimmed = name.trim();
  if (trimmed === '') return { text: '', fontSize: sizes.max };
  const wanted = Math.floor(boxWidth / (LETTER_WIDTH * trimmed.length));
  const fontSize = Math.min(sizes.max, Math.max(sizes.min, wanted));
  const fits = Math.floor(boxWidth / (LETTER_WIDTH * fontSize));
  if (trimmed.length <= fits) return { text: trimmed, fontSize };
  return { text: `${trimmed.slice(0, Math.max(1, fits - 3))}...`, fontSize };
}

/** The shape a room block covers on the screen. A room is 2.7 m high, so what the player sees of
 *  it reaches well above the cells it stands on: the canteen block is painted over the middle of
 *  the office's floor, and the office block over the WC's front face. */
export function roomSilhouette(room: {
  x: number;
  y: number;
  width: number;
  depth: number;
  height: number;
}): Polygon {
  return blockSilhouette(room.x, room.y, room.width, room.depth, room.height);
}

/** Which room the player clicked, from the room footprints alone: never from the layer images,
 *  which are one full canvas each and would answer for every pixel of the hall (CLAUDE.md T6 3.1).
 *  The rooms are tried nearest first, in the reverse of the order they are painted in, so the
 *  block in front takes the click the way it takes the pixel. */
export function roomAtScenePoint(point: Point): RoomId | null {
  const nearestFirst = [...ROOM_LAYOUT].sort(
    (left, right) => depthKey(right.x, right.y) - depthKey(left.x, left.y),
  );
  for (const room of nearestFirst) {
    if (pointInPolygon(point, roomSilhouette(room))) return room.id;
  }
  return null;
}

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
// The camera over the hall (CLAUDE.md T6 3.3). One transform on one group, over the painting, the
// sprites, the figures, the effects and the text: nothing is laid out again when it changes, and
// the same numbers answer where a click landed.
// ---------------------------------------------------------------------------

export interface HallCamera {
  /** Multiples of the letterboxed fit the view box already gives. */
  scale: number;
  /** Where the scene is pushed to, in view box units. */
  x: number;
  y: number;
}

/** The whole hall on the screen, which is where every visit starts. */
export const HALL_CAMERA_FIT: HallCamera = { scale: 1, x: 0, y: 0 };
export const HALL_ZOOM_MIN = 1;
export const HALL_ZOOM_MAX = 4;
/** One notch of the wheel [PIOTR: steps of 1.2]. */
export const HALL_ZOOM_STEP = 1.2;

/** A rectangle in view box units: the frame the scene is seen through. */
export interface Frame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function cameraTransform(camera: HallCamera): string {
  return `translate(${round(camera.x)},${round(camera.y)}) scale(${round(camera.scale)})`;
}

/** How far in the player is allowed to be: from the fit to four times it (CLAUDE.md T6 3.3). The
 *  one place the two ends are applied, so no way in can land outside them. */
function clampScale(scale: number): number {
  return Math.min(HALL_ZOOM_MAX, Math.max(HALL_ZOOM_MIN, scale));
}

/** The scene never comes off the frame: at the fit there is nowhere to go, and the further in the
 *  player is the more he may push it about. */
export function clampCamera(camera: HallCamera, frame: Frame): HallCamera {
  const scale = clampScale(camera.scale);
  const slack = 1 - scale;
  return {
    scale,
    x: Math.min(frame.x * slack, Math.max((frame.x + frame.width) * slack, camera.x)),
    y: Math.min(frame.y * slack, Math.max((frame.y + frame.height) * slack, camera.y)),
  };
}

/** A point of the frame, back to the point of the scene under it. Hit testing goes through here,
 *  so it reads the same transform the picture is drawn with. */
export function sceneToContent(camera: HallCamera, at: Point): Point {
  return { x: (at.x - camera.x) / camera.scale, y: (at.y - camera.y) / camera.scale };
}

/** Zoom about a point of the frame: whatever is under the pointer stays under it. */
export function zoomAt(camera: HallCamera, frame: Frame, at: Point, factor: number): HallCamera {
  const scale = clampScale(camera.scale * factor);
  const taken = scale / camera.scale;
  return clampCamera(
    { scale, x: at.x - taken * (at.x - camera.x), y: at.y - taken * (at.y - camera.y) },
    frame,
  );
}

/** Zoom to a scale with a point of the scene in the middle of the frame. */
export function zoomTo(frame: Frame, centre: Point, scale: number): HallCamera {
  const wanted = clampScale(scale);
  return clampCamera(
    {
      scale: wanted,
      x: frame.x + frame.width / 2 - wanted * centre.x,
      y: frame.y + frame.height / 2 - wanted * centre.y,
    },
    frame,
  );
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

/** Where a machine's picture actually stands: its class's footprint, centred inside the working
 *  zone it reserves (CLAUDE.md T7 3.3). The anchor cell is the zone's corner, so everything that
 *  draws an object comes through here. */
export function footprintIn(item: Equipment): {
  x: number;
  y: number;
  width: number;
  depth: number;
  height: number;
} {
  const stands = footprintOf(item.specId, item.variantId);
  const zone = zoneOf(item.specId, item.variantId);
  // A class that holds no floor is kept in a tool cabinet: its picture stands on the cell the
  // cabinet stands on, with nothing to centre it in (CLAUDE.md T7 3.6).
  const inZone = zone.width > 0 && zone.depth > 0;
  return {
    x: item.anchorX + (inZone ? (zone.width - stands.width) / 2 : 0),
    y: item.anchorY + (inZone ? (zone.depth - stands.depth) / 2 : 0),
    width: stands.width,
    depth: stands.depth,
    height: stands.height,
  };
}

export function machineFx(state: GameState, item: Equipment, spec: EquipmentSpec): MachineFx {
  // The top of the object, where a lamp or a blade would sit on the real thing.
  const stands = footprintIn(item);
  const point = centreOf(stands.x, stands.y, stands.width, stands.depth, stands.height);
  if (spec.category === 'extraction') {
    if (item.broken) return { className: '', svg: lamp(point, 'red') };
    return machineInUse(state, item) ? { className: ' fx-breathe', svg: '' } : NO_FX;
  }
  if (!machineInUse(state, item)) return NO_FX;
  if (item.specId === 'tableSaw') {
    return { className: '', svg: blade(point) + chipStream(point) };
  }
  if (item.specId === 'thicknesser') return { className: '', svg: chipStream(point) };
  // A floor edgebander throws chips off its trimmer; a hand one holds no cell of the floor and
  // is never drawn at all (CLAUDE.md T6 3.5, T7 3.6).
  if (item.specId === 'edgebander') return { className: '', svg: chipStream(point) };
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

/** The cell in front of an object, along its own footprint: where a man stands to use it. */
function frontOf(item: Equipment, along: number): { x: number; y: number } {
  const stands = footprintIn(item);
  return {
    x: Math.floor(stands.x) + Math.min(along, Math.max(0, Math.ceil(stands.width) - 1)),
    y: Math.floor(stands.y + stands.depth),
  };
}

/** The cell a station puts a figure on. Anything the workshop has not bought falls back to the
 *  middle of the floor (CLAUDE.md T2 3.3). */
export function stationCell(
  state: GameState,
  station: string,
  bench: { x: number; y: number },
): { x: number; y: number } {
  // A man waiting for a machine stands at it, which is what waiting at one looks like (T7 3.1).
  const waitingFor = stationWaitingFor(station);
  const specId = stationMachine(station) ?? waitingFor;
  if (specId !== null) {
    // At the front edge of the machine itself, not of the working zone around it, and one step
    // along it when he is waiting for somebody else to finish with it (CLAUDE.md T7 3.1).
    const item = state.equipment.find((entry) => entry.specId === specId);
    if (item) return frontOf(item, waitingFor === null ? 0 : 1);
  }
  if (station === STATION_RACK) {
    const rack = state.equipment.find((entry) => sheetCapacityOf(entry) > 0);
    if (rack) return frontOf(rack, 0);
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
  const waiting = stationWaitingFor(station);
  if (waiting !== null) {
    return `waiting for ${(findSpec(waiting)?.name ?? waiting).toLowerCase()}`;
  }
  if (station === STATION_RACK) return 'the rack';
  if (station === STATION_GATE) return 'the gate';
  if (station === STATION_OFFICE) return 'the office';
  if (station === STATION_BENCH) return 'the bench';
  if (station === STATION_NO_BENCH) return 'no bench';
  return 'waiting';
}

/** Which way a figure stands when nobody has told him otherwise: towards the camera's left, the
 *  way the hall is drawn [TUNE] (CLAUDE.md T9 3.13). */
const FIGURE_FACING: Facing = 'sw';

/** A worker is his sheet if the art side has delivered one and a capsule if it has not, with his
 *  name under him either way. The owner is the green one. The group carries its position as a
 *  transform, so a change of station slides instead of jumping. */
function figure(
  key: string,
  tile: { x: number; y: number },
  name: string,
  isOwner: boolean,
  extra: string,
  art: { role: string; station: string; options: CharacterOptions } | null = null,
): Drawable {
  const feet = centreOf(tile.x, tile.y, 1, 1);
  const fill = isOwner ? 'var(--owner)' : 'var(--worker)';
  // The sheet if the art side has delivered one for this role, and the capsule the game has
  // always drawn if it has not (CLAUDE.md T9 3.13).
  const rest = art === null ? 'idle' : animationForStation(art.station);
  const drawn =
    art === null ? null : characterArt(art.role, rest, FIGURE_FACING, art.options);
  const body =
    drawn ?? `<rect x="-6" y="-30" width="12" height="26" rx="6" fill="${fill}" />`;
  return {
    depth: depthKey(tile.x, tile.y) + 0.2,
    svg:
      `<g class="figure" data-figure="${key}" ` +
      `transform="translate(${Math.round(feet.x)},${Math.round(feet.y)})" ` +
      `data-rest="${rest}" ${extra}>` +
      `<title>${escapeText(name)}</title>` +
      body +
      '<text x="0" y="14" text-anchor="middle" ' +
      `class="iso-label figure-label">${escapeText(name.split(',')[0] ?? name)}</text></g>`,
  };
}

/** The board by the entrance door of the hall, not on the office (PIOTR, 13.09; CLAUDE.md T9
 *  3.2). The personnel door is in the left wall at y 4.5 to 5.5, and the board hangs beside it at
 *  y 3 to 4.5, 1.5 m up (docs/art/SPRITES.md 9.3). Its own small board rather than a control
 *  drawn over the painting, so the hall keeps its one style. */
export const PIN_BOARD = { fromY: 3, toY: 4.5, z: 1.5, height: 0.7 };

export function pinBoard(count: number): string {
  // Anchored at the far end of the span, because a local metre to the right along this wall is a
  // metre of falling y (see leftWallMatrix).
  const at = tileToScreen(0, PIN_BOARD.toY, PIN_BOARD.z);
  const width = (PIN_BOARD.toY - PIN_BOARD.fromY) * TILE_RISE;
  const height = PIN_BOARD.height * TILE_RISE;
  return (
    '<g data-do="openModal" data-modal="shopping" data-pinboard="1" ' +
    `class="clickable pin-board" transform="${leftWallMatrix(at)}">` +
    '<title>What is on order. Click for the list.</title>' +
    `<rect x="0" y="${-height}" width="${width}" height="${height}" class="pin-board-face" />` +
    `<text x="${round(width / 2)}" y="${round(-height / 2 + 4)}" text-anchor="middle" ` +
    `class="painted-text pin-board-text" font-size="9">Orders: ${count}</text>` +
    '</g>'
  );
}

/** The outline of something bought and not here yet, on the cells held for it (T8 3.2). */
export function reservedOutline(item: OnOrderItem): string {
  const zone = zoneOf(item.specId, item.variantId);
  const stands = footprintOf(item.specId, item.variantId);
  const inset = {
    x: item.anchorX + Math.max(0, (zone.width - stands.width) / 2),
    y: item.anchorY + Math.max(0, (zone.depth - stands.depth) / 2),
  };
  const name = orderName(item);
  return (
    `<g data-kit="${item.id}" data-order="${item.id}" class="clickable reserved">` +
    `<title>${escapeText(`${name}, on order, due day ${item.dueDay}`)}</title>` +
    `<polygon points="${points(footprintPolygon(item.anchorX, item.anchorY, zone.width, zone.depth))}" ` +
    'class="reserved-zone" />' +
    `<polygon points="${points(footprintPolygon(inset.x, inset.y, stands.width, stands.depth))}" ` +
    'class="reserved-floor" />' +
    label(
      centreOf(item.anchorX, item.anchorY, zone.width, zone.depth),
      `${name}, due day ${item.dueDay}`,
    ) +
    '</g>'
  );
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

/** A view that is expensive to build. The shell carries the pictures, which are megabytes: a
 *  fresh <img> has to fetch and decode before it paints, so a page rebuilt every game minute made
 *  the whole room blink. The shell is built once and kept on the page, and only the live part is
 *  written again, which is what ui/modal.ts already does for an open modal (CLAUDE.md T3 3.4). */
export interface Scene {
  /** The shell is rebuilt when, and only when, this changes. */
  key: string;
  /** Built once. Carries exactly one empty element marked `data-live`. Asked for only when the key
   *  has changed, so the markup of a scene that is already on the page is never built again. */
  shell: () => string;
  /** Written into that element on every render. */
  live: string;
  /** The lines under the view. They belong to the page, not to the scene. */
  notes: string;
}

/** The empty element a shell leaves for its live part. */
export const LIVE_SLOT = '<g data-live="1"></g>';

/** The shell and the live part as one string, for a caller that just wants the markup. */
export function sceneHtml(scene: Scene): string {
  return scene.shell().replace(LIVE_SLOT, `<g data-live="1">${scene.live}</g>`) + scene.notes;
}

export interface HallOptions {
  /** The footprint following the mouse while the hall is being set out. */
  ghost?: Ghost | null;
  /** True while the hall is being set out: the grid comes out over the painting. */
  setup?: boolean;
  /** What the art side has delivered. A parameter so a test can ask for the hall before the art
   *  arrived, which is what the placeholders are for. */
  files?: readonly string[];
  /** The character sheets, for the same reason: a figure is his sheet where there is one and the
   *  capsule where there is not (CLAUDE.md T9 3.13). */
  characters?: CharacterOptions['sheets'];
}

export function hallScene(state: GameState, options: HallOptions = {}): Scene {
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
  const characterOptions: CharacterOptions = { files, sheets: options.characters };

  if (painted) {
    // The layers sit at the canvas origin, every one of them, which is what keeps the two room
    // blocks on their own cells (docs/art/SPRITES.md 9.3).
    const at = hallLayerBox();
    for (const layer of HALL_LAYERS) {
      const url = layerUrl(layer.key);
      if (url === null) continue;
      parts.push(
        // The box is the canvas itself, so none is the honest fit: it puts every pixel of the
        // painting exactly where the art side drew it, with nothing left for a fit rule to round.
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
    // A room is a layer of the painting or a placeholder box, and nothing else: there is no sprite
    // of its own any more, which would be a second way to draw the same block
    // (docs/art/SPRITES.md 9.3 replaced the room sprites of section 6).
    const faces = boxPolygons(room.x, room.y, room.width, room.depth, room.height);
    drawables.push({
      depth: depthKey(room.x, room.y),
      svg:
        `<g data-room="${room.id}" class="clickable">` +
        `<title>${escapeText(room.tooltip)}</title>` +
        (drawn
          ? polygon(roomSilhouette(room), 'transparent', 'class="room-hit"') +
            // The art leaves the face blank, so the game letters it (docs/art/SPRITES.md 9.5).
            // Over the door, not on it, and skewed into the face the door is in (T6 3.2).
            // A boxed room already carries its name in the middle: one name per room either way.
            paintedText(
              tileToScreen(
                room.x + room.width / 2,
                room.y + room.depth,
                roomLabelBox(room).bottom,
              ),
              room.name,
              'painted-text room-label',
              ROOM_LABEL_SIZE,
            )
          : contactShadow(room.x, room.y, room.width, room.depth) +
            box(faces, 'var(--room)', 'var(--room-dark)') +
            label(centreOf(room.x, room.y, room.width, room.depth, room.height), room.name)) +
        '</g>',
    });
  }

  // Everything the player has bought, except the office furniture, which lives in the office
  // view, and the hand edgebander, which lives in a tool cabinet (CLAUDE.md T6 3.5).
  for (const item of state.equipment) {
    const spec = findSpec(item.specId);
    if (!spec || spec.category === 'furniture') continue;
    if (!itemStandsInTheHall(item)) continue;
    // What the picture stands on is the class's own footprint, centred inside the working zone
    // the class reserves (CLAUDE.md T7 3.3).
    const stands = footprintIn(item);
    const broken = item.broken;
    const fill = broken ? 'var(--stopped)' : CATEGORY_FILL[spec.category] ?? 'var(--kit-machine)';
    const shade = broken
      ? 'var(--stopped-dark)'
      : CATEGORY_SHADE[spec.category] ?? 'var(--kit-machine-dark)';
    const bagLine = item.bagFull ? ' (bag full)' : '';
    const serviceLine = !item.broken && serviceIsDue(item) ? ' (service due)' : '';
    const rackLine =
      sheetCapacityOf(item) > 0 ? `: ${state.stock.sheets} / ${rackCapacity(state)}` : '';
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
          files,
          spriteKey: item.spriteKey,
          tier: item.variantId,
          x: stands.x,
          y: stands.y,
          width: stands.width,
          depth: stands.depth,
          height: stands.height,
          fill,
          shade,
          label: name,
        }) +
        fx.svg +
        '</g>',
    });
  }

  // The Orders board by the entrance door of the hall, on the left wall (PIOTR, 13.09). It hangs
  // on the wall, so it is drawn behind everything standing in front of it.
  drawables.push({
    depth: depthKey(0, PIN_BOARD.fromY) - 0.01,
    svg: pinBoard(shoppingList(state).length),
  });

  // The floor held for what is bought and not here yet: a grey outline of the zone it reserves
  // with the footprint it will stand on inside it, and the day it is due under them. Setup mode
  // drags it about like a machine, because it carries the same data-kit hook (T8 3.2).
  for (const item of reservedItems(state)) {
    drawables.push({
      depth: depthKey(item.anchorX, item.anchorY) - 0.01,
      svg: reservedOutline(item),
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
        // Joiners have a sheet tonight; everybody else falls back to the capsule until his own
        // one is delivered (CLAUDE.md T9 3.13).
        { role: worker.role, station: worker.station, options: characterOptions },
      ),
    );
  }
  if (ownerIsAvailable(state)) {
    const bench = state.equipment.find((item) => item.specId === 'workbench');
    // At his bench's own front edge, taken from the class's footprint inside its working zone.
    const ownerBench = bench ? frontOf(bench, 0) : { x: 2, y: 5 };
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
          files,
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
  // Everything from here on is the live part: it changes with the state, minute by minute.
  const live: string[] = [];

  // The name on the rear wall, lettered into the wall plane so it leans with the blockwork
  // (CLAUDE.md T6 3.2). It is live text and not part of the shell: the company the player typed
  // in is state, and a new game has a new one.
  if (painted) {
    const fitted = fitName(state.companyName, HALL_NAME_WIDTH);
    if (fitted.text !== '') {
      live.push(
        paintedText(
          tileToScreen(HALL_NAME_WALL.x, 0, HALL_NAME_WALL.z),
          fitted.text,
          'painted-text hall-company',
          fitted.fontSize,
        ),
      );
    }
    // The clock the hall did not have, beside the name and in the office's own amber digits
    // (PIOTR, 13.09; CLAUDE.md T9 3.5). Live text, so the minute is written into the text node
    // that already holds it and the element itself is never made again (CLAUDE.md T9 3.8).
    live.push(
      paintedText(
        tileToScreen(HALL_CLOCK_WALL.x, 0, HALL_CLOCK_WALL.z),
        formatTime(state.clock.minute),
        'painted-text hall-clock',
        HALL_CLOCK_SIZE,
      ),
    );
  }

  live.push(drawables.map((drawable) => drawable.svg).join(''));

  // The ghost footprint of whatever is being dragged, on top of everything else.
  if (ghost !== null) {
    const colour = ghost.ok ? 'var(--good)' : 'var(--bad)';
    live.push(
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
  // The shell stands until the frame, the painting or the grid changes. Nothing else in the hall
  // can make it wrong, so the pictures are loaded once and never again.
  const key = [
    'hall',
    viewBox,
    options.setup === true ? 'setup' : 'run',
    HALL_LAYERS.map((layer) => layerUrl(layer.key) ?? '').join(','),
  ].join('|');
  return {
    key,
    shell: () =>
      `<svg class="hall-view" data-scene="${key}" viewBox="${viewBox}" ` +
      `width="${size.width}" height="${size.height}" ` +
      `xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Workshop hall">` +
      // Everything the player sees hangs off one group, so the camera is one attribute and no
      // part of the hall is laid out again when it moves. It leaves here at the fit; the page
      // writes the camera it is holding onto the group (CLAUDE.md T6 3.3).
      `<g class="hall-scene" data-camera="1" transform="${cameraTransform(HALL_CAMERA_FIT)}">` +
      `${parts.join('')}${LIVE_SLOT}</g></svg>`,
    live: live.join(''),
    notes:
      `<p class="view-note">${escapeText(stateLine)}</p>` +
      `${extractionLine}${brokenLine}${serviceLine}${gateLine}${lowStock}`,
  };
}

/** The hall as one string. The app builds it from the pieces instead, so the painting survives a
 *  render; everything that only wants to read the markup comes through here. */
export function renderHall(state: GameState, options: HallOptions = {}): string {
  return sceneHtml(hallScene(state, options));
}

function lineAttrs(x1: number, y1: number, x2: number, y2: number): string {
  const from = centreOf(x1, y1, 0, 0);
  const to = centreOf(x2, y2, 0, 0);
  return `x1="${Math.round(from.x)}" y1="${Math.round(from.y)}" x2="${Math.round(to.x)}" y2="${Math.round(to.y)}"`;
}

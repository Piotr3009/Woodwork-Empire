// The hall, drawn from the state as flat placeholder boxes. No memory of its own: give it a state
// and it hands back an SVG string (CLAUDE.md 10.3).

import {
  DUCT_HEIGHT,
  DUCT_SYSTEMS,
  FINISHED_GOODS_LAYOUT,
  GATE_CROWD_LIMIT,
  GATE_LAYOUT,
  PALLET_LAYOUT,
  CLASS_BADGE,
  ROOM_DOOR,
  ROOM_LAYOUT,
  WELFARE_IN_THE_CANTEEN,
  YARD_WIDTH_CELLS,
  roomDoorCell,
} from '../engine/constants';
import {
  bagStore,
  bagStoreLine,
  brokenMachines,
  dustBand,
  findSpec,
  gateIsCrowded,
  hasExtraction,
  hasGate,
  machineIsOut,
  machinesDueService,
  machinesInService,
  sawdustPiles,
  serviceIsDue,
} from '../engine/machines';
import {
  footprintOrigin,
  isConnected,
  pipeRunFor,
  portCell,
  tileKeysFor,
  wantsExtraction,
} from '../engine/pipes';
import { jobsAtGate } from '../engine/jobs';
import { orderName, reservedItems, shoppingList } from '../engine/orders';
import {
  OWNER,
  BENCH,
  isSold,
  itemFootprint,
  itemStandsInTheHall,
  itemZone,
  sheetCapacityOf,
} from '../engine/machines';
import { machineInUse } from '../engine/game';
import { rackCapacity } from '../engine/materials';
import {
  STATION_BENCH,
  STATION_GATE,
  STATION_IDLE,
  STATION_NO_BENCH,
  STATION_OFFICE,
  STATION_PHONE,
  STATION_RACK,
  type Facing as StationFacing,
  facingAt,
  facingAtPallet,
  facingTowards,
  itemAtCell,
  palletCell,
  benchCellsAt,
  queueCellsAt,
  standingCell,
  stationMachine,
  stationPlaceAt,
  stationSecondAt,
  stationWaitingFor,
} from '../engine/stations';
import { gateCollarArt, pipeTile, portRing } from './pipes';
import { ownerIsAvailable } from '../engine/owner';
import { homeCellOf } from '../engine/staff';
import { plural } from '../engine/text';
import type { RoomId } from '../engine/constants';
import type {
  Equipment,
  EquipmentSpec,
  GameState,
  OnOrderItem,
  TaskInstance,
  Worker,
} from '../engine/types';
import {
  type BoxFaces,
  type Point,
  type Polygon,
  TILE_RISE,
  TILE_WIDTH,
  blockSilhouette,
  boxPolygons,
  centreOf,
  depthKey,
  footprintPolygon,
  gridBounds,
  pointInPolygon,
  tileToScreen,
} from './iso';
import { formatCalendarDay, formatTime } from '../engine/clock';
import { compressorIsLow, extractionCheck, hallAirCheck } from '../engine/media';
import { type CharacterOptions, animationForStation, characterArt } from './characters';
import {
  SPRITE_SCALE,
  contactShadow,
  mirrorNeeded,
  pickSprite,
  placeholderKindFor,
  spriteBox,
  spriteFiles,
  spriteImage,
  spriteUrl,
} from './sprites';
import { placeholder } from './placeholder';
import { cncOptions } from '../engine/stages';
import { jobStage } from '../engine/jobs';
import { cleanerAtWork } from '../engine/tasks';
import type { StageId } from '../engine/types';
import { figureIsThroughADoor, takeDoorGoings } from './doors';

/** What the hall can be heard doing (CLAUDE.md T19 2.10, T20 2.13). The render layer owns the
 *  list, because the render layer is what reports the events; `src/ui/sound.ts` plays what is on
 *  it and reads the names from here, so nothing in `src/render` imports the ui layer. */
export type HallLoopName = 'tableSaw' | 'extractor' | 'sander' | 'sprayBooth';
export type HallOneShotName = 'door' | 'hammer' | 'drill';

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

/** The token under a machine's name when it has no pipe to the extraction: the words in the
 *  game's red, one line below the name (CLAUDE.md T16 2.3). */
export function notConnectedLabel(stands: {
  x: number;
  y: number;
  width: number;
  depth: number;
  height: number;
}): string {
  const at = centreOf(stands.x, stands.y, stands.width, stands.depth, stands.height);
  return (
    `<text x="${round(at.x)}" y="${round(at.y + 12)}" text-anchor="middle" ` +
    'class="iso-label not-connected" data-not-connected="1">not connected</text>'
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
  /** Stood at ninety degrees to the walls: the second orientation the art side delivered, or the
   *  picture mirrored about its anchor (CLAUDE.md T10 3.8). */
  rotated?: boolean;
  /** What the art side has delivered; the manifest when not given, so a test can draw the hall
   *  as if a file had not landed yet (the placeholders are for exactly that). */
  files?: readonly string[];
}): string {
  const shadow = contactShadow(art.x, art.y, art.width, art.depth);
  const rotated = art.rotated === true;
  const files = art.files ?? spriteFiles();
  const url = art.files === undefined
    ? spriteUrl(art.spriteKey, art.tier, rotated)
    : pickSprite(art.files, art.spriteKey, art.tier, rotated);
  if (url !== null) {
    const at = spriteBox(art.x, art.y, art.width, art.depth, art.height);
    // Mirrored about the anchor, which is the corner the picture is placed by, so the object
    // stays on its own tile while it faces the other way (CLAUDE.md T10 3.8).
    const anchor = tileToScreen(art.x + art.width, art.y + art.depth);
    const mirror = mirrorNeeded(files, art.spriteKey, art.tier, rotated)
      ? ` transform="translate(${round(anchor.x * 2)},0) scale(-1, 1)"`
      : '';
    return shadow + spriteImage(url, at, mirror.trim());
  }
  // A Turn 13 picture the art side has not painted yet is drawn by the one placeholder helper,
  // in the hall's 2:1 dimetric, where its file will go (CLAUDE.md T13 1, 3.13, 3.21).
  const kind = placeholderKindFor(art.spriteKey, art.tier);
  if (kind !== null) {
    const at = spriteBox(art.x, art.y, art.width, art.depth, art.height);
    return (
      shadow +
      `<g class="placeholder-art" transform="translate(${round(at.x)},${round(at.y)})">` +
      placeholder(kind, { width: at.width, height: at.height }, { dimetric: true }) +
      '</g>' +
      label(centreOf(art.x, art.y, art.width, art.depth, art.height), art.label)
    );
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
// The central system (PIOTR, CLAUDE.md T10 3.4; T16 2.3). The plant itself stands outside on the
// apron by the shutter, like the van; what the player sees in the hall is one run along the rear
// wall and a drop to every machine that wants extraction, drawn by the same vector helper as the
// pipes the game routes, because with a central system every machine is connected and that is
// what the drawing has to say.
// ---------------------------------------------------------------------------

/** The central system the hall runs on, or null. The flexi one wins where both are owned: it is
 *  the dearer of the two and it is the one whose reconnection is free (CLAUDE.md T4 3.5). */
export function ductSystemOf(state: GameState): string | null {
  for (const specId of DUCT_SYSTEMS.slice().reverse()) {
    if (state.equipment.some((item) => item.specId === specId && !isSold(item))) return specId;
  }
  return null;
}

/** The door in the office block's face, as a control: it walks into the office, the same as the
 *  top bar's Office button (PIOTR, 15.09; CLAUDE.md T14 2.3). The face is the one the hall is on,
 *  and the door is centred in it, which is the same box the room's own lettering is measured
 *  from. */
export function officeDoor(room: {
  x: number;
  y: number;
  width: number;
  depth: number;
}): string {
  return roomDoor(room, 'office');
}


/** The dark hole in the face, behind the leaf: the door opening itself. */
export function doorOpening(room: { x: number; y: number; width: number; depth: number }): Polygon {
  const door = roomDoorBox(room);
  const face = room.y + room.depth;
  const from = room.x + door.from;
  const to = from + door.across;
  return [
    tileToScreen(from, face, door.bottom),
    tileToScreen(to, face, door.bottom),
    tileToScreen(to, face, door.top),
    tileToScreen(from, face, door.top),
  ];
}

/** The leaf, closed, flat in the face of the room, hung on the left jamb (docs/art/SPRITES.md
 *  9.3). A door is drawn closed and always closed: the swing of Turn 19 is gone, and the two open
 *  frames and the angle that made them with it (PIOTR, 18.09; CLAUDE.md T20 2.12). A man does not
 *  stand in a doorway any more, he goes through it, which is what `figureIsThroughADoor` says of
 *  him and why nothing has to be swung out of his way. */
export function doorLeaf(room: { x: number; y: number; width: number; depth: number }): Polygon {
  const door = roomDoorBox(room);
  const face = room.y + room.depth;
  const hinge = { x: room.x + door.from, y: face };
  const free = { x: hinge.x + door.across, y: face };
  return [
    tileToScreen(hinge.x, hinge.y, door.bottom),
    tileToScreen(free.x, free.y, door.bottom),
    tileToScreen(free.x, free.y, door.top),
    tileToScreen(hinge.x, hinge.y, door.top),
  ];
}

/** A room's door: the dark opening, the one closed leaf, and, for the office, the control that
 *  walks into it. There is no open state and no swing: a door is drawn closed and a man goes
 *  through it (PIOTR, 18.09; CLAUDE.md T20 2.12).
 *
 *  Only the office carries `data-door`, because only the office door is a control: the canteen
 *  door is a door and the block behind it is still the way to the canteen's own note, and giving
 *  it the control's hook would have taken that click away from it. */
export function roomDoor(
  room: { x: number; y: number; width: number; depth: number },
  id: string,
): string {
  const leaf = `<polygon class="door-leaf" data-state="closed" points="${points(doorLeaf(room))}" />`;
  const opening = points(doorOpening(room));
  if (id !== 'office') {
    return (
      `<g data-door-room="${id}" data-door-state="closed" class="${id}-door">` +
      `<polygon points="${opening}" class="door-opening" />${leaf}</g>`
    );
  }
  return (
    `<g data-door="office" data-door-room="office" data-door-state="closed" ` +
    'class="clickable office-door">' +
    '<title>To the office</title>' +
    `<polygon points="${opening}" class="door-opening" />${leaf}` +
    `<polygon points="${opening}" class="door-hit" />` +
    '</g>'
  );
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

/** The whole hall on the screen: what the Fit button comes back to. */
export const HALL_CAMERA_FIT: HallCamera = { scale: 1, x: 0, y: 0 };
/** How far in the hall opens: a fifth past the fit, so the machines read at a glance (PIOTR,
 *  13.09; CLAUDE.md T10 3.9). The wheel still goes out to the fit and in to four times it. */
export const HALL_ZOOM_START = 1.2;
export const HALL_CAMERA_START: HallCamera = { scale: HALL_ZOOM_START, x: 0, y: 0 };
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

/** Where the hall opens: a fifth past the fit, with the middle of it in the middle of the frame
 *  (PIOTR, 13.09; CLAUDE.md T10 3.9). */
export function hallStartCamera(frame: Frame): HallCamera {
  return zoomTo(
    frame,
    { x: frame.x + frame.width / 2, y: frame.y + frame.height / 2 },
    HALL_ZOOM_START,
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
  // The one arithmetic, shared with the pipe that drops onto the same footprint (T13 3.19).
  return footprintOrigin(item);
}

// ---------------------------------------------------------------------------
// The pipe layer (CLAUDE.md T13 3.11, 3.19): the runs the game routed and the gate collars on
// their drops, drawn above the equipment at the height of the ducting. It occupies no cell and
// blocks nothing under it.
// ---------------------------------------------------------------------------

/** One cell of the pipe layer: the delivered picture where the art side has painted the key,
 *  placed by the cell's anchor at the ducting's height, and the vector helper's own drawing of
 *  that kind where it has not (CLAUDE.md T16 2.3). Nothing green, nothing placeholder. */
export function pipeCellArt(
  kind: string,
  cell: { x: number; y: number },
  files: readonly string[],
  scale = 1,
  landsAt = 0,
): string {
  const url = pickSprite(files, kind);
  if (url !== null) {
    const width = TILE_WIDTH * scale;
    // A tile is three thirds tall: the diamond is the middle third, so a cell wide picture is a
    // cell and a half high and its diamond is exactly a cell (docs/art/SPRITES.md 1).
    const height = width * 1.5;
    const centre = centreOf(cell.x, cell.y, 1, 1, DUCT_HEIGHT);
    return spriteImage(url, { x: centre.x - width / 2, y: centre.y - height / 2, width, height });
  }
  return kind === 'gate.collar' ? gateCollarArt(cell) : pipeTile(kind, cell, landsAt);
}

/** How much smaller than a cell the collar is drawn [TUNE]. */
const GATE_COLLAR_SCALE = 0.5;

/** The automatic gate on a machine's drop: a short collar on the drop cell (CLAUDE.md T13 3.11). */
export function gateCollar(item: Equipment, files: readonly string[]): string {
  return (
    `<g class="gate-collar" data-gate="${item.id}">` +
    pipeCellArt('gate.collar', portCell(item), files, GATE_COLLAR_SCALE) +
    '</g>'
  );
}

/** Every gate collar in the hall, on the drop of every gated machine standing on the floor. */
export function gateCollars(state: GameState, files: readonly string[]): string {
  return state.equipment
    .filter(
      (item) =>
        !isSold(item) &&
        itemStandsInTheHall(item) &&
        item.anchorX < state.unit.widthCells &&
        hasGate(state, item),
    )
    .map((item) => gateCollar(item, files))
    .join('');
}

/** One run of pipe, tile by tile in the order it was routed, as a group the page can find by
 *  the machine it serves. A connected machine that the air rule says is not pulled hard enough
 *  wears a thin red outline on its run (CLAUDE.md T13 3.19): the hall is short this minute and
 *  this machine is one of the ones running in it. */
export function pipeRunArt(
  state: GameState,
  run: { id: string; equipmentId: string; tiles: ReadonlyArray<{ x: number; y: number; key: string }> },
  files: readonly string[],
  short: boolean,
): string {
  const machine = state.equipment.find((item) => item.id === run.equipmentId);
  const running = machine !== undefined && machine.takenBy !== null;
  // The drop lands on the machine's own top face, where its port is, and not on the floor of the
  // cell it stands on (PIOTR, 16.09; CLAUDE.md T17 2.7).
  const lands = machine === undefined ? 0 : footprintIn(machine).height;
  const tiles = run.tiles
    .map((tile) => pipeCellArt(tile.key, tile, files, 1, tile.key === 'pipe.drop' ? lands : 0))
    .join('');
  return (
    `<g class="pipe${short && running ? ' pipe-short' : ''}" data-pipe="${escapeText(run.id)}" ` +
    `data-pipe-for="${escapeText(run.equipmentId)}">${tiles}</g>`
  );
}

/** Every run over the floor, in the order they were routed. */
export function pipeRuns(state: GameState, files: readonly string[]): string {
  const short = extractionCheck(state).short;
  return state.pipes.map((run) => pipeRunArt(state, run, files, short)).join('');
}

/** The machines standing on the floor that want a pipe at all. */
function machinesWantingExtraction(state: GameState): Equipment[] {
  return state.equipment.filter(
    (item) =>
      !isSold(item) &&
      itemStandsInTheHall(item) &&
      item.anchorX < state.unit.widthCells &&
      wantsExtraction(item),
  );
}

/** What a central system draws: one run along the rear wall at the pipes' height, the width of
 *  the hall, and a run up from every machine's port to it ending in a tee, so every machine is
 *  seen to be connected (CLAUDE.md T16 2.3). Drawn by the same helper as every routed run. */
export function centralRunArt(state: GameState, files: readonly string[]): string {
  const system = ductSystemOf(state);
  if (system === null) return '';
  const tiles: string[] = [];
  for (let x = 0; x < state.unit.widthCells; x += 1) {
    tiles.push(pipeCellArt('pipe.ew', { x, y: 0 }, files));
  }
  const drops: string[] = [];
  for (const item of machinesWantingExtraction(state)) {
    const port = portCell(item);
    const cells: Array<{ x: number; y: number }> = [];
    for (let y = port.y; y >= 0; y -= 1) cells.push({ x: port.x, y });
    // The port is the drop, the wall the tee, and every cell between a straight length: the
    // same key rule the routed runs use (src/engine/pipes.ts).
    const keyed = cells.length === 1 ? [{ x: port.x, y: port.y, key: 'pipe.drop' }] : tileKeysFor(cells, 'tee');
    const lands = footprintIn(item).height;
    drops.push(
      `<g class="pipe central-drop" data-central-for="${escapeText(item.id)}">` +
        keyed
          .map((tile) => pipeCellArt(tile.key, tile, files, 1, tile.key === 'pipe.drop' ? lands : 0))
          .join('') +
        '</g>',
    );
  }
  return `<g class="pipe central-run" data-ducts="${system}">${tiles.join('')}</g>${drops.join('')}`;
}

/** The red ring on the port of every machine that wants a pipe and has none, and no central
 *  system to make one unnecessary (CLAUDE.md T16 2.3). */
export function portRings(state: GameState): string {
  if (ductSystemOf(state) !== null) return '';
  return machinesWantingExtraction(state)
    .filter((item) => pipeRunFor(state, item.id) === null)
    .map((item) => portRing(portCell(item), item.id))
    .join('');
}

/** The whole layer: the central system's run where there is one, the runs the game routed, the
 *  collars over their drops, and the red ring on every port without a pipe. */
export function pipeLayer(state: GameState, files: readonly string[]): string {
  return (
    `<g class="pipe-layer">${centralRunArt(state, files)}${pipeRuns(state, files)}` +
    `${gateCollars(state, files)}${portRings(state)}</g>`
  );
}

export function machineFx(state: GameState, item: Equipment, spec: EquipmentSpec): MachineFx {
  // The top of the object, where a lamp or a blade would sit on the real thing.
  const stands = footprintIn(item);
  const point = centreOf(stands.x, stands.y, stands.width, stands.depth, stands.height);
  // An amber lamp on a compressor that is short of litres, which is what the player sees before
  // he reads the line under the hall (PIOTR, CLAUDE.md T10 3.2).
  if (item.specId === 'compressor') {
    if (item.broken) return { className: '', svg: lamp(point, 'red') };
    return compressorIsLow(hallAirCheck(state), item.id)
      ? { className: '', svg: lamp(point, 'amber') }
      : NO_FX;
  }
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

/** How tall a seat or a locker is drawn on the canteen roof, in metres, and how far its box is
 *  inset in its cell [TUNE]: small enough to read as a plan of what is in there and not as kit
 *  standing on the roof (CLAUDE.md T17 2.2). */
const CANTEEN_KIT_HEIGHT = 0.3;
const CANTEEN_KIT_INSET = 0.15;

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
  // One figure for the piles that are drawn and for the dirt the helper answers, so he picks up a
  // broom for the dirt the player is looking at (CLAUDE.md T20 2.8).
  const piles = sawdustPiles(state.dust);
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

/** Where a figure stands and which way he faces: a cell and a facing. */
export interface Standing {
  x: number;
  y: number;
  facing: StationFacing;
}

/** The standing cell a station puts a figure on, and the way he faces there: the station table's
 *  cell at the item, on its free side, facing the item (CLAUDE.md T16 2.1). Anything the workshop
 *  has not bought falls back to the middle of the floor (CLAUDE.md T2 3.3). */
export function stationCell(
  state: GameState,
  station: string,
  bench: { x: number; y: number },
): Standing {
  // The third man and beyond, at a place of his own along the same side of the same item: the
  // engine counts the places and the renderer knows where they are, so twenty men on one job do
  // not stand on one tile (PIOTR, 17.09; CLAUDE.md T19 2.5).
  const placeAt = stationPlaceAt(station);
  if (placeAt !== null) {
    const item = state.equipment.find((entry) => entry.id === placeAt.id && !isSold(entry));
    if (item) {
      const cells =
        item.specId === BENCH
          ? benchCellsAt(state, item, placeAt.place + 1)
          : queueCellsAt(state, item, placeAt.place + 1);
      const cell = cells[placeAt.place] ?? standingCell(state, item, 'operator');
      return { ...cell, facing: facingAt(cell, item) };
    }
  }
  // The second man of a job stands at the first man's own bench, in its second place: two men on
  // one bench, one in front of it and one behind it (CLAUDE.md T17 2.10).
  const secondAt = stationSecondAt(station);
  if (secondAt !== null) {
    const item = state.equipment.find((entry) => entry.id === secondAt && !isSold(entry));
    if (item) {
      const cell = standingCell(state, item, 'second');
      return { ...cell, facing: facingAt(cell, item) };
    }
  }
  // A man waiting for a machine stands at its waiting cell, which is what waiting at one looks
  // like (T7 3.1; T16 2.1).
  const waitingFor = stationWaitingFor(station);
  const specId = stationMachine(station) ?? waitingFor;
  if (specId !== null) {
    const item = state.equipment.find(
      (entry) => entry.specId === specId && !isSold(entry) && itemStandsInTheHall(entry),
    );
    if (item) {
      const cell = standingCell(state, item, waitingFor === null ? 'operator' : 'waiting');
      return { ...cell, facing: facingAt(cell, item) };
    }
  }
  if (station === STATION_RACK) {
    const rack = state.equipment.find(
      (entry) => sheetCapacityOf(entry) > 0 && !isSold(entry) && itemStandsInTheHall(entry),
    );
    if (rack) {
      const cell = standingCell(state, rack, 'operator');
      return { ...cell, facing: facingAt(cell, rack) };
    }
  }
  if (station === STATION_GATE) {
    // In front of the pallet on the hall side, facing it, never outside (PIOTR, 16.09).
    const cell = palletCell(state);
    return { ...cell, facing: facingAtPallet(cell) };
  }
  // The phone is on the desk: he is in the office for a call like any other desk job (T11 3.11).
  if (station === STATION_OFFICE || station === STATION_PHONE) {
    const cell = roomDoorCell('office');
    return { ...cell, facing: facingTowards(cell, { x: cell.x, y: cell.y - 1 }) };
  }
  if (station === STATION_IDLE || station === STATION_NO_BENCH) {
    const cell = roomDoorCell('canteen');
    return { ...cell, facing: facingTowards(cell, { x: cell.x - 1, y: cell.y + 1 }) };
  }
  // A man at his bench stands AT it and not on it (PIOTR, 17.09; CLAUDE.md T19 2.4). The bench
  // station names no bench, because every joiner has one, and the cell the engine keeps for him is
  // his bench's own anchor cell, which is a cell the bench stands on: this fall-through used to put
  // his feet on the bench top, and the depth order painted him over it. The helper's own cell is
  // the fan's anchor and was the same bug. Whatever item his cell belongs to, the station table
  // says where to stand at it; a cell that belongs to nothing is the middle of the floor as before.
  const under = itemAtCell(state, bench);
  if (under !== null) {
    const cell = standingCell(state, under, 'operator');
    return { ...cell, facing: facingAt(cell, under) };
  }
  return { ...bench, facing: facingTowards(bench, { x: bench.x, y: bench.y - 1 }) };
}

/** The cell the owner falls back to when his station is nothing in particular: his bench's own
 *  standing cell, or the middle of the floor while the workshop has no bench (CLAUDE.md T16 2.1). */
export function ownerBenchCell(state: GameState): { x: number; y: number } {
  const bench = state.equipment.find(
    (item) => item.specId === 'workbench' && !isSold(item) && itemStandsInTheHall(item),
  );
  return bench ? standingCell(state, bench, 'operator') : { x: 2, y: 5 };
}

/** Every cell a man is standing on this minute, the owner and the crew who are in today. A door
 *  reads it to know whether somebody is in it (CLAUDE.md T19 2.3); it is the same question the
 *  figure loop asks, through the same `stationCell`, so the two can never disagree. */
export function standingCellsNow(state: GameState): Array<{ x: number; y: number }> {
  const cells: Array<{ x: number; y: number }> = [];
  for (const worker of state.workers) {
    if (worker.startDay > state.clock.day) continue;
    const cell = stationCell(state, worker.station, homeCellOf(state, worker));
    cells.push({ x: cell.x, y: cell.y });
  }
  if (ownerIsAvailable(state)) {
    const cell = stationCell(state, state.owner.station, ownerBenchCell(state));
    cells.push({ x: cell.x, y: cell.y });
  }
  return cells;
}

/** Whether this room's door has somebody standing in it, which is what opens it and what keeps it
 *  open (CLAUDE.md T19 2.3). The owner in the office is in its doorway, and a man at the canteen
 *  for his tea, or idle, or with no bench to work at, is in the canteen's. */
export function doorIsUsed(state: GameState, room: RoomId): boolean {
  const door = roomDoorCell(room);
  return standingCellsNow(state).some((cell) => cell.x === door.x && cell.y === door.y);
}

/** The line under a figure's name: where he is standing, in words. */
function stationLabel(station: string): string {
  const specId = stationMachine(station);
  if (specId !== null) return (findSpec(specId)?.name ?? specId).toLowerCase();
  const waiting = stationWaitingFor(station);
  if (waiting !== null) {
    return `waiting for ${(findSpec(waiting)?.name ?? waiting).toLowerCase()}`;
  }
  if (stationSecondAt(station) !== null) return 'the bench, second place';
  if (stationPlaceAt(station) !== null) return 'alongside, on the next place';
  if (station === STATION_RACK) return 'the rack';
  if (station === STATION_GATE) return 'the gate';
  if (station === STATION_OFFICE) return 'the office';
  if (station === STATION_PHONE) return 'the phone';
  if (station === STATION_BENCH) return 'the bench';
  if (station === STATION_NO_BENCH) return 'no bench';
  return 'waiting';
}

/** How tall the placeholder man stands, in metres: the height the character sheets themselves
 *  declare for a man (metresPerCell.height in public/sprites/characters.json), so the drawn
 *  figure and the placeholder are the same man (CLAUDE.md T17 2.1). */
const CAPSULE_HEIGHT_M = 1.8;

/** The placeholder figure, in fractions of his own height [TUNE]: head, trunk, legs and feet,
 *  in the proportions of a man on a 2:1 floor. Nothing here is a sprite: it is the one shape a
 *  role with no character sheet is drawn as, and it goes the day his sheet lands. */
const CAPSULE_PARTS = {
  headRadius: 0.1,
  headCentre: 0.88,
  shoulders: 0.34,
  trunkTop: 0.78,
  trunkBottom: 0.42,
  legWidth: 0.11,
  legGap: 0.04,
  footLength: 0.16,
  footHeight: 0.05,
};

/** The man a role with no character sheet is drawn as, until the art side delivers one
 *  (CLAUDE.md T17 2.1). He was a 12 by 26 rounded rect, a third of the height of a delivered
 *  sheet and a fifth of its width: beside a joiner he read as a stroke on the floor, which is
 *  what Piotr saw of his yellow shirted helper. He is sized off the projection instead, at
 *  TILE_RISE pixels to the metre of a 1.8 m man, and given a head, a trunk, legs and feet so he
 *  reads as a person. */
function capsuleBody(fill: string): string {
  const height = CAPSULE_HEIGHT_M * TILE_RISE;
  // Scene pixels to a tenth: the shapes are small, and a long tail of decimals is noise in the
  // page and in the tests that read it.
  const px = (fraction: number): number => Math.round(fraction * height * 10) / 10;
  const at = (value: number): number => Math.round(value * 10) / 10;
  const trunkWidth = px(CAPSULE_PARTS.shoulders);
  const legWidth = px(CAPSULE_PARTS.legWidth);
  const legGap = px(CAPSULE_PARTS.legGap);
  const foot = px(CAPSULE_PARTS.footLength);
  const leg = (side: number): string =>
    `<rect x="${at(side > 0 ? legGap / 2 : -(legGap / 2 + legWidth))}" ` +
    `y="${-px(CAPSULE_PARTS.trunkBottom)}" width="${legWidth}" ` +
    `height="${at(px(CAPSULE_PARTS.trunkBottom) - px(CAPSULE_PARTS.footHeight))}" ` +
    `rx="${at(legWidth / 2)}" fill="${fill}" />`;
  const shoe = (side: number): string =>
    `<ellipse cx="${at(side * (legGap / 2 + legWidth / 2))}" ` +
    `cy="${-px(CAPSULE_PARTS.footHeight)}" rx="${at(foot / 2)}" ` +
    `ry="${px(CAPSULE_PARTS.footHeight)}" fill="${fill}" opacity="0.7" />`;
  return (
    leg(-1) +
    leg(1) +
    shoe(-1) +
    shoe(1) +
    `<rect x="${at(-trunkWidth / 2)}" y="${-px(CAPSULE_PARTS.trunkTop)}" ` +
    `width="${trunkWidth}" ` +
    `height="${at(px(CAPSULE_PARTS.trunkTop) - px(CAPSULE_PARTS.trunkBottom))}" ` +
    `rx="${at(trunkWidth / 3)}" fill="${fill}" />` +
    `<circle cx="0" cy="${-px(CAPSULE_PARTS.headCentre)}" ` +
    `r="${px(CAPSULE_PARTS.headRadius)}" fill="${fill}" />`
  );
}

/** A third of what Turn 17 drew. The figure over the rack was the size of a shop sign and sat on
 *  top of the hall; at a third of its height and its stroke it is a label on a rack, in the same
 *  place (PIOTR, 17.09; CLAUDE.md T18 2.3) [TUNE: the divisor]. */
const RACK_COUNT_SHRINK = 3;

/** How the number on the rack is set out [TUNE]: how far up the front face the plate sits, how
 *  high the plate is in scene pixels, how wide a digit is on it, the padding each side, and the
 *  stroke of the type. Turn 17's own figures over `RACK_COUNT_SHRINK`, so the source says what
 *  was shrunk and by how much. The type is written onto the text itself and not left to the
 *  stylesheet, because a third of the hand is this figure and nothing else. */
const RACK_COUNT = {
  up: 0.55,
  height: 26 / RACK_COUNT_SHRINK,
  digit: 15 / RACK_COUNT_SHRINK,
  pad: 9 / RACK_COUNT_SHRINK,
  // 26 px is `--fs-hand`, which is what `.rack-count` wore before tonight.
  type: 26 / RACK_COUNT_SHRINK,
};

/** The sheets in the rack, over its own front face, big, in the hand, on the class's colour
 *  (PIOTR, 17.09; CLAUDE.md T17 2.8). The count used to be glued into the object's name, and
 *  `objectArt` throws the name away whenever a sprite file exists, so in the real game the number
 *  was invisible: the rack draws it itself now, and it moves with the stock. */
function rackCount(item: Equipment, sheets: number): string {
  const stands = footprintIn(item);
  const at = centreOf(
    stands.x,
    stands.y,
    stands.width,
    stands.depth,
    stands.height * RACK_COUNT.up,
  );
  const text = String(Math.max(0, Math.round(sheets)));
  const width = RACK_COUNT.pad * 2 + text.length * RACK_COUNT.digit;
  const colour = CLASS_BADGE[item.variantId]?.colour ?? 'var(--kit-stock)';
  return (
    `<rect class="rack-count-plate" x="${round(at.x - width / 2)}" ` +
    `y="${round(at.y - RACK_COUNT.height / 2)}" width="${round(width)}" ` +
    `height="${round(RACK_COUNT.height)}" ` +
    `rx="${round(RACK_COUNT.height / 3)}" fill="${colour}" />` +
    `<text class="rack-count" x="${round(at.x)}" font-size="${round(RACK_COUNT.type)}" ` +
    `y="${round(at.y + RACK_COUNT.height / 3)}">${escapeText(text)}</text>`
  );
}

/** A worker is his sheet if the art side has delivered one and a capsule if it has not, with his
 *  name under him either way. The owner is the green one. The group carries its standing cell,
 *  its station and the way he faces there, and the walker in the renderer carries him to that
 *  cell along the network in real time (CLAUDE.md T16 2.2): the transform written here is where
 *  he stands when the view is built from nothing. */
function figure(
  key: string,
  tile: Standing,
  name: string,
  isOwner: boolean,
  extra: string,
  art: { role: string; station: string; options: CharacterOptions } | null = null,
  loop = '',
): Drawable {
  const feet = centreOf(tile.x, tile.y, 1, 1);
  const fill = isOwner ? 'var(--owner)' : 'var(--worker)';
  // The sheet if the art side has delivered one for this role, and the capsule the game has
  // always drawn if it has not (CLAUDE.md T9 3.13).
  const rest = art === null ? 'idle' : animationForStation(art.station);
  const drawn =
    art === null ? null : characterArt(art.role, rest, tile.facing, art.options);
  const body = drawn ?? capsuleBody(fill);
  return {
    depth: depthKey(tile.x, tile.y) + 0.2,
    svg:
      `<g class="figure" data-figure="${key}" ` +
      `transform="translate(${Math.round(feet.x)},${Math.round(feet.y)})" ` +
      `data-cell="${tile.x},${tile.y}" data-station="${escapeText(art?.station ?? '')}" ` +
      `data-facing-rest="${tile.facing}"${loop === '' ? '' : ` data-loop="${loop}"`} ` +
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

/** The key the pallet of sheets is drawn from once the art side paints it; until then the
 *  placeholder helper draws it (CLAUDE.md T13 3.21; docs/art/REQUESTS-T13.md 4). */
export const PALLET_SPRITE = 'pallet';
/** The placeholder kind of the pallet, a pallet of sheets one metre each way. */
export const PALLET_PLACEHOLDER = 'pallet.sheets';
/** The pallet stands where the lorry stood: inside the shutter, on the lane; the constant is the
 *  engine's, because the walking network keeps the man off it (CLAUDE.md T16 2.2). */
export { PALLET_LAYOUT };

/** The pallet at the gate: the delivered file where there is one, the placeholder in the hall's
 *  dimetric where there is not, with the shadow and the name every object has. */
export function palletArt(files: readonly string[], name: string): string {
  const at = PALLET_LAYOUT;
  const shadow = contactShadow(at.x, at.y, at.width, at.depth);
  const url = pickSprite(files, PALLET_SPRITE);
  const box = spriteBox(at.x, at.y, at.width, at.depth, at.height);
  const picture =
    url !== null
      ? spriteImage(url, box)
      : `<g class="placeholder-art" transform="translate(${round(box.x)},${round(box.y)})">` +
        placeholder(PALLET_PLACEHOLDER, { width: box.width, height: box.height }, { dimetric: true }) +
        '</g>';
  return shadow + picture + label(centreOf(at.x, at.y, at.width, at.depth, at.height), name);
}

/** A machine off the lorry, on the apron by the gate: its own picture, unplaced, with the new
 *  tag, one cell further down the lane for each one waiting (CLAUDE.md T13 3.21). */
export function arrivedKit(item: OnOrderItem, index: number, files: readonly string[]): Drawable {
  const spec = findSpec(item.specId);
  const stands = itemFootprint(item);
  const x = GATE_LAYOUT.x;
  const y = GATE_LAYOUT.y + PALLET_LAYOUT.depth + index;
  const name = `${orderName(item)} (new)`;
  return {
    depth: depthKey(x, y),
    svg:
      `<g data-arrived="${item.id}" data-sprite="${escapeText(spec?.spriteKey ?? item.specId)}" ` +
      `data-tier="${escapeText(item.variantId)}" class="arrived">` +
      `<title>${escapeText(`${name}, at the gate, waiting to be unloaded`)}</title>` +
      objectArt({
        files,
        spriteKey: spec?.spriteKey ?? item.specId,
        tier: item.variantId,
        x,
        y,
        width: stands.width,
        depth: stands.depth,
        height: stands.height,
        fill: 'var(--kit-machine)',
        shade: 'var(--kit-machine-dark)',
        label: name,
      }) +
      '</g>',
  };
}

/** The outline of something bought and not here yet, on the cells held for it (T8 3.2). */
export function reservedOutline(item: OnOrderItem): string {
  const zone = itemZone(item);
  const stands = itemFootprint(item);
  const inset = {
    x: item.anchorX + Math.max(0, (zone.width - stands.width) / 2),
    y: item.anchorY + Math.max(0, (zone.depth - stands.depth) / 2),
  };
  const name = orderName(item);
  return (
    `<g data-kit="${item.id}" data-order="${item.id}" class="clickable reserved">` +
    `<title>${escapeText(`${name}, on order, due ${formatCalendarDay(item.dueDay)}`)}</title>` +
    `<polygon points="${points(footprintPolygon(item.anchorX, item.anchorY, zone.width, zone.depth))}" ` +
    'class="reserved-zone" />' +
    `<polygon points="${points(footprintPolygon(inset.x, inset.y, stands.width, stands.depth))}" ` +
    'class="reserved-floor" />' +
    label(
      centreOf(item.anchorX, item.anchorY, zone.width, zone.depth),
      `${name}, due ${formatCalendarDay(item.dueDay)}`,
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
  /** True while the next drop will stand it at ninety degrees to the walls (T10 3.8). */
  rotated?: boolean;
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
}

/** The empty element a shell leaves for its live part. */
export const LIVE_SLOT = '<g data-live="1"></g>';

/** The shell and the live part as one string, for a caller that just wants the markup. */
export function sceneHtml(scene: Scene): string {
  return scene.shell().replace(LIVE_SLOT, `<g data-live="1">${scene.live}</g>`);
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

  // Which doors have somebody standing in them this minute, read once for the whole scene.
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
    // The door is a drawable of its own, keyed off the cell it stands in, so it is painted with
    // the wall it is in and in front of what is behind it. The office one is also the control it
    // has always been: knock on it and the team is behind it (PIOTR, CLAUDE.md T10 3.6).
    if (room.id === 'office' || room.id === 'canteen') {
      const door = roomDoorCell(room.id);
      drawables.push({
        depth: depthKey(door.x, door.y) - 0.05,
        svg: roomDoor(room, room.id),
      });
    }
  }

  // The hall's bag store, read once: the full state is worn by the extractor the bags are on,
  // which is where the full bag used to be worn by the machine (CLAUDE.md T12 3.3).
  const store = bagStore(state);
  // Everything the player has bought, except the office furniture, which lives in the office
  // view, and the hand edgebander, which lives in a tool cabinet (CLAUDE.md T6 3.5).
  const welfare: Equipment[] = [];
  for (const item of state.equipment) {
    const spec = findSpec(item.specId);
    if (!spec || spec.category === 'furniture') continue;
    if (!itemStandsInTheHall(item)) continue;
    // The seats and the lockers are inside the canteen and are drawn on the block, with no
    // data-kit on them: there is no hall cell to drag them to (CLAUDE.md T17 2.2).
    if (WELFARE_IN_THE_CANTEEN.includes(item.specId)) {
      welfare.push(item);
      continue;
    }
    // What the picture stands on is the class's own footprint, centred inside the working zone
    // the class reserves (CLAUDE.md T7 3.3).
    const stands = footprintIn(item);
    const broken = item.broken;
    const fill = broken ? 'var(--stopped)' : CATEGORY_FILL[spec.category] ?? 'var(--kit-machine)';
    const shade = broken
      ? 'var(--stopped-dark)'
      : CATEGORY_SHADE[spec.category] ?? 'var(--kit-machine-dark)';
    const bagLine = item.specId === 'extractor' && store.full ? ' (bags full)' : '';
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
    // A machine that wants a pipe and has none is not served: the hall says so under its name, in
    // the game's red, and never writes "connected" anywhere (CLAUDE.md T16 2.3).
    const unconnected = wantsExtraction(item) && !isConnected(state, item);
    const name = `${spec.name}${bagLine}${serviceLine}${benchLine}${rackLine}`;
    // Pointing at the extractor reads the hall's store (CLAUDE.md T12 3.3).
    const tooltip =
      item.specId === 'extractor' && store.exists
        ? `${name}. ${bagStoreLine(store)}. ${spec.effect}`
        : `${name}${unconnected ? ', not connected' : ''}. ${spec.effect}`;
    const fx = machineFx(state, item, spec);
    drawables.push({
      depth: depthKey(item.anchorX, item.anchorY),
      svg:
        `<g data-kit="${item.id}"${spec.category === 'storage' ? ' data-rack="1"' : ''} ` +
        `data-sprite="${item.spriteKey}" data-tier="${item.variantId}" ` +
        `class="clickable${fx.className}">` +
        `<title>${escapeText(tooltip)}</title>` +
        objectArt({
          files,
          spriteKey: item.spriteKey,
          tier: item.variantId,
          rotated: item.rotated,
          x: stands.x,
          y: stands.y,
          width: stands.width,
          depth: stands.depth,
          height: stands.height,
          fill,
          shade,
          label: name,
        }) +
        (unconnected ? notConnectedLabel(stands) : '') +
        (sheetCapacityOf(item) > 0 ? rackCount(item, state.stock.sheets) : '') +
        fx.svg +
        '</g>',
    });
  }

  // The welfare kit, drawn where it stands: inside the canteen, on the block's own cells, lifted
  // to the roof so the player can see what is in there through it. No hall cell, no data-kit and
  // no drag: it is placed by count and that is all (PIOTR, 17.09; CLAUDE.md T17 2.2). The art
  // side has no seat and no locker yet, so this is the one placeholder helper's box
  // (docs/art/REQUESTS-T17.md 2).
  const canteen = ROOM_LAYOUT.find((room) => room.id === 'canteen');
  for (const item of welfare) {
    const spec = findSpec(item.specId);
    if (spec === null || spec === undefined) continue;
    const lift = canteen?.height ?? 0;
    const faces = boxPolygons(
      item.anchorX + CANTEEN_KIT_INSET,
      item.anchorY + CANTEEN_KIT_INSET,
      1 - CANTEEN_KIT_INSET * 2,
      1 - CANTEEN_KIT_INSET * 2,
      CANTEEN_KIT_HEIGHT,
    );
    drawables.push({
      depth: depthKey(item.anchorX, item.anchorY) + 0.01,
      svg:
        `<g class="canteen-kit" data-canteen-kit="${item.id}" ` +
        `data-sprite="${item.spriteKey}" ` +
        `transform="translate(0,${round(-lift * TILE_RISE)})">` +
        `<title>${escapeText(`${spec.name}, in the canteen. ${spec.effect}`)}</title>` +
        box(faces, 'var(--kit-welfare)', 'var(--kit-welfare-dark)') +
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

  // A delivery being unloaded: the man at the gate or the rack is on the loop between the pallet
  // and the rack, and he never stands on it: he touches the pallet and goes, touches the rack
  // and comes back, for as long as the engine has him unloading (PIOTR, 16.09; CLAUDE.md T16
  // 2.2). The page gives the walker both ends of the loop.
  const unloadingNow = state.deliveries.some((delivery) => delivery.arrived && !delivery.unloaded);
  const loopEnds = (): string => {
    const gate = stationCell(state, STATION_GATE, { x: 2, y: 5 });
    const rack = stationCell(state, STATION_RACK, { x: 2, y: 5 });
    return `${gate.x},${gate.y};${rack.x},${rack.y}`;
  };
  const onTheLoop = (station: string): string =>
    unloadingNow && (station === STATION_GATE || station === STATION_RACK) ? loopEnds() : '';

  // A machine off the lorry is the same loop walked empty handed: from the gate to the floor
  // held for it and back, as many times as the unload minutes allow, and nobody stands moving
  // his legs (PIOTR, 16.09; CLAUDE.md T17 2.4). The far end carries its own station, so the leg
  // is a walk and not a carry, and the man rests idle if the loop ever ends on it.
  const machineUnload = state.tasks.find(
    (task) => task.kind === 'unload' && !task.done && task.deliveryId === null && task.orderIds.length > 0,
  );
  const heldFor = machineUnload
    ? state.onOrder.find((item) => machineUnload.orderIds.includes(item.id))
    : undefined;
  const machineLoopEnds = (): string => {
    if (machineUnload === undefined || heldFor === undefined) return '';
    const gate = stationCell(state, STATION_GATE, { x: 2, y: 5 });
    return `${gate.x},${gate.y};${heldFor.anchorX},${heldFor.anchorY};${STATION_IDLE}`;
  };
  const onTheMachineLoop = (taskId: string | null): string =>
    machineUnload !== undefined && taskId === machineUnload.id ? machineLoopEnds() : '';

  // The crew, and the owner, each at the station the engine put him on.
  for (const worker of state.workers) {
    if (worker.startDay > state.clock.day) continue;
    const away = worker.absentDaysRemaining > 0;
    // Where he stands when the hall has nothing else for him. The helper's own corner is the fan
    // or the gate lane, never the inside of the office block (CLAUDE.md T11 3.4).
    const bench = homeCellOf(state, worker);
    const where = stationLabel(worker.station);
    const cell = stationCell(state, worker.station, bench);
    // He has gone through a door and is in the room behind it: off the hall's drawing until he
    // comes out again (PIOTR, 18.09; CLAUDE.md T20 2.12).
    if (figureIsThroughADoor(`worker-${worker.id}`, cell)) continue;
    drawables.push(
      figure(
        `worker-${worker.id}`,
        cell,
        away ? `${worker.name} (off)` : `${worker.name}, ${where}`,
        false,
        `data-worker="${worker.id}"`,
        // Joiners have a sheet tonight; everybody else falls back to the capsule until his own
        // one is delivered (CLAUDE.md T9 3.13).
        { role: worker.role, station: worker.station, options: characterOptions },
        onTheMachineLoop(worker.taskId) || onTheLoop(worker.station),
      ),
    );
  }
  const ownerCell = stationCell(state, state.owner.station, ownerBenchCell(state));
  // The owner in the office is not on the hall at all: he went through the door, and the office
  // view draws him at his desk (PIOTR, 18.09; CLAUDE.md T20 2.12, T19 2.2).
  if (ownerIsAvailable(state) && !figureIsThroughADoor('owner', ownerCell)) {
    drawables.push(
      figure(
        'owner',
        ownerCell,
        `${state.playerName}, ${stationLabel(state.owner.station)}`,
        true,
        'data-owner="1"',
        // The owner is his sheet where the art side has delivered one (character.owner.*, the
        // boss pack of 14.09), and the capsule where it has not, like every worker.
        { role: 'owner', station: state.owner.station, options: characterOptions },
        onTheMachineLoop(state.owner.currentTaskId) || onTheLoop(state.owner.station),
      ),
    );
  }

  // A pallet of sheets at the gate while a delivery is waiting to be unloaded: the material
  // arrives as what it is (CLAUDE.md T13 3.21). It keeps the lorry's hook, so a click on it
  // still asks who unloads it.
  const waiting = state.deliveries.find((delivery) => delivery.arrived && !delivery.unloaded);
  if (waiting) {
    drawables.push({
      depth: depthKey(GATE_LAYOUT.x, GATE_LAYOUT.y),
      svg:
        `<g data-van="${waiting.id}" data-sprite="${PALLET_SPRITE}" class="clickable pallet">` +
        '<title>Click the pallet to decide who unloads it</title>' +
        palletArt(files, `Delivery: ${plural(waiting.sheets, 'sheet', 'sheets')}`) +
        '</g>',
    });
  }

  // A delivered machine stands on the apron by the gate as that machine, unplaced, with a new
  // tag, until somebody gets it off the lorry and it goes to the cells held for it
  // (CLAUDE.md T13 3.21).
  state.onOrder
    .filter((item) => item.arrived && itemStandsInTheHall(item))
    .forEach((item, index) => drawables.push(arrivedKit(item, index, files)));

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

  // The pipes the game routed and the gate collars on their drops: a layer above the equipment
  // (CLAUDE.md T13 3.11, 3.19).
  live.push(pipeLayer(state, files));

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
        `${escapeText(
          ghost.ok ? (ghost.rotated === true ? 'Drop it here, turned' : 'Drop it here') : ghost.reason,
        )}</text></g>`,
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
  };
}

/** One thing the hall wants doing: the sentence the old strip under the hall used to carry, and
 *  what it is about, so the page can hang the right button on the chip (PIOTR, 16.09;
 *  CLAUDE.md T17 2.5). A hall with nothing wrong with it has none of them and shows no chip. */
export interface HallProblem {
  kind: 'broken' | 'bags' | 'hall' | 'dirty' | 'service';
  /** The machine it is about, where it is about one. */
  equipmentId: string | null;
  text: string;
  /** Somebody is already on it, so the chip is a statement and not a question (CLAUDE.md T19 2.7). */
  inHand?: boolean;
}

function lowerName(specId: string): string {
  return (findSpec(specId)?.name ?? specId).toLowerCase();
}

/** The man who has the one open job of work of this kind in his hands this minute, or null. It is
 *  `cleanerAtWork` of `src/engine/tasks.ts` with the kind asked for instead of fixed at the
 *  cleaning: both halves have to be true, the task names him and he names it, and a task the owner
 *  took on himself is nobody, because that is his own override and it keeps its button
 *  (CLAUDE.md T19 2.7, T20 2.8). NOTES-B3.md note 3 asks phase C to fold the two into one
 *  selector in `tasks.ts`, which is not B3's file this phase. */
function manOnOpenTask(state: GameState, kind: TaskInstance['kind']): Worker | null {
  const task = state.tasks.find((entry) => entry.kind === kind && !entry.done);
  if (!task || task.doneBy === null) return null;
  const worker = state.workers.find((entry) => entry.id === task.doneBy);
  if (!worker || worker.taskId !== task.id) return null;
  return worker;
}

/** Everything the hall wants doing, in the order it costs the workshop: what has stopped, then
 *  what is slowing it down, then what can wait a day (CLAUDE.md T17 2.5). The one list: the
 *  chips over the floor are built from it and nothing else reads the hall's state in words. */
export function hallProblems(state: GameState): HallProblem[] {
  const list: HallProblem[] = [];
  // A machine that has stopped, the extractor first in its own words: without it nothing in the
  // hall runs at more than a quarter speed.
  for (const item of brokenMachines(state)) {
    list.push({
      kind: 'broken',
      equipmentId: item.id,
      text:
        item.specId === 'extractor'
          ? 'The extractor is broken, so everything runs at a quarter speed'
          : `The ${lowerName(item.specId)} has stopped`,
    });
  }
  if (bagStore(state).full) {
    // The bags are the helper's, like the unloading and the sweeping, so once he has them in hand
    // the chip says so and asks the player nothing (PIOTR, 18.09; CLAUDE.md T20 2.8).
    const man = manOnOpenTask(state, 'emptyBags');
    list.push(
      man === null
        ? {
            kind: 'bags',
            equipmentId: null,
            text: 'The bags are full, so nothing that makes dust runs',
          }
        : {
            kind: 'bags',
            equipmentId: null,
            text: `${man.name} is emptying the bags`,
            inHand: true,
          },
    );
  }
  const machines = state.equipment.filter((item) => findSpec(item.specId)?.category === 'machine');
  if (machines.length > 0 && !hasExtraction(state)) {
    list.push({
      kind: 'hall',
      equipmentId: null,
      text: 'No extraction in the hall, so no machine will run. Buy an extractor',
    });
  }
  // The fans are too small for what is running this minute: nothing stops, the hall just turns
  // out less and fills with dust (PIOTR, CLAUDE.md T10 3.1).
  const extraction = extractionCheck(state);
  if (extraction.short) {
    list.push({
      kind: 'hall',
      equipmentId: null,
      text: `${extraction.line} m³/h: everything is 30% slower and the dust rises three times as fast`,
    });
  }
  // A compressor with more drawn on it than the pipe will carry: everything on it runs at 0.7
  // for the minute (PIOTR, CLAUDE.md T10 3.2).
  for (const line of hallAirCheck(state).lines) {
    list.push({
      kind: 'hall',
      equipmentId: null,
      text: `${line}. Everything on it runs at 70% until something is turned off`,
    });
  }
  if (gateIsCrowded(state)) {
    list.push({
      kind: 'hall',
      equipmentId: null,
      text:
        `Order transport, no room at the gate: ${jobsAtGate(state).length} finished pieces ` +
        `against a limit of ${GATE_CROWD_LIMIT}. Everything is 30% slower`,
    });
  }
  // 9.7: from the dirty band on, the player is warned that somebody can get hurt.
  const band = dustBand(state.dust);
  if (band.label !== 'clean') {
    // With a helper on the books the hall makes the job of work itself and he takes it, so the
    // chip says who is on it and asks the player nothing (PIOTR, 17.09; CLAUDE.md T19 2.7).
    const cleaner = cleanerAtWork(state);
    if (cleaner !== null) {
      list.push({
        kind: 'dirty',
        equipmentId: null,
        text: `The hall is ${band.label}, ${cleaner.name} is cleaning it`,
        inHand: true,
      });
    } else {
      const risk =
        band.label === 'dirty' || band.label === 'dangerous'
          ? ', somebody will get hurt in this'
          : '';
      list.push({ kind: 'dirty', equipmentId: null, text: `The hall is ${band.label}${risk}` });
    }
  }
  // A machine away being serviced is a statement and not a question: it is paid for and it comes
  // back the next working day (PIOTR, 18.09; CLAUDE.md T20 2.9.3).
  for (const item of machinesInService(state)) {
    list.push({
      kind: 'service',
      equipmentId: item.id,
      text: `The ${lowerName(item.specId)} is in for a service, nothing runs on it today`,
      inHand: true,
    });
  }
  for (const item of machinesDueService(state)) {
    if (item.broken || machineIsOut(item, state.clock.day)) continue;
    list.push({
      kind: 'service',
      equipmentId: item.id,
      text: `The ${lowerName(item.specId)} is due a service`,
    });
  }
  return list;
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

// ---------------------------------------------------------------------------
// What the hall sounds like this moment (CLAUDE.md T19 2.10)
// ---------------------------------------------------------------------------
//
// The engine of the sound is in src/ui/sound.ts; what is here is the hall's own reading of itself,
// so the sound follows what the player can see and never a second copy of the state. The names are
// the sound table's names; the types come across as types only, so nothing in render depends on
// anything in ui at run time.
//
// A naming note for the report: the brief's "fitting" is not a stage in this code. The stages are
// cutting, machining, cnc, assembly, finishing and delivery (src/engine/types.ts, StageId), and
// the fitting of a carcass happens inside assembly. The hammer and the drill are therefore both
// hooked to assembly, at their own cadences, and the code's names are used.

/** Every machine of this family somebody is standing at this minute. */
function familyInUse(state: GameState, specId: string): boolean {
  return state.equipment.some(
    (item) =>
      item.specId === specId &&
      !isSold(item) &&
      itemStandsInTheHall(item) &&
      machineInUse(state, item),
  );
}

/** Whether this man is in the hall to be heard: the owner while he is at work, and a worker who
 *  has started and is not away. A job can carry a man who is off sick, and a sick man makes no
 *  noise (CLAUDE.md T19 2.10). */
function manIsAtWork(state: GameState, who: string): boolean {
  if (who === OWNER) return ownerIsAvailable(state);
  const worker = state.workers.find((entry) => entry.id === who);
  if (worker === undefined) return false;
  return worker.startDay <= state.clock.day && worker.absentDaysRemaining <= 0;
}

/** The stage every job in production is at this minute, as a list of stage ids with the job's
 *  finish beside each, which is what the bench sounds are chosen from. A job with nobody on it,
 *  and a job whose men are all off, is silent. */
function benchStagesNow(state: GameState): Array<{ stage: StageId; finish: string }> {
  const found: Array<{ stage: StageId; finish: string }> = [];
  for (const job of state.jobs) {
    if (job.stage !== 'inProduction') continue;
    const who = job.assignees.find((man) => manIsAtWork(state, man)) ?? null;
    if (who === null) continue;
    const plan = jobStage(state, job, cncOptions(state, who, job));
    if (plan === null) continue;
    found.push({ stage: plan.id, finish: job.finish });
  }
  return found;
}

/** The loops the hall is running this moment: the saw while somebody is at it, the extraction
 *  while it pulls, the sander while a bench is finishing something that is not lacquered, and the
 *  booth while somebody sprays (CLAUDE.md T19 2.10). */
export function hallLoops(state: GameState): Set<HallLoopName> {
  const on = new Set<HallLoopName>();
  // Somebody is at the saw when the saw is taken: `takenBy` is how the hall already knows to spin
  // its blade and throw chips off it (machineFx above reads the same thing).
  if (familyInUse(state, 'tableSaw')) on.add('tableSaw');
  // The extraction pulls while a machine on it is running, which is what makes its own fan breathe
  // on the hall: the same predicate, on the extraction item itself, so what is heard and what is
  // seen can never disagree. A broken or sold unit, and one still on the lorry, is silent.
  const pulling = state.equipment.some(
    (item) =>
      !isSold(item) &&
      itemStandsInTheHall(item) &&
      findSpec(item.specId)?.category === 'extraction' &&
      machineInUse(state, item),
  );
  if (pulling) on.add('extractor');
  // The booth hisses while somebody is standing at one, and not merely while a lacquered job is at
  // its finishing stage: a workshop with no booth cannot spray, and it must not be heard to.
  if (familyInUse(state, 'sprayBooth')) on.add('sprayBooth');
  // The sander is hands and paper at a bench, which no machine is taken for: it is the stage that
  // says so. Lacquer is the booth's above and never the sander's.
  for (const at of benchStagesNow(state)) {
    if (at.stage === 'finishing' && at.finish !== 'lacquer') on.add('sander');
  }
  return on;
}

/** The one shot sounds the hall wants this moment: knocks and screws off the benches that are
 *  assembling. The engine thins them to at most one a second per sound, so this may say "yes"
 *  every frame and the hall still does not rattle (CLAUDE.md T19 2.10).
 *
 *  A naming note the report carries too: the brief hangs the drill on "fitting", and there is no
 *  fitting stage in this code. `StageId` is cutting, machining, cnc, assembly, finishing and
 *  delivery, and the fitting of a carcass, the hinges and the runners, happens inside assembly.
 *  The hammer and the drill are therefore both hooked to assembly, which is the stage a man is at
 *  a bench with a carcass in front of him. */
export function hallOneShots(state: GameState): Set<HallOneShotName> {
  const on = new Set<HallOneShotName>();
  for (const at of benchStagesNow(state)) {
    if (at.stage === 'assembly') {
      on.add('hammer');
      on.add('drill');
    }
  }
  // A man going through a door, in or out. The render layer reports it and the ui layer plays it,
  // which is why `src/render` no longer reaches into `src/ui/sound.ts` (CLAUDE.md T20 2.13). The
  // asking clears the count, so one passage is one knock however many frames it spans.
  if (takeDoorGoings() > 0) on.add('door');
  return on;
}

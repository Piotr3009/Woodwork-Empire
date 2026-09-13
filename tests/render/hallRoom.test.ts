// The painted hall (docs/art/SPRITES.md 9): three layers on one canvas, registered to the grid,
// with the sprites and the figures on top. The numbers here are the contract's, not the code's.

import { describe, expect, it } from 'vitest';
import {
  HALL_CANVAS,
  HALL_LAYERS,
  HALL_NAME_BOX,
  HALL_NAME_WALL,
  HALL_NAME_WIDTH,
  type Scene,
  faceBoxesOverlap,
  fitName,
  hallLayerBox,
  hallScene,
  renderHall,
  roomAtScenePoint,
  roomDoorBox,
  roomLabelBox,
  roomSilhouette,
  wallMatrix,
} from '../../src/render/hall';
import { TILE_RISE, centreOf, pointInPolygon, tileToScreen } from '../../src/render/iso';
import { roomById } from '../../src/engine/constants';
import { findSpec } from '../../src/engine/machines';
import { STATION_BENCH } from '../../src/engine/stations';
import { ROOM_LAYOUT } from '../../src/engine/constants';
import { buyStartingKit, newGame } from '../helpers';

const DELIVERED = ['hallBackground.png', 'hallOffice.png', 'hallCanteen.png'];

function hall(files: readonly string[] = DELIVERED): string {
  return renderHall(buyStartingKit(newGame()), { files });
}

describe('the canvas and the registration', () => {
  it('halves the 2x canvas and keeps the origin pixel of the contract', () => {
    // docs/art/SPRITES.md 9.2: 1680 by 1128 at 2x with the floor origin at 600, 288.
    expect(HALL_CANVAS).toEqual({ width: 840, height: 564, originX: 300, originY: 144 });
  });

  it('puts every floor corner of docs/art/SPRITES.md 9.2 on the painting', () => {
    const at = hallLayerBox();
    // The contract's corners on the 2x canvas, halved, then read as an offset from where the
    // layer was laid down. That has to come out at the projection of the same corner.
    const corners: Array<[number, number, number, number]> = [
      [0, 0, 600, 288],
      [20, 0, 1560, 768],
      [0, 10, 120, 528],
      [20, 10, 1080, 1008],
    ];
    for (const [x, y, canvasX, canvasY] of corners) {
      const onPainting = { x: at.x + canvasX / 2, y: at.y + canvasY / 2 };
      expect(onPainting, `${x},${y}`).toEqual(tileToScreen(x, y));
    }
  });
});

describe('the layers in the hall', () => {
  it('draws the three of them at the canvas origin, back to front', () => {
    const svg = hall();
    const order = Array.from(svg.matchAll(/data-layer="([a-zA-Z]+)"/g)).map((hit) => hit[1]);
    expect(order).toEqual(HALL_LAYERS.map((layer) => layer.key));
    const at = hallLayerBox();
    for (const layer of HALL_LAYERS) {
      const image = svg.match(new RegExp(`<image[^>]*data-layer="${layer.key}"[^>]*>`))?.[0] ?? '';
      expect(image, layer.key).toContain(`x="${at.x}" y="${at.y}"`);
      expect(image, layer.key).toContain(`width="${at.width}" height="${at.height}"`);
      expect(image, layer.key).toContain(`href="/sprites/${layer.key}.png"`);
    }
  });

  it('frames the view on the canvas, so the registration cannot drift', () => {
    const svg = hall();
    const at = hallLayerBox();
    expect(svg).toContain(`viewBox="${at.x} ${at.y} ${at.width} ${at.height}"`);
    // And the intrinsic size matches the box, which is what keeps the labels unscaled (T2 3.11).
    expect(svg).toContain(`width="${at.width}" height="${at.height}"`);
  });

  it('lets the painting carry the floor, the walls and the grid', () => {
    const svg = hall();
    expect(svg).not.toContain('var(--concrete)');
    expect(svg).not.toContain('var(--yard)');
    expect(svg).not.toContain('var(--grid)');
  });

  it('brings the grid back while the hall is being set out', () => {
    const svg = renderHall(buyStartingKit(newGame()), { files: DELIVERED, setup: true });
    expect(svg).toContain('var(--grid)');
    // And the painting is still under it.
    expect(svg).toContain('data-layer="hallBackground"');
  });
});

describe('the hall without the art', () => {
  it('draws its own floor and grid, so the game is playable before the delivery', () => {
    const svg = hall([]);
    expect(svg).not.toContain('data-layer=');
    expect(svg).toContain('var(--concrete)');
    expect(svg).toContain('var(--grid)');
    // And every room is a placeholder box with its name on it.
    for (const room of ROOM_LAYOUT) expect(svg, room.id).toContain(`>${room.name}<`);
  });

  it('falls back room by room, not all or nothing', () => {
    // The background arrived, the canteen block did not.
    const svg = hall(['hallBackground.png', 'hallOffice.png']);
    expect(svg).toContain('data-layer="hallOffice"');
    expect(svg).not.toContain('data-layer="hallCanteen"');
    // The WC and the office are painted, so their names are lettered on the face; the canteen is
    // still a box, which carries its own name in the middle.
    expect(svg).toContain('class="painted-text room-label" font-size="11">WC<');
    expect(svg).toContain('class="painted-text room-label" font-size="11">Office<');
    expect(svg).not.toContain('class="painted-text room-label" font-size="11">Canteen<');
    expect(svg).toContain('class="iso-label">Canteen<');
  });
});

/** The middle of the face a room's door is in, which is the part of it the player aims at. */
function frontFaceCentre(id: 'wc' | 'office' | 'canteen'): { x: number; y: number } {
  const room = roomById(id);
  return tileToScreen(room.x + room.width / 2, room.y + room.depth, room.height / 2);
}

describe('the rooms stay the way into the office', () => {
  it('gives every room a footprint the player can click, painted or not', () => {
    for (const files of [DELIVERED, []]) {
      const svg = hall(files);
      for (const room of ROOM_LAYOUT) {
        expect(svg, `${room.id} ${files.length}`).toContain(`data-room="${room.id}"`);
      }
    }
    // With the art there the hit area is the block the player sees, and nothing is drawn over it.
    const painted = hall();
    expect(painted).toContain('fill="transparent" class="room-hit"');
    for (const room of ROOM_LAYOUT) {
      const shape = roomSilhouette(room);
      const wanted = shape
        .map((point) => `${Math.round(point.x * 100) / 100},${Math.round(point.y * 100) / 100}`)
        .join(' ');
      expect(painted, room.id).toContain(`<polygon points="${wanted}" fill="transparent"`);
    }
  });

  it('opens the room the player clicked, not the one behind it', () => {
    // The bug Piotr found: the canteen block is painted over the middle of the office's floor, so
    // the office footprint took every click aimed at the canteen (CLAUDE.md T6 3.1).
    expect(roomAtScenePoint(frontFaceCentre('canteen'))).toBe('canteen');
    expect(roomAtScenePoint(frontFaceCentre('office'))).toBe('office');
    // And a click on empty floor is not a room at all.
    expect(roomAtScenePoint(tileToScreen(12, 8))).toBeNull();
  });

  it('gives the WC the part of it the camera can see', () => {
    // The office block is 2.7 m high and stands right of the WC, so it hides all but the top of
    // the WC's front face: what the player clicks there is the office roof, and that is what
    // opens (REPORT-T6 section 5). The WC answers on its own roof.
    const wc = roomById('wc');
    expect(roomAtScenePoint(frontFaceCentre('wc'))).toBe('office');
    expect(pointInPolygon(frontFaceCentre('wc'), roomSilhouette(roomById('office')))).toBe(true);
    const roof = tileToScreen(wc.x + wc.width / 2, wc.y + wc.depth / 2, wc.height);
    expect(roomAtScenePoint(roof)).toBe('wc');
  });

  it('never asks a layer image which room was clicked', () => {
    // Each layer is the whole 1680 by 1128 canvas, so an image would answer for the whole hall.
    const svg = hall();
    for (const layer of HALL_LAYERS) {
      const image = svg.match(new RegExp(`<image[^>]*data-layer="${layer.key}"[^>]*>`))?.[0] ?? '';
      expect(image, layer.key).not.toContain('data-room');
    }
  });
});

describe('the text the game letters on the painting', () => {
  it('paints the company name onto the rear wall plane', () => {
    // The contract gives the box in 2x canvas pixels: x 300 to 560, y 130 to 200, and the scene
    // is 1x, so 130 pixels of wall are what the name is fitted to.
    expect(HALL_NAME_BOX).toEqual({ x: 300, y: 130, width: 260, height: 70 });
    expect(HALL_NAME_WIDTH).toBe(130);
    const svg = hall();
    const name = svg.match(/<text[^>]*class="painted-text hall-company"[^>]*>([^<]*)</);
    expect(name?.[1]).toBe('Woodwork Empire');
    // The transform is the wall: two points of the baseline, projected, land on (x, 0, z).
    const anchor = tileToScreen(HALL_NAME_WALL.x, 0, HALL_NAME_WALL.z);
    expect(svg).toContain(`transform="${wallMatrix(anchor)}"`);
    const matrix = svg
      .match(/class="painted-text hall-company"/)
      ? wallMatrix(anchor).slice('matrix('.length, -1).split(',').map(Number)
      : [];
    const [a, b, c, d, e, f] = matrix as [number, number, number, number, number, number];
    const on = (localX: number): { x: number; y: number } => ({
      x: a * localX + e,
      y: b * localX + f,
    });
    expect(c).toBe(0);
    expect(d).toBe(1);
    expect(on(0)).toEqual(tileToScreen(HALL_NAME_WALL.x, 0, HALL_NAME_WALL.z));
    // Sixty pixels along the baseline is two and a half metres along the wall, and still on it.
    expect(on(60)).toEqual(tileToScreen(HALL_NAME_WALL.x + 60 / 24, 0, HALL_NAME_WALL.z));
    // And the wall is a wall: the name stands under the 3.5 m roofline and past the room blocks.
    expect(HALL_NAME_WALL.z).toBeLessThan(3.5);
    expect(HALL_NAME_WALL.x - HALL_NAME_WIDTH / 48).toBeGreaterThan(5);
  });

  it('shrinks a long name to the readable minimum before it cuts it', () => {
    // The default fits whole, which is what open question 5 of REPORT-T4 was about.
    expect(fitName('Woodwork Empire', 130)).toEqual({ text: 'Woodwork Empire', fontSize: 15 });
    // A short one is lettered as large as the wall allows and no larger.
    expect(fitName('WE', 130)).toEqual({ text: 'WE', fontSize: 18 });
    // A name no lettering will hold is cut, and only then.
    const long = fitName('The Joinery Company of Great Britain Limited', 130);
    expect(long.fontSize).toBe(11);
    expect(long.text.endsWith('...')).toBe(true);
    expect(long.text.length).toBeLessThan('The Joinery Company of Great Britain Limited'.length);
    expect(fitName('   ', 130).text).toBe('');
  });

  it('letters the name only once the wall is painted', () => {
    expect(hall([])).not.toContain('hall-company');
  });

  it('letters each room on the face that looks into the hall, above its door', () => {
    const svg = hall();
    for (const room of ROOM_LAYOUT) {
      const label = roomLabelBox(room);
      const at = tileToScreen(room.x + room.width / 2, room.y + room.depth, label.bottom);
      const wanted =
        `<text x="0" y="0" text-anchor="middle" transform="${wallMatrix(at)}" ` +
        `class="painted-text room-label" font-size="11">${room.name}</text>`;
      expect(svg, room.id).toContain(wanted);
    }
  });

  it('keeps every room name clear of its door, in the top third of the face', () => {
    for (const room of ROOM_LAYOUT) {
      const label = roomLabelBox(room);
      const door = roomDoorBox(room);
      expect(faceBoxesOverlap(label, door), room.id).toBe(false);
      // The top third of the face, and inside it.
      expect(label.bottom, room.id).toBeGreaterThanOrEqual((room.height * 2) / 3);
      expect(label.top, room.id).toBeLessThanOrEqual(room.height);
      // And the name fits across the face it is painted on.
      expect(label.from, room.id).toBeGreaterThan(0);
      expect(label.from + label.across, room.id).toBeLessThan(room.width);
    }
    // The name is one line of the lettering the renderer uses, measured in metres of wall.
    const office = roomLabelBox({ name: 'Office', width: 2 });
    expect(office.top - office.bottom).toBeCloseTo(11 / TILE_RISE, 6);
    expect(office.bottom).toBeGreaterThan(roomDoorBox({ width: 2 }).top);
  });
});

describe('the shell is only built when it has to be', () => {
  it('hands back the markup as a function, and the same key twice means the same shell', () => {
    const state = buyStartingKit(newGame());
    let built = 0;
    const first = hallScene(state, { files: DELIVERED });
    const second = hallScene(state, { files: DELIVERED });
    // Same frame, same painting, same mode: the page can keep what it has.
    expect(second.key).toBe(first.key);
    // Asking for it is what builds it, so a caller that does not ask pays nothing.
    const counted: Scene = { ...first, shell: () => { built += 1; return first.shell(); } };
    expect(built).toBe(0);
    expect(counted.shell()).toContain('<svg class="hall-view"');
    expect(built).toBe(1);
  });

  it('changes the key when the frame, the painting or the mode changes', () => {
    const state = buyStartingKit(newGame());
    const plain = hallScene(state, { files: DELIVERED }).key;
    expect(hallScene(state, { files: DELIVERED, setup: true }).key).not.toBe(plain);
    expect(hallScene(state, { files: [] }).key).not.toBe(plain);
    expect(hallScene(state, { files: ['hallBackground.png'] }).key).not.toBe(plain);
    // And not when only the state inside it moved.
    const later = { ...state, dust: 40, companyName: 'Someone Else' };
    expect(hallScene(later, { files: DELIVERED }).key).toBe(plain);
  });
});

describe('where the owner stands', () => {
  it('puts him at the middle of his bench front, from the bench footprint', () => {
    const state = buyStartingKit(newGame());
    // Standing at it, which is the only time the bench is where he is.
    state.owner.station = STATION_BENCH;
    const bench = state.equipment.find((item) => item.specId === 'workbench');
    const spec = findSpec('workbench');
    expect(bench).toBeDefined();
    const feet = centreOf(
      (bench?.anchorX ?? 0) + Math.floor((spec?.width ?? 1) / 2),
      (bench?.anchorY ?? 0) + (spec?.depth ?? 1),
      1,
      1,
    );
    const svg = renderHall(state, { files: DELIVERED });
    expect(svg).toContain(
      `data-figure="owner" transform="translate(${Math.round(feet.x)},${Math.round(feet.y)})"`,
    );
  });
});

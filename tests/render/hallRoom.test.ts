// The painted hall (docs/art/SPRITES.md 9): three layers on one canvas, registered to the grid,
// with the sprites and the figures on top. The numbers here are the contract's, not the code's.

import { describe, expect, it } from 'vitest';
import {
  HALL_CANVAS,
  HALL_LAYERS,
  HALL_NAME_BOX,
  type Scene,
  canvasBoxInHall,
  fitName,
  hallLayerBox,
  hallScene,
  renderHall,
} from '../../src/render/hall';
import { centreOf, tileToScreen } from '../../src/render/iso';
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

describe('the rooms stay the way into the office', () => {
  it('gives every room a footprint the player can click, painted or not', () => {
    for (const files of [DELIVERED, []]) {
      const svg = hall(files);
      for (const room of ROOM_LAYOUT) {
        expect(svg, `${room.id} ${files.length}`).toContain(`data-room="${room.id}"`);
      }
    }
    // With the art there the hit area is the footprint itself, and nothing is drawn over the room.
    const painted = hall();
    expect(painted).toContain('fill="transparent" class="room-hit"');
  });
});

describe('the text the game letters on the painting', () => {
  it('puts the company name in the blank strip docs/art/SPRITES.md 9.5 leaves for it', () => {
    // The contract gives the box in 2x canvas pixels: x 300 to 560, y 130 to 200.
    expect(HALL_NAME_BOX).toEqual({ x: 300, y: 130, width: 260, height: 70 });
    const inHall = canvasBoxInHall(HALL_NAME_BOX);
    expect(inHall).toEqual({ x: -150, y: -79, width: 130, height: 35 });
    const svg = hall();
    const name = svg.match(/<text[^>]*class="painted-text hall-company"[^>]*>([^<]*)</);
    expect(name?.[1]).toBe('Woodwork Empire');
    // Centred in its box, so it cannot drift off the wall.
    const x = svg.match(/<text x="(-?[\d.]+)"[^>]*class="painted-text hall-company"/)?.[1];
    expect(Number(x)).toBe(inHall.x + inHall.width / 2);
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

  it('letters each room on the face that looks into the hall', () => {
    const svg = hall();
    // The renderer rounds its coordinates to two places, as every other part of the scene does.
    const round = (value: number): number => Math.round(value * 100) / 100;
    for (const room of ROOM_LAYOUT) {
      const at = tileToScreen(room.x + room.width / 2, room.y + room.depth, room.height / 2);
      const wanted =
        `<text x="${round(at.x)}" y="${round(at.y)}" text-anchor="middle" ` +
        `class="painted-text room-label" font-size="11">${room.name}</text>`;
      expect(svg, room.id).toContain(wanted);
    }
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

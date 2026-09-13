// The painted hall (docs/art/SPRITES.md 9): three layers on one canvas, registered to the grid,
// with the sprites and the figures on top. The numbers here are the contract's, not the code's.

import { describe, expect, it } from 'vitest';
import {
  HALL_CANVAS,
  HALL_LAYERS,
  hallLayerBox,
  renderHall,
} from '../../src/render/hall';
import { tileToScreen } from '../../src/render/iso';
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
    // The WC and the office are painted, so neither is boxed; the canteen still is.
    expect(svg).not.toContain('>WC<');
    expect(svg).not.toContain('>Office<');
    expect(svg).toContain('>Canteen<');
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

// Machines stand at an angle to the walls (PIOTR; CLAUDE.md T10 3.8). In setup mode the dragged
// item turns by ninety degrees: the footprint and the working zone swap their width and their
// depth, `canPlace` checks the turned zone, and the picture is mirrored unless the art side has
// delivered a second orientation for it.

import { describe, expect, it } from 'vitest';
import { footprintOf, itemFootprint, itemZone, zoneOf } from '../../src/engine/machines';
import { boxOf, canPlaceSpec, canPlace, moveItem } from '../../src/engine/layout';
import { mirrorNeeded, pickSprite, spriteFiles } from '../../src/render/sprites';
import { objectArt } from '../../src/render/hall';
import { act, newGame, placeEquipment } from '../helpers';
import type { GameState } from '../../src/engine/index';

function emptyHall(): GameState {
  return newGame({ difficulty: 'veryEasy' });
}

describe('what turning does to the floor', () => {
  it('swaps the width and the depth of the footprint and of the zone', () => {
    // A standard saw is 3 by 1 of machine on a 4 by 3 zone (CLAUDE.md T7 3.6).
    expect(footprintOf('tableSaw', 'standard')).toEqual({ width: 3, depth: 1, height: 1 });
    expect(footprintOf('tableSaw', 'standard', true)).toEqual({ width: 1, depth: 3, height: 1 });
    expect(zoneOf('tableSaw', 'standard')).toEqual({ width: 4, depth: 3 });
    expect(zoneOf('tableSaw', 'standard', true)).toEqual({ width: 3, depth: 4 });
    // The height is the height whichever way it faces.
    expect(footprintOf('extractor', 'pro', true)).toEqual({ width: 1, depth: 3, height: 2.5 });
    // A square thing is the same thing turned.
    expect(footprintOf('compressor', 'used', true)).toEqual(footprintOf('compressor', 'used'));
  });

  it('reads the turn off the item that is standing in the hall', () => {
    const state = emptyHall();
    const saw = placeEquipment(state, 'tableSaw', { variantId: 'standard', x: 6, y: 1 });
    expect(saw.rotated).toBe(false);
    expect(itemFootprint(saw)).toEqual({ width: 3, depth: 1, height: 1 });
    expect(itemZone(saw)).toEqual({ width: 4, depth: 3 });
    saw.rotated = true;
    expect(itemFootprint(saw)).toEqual({ width: 1, depth: 3, height: 1 });
    expect(itemZone(saw)).toEqual({ width: 3, depth: 4 });
    expect(boxOf('tableSaw', 6, 1, 'standard', true)).toEqual({
      x: 6,
      y: 1,
      width: 3,
      depth: 4,
    });
  });
});

describe('where a turned machine will go', () => {
  it('wants a free 1 by 3 of hall where the saw wanted a 3 by 1', () => {
    const state = emptyHall();
    // A wall with a gap three deep and one wide in it: nothing but a turned saw fits. The wall is
    // built of compressors and no longer of tool cabinets, because a cabinet is two cells wide from
    // Turn 21 and a wall of them leaves gaps of its own that a square saw would fit
    // (CLAUDE.md T21 2.13).
    for (let y = 0; y < 10; y += 1) {
      for (let x = 0; x < 20; x += 1) {
        const inGap = x >= 8 && x < 11 && y >= 2 && y < 6;
        if (inGap) continue;
        if (!canPlaceSpec(state, 'compressor', x, y, null).ok) continue;
        placeEquipment(state, 'compressor', { x, y, id: `cab-${x}-${y}` });
      }
    }
    // Square to the walls the saw wants 4 by 3 and there is no 4 anywhere.
    expect(canPlaceSpec(state, 'tableSaw', 8, 2, null, 'standard', false).ok).toBe(false);
    // Turned it wants 3 by 4, and the gap is exactly that.
    expect(canPlaceSpec(state, 'tableSaw', 8, 2, null, 'standard', true).ok).toBe(true);
  });

  it('is refused off the floor when the turned zone runs over the edge', () => {
    const state = emptyHall();
    // A pro extractor is 3 by 1 on a 3 by 1 zone: square to the walls it fits against the front
    // edge, and turned it is 1 by 3 and hangs off it.
    expect(canPlaceSpec(state, 'extractor', 15, 9, null, 'pro', false).ok).toBe(true);
    const turned = canPlaceSpec(state, 'extractor', 15, 9, null, 'pro', true);
    expect(turned.ok).toBe(false);
    expect(turned.reason).toBe('Off the floor');
  });

  it('writes the turn down on the machine when it is dropped', () => {
    const state = emptyHall();
    const saw = placeEquipment(state, 'tableSaw', { variantId: 'standard', x: 6, y: 1 });
    expect(canPlace(state, saw.id, 6, 1, true).ok).toBe(true);
    expect(moveItem(state, saw.id, 6, 1, true).ok).toBe(true);
    expect(saw.rotated).toBe(true);
    // And what it stands on is the turned zone from then on, without being asked again.
    expect(canPlace(state, saw.id, 6, 1).ok).toBe(true);
    expect(itemZone(saw)).toEqual({ width: 3, depth: 4 });
  });

  it('turns an outline held for something on order in the same way', () => {
    const state = emptyHall();
    const ordered = act(state, { type: 'BUY_EQUIPMENT', specId: 'tableSaw', variantId: 'standard' });
    const order = ordered.onOrder[0];
    if (!order) throw new Error('nothing on order');
    expect(order.rotated).toBe(false);
    expect(moveItem(ordered, order.id, 6, 1, true).ok).toBe(true);
    expect(ordered.onOrder[0]?.rotated).toBe(true);
  });
});

describe('what turning does to the picture', () => {
  const files = ['tableSaw.standard.png', 'extractor.pro.png', 'extractor.pro.r.png'];

  it('mirrors the picture about its anchor while there is no second orientation', () => {
    expect(mirrorNeeded(files, 'tableSaw', 'standard', true)).toBe(true);
    expect(mirrorNeeded(files, 'tableSaw', 'standard', false)).toBe(false);
    expect(pickSprite(files, 'tableSaw', 'standard', true)).toBe('/sprites/tableSaw.standard.png');
    const art = objectArt({
      files,
      spriteKey: 'tableSaw',
      tier: 'standard',
      rotated: true,
      x: 4,
      y: 2,
      width: 1,
      depth: 3,
      height: 1,
      fill: '#000',
      shade: '#000',
      label: 'saw',
    });
    expect(art).toContain('scale(-1, 1)');
    expect(art).toContain('/sprites/tableSaw.standard.png');
  });

  it('uses the second orientation unmirrored where the art side has drawn one', () => {
    expect(mirrorNeeded(files, 'extractor', 'pro', true)).toBe(false);
    expect(pickSprite(files, 'extractor', 'pro', true)).toBe('/sprites/extractor.pro.r.png');
    const art = objectArt({
      files,
      spriteKey: 'extractor',
      tier: 'pro',
      rotated: true,
      x: 4,
      y: 2,
      width: 1,
      depth: 3,
      height: 2.5,
      fill: '#000',
      shade: '#000',
      label: 'extractor',
    });
    expect(art).toContain('/sprites/extractor.pro.r.png');
    expect(art).not.toContain('scale(-1, 1)');
  });

  it('leaves a picture that is not turned exactly as it was', () => {
    const art = objectArt({
      files,
      spriteKey: 'tableSaw',
      tier: 'standard',
      x: 4,
      y: 2,
      width: 3,
      depth: 1,
      height: 1,
      fill: '#000',
      shade: '#000',
      label: 'saw',
    });
    expect(art).not.toContain('scale(-1, 1)');
  });

  it('takes the one second orientation the art side has delivered, and mirrors the rest', () => {
    // The art side's `.r` files were parked (CLAUDE.md T10 6.2): the hall mirrored until one
    // landed, and the day one did the loader was to take it with no code change at all. Piotr
    // delivered `toolCabinet.standard.r.png` between Turn 20 and Turn 21, and that is what this
    // reads: the cabinet turned is drawn from its own file and not mirrored, and every other
    // class the game draws still mirrors.
    const turned = spriteFiles().filter((name) => name.endsWith('.r.png'));
    expect(turned).toEqual(['toolCabinet.standard.r.png']);
    expect(mirrorNeeded(spriteFiles(), 'toolCabinet', 'standard', true)).toBe(false);
    expect(pickSprite(spriteFiles(), 'toolCabinet', 'standard', true)).toBe(
      '/sprites/toolCabinet.standard.r.png',
    );
    // The saw has no second orientation, so it is mirrored as it always was.
    expect(mirrorNeeded(spriteFiles(), 'tableSaw', 'standard', true)).toBe(true);
    expect(mirrorNeeded([], 'tableSaw', 'standard', true)).toBe(true);
  });
});

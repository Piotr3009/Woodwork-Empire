// Machines stand at an angle to the walls (PIOTR; CLAUDE.md T10 3.8). In setup mode the dragged
// item turns by ninety degrees: the footprint and the working zone swap their width and their
// depth, `canPlace` checks the turned zone, and the picture is mirrored unless the art side has
// delivered a second orientation for it.

import { describe, expect, it } from 'vitest';
import { footprintOf, itemFootprint, itemZone, zoneOf } from '../../src/engine/machines';
import { boxOf, canPlaceSpec, canPlace, moveItem } from '../../src/engine/layout';
import { mirrorNeeded, pickSprite, spriteFiles } from '../../src/render/sprites';
import { nextOrientation, orientationsFor } from '../../src/engine/ports';
import type { Orientation } from '../../src/engine/types';
import { objectArt } from '../../src/render/hall';
import { act, newGame, placeEquipment } from '../helpers';
import type { GameState } from '../../src/engine/index';

function emptyHall(): GameState {
  return newGame({ difficulty: 'veryEasy' });
}

describe('what turning does to the floor', () => {
  it('swaps the width and the depth of the footprint and of the zone', () => {
    // A standard saw is 3 by 1 of machine on a 4 by 3 zone (CLAUDE.md T7 3.6).
    expect(footprintOf('tableSaw', 'standard')).toEqual({ width: 3, depth: 1, height: 1.95 });
    expect(footprintOf('tableSaw', 'standard', 1)).toEqual({ width: 1, depth: 3, height: 1.95 });
    expect(zoneOf('tableSaw', 'standard')).toEqual({ width: 4, depth: 3 });
    expect(zoneOf('tableSaw', 'standard', 1)).toEqual({ width: 3, depth: 4 });
    // The height is the height whichever way it faces.
    expect(footprintOf('extractor', 'pro', 1)).toEqual({ width: 1, depth: 3, height: 2.5 });
    // A square thing is the same thing turned.
    expect(footprintOf('compressor', 'used', 1)).toEqual(footprintOf('compressor', 'used'));
  });

  it('reads the turn off the item that is standing in the hall', () => {
    const state = emptyHall();
    const saw = placeEquipment(state, 'tableSaw', { variantId: 'standard', x: 6, y: 1 });
    expect(saw.orientation).toBe(0);
    expect(itemFootprint(saw)).toEqual({ width: 3, depth: 1, height: 1.95 });
    expect(itemZone(saw)).toEqual({ width: 4, depth: 3 });
    saw.orientation = 1;
    expect(itemFootprint(saw)).toEqual({ width: 1, depth: 3, height: 1.95 });
    expect(itemZone(saw)).toEqual({ width: 3, depth: 4 });
    expect(boxOf('tableSaw', 6, 1, 'standard', 1)).toEqual({
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
    expect(canPlaceSpec(state, 'tableSaw', 8, 2, null, 'standard', 0).ok).toBe(false);
    // Turned it wants 3 by 4, and the gap is exactly that.
    expect(canPlaceSpec(state, 'tableSaw', 8, 2, null, 'standard', 1).ok).toBe(true);
  });

  it('is refused off the floor when the turned zone runs over the edge', () => {
    const state = emptyHall();
    // A pro extractor is 3 by 1 on a 3 by 1 zone: square to the walls it fits against the front
    // edge, and turned it is 1 by 3 and hangs off it.
    expect(canPlaceSpec(state, 'extractor', 15, 9, null, 'pro', 0).ok).toBe(true);
    const turned = canPlaceSpec(state, 'extractor', 15, 9, null, 'pro', 1);
    expect(turned.ok).toBe(false);
    expect(turned.reason).toBe('Off the floor');
  });

  it('writes the turn down on the machine when it is dropped', () => {
    const state = emptyHall();
    const saw = placeEquipment(state, 'tableSaw', { variantId: 'standard', x: 6, y: 1 });
    expect(canPlace(state, saw.id, 6, 1, 1).ok).toBe(true);
    expect(moveItem(state, saw.id, 6, 1, 1).ok).toBe(true);
    expect(saw.orientation).toBe(1);
    // And what it stands on is the turned zone from then on, without being asked again.
    expect(canPlace(state, saw.id, 6, 1).ok).toBe(true);
    expect(itemZone(saw)).toEqual({ width: 3, depth: 4 });
  });

  it('turns an outline held for something on order in the same way', () => {
    const state = emptyHall();
    const ordered = act(state, { type: 'BUY_EQUIPMENT', specId: 'tableSaw', variantId: 'standard' });
    const order = ordered.onOrder[0];
    if (!order) throw new Error('nothing on order');
    expect(order.orientation).toBe(0);
    expect(moveItem(ordered, order.id, 6, 1, 1).ok).toBe(true);
    expect(ordered.onOrder[0]?.orientation).toBe(1);
  });
});

describe('the orientations Rotate can reach (CLAUDE.md T22 2.11)', () => {
  it('is 0, 1, 0 for a thing with two pictures and 0, 1, 2, 3, 0 for one with four', () => {
    const files = spriteFiles();
    // The saw has its base picture and a true quarter turn (the art side's table saws v2, 19.09)
    // and nothing else: a half turn would show the front of the machine where its back belongs,
    // so Rotate never offers it (CLAUDE.md T22 2.11).
    expect(orientationsFor(files, 'tableSaw', 'standard')).toEqual([0, 1]);
    const walk = (spriteKey: string, tier: string, from: Orientation, steps: number): Orientation[] => {
      const out: Orientation[] = [];
      let at = from;
      for (let step = 0; step < steps; step += 1) {
        at = nextOrientation(files, spriteKey, tier, at);
        out.push(at);
      }
      return out;
    };
    expect(walk('tableSaw', 'standard', 0, 3)).toEqual([1, 0, 1]);
    // The tool cabinet is the first family in the game the art side has drawn all four of
    // (PIOTR's art, 19.09): the standard cabinet walks the whole ring and comes back.
    expect(orientationsFor(files, 'toolCabinet', 'standard')).toEqual([0, 1, 2, 3]);
    expect(walk('toolCabinet', 'standard', 0, 5)).toEqual([1, 2, 3, 0, 1]);
  });

  it('gives every class of cabinet all four, and swaps the footprint at each', () => {
    const files = spriteFiles();
    for (const tier of ['used', 'budget', 'standard', 'pro', 'industrial']) {
      expect(orientationsFor(files, 'toolCabinet', tier), tier).toEqual([0, 1, 2, 3]);
      for (const orientation of [0, 1, 2, 3] as Orientation[]) {
        expect(
          pickSprite(files, 'toolCabinet', tier, orientation),
          `${tier} at ${orientation}`,
        ).toBe(`/sprites/toolCabinet.${tier}${['', '.r', '.rr', '.rrr'][orientation]}.png`);
        expect(mirrorNeeded(files, 'toolCabinet', tier, orientation)).toBe(false);
      }
    }
    // The standard cabinet is 2 by 1: across at 1 and 3, along at 0 and 2 (CLAUDE.md T22 2.11).
    expect(footprintOf('toolCabinet', 'standard', 0)).toEqual({ width: 2, depth: 1, height: 1 });
    expect(footprintOf('toolCabinet', 'standard', 1)).toEqual({ width: 1, depth: 2, height: 1 });
    expect(footprintOf('toolCabinet', 'standard', 2)).toEqual({ width: 2, depth: 1, height: 1 });
    expect(footprintOf('toolCabinet', 'standard', 3)).toEqual({ width: 1, depth: 2, height: 1 });
  });

  it('gives a family with no picture at all its two turns as well', () => {
    // Orientation 1 is always reachable, whatever the art side has delivered: with no file there
    // is a box on the floor and the box's footprint swaps, which is the thing the player is
    // really turning (CLAUDE.md T10 3.8).
    expect(orientationsFor([], 'somethingNobodyHasPainted', 'standard')).toEqual([0, 1]);
    expect(nextOrientation([], 'somethingNobodyHasPainted', 'standard', 1)).toBe(0);
    // An orientation that is not on the ring comes back to the first one that is: a save carrying
    // a 2 for a family whose `.rr` file has gone is not left standing at a picture that is not
    // there.
    expect(nextOrientation([], 'somethingNobodyHasPainted', 'standard', 2)).toBe(0);
  });

  it('takes a half turn the day its file lands, and not before', () => {
    const half = ['thing.standard.png', 'thing.standard.rr.png'];
    expect(orientationsFor(half, 'thing', 'standard')).toEqual([0, 1, 2]);
    expect(nextOrientation(half, 'thing', 'standard', 2)).toBe(0);
    // The family file answers for a class that has none of its own, which is the loader's own
    // rule (docs/art/SPRITES.md 3).
    expect(orientationsFor(['thing.png', 'thing.rrr.png'], 'thing', 'standard')).toEqual([0, 1, 3]);
  });
});

describe('what turning does to the picture', () => {
  const files = ['tableSaw.standard.png', 'extractor.pro.png', 'extractor.pro.r.png'];

  it('mirrors the picture about its anchor while there is no second orientation', () => {
    expect(mirrorNeeded(files, 'tableSaw', 'standard', 1)).toBe(true);
    expect(mirrorNeeded(files, 'tableSaw', 'standard', 0)).toBe(false);
    expect(pickSprite(files, 'tableSaw', 'standard', 1)).toBe('/sprites/tableSaw.standard.png');
    const art = objectArt({
      files,
      spriteKey: 'tableSaw',
      tier: 'standard',
      orientation: 1,
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
    expect(mirrorNeeded(files, 'extractor', 'pro', 1)).toBe(false);
    expect(pickSprite(files, 'extractor', 'pro', 1)).toBe('/sprites/extractor.pro.r.png');
    const art = objectArt({
      files,
      spriteKey: 'extractor',
      tier: 'pro',
      orientation: 1,
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

  it('takes the second orientations the art side has delivered, and mirrors the rest', () => {
    // The art side's `.r` files were parked (CLAUDE.md T10 6.2): the hall mirrored until one
    // landed, and the day one did the loader was to take it with no code change at all. The
    // cabinets came first (19.09), then the benches, the saws and the corrected equipment of
    // 20.09: every class of every floor family the game draws has a true quarter turn now, and
    // only the character sheets, the rooms and the old better rack have none.
    // Fifty one from v49: the thicknessers, the van, the forklift and the pallet truck of the
    // pack of 22.09 turned too. Fifty six from v54: the five CNCs of the pack of 24.09, each a true
    // quarter turn of its mesh and never a mirror.
    const turned = spriteFiles().filter((name) => name.endsWith('.r.png'));
    expect(turned).toHaveLength(56);
    for (const family of ['cnc', 'compressor', 'edgebander', 'extractor', 'sheetRack', 'spindleMoulder', 'tableSaw', 'toolCabinet', 'workbench']) {
      for (const tier of ['used', 'budget', 'standard', 'pro', 'industrial']) {
        expect(turned, `${family}.${tier}`).toContain(`${family}.${tier}.r.png`);
      }
    }
    for (const single of ['dustSystem', 'flexiSystem', 'pelletiser']) {
      expect(turned, single).toContain(`${single}.standard.r.png`);
    }
    for (const cabinet of ['used', 'budget', 'standard', 'pro', 'industrial']) {
      expect(mirrorNeeded(spriteFiles(), 'toolCabinet', cabinet, 1), cabinet).toBe(false);
      expect(pickSprite(spriteFiles(), 'toolCabinet', cabinet, 1), cabinet).toBe(
        `/sprites/toolCabinet.${cabinet}.r.png`,
      );
    }
    // A class whose turned file is missing is mirrored as it always was: the saw with its `.r`
    // file taken out of the list.
    const withoutTurnedSaw = spriteFiles().filter((name) => name !== 'tableSaw.standard.r.png');
    expect(mirrorNeeded(withoutTurnedSaw, 'tableSaw', 'standard', 1)).toBe(true);
    expect(mirrorNeeded(spriteFiles(), 'tableSaw', 'standard', 1)).toBe(false);
    // With no picture at all there is nothing to mirror, and the hall draws the box instead. The
    // boolean version of this said "mirror" for a family that had no file either, which was an
    // answer nobody read: `objectArt` asks the question only once it has a URL in its hand
    // (CLAUDE.md T22 2.11).
    expect(mirrorNeeded([], 'tableSaw', 'standard', 1)).toBe(false);
  });
});

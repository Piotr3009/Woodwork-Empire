// Tool cabinets: one for every worker and one for the owner, and the hand edgebander lives in one
// instead of standing on the floor (CLAUDE.md T6 3.5).
//
// The cabinet stands two metres wide from Turn 21, because that is what the art side painted
// (PIOTR's art, 19.09; CLAUDE.md T21 2.13). The two describes at the end of this file are that
// section: everything the brief asks to be checked rather than trusted, which is that the placement
// and the station table read a two cell cabinet with no rule of their own for it, that the row it is
// laid out on holds a cabinet a man with nothing overlapping and nothing standing on a bench, and the
// arithmetic of the `zone 3 by 2` the brief tags [TUNE], which is a line Piotr has to rule on.

import { describe, expect, it } from 'vitest';
import {
  BENCH_SLOT_LAYOUT,
  CABINET_SLOT_LAYOUT,
  JOINER_PREREQUISITES,
  M2_PER_PERSON,
  ROOM_LAYOUT,
  TOOL_CABINET,
  UNIT_WIDTH_CELLS,
} from '../../src/engine/constants';
import { findSpec, itemFootprint, itemZone, zoneOf } from '../../src/engine/machines';
import { canBuy } from '../../src/engine/game';
import { canPlace, canPlaceSpec, crewLimit, freeFloorM2, hallItems } from '../../src/engine/layout';
import { standsInTheHall } from '../../src/engine/machines';
import { cabinetsNeeded, canHire, missingForHire } from '../../src/engine/staff';
import { needsDucting } from '../../src/engine/machines';
import { renderHall } from '../../src/render/hall';
import { standingCell, stationRow } from '../../src/engine/stations';
import { covers, footprintCells } from '../../src/engine/walk';
import type { Equipment, GameState } from '../../src/engine/index';
import { buyNow, buyStartingKit, hireNow, newGame, placeEquipment } from '../helpers';

function countOf(state: ReturnType<typeof newGame>, specId: string): number {
  return state.equipment.filter((item) => item.specId === specId).length;
}

/** The day one hall, with its one cabinet on the first slot of the row. */
function hall(): GameState {
  return buyStartingKit(newGame({ difficulty: 'veryEasy' }));
}

function cabinetsOf(state: GameState): Equipment[] {
  return state.equipment.filter((item) => item.specId === TOOL_CABINET);
}

function overlap(
  one: { x: number; y: number; width: number; depth: number },
  two: { x: number; y: number; width: number; depth: number },
): boolean {
  return (
    one.x < two.x + two.width &&
    two.x < one.x + one.width &&
    one.y < two.y + two.depth &&
    two.y < one.y + one.depth
  );
}

describe('the tool cabinet in the catalogue', () => {
  it('stands two metres wide, 350, and one is wanted per worker', () => {
    const spec = findSpec(TOOL_CABINET);
    expect(spec).not.toBeNull();
    expect(spec?.price).toBe(350);
    // Two metres from Turn 21, because that is what the art side painted: drawers, doors and a
    // bench top, which is a two metre unit and not a metre square one. The picture is the fact and
    // the spec followed it (PIOTR's art, 19.09; CLAUDE.md T21 2.13).
    expect({ width: spec?.width, depth: spec?.depth, height: spec?.height }).toEqual({
      width: 2,
      depth: 1,
      height: 1,
    });
    // Its working zone is its own footprint and not the brief's 3 by 2: see the comment beside the
    // spec in `src/engine/constants.ts` for the arithmetic that rules that out.
    expect(zoneOf(TOOL_CABINET)).toEqual({ width: 2, depth: 1 });
    expect(spec?.perWorker).toBe(true);
    expect(spec?.stackable).toBe(true);
  });
});

describe('what cannot be bought without one', () => {
  it('refuses the hand edgebander and the hand tool set, and lets them through after', () => {
    let state = newGame();
    expect(canBuy(state, 'edgebander').ok).toBe(false);
    expect(canBuy(state, 'edgebander').reason).toBe('Needs Tool cabinet first');
    expect(canBuy(state, 'handToolSet').ok).toBe(false);
    expect(canBuy(state, 'handToolSet').reason).toBe('Needs Tool cabinet first');
    state = buyNow(state, TOOL_CABINET);
    expect(countOf(state, TOOL_CABINET)).toBe(1);
    expect(canBuy(state, 'edgebander').ok).toBe(true);
    expect(canBuy(state, 'handToolSet').ok).toBe(true);
  });

  it('leaves the buy undone, not half done, while the cabinet is missing', () => {
    const state = buyNow(newGame(), 'edgebander');
    expect(countOf(state, 'edgebander')).toBe(0);
  });
});

describe('the hand edgebander holds no cell of the floor', () => {
  it('cannot be placed anywhere, and is not in the way of anything', () => {
    const state = buyStartingKit(newGame());
    expect(standsInTheHall('edgebander')).toBe(false);
    expect(canPlaceSpec(state, 'edgebander', 6, 6, null).ok).toBe(false);
    expect(canPlaceSpec(state, 'edgebander', 6, 6, null).reason).toBe('It lives in a tool cabinet');
    const bander = state.equipment.find((item) => item.specId === 'edgebander');
    expect(bander).toBeDefined();
    expect(canPlace(state, bander?.id ?? '', 6, 6).ok).toBe(false);
    // It is not on the floor, so nothing collides with it and nothing is drawn for it.
    expect(hallItems(state).some((item) => item.specId === 'edgebander')).toBe(false);
    expect(renderHall(state)).not.toContain('Hand edgebander');
    // And there is no ducting to reconnect on something that never stood anywhere.
    expect(needsDucting('edgebander')).toBe(false);
  });

  it('is still sheet work, whatever cabinet it is kept in', () => {
    const spec = findSpec('edgebander');
    expect(spec?.usedOn).toBe('sheet');
  });
});

describe('hiring wants a free cabinet', () => {
  it('counts one for the owner and one for every joiner, and one more for the hire', () => {
    const state = newGame();
    expect(cabinetsNeeded(state)).toBe(1);
    expect(cabinetsNeeded(state, 1)).toBe(2);
    expect(JOINER_PREREQUISITES).toContain(TOOL_CABINET);
  });

  it('blocks the hire while there is no cabinet free, and lets it through when there is', () => {
    let state = buyStartingKit(newGame());
    // The day 1 kit buys one, which is the owner's: the joiner has none.
    expect(countOf(state, TOOL_CABINET)).toBe(1);
    expect(missingForHire(state, 'joiner')).toContain(TOOL_CABINET);
    for (const specId of ['locker', 'canteenSeat', 'handToolSet']) {
      state = buyNow(state, specId);
    }
    expect(canHire(state, 'joiner', 'novice').ok).toBe(false);
    expect(canHire(state, 'joiner', 'novice').reason).toContain('Tool cabinet');
    state = buyNow(state, TOOL_CABINET);
    expect(countOf(state, TOOL_CABINET)).toBe(2);
    expect(missingForHire(state, 'joiner')).toEqual([]);
    expect(canHire(state, 'joiner', 'novice').ok).toBe(true);
    state = hireNow(state, 'joiner', 'novice');
    expect(state.workers).toHaveLength(1);
    // And the next man wants a third.
    expect(missingForHire(state, 'joiner')).toContain(TOOL_CABINET);
  });

  it('stands the cabinets along the rear wall, clear of everything else', () => {
    let state = buyStartingKit(newGame());
    state = buyNow(state, TOOL_CABINET);
    const cabinets = state.equipment.filter((item) => item.specId === TOOL_CABINET);
    expect(cabinets).toHaveLength(2);
    const places = cabinets.map((item) => `${item.anchorX},${item.anchorY}`);
    expect(new Set(places).size).toBe(2);
    for (const item of cabinets) {
      expect(canPlaceSpec(state, TOOL_CABINET, item.anchorX, item.anchorY, item.id).ok).toBe(true);
    }
    // And one placed by hand collides with the next thing dropped on it.
    const extra = placeEquipment(state, TOOL_CABINET, { x: 6, y: 6 });
    expect(canPlaceSpec(state, TOOL_CABINET, 6, 6, null).ok).toBe(false);
    expect(hallItems(state).some((item) => item.id === extra.id)).toBe(true);
  });
});

describe('two metres wide, placed and stood at as any other 2 by 1 (CLAUDE.md T21 2.13)', () => {
  it('is 1 by 2 turned, which is what a rotated 2 by 1 is anywhere', () => {
    const cabinet = cabinetsOf(hall())[0];
    if (cabinet === undefined) throw new Error('the day one kit has a cabinet in it');
    expect(itemFootprint(cabinet)).toEqual({ width: 2, depth: 1, height: 1 });
    expect(itemZone(cabinet)).toEqual({ width: 2, depth: 1 });
    expect(itemFootprint({ ...cabinet, rotated: true })).toEqual({ width: 1, depth: 2, height: 1 });
  });

  it('is placed and refused as any other 2 by 1, with no rule of its own', () => {
    // `canPlaceSpec` works on the zone, so a 2 by 1 wants no change in it: this is the assertion that
    // says so rather than the paragraph in the brief.
    const state = hall();
    const first = CABINET_SLOT_LAYOUT[0];
    const second = CABINET_SLOT_LAYOUT[1];
    if (first === undefined || second === undefined) throw new Error('two slots are wanted');
    const standing = cabinetsOf(state)[0];
    if (standing === undefined) throw new Error('the day one kit has a cabinet in it');
    expect([standing.anchorX, standing.anchorY]).toEqual([first.x, first.y]);
    // Its own two cells are taken: one cell along is refused and names what is in the way.
    const clash = canPlaceSpec(state, TOOL_CABINET, first.x + 1, first.y, null);
    expect(clash.ok).toBe(false);
    expect(clash.reason).toBe('On the tool cabinet');
    // Two cells along is the next slot of the row and is free.
    expect(canPlaceSpec(state, TOOL_CABINET, second.x, second.y, null).ok).toBe(true);
    // And the last slot ends inside the hall: 18 and 19 of a hall 20 cells wide.
    const last = CABINET_SLOT_LAYOUT[CABINET_SLOT_LAYOUT.length - 1];
    if (last === undefined) throw new Error('a last slot is wanted');
    expect(last.x + (findSpec(TOOL_CABINET)?.width ?? 0)).toBe(UNIT_WIDTH_CELLS);
    expect(canPlaceSpec(state, TOOL_CABINET, UNIT_WIDTH_CELLS - 1, last.y, null).reason).toBe(
      'Off the floor',
    );
  });

  it('lays a cabinet a man out on the row with nothing overlapping and nothing on a bench', () => {
    // One for the owner and one for every worker (CLAUDE.md T6 3.5), which on a hall of six benches
    // is seven: the row holds six and the seventh falls back to the first free cell, the way any
    // purchase does.
    const state = hall();
    for (let more = 1; more < CABINET_SLOT_LAYOUT.length; more += 1) {
      const slot = CABINET_SLOT_LAYOUT[more];
      if (slot === undefined) throw new Error('a slot is wanted');
      expect(canPlaceSpec(state, TOOL_CABINET, slot.x, slot.y, null).ok, String(more)).toBe(true);
      placeEquipment(state, TOOL_CABINET, { x: slot.x, y: slot.y, id: `kit-cab-${more}` });
    }
    const boxes = cabinetsOf(state).map((item) => ({
      x: item.anchorX,
      y: item.anchorY,
      ...itemZone(item),
    }));
    expect(boxes).toHaveLength(CABINET_SLOT_LAYOUT.length);
    for (let one = 0; one < boxes.length; one += 1) {
      for (let two = one + 1; two < boxes.length; two += 1) {
        const a = boxes[one];
        const b = boxes[two];
        if (a === undefined || b === undefined) throw new Error('two boxes are wanted');
        expect(overlap(a, b), `${one} against ${two}`).toBe(false);
      }
    }
    // Nothing of the row is on the bench row under it, on a room, or outside the hall.
    for (const box of boxes) {
      expect(BENCH_SLOT_LAYOUT.some((bench) => bench.y >= box.y && bench.y < box.y + box.depth)).toBe(
        false,
      );
      for (const room of ROOM_LAYOUT) {
        expect(overlap(box, { x: room.x, y: room.y, width: room.width, depth: room.depth })).toBe(
          false,
        );
      }
      expect(box.x + box.width).toBeLessThanOrEqual(UNIT_WIDTH_CELLS);
    }
  });

  it('puts the man beside it and never on it, off the default row and no table of its own', () => {
    // `STATION_TABLE` has no `toolCabinet` row, so it takes `DEFAULT_ROW`, whose offsets count off
    // the whole cells the footprint covers: a 2 by 1 wants no table change. Asserted, not assumed.
    expect(stationRow(TOOL_CABINET)).toEqual(stationRow('somethingWithNoRowOfItsOwn'));
    const state = hall();
    const cabinet = cabinetsOf(state)[0];
    if (cabinet === undefined) throw new Error('the day one kit has a cabinet in it');
    const cells = footprintCells(cabinet);
    expect(cells.width).toBe(2);
    // The default row's waiting cell is a cell further out than the operator's, because the second
    // cell along a small item's front edge is the one the body leans over; the second place falls
    // back to the operator's, the row naming none.
    for (const [role, reach] of [['operator', 1], ['waiting', 2], ['second', 1]] as const) {
      const cell = standingCell(state, cabinet, role);
      // Beside the cabinet: never on one of the two cells it stands on.
      expect(covers(cells, cell), role).toBe(false);
      // And within reach of it, off one of its four sides.
      expect(
        cell.x >= cells.x - reach &&
          cell.x < cells.x + cells.width + reach &&
          cell.y >= cells.y - reach &&
          cell.y < cells.y + cells.depth + reach,
        role,
      ).toBe(true);
    }
  });
});

describe('the zone 3 by 2 the brief tags [TUNE] (CLAUDE.md T21 2.13)', () => {
  it('cannot be laid out at all: it stands on the bench row and on the cabinet beside it', () => {
    // Phase A left the zone equal to the footprint and wrote its reasons in a comment beside the
    // spec. This is that arithmetic, checked: it holds, and the section is a line for Piotr.
    const zone = { width: 3, depth: 2 };
    const first = CABINET_SLOT_LAYOUT[0];
    const second = CABINET_SLOT_LAYOUT[1];
    if (first === undefined || second === undefined) throw new Error('two slots are wanted');
    // One: the row is at y 3 and a zone two deep reaches into y 4, which is the workbench row. Every
    // bench of the day one hall is inside the first cabinet's zone, so the hall cannot be laid out.
    expect(first.y + zone.depth).toBeGreaterThan(BENCH_SLOT_LAYOUT[0]?.y ?? 0);
    const firstZone = { x: first.x, y: first.y, ...zone };
    const firstBench = BENCH_SLOT_LAYOUT[0];
    if (firstBench === undefined) throw new Error('a bench slot is wanted');
    expect(overlap(firstZone, { x: firstBench.x, y: firstBench.y, width: 2, depth: 1 })).toBe(true);
    // Two: the slots are two cells apart and a zone three wide overlaps its neighbour, so no two
    // cabinets could stand side by side on the row the game lays them out on.
    expect(overlap(firstZone, { x: second.x, y: second.y, ...zone })).toBe(true);
    // A row of them would want three cells each, and a hall twenty wide from x 8 holds four of the
    // seven a six man crew wants.
    let fits = 0;
    for (let x = first.x; x + zone.width <= UNIT_WIDTH_CELLS; x += zone.width) fits += 1;
    expect(fits).toBe(4);
  });

  it('would cost the player a man off the crew limit', () => {
    // The zone is what the free floor is measured against (`freeFloorM2`), so four more cells a
    // cabinet is four square metres a cabinet off the floor the crew is counted on.
    const state = hall();
    const before = freeFloorM2(state);
    const slot = CABINET_SLOT_LAYOUT[1];
    if (slot === undefined) throw new Error('a slot is wanted');
    placeEquipment(state, TOOL_CABINET, { x: slot.x, y: slot.y, id: 'kit-cab-2' });
    // A cabinet takes its own two cells today, and it would take six with the wider zone.
    expect(before - freeFloorM2(state)).toBe(2);
    const extra = 3 * 2 - 2 * 1;
    expect(extra).toBe(4);
    // Six of them is 24 m2, which is exactly one man of the limit (`M2_PER_PERSON`).
    expect(CABINET_SLOT_LAYOUT.length * extra).toBe(M2_PER_PERSON);
    expect(Math.floor((freeFloorM2(state) - M2_PER_PERSON) / M2_PER_PERSON)).toBe(
      crewLimit(state) - 1,
    );
  });
});

// The picture itself is measured against the new footprint in
// `tests/render/spriteClasses.test.ts`, where every delivered file is measured against the contract
// and the two the cabinet is behind on are written down with the size they owe: 112 by 112 delivered
// against 160 by 136 wanted, for `toolCabinet.standard.png` and its turned pair. The request is
// `docs/art/REQUESTS-T21.md` 2, and nothing of the art or of `docs/art/SPRITES.md` is touched
// (CLAUDE.md T21 section 6).

// @vitest-environment jsdom
// The welfare kit lives in the canteen (PIOTR, 17.09; CLAUDE.md T17 2.2): a seat and a locker
// stand inside the block, take no hall cell, cannot be dragged onto the floor, and the man who
// uses one stands in the doorway facing in. What they are worth is unchanged: a seat a man and a
// locker a man, which is what hiring a joiner still asks for.

import { describe, expect, it } from 'vitest';
import { ROOM_LAYOUT, WELFARE_IN_THE_CANTEEN, roomDoorCell } from '../../src/engine/constants';
import { canPlace, crewLimit, freeFloorM2, hallItems } from '../../src/engine/layout';
import { machineStation, standingCell } from '../../src/engine/stations';
import { shortfallForHire } from '../../src/engine/staff';
import { renderHall, stationCell } from '../../src/render/hall';
import type { Equipment, GameState } from '../../src/engine/index';
import { buyNow, buyStartingKit, fillRack, newGame } from '../helpers';

const CANTEEN = ROOM_LAYOUT.find((room) => room.id === 'canteen');

function insideTheCanteen(cell: { x: number; y: number }): boolean {
  if (CANTEEN === undefined) return false;
  return (
    cell.x >= CANTEEN.x &&
    cell.x < CANTEEN.x + CANTEEN.width &&
    cell.y >= CANTEEN.y &&
    cell.y < CANTEEN.y + CANTEEN.depth
  );
}

/** A hall with a seat and a locker bought, which is what hiring a joiner asks for. */
function withWelfare(): GameState {
  const bare = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
  return buyNow(buyNow(bare, 'locker'), 'canteenSeat');
}

function welfareOf(state: GameState): Equipment[] {
  return state.equipment.filter((item) => WELFARE_IN_THE_CANTEEN.includes(item.specId));
}

function page(svg: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = `<svg>${svg}</svg>`;
  return holder;
}

describe('the seats and the lockers', () => {
  it('stand inside the canteen and on no hall cell at all', () => {
    const state = withWelfare();
    const kit = welfareOf(state);
    expect(kit.length).toBe(2);
    for (const item of kit) {
      expect(insideTheCanteen({ x: item.anchorX, y: item.anchorY }), item.specId).toBe(true);
      // The hall's own collision does not know about them: they are not on the floor.
      expect(hallItems(state).some((entry) => entry.id === item.id), item.specId).toBe(false);
    }
  });

  it('eat none of the floor the crew is limited by', () => {
    const bare = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
    const state = withWelfare();
    expect(freeFloorM2(state)).toBe(freeFloorM2(bare));
    expect(crewLimit(state)).toBe(crewLimit(bare));
  });

  it('are drawn on the canteen block, with nothing to drag them by', () => {
    const state = withWelfare();
    const root = page(renderHall(state));
    for (const item of welfareOf(state)) {
      const drawn = root.querySelector(`[data-canteen-kit="${item.id}"]`);
      expect(drawn, item.specId).not.toBeNull();
      expect(drawn?.classList.contains('canteen-kit'), item.specId).toBe(true);
      // Setup mode drags what carries a data-kit, and this carries none.
      expect(root.querySelector(`[data-kit="${item.id}"]`), item.specId).toBeNull();
    }
  });

  it('refuse a hall cell when somebody asks for one', () => {
    const state = withWelfare();
    for (const item of welfareOf(state)) {
      const check = canPlace(state, item.id, 8, 8);
      expect(check.ok, item.specId).toBe(false);
      expect(check.reason, item.specId).toBe('It stands in the canteen');
    }
  });

  it('put the man who uses one in the canteen doorway, facing in', () => {
    const state = withWelfare();
    const door = roomDoorCell('canteen');
    for (const item of welfareOf(state)) {
      expect(standingCell(state, item), item.specId).toEqual(door);
      const stands = stationCell(state, machineStation(item.specId), { x: 2, y: 5 });
      expect({ x: stands.x, y: stands.y }, item.specId).toEqual(door);
      // Into the canteen, which is behind him from the doorway.
      expect(stands.facing, item.specId).toBe('ne');
    }
  });

  it('are worth exactly what they were worth: a seat a man and a locker a man', () => {
    const bare = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
    const short = shortfallForHire(bare, 'joiner').map((entry) => entry.specId);
    expect(short).toContain('locker');
    expect(short).toContain('canteenSeat');
    const state = withWelfare();
    const left = shortfallForHire(state, 'joiner').map((entry) => entry.specId);
    expect(left).not.toContain('locker');
    expect(left).not.toContain('canteenSeat');
  });
});

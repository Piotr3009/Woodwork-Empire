// Tool cabinets: one for every worker and one for the owner, and the hand edgebander lives in one
// instead of standing on the floor (CLAUDE.md T6 3.5).

import { describe, expect, it } from 'vitest';
import { JOINER_PREREQUISITES, TOOL_CABINET } from '../../src/engine/constants';
import { findSpec } from '../../src/engine/machines';
import { canBuy } from '../../src/engine/game';
import { canPlace, canPlaceSpec, hallItems } from '../../src/engine/layout';
import { standsInTheHall } from '../../src/engine/machines';
import { cabinetsNeeded, canHire, missingForHire } from '../../src/engine/staff';
import { needsDucting } from '../../src/engine/machines';
import { renderHall } from '../../src/render/hall';
import { act, buyStartingKit, newGame, placeEquipment } from '../helpers';

function countOf(state: ReturnType<typeof newGame>, specId: string): number {
  return state.equipment.filter((item) => item.specId === specId).length;
}

describe('the tool cabinet in the catalogue', () => {
  it('is a metre square, 350, and one is wanted per worker', () => {
    const spec = findSpec(TOOL_CABINET);
    expect(spec).not.toBeNull();
    expect(spec?.price).toBe(350);
    expect({ width: spec?.width, depth: spec?.depth, height: spec?.height }).toEqual({
      width: 1,
      depth: 1,
      height: 1,
    });
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
    state = act(state, { type: 'BUY_EQUIPMENT', specId: TOOL_CABINET });
    expect(countOf(state, TOOL_CABINET)).toBe(1);
    expect(canBuy(state, 'edgebander').ok).toBe(true);
    expect(canBuy(state, 'handToolSet').ok).toBe(true);
  });

  it('leaves the buy undone, not half done, while the cabinet is missing', () => {
    const state = act(newGame(), { type: 'BUY_EQUIPMENT', specId: 'edgebander' });
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

  it('keeps its bag interval and its effect', () => {
    const spec = findSpec('edgebander');
    expect(spec?.bagInterval).toBe(4800);
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
      state = act(state, { type: 'BUY_EQUIPMENT', specId });
    }
    expect(canHire(state, 'joiner', 'poor').ok).toBe(false);
    expect(canHire(state, 'joiner', 'poor').reason).toContain('Tool cabinet');
    state = act(state, { type: 'BUY_EQUIPMENT', specId: TOOL_CABINET });
    expect(countOf(state, TOOL_CABINET)).toBe(2);
    expect(missingForHire(state, 'joiner')).toEqual([]);
    expect(canHire(state, 'joiner', 'poor').ok).toBe(true);
    state = act(state, { type: 'HIRE', role: 'joiner', tier: 'poor' });
    expect(state.workers).toHaveLength(1);
    // And the next man wants a third.
    expect(missingForHire(state, 'joiner')).toContain(TOOL_CABINET);
  });

  it('stands the cabinets along the rear wall, clear of everything else', () => {
    let state = buyStartingKit(newGame());
    state = act(state, { type: 'BUY_EQUIPMENT', specId: TOOL_CABINET });
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

// @vitest-environment jsdom
// Hidden by what he walks behind (PIOTR, 02.10: "when a man goes behind a machine the machine does
// not hide him"; CLAUDE.md T26 2.4, 7): every frame a walking figure is put among the drawables
// round him by a full insertion, before every thing whose footprint he stands behind, so for every
// frame he is behind the moulder he is before it in the document. The keys are what they were.

import { beforeEach, describe, expect, it } from 'vitest';
import { footprintOrigin } from '../../src/engine/pipes';
import { renderHall } from '../../src/render/hall';
import { standsBehind } from '../../src/render/iso';
import { resetWalkers, resortFigures, stepWalkers, syncWalkers, walkerOf } from '../../src/render/walkers';
import { day53Hall } from '../helpers';

const straight = (from: { x: number; y: number }, to: { x: number; y: number }): Array<{ x: number; y: number }> => [
  from,
  to,
];

beforeEach(() => resetWalkers());

function footOf(node: Element): { x: number; y: number; width: number; depth: number } {
  const [x, y, width, depth] = (node.getAttribute('data-foot') ?? '').split(',').map(Number);
  return { x: x ?? 0, y: y ?? 0, width: width ?? 0, depth: depth ?? 0 };
}

describe('a man walking behind the moulder on the day 53 hall', () => {
  it('is before the moulder in the document for every frame his feet are behind it', () => {
    const state = day53Hall();
    const holder = document.createElement('div');
    holder.innerHTML = `<svg>${renderHall(state)}</svg>`;
    syncWalkers(holder, 0, straight);
    const live = holder.querySelector('[data-live="1"]') as Element;
    const moulder = live.querySelector('[data-sprite="spindleMoulder"]') as Element;
    expect(moulder).not.toBeNull();
    // Its drawn footprint, off the engine, and the same the scene wrote on it.
    const item = state.equipment.find((entry) => entry.specId === 'spindleMoulder');
    if (item === undefined) throw new Error('a moulder is wanted');
    const drawn = footprintOrigin(item);
    const foot = { x: drawn.x, y: drawn.y, width: drawn.width, depth: drawn.depth };
    expect(footOf(moulder)).toEqual(foot);
    // Frank, the labourer, walks the row behind it from end to end, a cell a second.
    const walker = walkerOf('worker-staff-7');
    if (walker === undefined) throw new Error('Frank is on the hall');
    const row = Math.floor(foot.y) - 1;
    walker.at = { x: Math.floor(foot.x) - 2, y: row };
    walker.path = [];
    for (let x = walker.at.x + 1; x <= Math.ceil(foot.x + foot.width) + 1; x += 1) walker.path.push({ x, y: row });
    walker.facings = walker.path.map(() => 'se' as const);
    resortFigures(holder);
    let framesBehind = 0;
    for (let frame = 1; frame <= 40 && walker.path.length > 0; frame += 1) {
      stepWalkers(holder, frame * 250);
      const feet = { x: walker.at.x + 0.5, y: walker.at.y + 0.5 };
      const nodes = Array.from(live.children);
      const him = nodes.findIndex((node) => node.getAttribute('data-figure') === 'worker-staff-7');
      const it = nodes.indexOf(moulder);
      if (standsBehind(feet, foot)) {
        framesBehind += 1;
        expect(him, `frame ${frame} at ${feet.x},${feet.y}`).toBeLessThan(it);
      }
    }
    expect(framesBehind).toBeGreaterThan(4);
  });

  it('keeps the keys as they were: his feet plus the offset, the moulder its zone s corner', () => {
    const state = day53Hall();
    const html = renderHall(state);
    const moulder = state.equipment.find((item) => item.specId === 'spindleMoulder');
    if (moulder === undefined) throw new Error('a moulder is wanted');
    expect(html).toContain(`data-depth="${moulder.anchorX + moulder.anchorY}"`);
  });
});

// @vitest-environment jsdom
// The man a role with no character sheet is drawn as (PIOTR, 16.09: a yellow shirted helper shows
// as a stroke and not a figure; CLAUDE.md T17 2.1). The placeholder is sized off the projection,
// so a man without a sheet stands as tall as a man with one.

import { describe, expect, it } from 'vitest';
import { characterArt } from '../../src/render/characters';
import { renderHall } from '../../src/render/hall';
import { TILE_RISE } from '../../src/render/iso';
import { CHARACTER_ROLES } from '../../src/ui/spriteCheck';
import type { GameState, WorkerRole } from '../../src/engine/index';
import { buyStartingKit, fillRack, hireNow, newGame } from '../helpers';

/** How tall a man is drawn: the 1.8 m the sheets declare, in scene pixels. */
const MAN = 1.8 * TILE_RISE;

/** A quiet hall with a helper who started this morning. */
function hallWithA(role: WorkerRole): GameState {
  const state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 60);
  state.enquiries = [];
  const hired = hireNow(state, role, role === 'joiner' ? 'poor' : null);
  for (const worker of hired.workers) worker.startDay = hired.clock.day;
  return hired;
}

/** What the figure's body measures on the screen: how far it reaches above his feet and how wide
 *  the widest part of it is. His name is not part of him. */
function bodyOf(group: Element): { top: number; width: number; shapes: number } {
  let top = 0;
  let width = 0;
  let shapes = 0;
  for (const node of Array.from(group.children)) {
    const tag = node.tagName.toLowerCase();
    if (tag === 'rect') {
      const y = Number(node.getAttribute('y') ?? '0');
      const w = Number(node.getAttribute('width') ?? '0');
      const h = Number(node.getAttribute('height') ?? '0');
      top = Math.min(top, y);
      width = Math.max(width, w);
      shapes += 1;
      expect(h).toBeGreaterThan(0);
      continue;
    }
    if (tag === 'circle') {
      const cy = Number(node.getAttribute('cy') ?? '0');
      const r = Number(node.getAttribute('r') ?? '0');
      top = Math.min(top, cy - r);
      width = Math.max(width, r * 2);
      shapes += 1;
      continue;
    }
    if (tag === 'ellipse') {
      const cy = Number(node.getAttribute('cy') ?? '0');
      const ry = Number(node.getAttribute('ry') ?? '0');
      top = Math.min(top, cy - ry);
      shapes += 1;
    }
  }
  return { top, width, shapes };
}

function groupOf(svg: string, selector: string): Element {
  const page = document.createElement('div');
  page.innerHTML = `<svg>${svg}</svg>`;
  const found = page.querySelector(selector);
  if (found === null) throw new Error(`no figure for ${selector}`);
  return found;
}

describe('the helper on the floor', () => {
  it('is drawn from his own sheets, which came in with the v28 patch', () => {
    const state = hallWithA('helper');
    const helper = state.workers.find((worker) => worker.role === 'helper');
    if (helper === undefined) throw new Error('no helper on the books');
    const group = groupOf(renderHall(state), `[data-worker="${helper.id}"]`);
    // He had no sheet when this was written. His walk, idle, carry and sweep were delivered with
    // the v28 patch (REPORT-T19, "Patch v28"), so he is the art now and not the placeholder.
    expect(group.querySelector('[data-character]')).not.toBeNull();
  });

  it('stands a man of full height for a role the art side has not drawn', () => {
    const state = hallWithA('helper');
    const helper = state.workers.find((worker) => worker.role === 'helper');
    if (helper === undefined) throw new Error('no helper on the books');
    // The sprayer has no sheets yet (docs/art/REQUESTS-T20.md 2), so he is the placeholder, and
    // the placeholder is what this measures.
    const id = 'staff-sprayer';
    state.workers.push({ ...helper, id, name: 'sprayer', role: 'sprayer' as WorkerRole });
    const group = groupOf(renderHall(state), `[data-worker="${id}"]`);
    expect(group.querySelector('[data-character]')).toBeNull();
    const body = bodyOf(group);
    // As tall as the 1.8 m man the sheets declare, give or take the rounding, where the old
    // capsule reached 30 px of the 43 he should.
    expect(-body.top).toBeGreaterThan(MAN * 0.9);
    expect(-body.top).toBeLessThanOrEqual(MAN + 1);
    // And wide enough to read as a man rather than a line: shoulders of a third of a metre.
    expect(body.width).toBeGreaterThan(TILE_RISE / 3);
    // A head, a trunk, two legs and two feet.
    expect(body.shapes).toBeGreaterThanOrEqual(6);
    expect(group.querySelector('circle')).not.toBeNull();
  });
});

describe('every role the art side has not drawn yet', () => {
  it('stands the same man, and only the owner, the joiner and the helper have sheets', () => {
    const state = hallWithA('helper');
    const helper = state.workers.find((worker) => worker.role === 'helper');
    if (helper === undefined) throw new Error('no helper on the books');
    // One of each role on the floor at once: the office ones are hired behind an admin and a
    // desk, and this is about how a man is drawn and not about who may be taken on.
    const drawn: string[] = [];
    for (const role of CHARACTER_ROLES) {
      // Three men are drawn now: the owner and the joiner from the start, and the helper since
      // the v28 patch (REPORT-T19, "Patch v28").
      if (role === 'owner' || role === 'joiner' || role === 'helper') {
        expect(characterArt(role, 'idle', 'sw'), role).not.toBeNull();
        continue;
      }
      expect(characterArt(role, 'idle', 'sw'), role).toBeNull();
      const id = `staff-${role}`;
      state.workers.push({ ...helper, id, name: role, role: role as WorkerRole });
      drawn.push(id);
    }
    const svg = renderHall(state);
    for (const id of drawn) {
      const group = groupOf(svg, `[data-worker="${id}"]`);
      expect(group.querySelector('[data-character]'), id).toBeNull();
      const body = bodyOf(group);
      expect(-body.top, id).toBeGreaterThan(MAN * 0.9);
      expect(body.width, id).toBeGreaterThan(TILE_RISE / 3);
    }
    expect(drawn).toHaveLength(CHARACTER_ROLES.length - 3);
  });
});

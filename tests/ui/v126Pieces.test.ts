/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// @vitest-environment jsdom
// v126: the hall written again only where it has changed [PIOTR, 24.10: "redrawing every second
// makes no sense: only let the animations run, and work it out again when something changes"]. The
// live layer comes in its pieces, one a drawable. A piece whose node stands with the mark the piece
// carries is not parsed, and its node is left as it is but for its depth; a piece whose node stands
// made of the same markup after its first tag has that tag's attributes written and nothing else;
// everything else is parsed and patched as before. The page left is the page the whole writing left.

import { afterEach, describe, expect, it } from 'vitest';
import { whilePinned } from '../../src/engine/pinned';
import type { GameState } from '../../src/engine/types';
import { hallScene } from '../../src/render/hall';
import { patchInto, patchPieces } from '../../src/ui/patch';
import { buyStartingKit, clearEvents, newGame, runClock } from '../helpers';

const SVG = 'http://www.w3.org/2000/svg';

/** An empty SVG group on the page, the shape of the hall's live layer. */
function group(): SVGGElement {
  const svg = document.createElementNS(SVG, 'svg');
  const layer = document.createElementNS(SVG, 'g');
  svg.appendChild(layer);
  document.body.appendChild(svg);
  return layer;
}

/** A drawable as the hall writes one: what it is drawn for, its depth, the mark of its markup (here
 *  simply given) and its picture inside it. */
function drawable(
  identity: string,
  options: { depth?: number; sig?: string; extra?: string; inside?: string } = {},
): string {
  const inside = options.inside ?? `<image href="${identity.split('=')[1] ?? 'x'}.png" x="0" y="0"></image>`;
  const [name, value] = identity.split('=');
  return (
    `<g data-depth="${options.depth ?? 1}" data-sig="${options.sig ?? 's'}" ${name}="${value}"${options.extra ?? ''}>` +
    `${inside}</g>`
  );
}

/** What the page did to the layer while `work` ran. */
function watched(target: Node, work: () => void): MutationRecord[] {
  const observer = new MutationObserver(() => undefined);
  observer.observe(target, { subtree: true, attributes: true, childList: true, characterData: true });
  work();
  const records = observer.takeRecords();
  observer.disconnect();
  return records;
}

/** A fixed run of numbers, so every run of the test is the same. */
function numbers(seed: number): () => number {
  let value = seed;
  return () => {
    value = (Math.imul(value, 1103515245) + 12345) >>> 0;
    return value / 4294967296;
  };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('the live layer piece by piece (v126)', () => {
  it('leaves the page the whole writing leaves, page after page, as things come, go, change and move', () => {
    const random = numbers(126);
    const whole = group();
    const pieces = group();
    // Forty things of the hall, each with a mark and a depth that change now and then, some drawn
    // twice for one thing, one drawn as two nodes, and a label that says what it is drawn for none.
    let things = Array.from({ length: 40 }, (_, index) => ({
      identity: index % 3 === 0 ? `data-figure=man-${index}` : `data-kit=kit-${index}`,
      sig: 's0',
      depth: index,
      transform: `translate(${index},0)`,
      twice: index % 11 === 5,
    }));
    for (let page = 0; page < 60; page += 1) {
      things = things.map((thing) => {
        const roll = random();
        if (roll < 0.1) return { ...thing, sig: `s${page}`, transform: `translate(${page},${thing.depth})` };
        if (roll < 0.2) return { ...thing, sig: `t${page}` };
        if (roll < 0.3) return { ...thing, depth: thing.depth + (random() < 0.5 ? -3.5 : 3.5) };
        return thing;
      });
      if (page % 7 === 3) things = things.filter((_, index) => index !== Math.floor(random() * things.length));
      if (page % 5 === 2) {
        things.push({ identity: `data-kit=new-${page}`, sig: 'n', depth: random() * 40, transform: 'translate(0,0)', twice: false });
      }
      const sorted = things.slice().sort((left, right) => left.depth - right.depth);
      const parts: string[] = [];
      for (const thing of sorted) {
        const extra = ` transform="${thing.transform}"`;
        parts.push(drawable(thing.identity, { depth: thing.depth, sig: thing.sig, extra }));
        if (thing.twice) parts.push(drawable(thing.identity, { depth: thing.depth, sig: `${thing.sig}b`, extra }));
      }
      parts.splice(3, 0, `<g data-kit="pair-${page % 2}"><rect></rect></g><text x="0">two nodes</text>`);
      parts.push(`<text x="1" y="2">${page % 4 === 0 ? 'a label' : 'another label'}</text>`);
      patchInto(whole, parts.join(''));
      patchPieces(pieces, parts);
      expect(pieces.innerHTML).toBe(whole.innerHTML);
    }
  });

  it('keeps a node whose piece carries its mark as it stands, inside untouched, and writes only its depth', () => {
    const layer = group();
    patchPieces(layer, [drawable('data-kit=a', { depth: 1 }), drawable('data-kit=b', { depth: 2 })]);
    const [a, b] = Array.from(layer.children);
    // What the frame did to the picture since the page was written: a machine's sheet on its frame.
    a?.querySelector('image')?.setAttribute('x', '-120');
    const records = watched(layer, () =>
      patchPieces(layer, [drawable('data-kit=a', { depth: 1.5 }), drawable('data-kit=b', { depth: 2 })]),
    );
    expect(Array.from(layer.children)).toEqual([a, b]);
    expect(a?.getAttribute('data-depth')).toBe('1.5');
    expect(a?.querySelector('image')?.getAttribute('x')).toBe('-120');
    expect(records.map((record) => [record.type, record.attributeName, record.target])).toEqual([
      ['attributes', 'data-depth', a],
    ]);
  });

  it('writes only the first tag of a piece whose inside is the same, keeping its node and what the frame did inside it', () => {
    const layer = group();
    const art = '<g data-character="1" class="figure-flip"><image href="engineer.png" x="0" y="0"></image></g>';
    const walked = (x: number, sig: string): string =>
      `<g data-depth="${x}" data-sig="${sig}" data-engineer="3:0" transform="translate(${x},4)" pointer-events="none">${art}</g>`;
    patchPieces(layer, [drawable('data-kit=a'), walked(1, 'e1')]);
    const engineer = layer.querySelector('[data-engineer]');
    // The frame faced him the other way and played him on.
    engineer?.querySelector('[data-character]')?.setAttribute('transform', 'scale(-1,1)');
    engineer?.querySelector('image')?.setAttribute('x', '-48');
    const records = watched(layer, () => patchPieces(layer, [drawable('data-kit=a'), walked(2, 'e2')]));
    expect(layer.querySelector('[data-engineer]')).toBe(engineer);
    expect(engineer?.getAttribute('transform')).toBe('translate(2,4)');
    expect(engineer?.getAttribute('data-sig')).toBe('e2');
    expect(engineer?.getAttribute('data-depth')).toBe('2');
    // Nothing inside him written, nothing taken out or put in.
    expect(engineer?.querySelector('[data-character]')?.getAttribute('transform')).toBe('scale(-1,1)');
    expect(engineer?.querySelector('image')?.getAttribute('x')).toBe('-48');
    expect(records.every((record) => record.type === 'attributes' && record.target === engineer)).toBe(true);
    expect(records.map((record) => record.attributeName).sort()).toEqual(['data-depth', 'data-sig', 'transform']);
    // And with nothing done in between, the page is the page the whole writing leaves.
    const whole = group();
    const pieces = group();
    for (const x of [1, 2, 3]) {
      patchInto(whole, drawable('data-kit=a') + walked(x, `e${x}`));
      patchPieces(pieces, [drawable('data-kit=a'), walked(x, `e${x}`)]);
      expect(pieces.innerHTML).toBe(whole.innerHTML);
    }
  });

  it('takes an attribute gone from the first tag off the node, as a fresh node would not have it', () => {
    const layer = group();
    patchPieces(layer, [drawable('data-kit=a', { sig: 'one', extra: ' class="fx-breathe"' })]);
    const node = layer.firstElementChild;
    patchPieces(layer, [drawable('data-kit=a', { sig: 'two' })]);
    expect(layer.firstElementChild).toBe(node);
    expect(node?.hasAttribute('class')).toBe(false);
    expect(node?.getAttribute('data-sig')).toBe('two');
  });

  it('parses a piece whose first tag it cannot be sure of reading as the browser does, as the whole writing would', () => {
    const inside = '<image href="a.png" x="0" y="0"></image>';
    // A character written as an entity the browser reads and the piece's own reading does not, and
    // an attribute whose name the browser writes in its own case.
    const tags = [
      (sig: string, x: number) => `<g data-depth="1" data-sig="${sig}" data-kit="a" data-label="&#169; ${x}">${inside}</g>`,
      (sig: string, x: number) => `<svg data-depth="1" data-sig="${sig}" data-kit="a" viewBox="0 0 ${x} 10">${inside}</svg>`,
    ];
    for (const tag of tags) {
      const whole = group();
      const pieces = group();
      patchInto(whole, tag('one', 1));
      patchPieces(pieces, [tag('one', 1)]);
      // The frame moved the picture in both.
      whole.querySelector('image')?.setAttribute('x', '-7');
      pieces.querySelector('image')?.setAttribute('x', '-7');
      patchInto(whole, tag('two', 2));
      patchPieces(pieces, [tag('two', 2)]);
      expect(pieces.innerHTML).toBe(whole.innerHTML);
      expect(pieces.querySelector('image')?.getAttribute('x')).toBe('0');
    }
  });

  it('gives the hall s live layer in its pieces, and its whole is their join', () => {
    const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    const scene = whilePinned(state, () => hallScene(state, {}));
    expect(scene.liveParts).toBeDefined();
    expect((scene.liveParts ?? []).length).toBeGreaterThan(5);
    expect((scene.liveParts ?? []).join('')).toBe(scene.live);
  });

  it('writes a played hall piece by piece as it writes it whole, minute after minute', () => {
    let state: GameState = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    const holder = document.createElement('div');
    holder.innerHTML = whilePinned(state, () => hallScene(state, {}).shell()) + whilePinned(state, () => hallScene(state, {}).shell());
    const [whole, pieces] = Array.from(holder.querySelectorAll('[data-live]'));
    if (whole === undefined || pieces === undefined) throw new Error('no live slot');
    for (let minute = 0; minute < 40; minute += 1) {
      state = clearEvents(runClock(state, 1));
      const now = state;
      const parts = whilePinned(now, () => hallScene(now, {}).liveParts ?? []);
      patchInto(whole, parts.join(''));
      patchPieces(pieces, parts);
      expect(pieces.innerHTML).toBe(whole.innerHTML);
    }
  });
});

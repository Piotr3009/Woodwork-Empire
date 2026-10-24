/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// @vitest-environment jsdom
// v125: the men put in the painter's order without reading the whole hall for each of them [PIOTR,
// 24.10: "code it so that everything speeds up"]. A batch of placings reads the drawables once and
// keeps its list in step with every move it makes; the order it leaves on the page is the order the
// one-at-a-time reading left, placing for placing.

import { describe, expect, it } from 'vitest';
import { type FloorBox, figureSlot } from '../../src/render/iso';
import { type DrawableBatch, placeAmongDrawables } from '../../src/render/walkers';

const SVG = 'http://www.w3.org/2000/svg';

/** A fixed run of numbers, so every run of the test is the same. */
function numbers(seed: number): () => number {
  let value = seed;
  return () => {
    value = (Math.imul(value, 1103515245) + 12345) >>> 0;
    return value / 4294967296;
  };
}

function depthOf(node: Element): number | null {
  const raw = node.getAttribute('data-depth');
  if (raw === null) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function footOf(node: Element): FloorBox | null {
  const raw = node.getAttribute('data-foot');
  if (raw === null) return null;
  const [x, y, width, depth] = raw.split(',').map(Number);
  return [x, y, width, depth].some((value) => value === undefined || !Number.isFinite(value))
    ? null
    : { x: x as number, y: y as number, width: width as number, depth: depth as number };
}

/** The placing as it was before v125, the run read off the page afresh for every man: the model
 *  the batch is held to. */
const modelPlaced = new WeakMap<Element, string>();
function placeOneAtATime(node: Element, depth: number, feet: { x: number; y: number }): void {
  const written = String(Math.round(depth * 1000) / 1000);
  const key = `${written}|${feet.x}|${feet.y}`;
  if (modelPlaced.get(node) === key && node.getAttribute('data-depth') === written) return;
  if (node.getAttribute('data-depth') !== written) node.setAttribute('data-depth', written);
  modelPlaced.set(node, key);
  const parent = node.parentNode;
  if (parent === null) return;
  const before: Element[] = [];
  for (let at = node.previousElementSibling; at !== null && depthOf(at) !== null; at = at.previousElementSibling) before.push(at);
  before.reverse();
  const after: Element[] = [];
  for (let at = node.nextElementSibling; at !== null && depthOf(at) !== null; at = at.nextElementSibling) after.push(at);
  const run = [...before, ...after];
  if (run.length === 0) return;
  const slot = figureSlot(run.map((sibling) => ({ depth: depthOf(sibling) ?? 0, foot: footOf(sibling) })), { depth, feet });
  if (slot === before.length) return;
  const target = run[slot];
  if (target !== undefined) parent.insertBefore(node, target);
  else parent.insertBefore(node, (run[run.length - 1] as Element).nextSibling);
}

/** A hall's live layer in small: things on the floor with their depth and floor, a few nodes with no
 *  depth between them (which a man is never put across), and men with a depth and no floor. */
function layer(random: () => number): { parent: Element; men: Element[] } {
  const parent = document.createElementNS(SVG, 'g');
  const men: Element[] = [];
  for (let n = 0; n < 400; n += 1) {
    const node = document.createElementNS(SVG, 'g');
    node.setAttribute('data-id', `n${n}`);
    const kind = random();
    if (kind < 0.04) {
      // No depth at all: the edge of a run.
    } else if (kind < 0.2) {
      node.setAttribute('data-depth', String(Math.round(random() * 400 * 1000) / 1000));
      node.setAttribute('data-man', '1');
      men.push(node);
    } else {
      const x = Math.floor(random() * 60);
      const y = Math.floor(random() * 30);
      node.setAttribute('data-depth', String(x + y + random()));
      node.setAttribute('data-foot', `${x},${y},${1 + Math.floor(random() * 6)},${1 + Math.floor(random() * 4)}`);
    }
    parent.appendChild(node);
  }
  return { parent, men };
}

function orderOf(parent: Element): string {
  return Array.from(parent.children, (node) => `${node.getAttribute('data-id')}:${node.getAttribute('data-depth')}`).join(' ');
}

describe('a batch of placings (v125)', () => {
  it('leaves the page in the order the one-at-a-time reading left it, frame after frame', () => {
    const random = numbers(20261024);
    const { parent, men } = layer(random);
    const copy = parent.cloneNode(true) as Element;
    const copyMen = Array.from(copy.querySelectorAll('[data-man]'));
    expect(men.length).toBeGreaterThan(40);
    let moves = 0;
    for (let frame = 0; frame < 40; frame += 1) {
      const batch: DrawableBatch = new Map();
      men.forEach((man, index) => {
        // Some stand still, as most men do in most frames; the rest step somewhere new.
        const still = random() < 0.3;
        const feet = still ? { x: 1.5, y: 1.5 } : { x: Math.floor(random() * 62) + 0.5, y: Math.floor(random() * 32) + 0.5 };
        const depth = Math.floor(feet.x) + Math.floor(feet.y) + 0.25;
        if (placeAmongDrawables(man, depth, feet, batch)) moves += 1;
        placeOneAtATime(copyMen[index] as Element, depth, feet);
      });
      expect(orderOf(parent)).toBe(orderOf(copy));
    }
    expect(moves).toBeGreaterThan(100);
  });

  it('reads the page again when it has changed under the batch', () => {
    const random = numbers(7);
    const { parent, men } = layer(random);
    const copy = parent.cloneNode(true) as Element;
    const copyMen = Array.from(copy.querySelectorAll('[data-man]'));
    const batch: DrawableBatch = new Map();
    const first = men[0] as Element;
    placeAmongDrawables(first, 50.25, { x: 25.5, y: 25.5 }, batch);
    placeOneAtATime(copyMen[0] as Element, 50.25, { x: 25.5, y: 25.5 });
    // The page takes a thing away and puts another in, between two placings of one batch.
    for (const holder of [parent, copy]) {
      holder.querySelector('[data-foot]')?.remove();
      const added = document.createElementNS(SVG, 'g');
      added.setAttribute('data-id', 'added');
      added.setAttribute('data-depth', '30.5');
      added.setAttribute('data-foot', '20,10,2,2');
      holder.insertBefore(added, holder.children[150] ?? null);
      holder.lastElementChild?.remove();
    }
    men.slice(1, 20).forEach((man, index) => {
      const feet = { x: 3 + index * 2.5, y: 4.5 + index };
      placeAmongDrawables(man, feet.x + feet.y, feet, batch);
      placeOneAtATime(copyMen[index + 1] as Element, feet.x + feet.y, feet);
    });
    expect(orderOf(parent)).toBe(orderOf(copy));
  });
});

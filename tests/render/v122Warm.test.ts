/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// @vitest-environment jsdom
// v122 [PIOTR, 20.10: "they still disappear and blink"]: the house factory's frames are held as blobs
// and not decoded as they land (v120's decode of a hundred and two frames, five hundred megabytes
// decoded, pushed the pictures on the screen out of the browser's keeping); the one frame each
// station shows next is decoded ahead, once in a while; and every sprite is drawn
// `decoding="sync"`, so a big picture is never painted as an empty tile first.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { lineModulesOf } from '../../src/engine/constants';
import type { GameState, Worker } from '../../src/engine/index';
import { isWorkingDay } from '../../src/engine/clock';
import { answerLineOffer, lineState, runningLineContract } from '../../src/engine/lineContract';
import { renderHall } from '../../src/render/hall';
import { WARM_AGAIN_MS, cachedUrl, prefetch, resetPrefetch, warm } from '../../src/render/prefetch';
import { spriteImage } from '../../src/render/sprites';
import { act, clearEvents, newGame, nextDay, placeEquipment, testJoiner } from '../helpers';

const fetched: Array<{ url: string; answer: () => void }> = [];
const decoded: string[] = [];
const realFetch = (globalThis as { fetch?: unknown }).fetch;
const realCreate = URL.createObjectURL;
const realRevoke = URL.revokeObjectURL;
const realImage = (globalThis as { Image?: unknown }).Image;

class FakeImage {
  src = '';
  decode(): Promise<void> {
    decoded.push(this.src);
    return Promise.resolve();
  }
}

beforeEach(() => {
  fetched.length = 0;
  decoded.length = 0;
  (globalThis as { fetch?: unknown }).fetch = (url: string) =>
    new Promise((resolve) => {
      fetched.push({ url, answer: () => resolve({ ok: true, status: 200, blob: () => Promise.resolve({ name: url }) }) });
    });
  URL.createObjectURL = ((blob: { name?: string }) => `blob:${blob.name ?? ''}`) as typeof URL.createObjectURL;
  URL.revokeObjectURL = (() => undefined) as typeof URL.revokeObjectURL;
  (globalThis as { Image?: unknown }).Image = FakeImage;
  resetPrefetch();
});

afterEach(() => {
  resetPrefetch();
  (globalThis as { fetch?: unknown }).fetch = realFetch;
  URL.createObjectURL = realCreate;
  URL.revokeObjectURL = realRevoke;
  (globalThis as { Image?: unknown }).Image = realImage;
});

async function landAll(): Promise<void> {
  for (let guard = 0; guard < 400; guard += 1) {
    const next = fetched.find((entry) => !(entry as { done?: boolean }).done);
    if (next === undefined) break;
    (next as { done?: boolean }).done = true;
    next.answer();
    for (let i = 0; i < 6; i += 1) await Promise.resolve();
  }
}

function houseFactory(): GameState {
  let state = newGame({ difficulty: 'veryEasy' });
  state.cash = 900000000;
  state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
  state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'second' }));
  for (let stage = 0; stage < 5; stage += 1) {
    state.cash = 900000000;
    state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'long' }));
  }
  state.cash = 900000000;
  state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'wide' }));
  state.cash = 90000000;
  state.reputation = 40;
  state.enquiries = [];
  lineModulesOf('house').forEach((id, index) =>
    placeEquipment(state, id, { x: 5 + 14 * index, y: 0, id: `kit-line-1-${index + 1}` }),
  );
  for (const item of state.equipment) {
    if (item.id.startsWith('kit-line-1-')) item.line = 1;
  }
  lineState(state, 1).kind = 'house';
  for (let n = 1; n <= 10; n += 1) {
    const engineer: Worker = { ...testJoiner(`eng-${n}`, `Eng ${n}`), role: 'lineEngineer', tier: null, rate: 0, monthlyWage: 15000 };
    state.workers.push(engineer);
  }
  state = nextDay(state);
  for (let guard = 0; guard < 5 && !isWorkingDay(state.clock.day); guard += 1) state = nextDay(state);
  state = clearEvents(state);
  state.stock.boards = 400;
  state.stock.glass = 200;
  const record = lineState(state, 1);
  if (record.contract === null) throw new Error('the house factory s contract is written');
  record.contract.status = 'offered';
  answerLineOffer(state, 1, 'take');
  if (runningLineContract(state, 1) === null) throw new Error('the contract runs');
  return state;
}

describe('the blobs and the frame decoded ahead (v122)', () => {
  it('holds a blob as it lands and decodes nothing of it', async () => {
    prefetch(['/sprites/a.png', '/sprites/b.png']);
    await landAll();
    expect(cachedUrl('/sprites/a.png')).toBe('blob:/sprites/a.png');
    expect(cachedUrl('/sprites/b.png')).toBe('blob:/sprites/b.png');
    expect(decoded).toEqual([]);
  });

  it('decodes a frame ahead from its blob, not before the blob is held, and once in a while', async () => {
    expect(warm('/sprites/a.png', 0)).toBe(false);
    prefetch(['/sprites/a.png']);
    await landAll();
    expect(warm('/sprites/a.png', 1000)).toBe(true);
    expect(decoded).toEqual(['blob:/sprites/a.png']);
    expect(warm('/sprites/a.png', 1000 + WARM_AGAIN_MS - 1)).toBe(false);
    expect(warm('/sprites/a.png', 1000 + WARM_AGAIN_MS)).toBe(true);
    expect(decoded).toEqual(['blob:/sprites/a.png', 'blob:/sprites/a.png']);
  });

  it('decodes ahead the one frame each station shows next, and nothing else of the factory', async () => {
    const state = houseFactory();
    lineState(state, 1).minutes = 240;
    renderHall(state);
    await landAll();
    expect(decoded).toEqual([]);
    renderHall(state);
    expect(decoded.sort()).toEqual(lineModulesOf('house').map((id) => `blob:/sprites/${id}.standard.work09.png`).sort());
    // A second page asks nothing again.
    renderHall(state);
    expect(decoded).toHaveLength(6);
  });
});

describe('every sprite (v122)', () => {
  it('is drawn decoded before it is painted', () => {
    expect(spriteImage('/sprites/x.png', { x: 0, y: 0, width: 10, height: 10 })).toContain('decoding="sync"');
    const hall = document.createElement('div');
    hall.innerHTML = renderHall(houseFactory());
    const images = Array.from(hall.querySelectorAll('[data-kit] image'));
    expect(images.length).toBeGreaterThanOrEqual(6);
    for (const image of images) expect(image.getAttribute('decoding'), image.getAttribute('href') ?? '').toBe('sync');
  });
});

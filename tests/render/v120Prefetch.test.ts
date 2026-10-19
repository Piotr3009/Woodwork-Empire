/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// @vitest-environment jsdom
// v120 [PIOTR, 19.10: "the houses disappear"]: the house factory's station frames are fetched ahead
// of their minute, the two wanted next first, each file once a page, one at a time, held as blobs
// in memory and drawn from them, so the swap at the next sixteenth of the cycle goes nowhere near
// the network and the station never blinks empty.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HOUSE_WORK_FRAMES, lineModulesOf } from '../../src/engine/constants';
import type { GameState, Worker } from '../../src/engine/index';
import { isWorkingDay } from '../../src/engine/clock';
import { answerLineOffer, lineState, runningLineContract } from '../../src/engine/lineContract';
import { renderHall } from '../../src/render/hall';
import { cachedUrl, prefetch, prefetchQueue, resetPrefetch } from '../../src/render/prefetch';
import { act, clearEvents, newGame, nextDay, placeEquipment, testJoiner } from '../helpers';

/** Stand ins for the browser: `fetch` answers when told to, object URLs are named after their
 *  file, and `Image` decodes at once. */
const fetched: Array<{ url: string; answer: (ok: boolean) => void }> = [];
let objectUrls = 0;
const realFetch = (globalThis as { fetch?: unknown }).fetch;
const realCreate = URL.createObjectURL;
const realRevoke = URL.revokeObjectURL;
const realImage = (globalThis as { Image?: unknown }).Image;

class FakeImage {
  src = '';
  decode(): Promise<void> {
    return Promise.resolve();
  }
}

beforeEach(() => {
  fetched.length = 0;
  objectUrls = 0;
  (globalThis as { fetch?: unknown }).fetch = (url: string) =>
    new Promise((resolve) => {
      fetched.push({
        url,
        answer: (ok: boolean) => resolve({ ok, status: ok ? 200 : 404, blob: () => Promise.resolve({ size: 1, name: url }) }),
      });
    });
  URL.createObjectURL = ((blob: { name?: string }) => {
    objectUrls += 1;
    return `blob:${blob.name ?? ''}#${objectUrls}`;
  }) as typeof URL.createObjectURL;
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

/** Lets the file on the way land, and the queue move on. */
async function land(ok = true): Promise<void> {
  const last = fetched.at(-1);
  last?.answer(ok);
  for (let i = 0; i < 6; i += 1) await Promise.resolve();
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

function page(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

describe('the queue (v120)', () => {
  it('asks for one file at a time, the first ones first, each once, holds each as a blob and moves on as each lands', async () => {
    prefetch(['/sprites/a.png', '/sprites/b.png']);
    expect(fetched.map((entry) => entry.url)).toEqual(['/sprites/a.png']);
    expect(prefetchQueue()).toEqual(['/sprites/b.png']);
    prefetch(['/sprites/c.png', '/sprites/a.png'], true);
    expect(prefetchQueue()).toEqual(['/sprites/c.png', '/sprites/b.png']);
    expect(cachedUrl('/sprites/a.png')).toBe('/sprites/a.png');
    await land();
    expect(cachedUrl('/sprites/a.png')).toBe('blob:/sprites/a.png#1');
    expect(fetched.map((entry) => entry.url)).toEqual(['/sprites/a.png', '/sprites/c.png']);
    await land();
    await land();
    expect(fetched.map((entry) => entry.url)).toEqual(['/sprites/a.png', '/sprites/c.png', '/sprites/b.png']);
    expect(prefetchQueue()).toEqual([]);
    expect(cachedUrl('/sprites/b.png')).toBe('blob:/sprites/b.png#3');
    // Asked again, nothing is fetched twice.
    prefetch(['/sprites/a.png', '/sprites/b.png', '/sprites/c.png']);
    expect(fetched).toHaveLength(3);
  });

  it('goes on past a file that fails, and draws that one from its file', async () => {
    prefetch(['/sprites/x.png', '/sprites/y.png']);
    await land(false);
    expect(fetched.map((entry) => entry.url)).toEqual(['/sprites/x.png', '/sprites/y.png']);
    expect(cachedUrl('/sprites/x.png')).toBe('/sprites/x.png');
  });
});

describe('the hall s stations (v120)', () => {
  it('asks for the two frames after the one drawn first, then the rest of the sixteen and the empty picture', () => {
    const state = houseFactory();
    lineState(state, 1).minutes = 240;
    renderHall(state);
    const asked = [fetched[0]?.url ?? '', ...prefetchQueue()];
    // Frame 08 shown on every station: the twelve frames 09 and 10 of the six stations head the
    // line, station 1's 09 already on its way, and the rest come after them.
    expect(asked[0]).toBe('/sprites/houseLine1.standard.work09.png');
    expect(new Set(asked.slice(0, 12))).toEqual(
      new Set(lineModulesOf('house').flatMap((id) => [`/sprites/${id}.standard.work09.png`, `/sprites/${id}.standard.work10.png`])),
    );
    // Every station's seventeen files are asked for, each once: six times sixteen frames and six empties.
    expect(new Set(asked).size).toBe(asked.length);
    expect(asked).toHaveLength(6 * (HOUSE_WORK_FRAMES + 1));
    for (const id of lineModulesOf('house')) {
      expect(asked).toContain(`/sprites/${id}.standard.empty.png`);
      expect(asked).toContain(`/sprites/${id}.standard.work15.png`);
    }
    // The last frame drawn wants the first two of the next cycle.
    resetPrefetch();
    fetched.length = 0;
    lineState(state, 1).minutes = 470;
    renderHall(state);
    const again = [fetched[0]?.url ?? '', ...prefetchQueue()];
    expect(again[0]).toBe('/sprites/houseLine1.standard.work00.png');
    expect(new Set(again.slice(0, 12))).toEqual(
      new Set(lineModulesOf('house').flatMap((id) => [`/sprites/${id}.standard.work00.png`, `/sprites/${id}.standard.work01.png`])),
    );
  });

  it('draws a station from its blob once the file is held, and from the file until then', async () => {
    const state = houseFactory();
    lineState(state, 1).minutes = 240;
    let hall = page(renderHall(state));
    const href = (): string | null => hall.querySelector('[data-sprite="houseLine1"] image')?.getAttribute('href') ?? null;
    expect(href()).toBe('/sprites/houseLine1.standard.work08.png');
    // The frames land one by one; the frame on show is far down the line, so the page asks for it.
    prefetch(['/sprites/houseLine1.standard.work08.png'], true);
    while (cachedUrl('/sprites/houseLine1.standard.work08.png') === '/sprites/houseLine1.standard.work08.png') await land();
    hall = page(renderHall(state));
    expect(href()).toMatch(/^blob:\/sprites\/houseLine1\.standard\.work08\.png#\d+$/);
    // Everything else is drawn from its file as before.
    expect(hall.querySelector('[data-sprite="workbench"] image')?.getAttribute('href') ?? '/sprites/').toMatch(/^\/sprites\//);
  });

  it('asks for nothing of a window line, and nothing twice on a second page', () => {
    const state = houseFactory();
    renderHall(state);
    const count = fetched.length + prefetchQueue().length;
    renderHall(state);
    expect(fetched.length + prefetchQueue().length).toBe(count);
    expect([fetched[0]?.url ?? '', ...prefetchQueue()].every((url) => url.includes('houseLine'))).toBe(true);
  });
});

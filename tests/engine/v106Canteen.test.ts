/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// @vitest-environment jsdom
// v106 [PIOTR, 18.10]: the canteen's six refits ("the canteens, with a purchase of course"; "dearer,
// twice" the office's; the mockup approved), bought one after the other on the Premises page, open
// the next morning, levels 3 to 6 only in an enlarged canteen, every level one picture of the room
// with a man's name on his plate under the pointer; and the taxman's half of the whole account once
// it is over £20,000,000 ("of the whole").

import { describe, expect, it } from 'vitest';
import {
  CANTEEN_LEVELS,
  CANTEEN_LEVEL_WIDE_FROM,
  CANTEEN_REGIONS_WIDE,
  OFFICE_LEVELS,
  STATE_VERSION,
  TAX_HIGH_FROM,
  canteenLevelSpec,
  canteenLevelSprite,
} from '../../src/engine/constants';
import { formatMoney } from '../../src/engine/economy';
import type { GameEvent, GameState } from '../../src/engine/index';
import { migrateState } from '../../src/engine/migrate';
import {
  canteenLevelOf,
  canteenPictureLevel,
  nextCanteenLevel,
  refitCanteen,
  refitCanteenCheck,
} from '../../src/engine/premises';
import { raiseTaxWarning, runTaxDay, taxComingLine, taxOn } from '../../src/engine/tax';
import {
  CANTEEN_LAYERS,
  CANTEEN_LAYERS_WIDE,
  canteenLayersOf,
  canteenPlatesOf,
  canteenRegionsOf,
  renderCanteen,
} from '../../src/render/canteen';
import { renderPremises } from '../../src/ui/premises';
import { act, buyNow, clearEvents, eventsOfKind, newGame, nextDay, testJoiner } from '../helpers';

/** The starting company with money to spend, and its canteen enlarged where asked. */
function company(wide = false): GameState {
  const state = clearEvents(newGame({ difficulty: 'veryEasy' }));
  state.cash = 5000000;
  state.unit.canteenWide = wide;
  return state;
}

function dom(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

function cardOf(state: GameState): HTMLElement | null {
  return dom(renderPremises(state)).querySelector('[data-premises="canteen-refit"]');
}

describe('the six levels (v106)', () => {
  it('are six, at twice the office s prices, the first two of the small room and the rest of the enlarged one', () => {
    expect(CANTEEN_LEVELS.map((spec) => spec.level)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(CANTEEN_LEVELS.map((spec) => spec.price)).toEqual(OFFICE_LEVELS.map((spec) => spec.price * 2));
    expect(CANTEEN_LEVELS.map((spec) => spec.price)).toEqual([10000, 30000, 80000, 200000, 500000, 1200000]);
    expect(CANTEEN_LEVELS.map((spec) => spec.wide)).toEqual([false, false, true, true, true, true]);
    expect(CANTEEN_LEVEL_WIDE_FROM).toBe(3);
    expect(CANTEEN_LEVELS.map((spec) => spec.plates.length)).toEqual([8, 8, 16, 16, 16, 16]);
    for (const spec of CANTEEN_LEVELS) {
      expect(canteenLevelSprite(spec.level)).toBe(`canteenLevel${spec.level}`);
      expect(spec.sentence.length).toBeGreaterThan(20);
      expect(spec.reputation).toBeGreaterThan(0);
      // Every plate inside the room, and every plate of a level inside its lockers' region but the
      // small room's near bank, which the art side's region leaves out of the click.
      for (const plate of spec.plates) {
        expect(plate.x + plate.w).toBeLessThanOrEqual(1672);
        expect(plate.y + plate.h).toBeLessThanOrEqual(941);
      }
    }
    expect(canteenLevelSpec(0)).toBeNull();
    expect(canteenLevelSpec(7)).toBeNull();
  });

  it('starts at the room as it was built: the first level on offer in it, the third in an enlarged one', () => {
    const state = company();
    expect(state.unit.canteenLevel).toBe(0);
    expect(state.unit.canteenRefit).toBeNull();
    expect(canteenLevelOf(state)).toBe(0);
    expect(nextCanteenLevel(state)?.level).toBe(1);
    expect(nextCanteenLevel(company(true))?.level).toBe(3);
    const second = company(true);
    second.unit.canteenLevel = 4;
    expect(nextCanteenLevel(second)?.level).toBe(5);
  });
});

describe('the refit (v106)', () => {
  it('is paid at the click and open the next morning with its card and its reputation', () => {
    const state = company();
    const paid = act(state, { type: 'REFIT_CANTEEN' });
    expect(paid.cash).toBe(state.cash - 10000);
    expect(paid.ledger.find((entry) => entry.label === 'Canteen refit: A first workshop')?.amount).toBe(-10000);
    expect(paid.unit.canteenRefit).toEqual({ level: 1 });
    expect(paid.unit.canteenLevel).toBe(0);
    const seen: GameEvent[] = [];
    const morning = nextDay(paid, seen);
    expect(morning.unit.canteenLevel).toBe(1);
    expect(morning.unit.canteenRefit).toBeNull();
    const card = eventsOfKind(seen, 'canteenRefitted')[0];
    expect(card?.title).toBe('The canteen is refitted');
    expect(card?.body).toContain('a first workshop');
    expect(card?.body).toContain('The next refit, a tidy small firm, is on the Premises page at 30,000.');
    expect(morning.reputationLog.some((entry) => entry.reason === 'Canteen refit: A first workshop')).toBe(true);
  });

  it('goes to the third level first in an enlarged canteen, at its own price', () => {
    const state = company(true);
    const paid = act(state, { type: 'REFIT_CANTEEN' });
    expect(paid.cash).toBe(state.cash - 80000);
    expect(paid.unit.canteenRefit).toEqual({ level: 3 });
  });

  it('is refused in the order the card reads: the top, the fitters in, the canteen to enlarge first, the cash', () => {
    const top = company(true);
    top.unit.canteenLevel = 6;
    expect(refitCanteenCheck(top)).toEqual({ ok: false, reason: 'The canteen is at its best' });
    expect(refitCanteen(top)).toEqual({ ok: false, reason: 'The canteen is at its best' });
    const busy = act(company(), { type: 'REFIT_CANTEEN' });
    expect(refitCanteenCheck(busy)).toEqual({ ok: false, reason: 'The fitters are in' });
    const small = company();
    small.unit.canteenLevel = 2;
    expect(refitCanteenCheck(small)).toEqual({ ok: false, reason: 'Enlarge the canteen first' });
    const broke = company();
    broke.cash = broke.finance.overdraftLimit + 9999;
    expect(refitCanteenCheck(broke)).toEqual({ ok: false, reason: 'Not enough cash' });
    expect(act(broke, { type: 'REFIT_CANTEEN' }).cash).toBe(broke.cash);
  });
});

describe('the room by its level (v106)', () => {
  it('is the room s layers at level 0, one picture of its level after a refit, and the enlarged room s layers for a small room s level once it is enlarged', () => {
    expect(canteenLayersOf(company())).toEqual(CANTEEN_LAYERS);
    expect(canteenLayersOf(company(true))).toEqual(CANTEEN_LAYERS_WIDE);
    const first = company();
    first.unit.canteenLevel = 1;
    expect(canteenPictureLevel(first)).toBe(1);
    expect(canteenLayersOf(first)).toEqual([{ key: 'canteenLevel1', name: 'Canteen: A first workshop', needs: null }]);
    expect(canteenPlatesOf(first)).toBe(canteenLevelSpec(1)?.plates);
    const enlargedLater = company(true);
    enlargedLater.unit.canteenLevel = 2;
    expect(canteenPictureLevel(enlargedLater)).toBe(0);
    expect(canteenLayersOf(enlargedLater)).toEqual(CANTEEN_LAYERS_WIDE);
    expect(canteenRegionsOf(enlargedLater).find((region) => region.id === 'lockers')).toMatchObject({
      x: CANTEEN_REGIONS_WIDE.lockers.x,
      y: CANTEEN_REGIONS_WIDE.lockers.y,
    });
    const top = company(true);
    top.unit.canteenLevel = 6;
    expect(canteenLayersOf(top)).toEqual([{ key: 'canteenLevel6', name: 'Canteen: The flagship canteen', needs: null }]);
    const lockers = canteenRegionsOf(top).find((region) => region.id === 'lockers');
    expect(lockers).toMatchObject({ x: 496, y: 184, width: 867, height: 271, opens: true });
  });

  it('puts a man s name on his plate under the pointer, the plate the lockers own click, and the counter on a label', () => {
    let state = company(true);
    state.workers.push(testJoiner('w-tomasz', 'Tomasz'));
    state = buyNow(state, 'locker');
    state.unit.canteenLevel = 3;
    const room = dom(renderCanteen(state, { width: 1280, height: 800 }, ['canteenLevel3.png']));
    expect(Array.from(room.querySelectorAll('.office-layer')).map((layer) => layer.getAttribute('data-layer'))).toEqual(['canteenLevel3']);
    const spots = Array.from(room.querySelectorAll('.canteen-plate-spot'));
    expect(spots).toHaveLength(16);
    for (const spot of spots) {
      expect(spot.getAttribute('data-do')).toBe('officeRegion');
      expect(spot.getAttribute('data-office')).toBe('lockers');
    }
    // Nothing lettered on the plates of a refit's picture.
    expect(room.querySelectorAll('.canteen-plate')).toHaveLength(0);
    const named = spots.filter((spot) => spot.querySelector('.canteen-plate-name') !== null);
    expect(named).toHaveLength(1);
    expect(named[0]?.getAttribute('data-canteen-plate')).toBe('0');
    expect(named[0]?.querySelector('.canteen-plate-name')?.textContent).toBe('Tomasz');
    const counter = room.querySelector('[data-canteen-text="counter"]');
    expect(counter?.classList.contains('is-label')).toBe(true);
    expect(counter?.textContent).toContain('in use');
  });
});

describe('the Premises page s canteen card (v106)', () => {
  it('offers the next level with its price, its words and Refit, under the Enlarge card', () => {
    const card = cardOf(company());
    expect(card?.querySelector('h3')?.textContent).toBe('Refit the canteen: A first workshop');
    const lines = Array.from(card?.querySelectorAll('.figures') ?? []).map((line) => line.textContent);
    expect(lines[0]).toBe('£10,000 · level 1 of 6, ready the next morning. Today: the canteen as it was built.');
    expect(lines[1]).toContain(canteenLevelSpec(1)?.sentence ?? '');
    expect(card?.querySelector('[data-do="refitCanteen"]')?.textContent).toBe('Refit');
    const page = dom(renderPremises(company()));
    const order = Array.from(page.querySelectorAll('[data-premises]')).map((node) => node.getAttribute('data-premises'));
    expect(order.indexOf('canteen-refit')).toBe(order.indexOf('canteen') + 1);
    const wide = cardOf(company(true));
    expect(wide?.querySelector('h3')?.textContent).toBe('Refit the canteen: A growing joinery');
    expect(wide?.textContent).toContain('£80,000 · level 3 of 6');
  });

  it('says why it is locked, Being refitted while the fitters are in, and Refitted at the top', () => {
    const small = company();
    small.unit.canteenLevel = 2;
    const locked = cardOf(small);
    expect(locked?.querySelector('[data-do="refitCanteen"]')).toBeNull();
    expect(locked?.textContent).toContain('Enlarge the canteen first');
    expect(locked?.textContent).toContain('Today: a tidy small firm.');
    const busy = cardOf(act(company(), { type: 'REFIT_CANTEEN' }));
    expect(busy?.textContent).toContain('Being refitted');
    expect(busy?.textContent).toContain('Paid');
    const top = company(true);
    top.unit.canteenLevel = 6;
    const done = cardOf(top);
    expect(done?.querySelector('h3')?.textContent).toBe('The canteen: The flagship canteen');
    expect(done?.textContent).toContain('level 6 of 6');
    expect(done?.textContent).toContain('Done');
  });
});

describe('a v49 save in this build (v106)', () => {
  it('opens with the canteen as it was and no fitters in, and nothing else of the unit touched', () => {
    const state = company(true);
    const raw = JSON.parse(JSON.stringify(state)) as Record<string, unknown> & { unit: Record<string, unknown> };
    raw.version = 49;
    delete raw.unit.canteenLevel;
    delete raw.unit.canteenRefit;
    const opened = migrateState(raw, 49);
    if (opened === null) throw new Error('the lift refused a whole version 49 state');
    expect(opened.version).toBe(STATE_VERSION);
    // 52 from v111: the yard laid out in its order.
    expect(STATE_VERSION).toBe(52);
    expect(opened.unit).toEqual({ ...state.unit, canteenLevel: 0, canteenRefit: null });
    expect(canteenLayersOf(opened)).toEqual(CANTEEN_LAYERS_WIDE);
  });
});

describe('the tax over £20,000,000 (v106)', () => {
  it('is half of the whole account over the line, and a quarter at the line and under it', () => {
    expect(TAX_HIGH_FROM).toBe(20000000);
    expect(taxOn(20000000)).toBe(5000000);
    expect(taxOn(20000001)).toBe(10000001);
    expect(taxOn(30000000)).toBe(15000000);
    expect(taxOn(48000)).toBe(12000);
  });

  it('says so on the December card, on the strip and on the card after, and only over the line', () => {
    // Friday 1 December 2025, day 271: the first working day of December.
    const state = company();
    state.clock.day = 271;
    state.cash = 30000000;
    raiseTaxWarning(state);
    const coming = state.eventQueue.find((event) => event.kind === 'taxComing');
    expect(coming?.body).toContain(
      `On 30 December the taxman takes 50% of the whole account, because it is over £20,000,000: ${formatMoney(15000000)} as it stands today. At £20,000,000 or under, he takes 25%.`,
    );
    expect(taxComingLine(state)).toBe('Tax on 30 December: 50% of the account, over £20,000,000, £15,000,000 as it stands');
    state.cash = 12000000;
    expect(taxComingLine(state)).toBe('Tax on 30 December: 25% of the account, £3,000,000 as it stands');
    state.cash = 30000000;
    runTaxDay(state, 300);
    const paid = state.eventQueue.find((event) => event.kind === 'taxPaid');
    expect(paid?.body).toBe('The taxman took 50% of the £30,000,000 in the account, which was over £20,000,000: £15,000,000.');
    expect(state.cash).toBe(15000000);
  });
});

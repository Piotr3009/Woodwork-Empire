/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// @vitest-environment jsdom
// v113: the hall's six levels [PIOTR, 18.10: the art side's P2, "hala ok"; "5 koduj" to chat's five
// points]: levels 2 to 6 bought one after the other on the Premises page, paid at the click on a line
// of their own, open the next morning with a card and two points of reputation; the hall drawn in
// its level at every size, each layer from its level's file and the ground round the hall from
// today's; a v52 save opens with the hall as it was built.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  HALL_LEVELS,
  HALL_LEVEL_TOP,
  REPUTATION_GAIN_FACTOR,
  hallLevelSpec,
  hallLevelTier,
} from '../../src/engine/constants';
import type { GameEvent, GameState } from '../../src/engine/index';
import { migrateState } from '../../src/engine/migrate';
import { hallLevelOf, nextHallLevel, refitHall, refitHallCheck } from '../../src/engine/premises';
import { renderHall } from '../../src/render/hall';
import { spriteFiles } from '../../src/render/sprites';
import { renderPremises } from '../../src/ui/premises';
import { act, newGame, nextDay } from '../helpers';

function moneyed(): GameState {
  const state = newGame({ difficulty: 'veryEasy' });
  state.cash = 9000000;
  return state;
}

function dom(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

function cardOf(state: GameState): HTMLElement | null {
  return dom(renderPremises(state)).querySelector('[data-premises="hall"]');
}

/** The files the hall's painting is drawn with, as the hall writes them. */
function layersDrawn(state: GameState): string[] {
  return Array.from(dom(renderHall(state)).querySelectorAll('image.hall-layer')).map(
    (image) => image.getAttribute('href')?.split('/').pop() ?? '',
  );
}

function pngSize(name: string): { width: number; height: number } {
  const bytes = readFileSync(join('public', 'sprites', name));
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

/** Every layer a hall of any size is painted with, today's file names. */
const LAYERS = [
  'hallBackground',
  'hallOffice',
  'hallCanteen',
  'hallBackgroundWide',
  'hallCanteenWide',
  'hallBackgroundDeep',
  'hallBackgroundLong',
  'hallBackgroundEnd',
  'hallBackgroundWider',
  'hallBackgroundWiderFront',
  'hallBackgroundLongWider',
  'hallBackgroundLongWiderFront',
  'hallBackgroundEndWider',
  'hallBackgroundEndWiderFront',
];

describe('the levels (v113)', () => {
  it('are five after the hall as it was built, at Piotr s prices and names, two points each', () => {
    expect(HALL_LEVELS.map((spec) => spec.level)).toEqual([2, 3, 4, 5, 6]);
    expect(HALL_LEVELS.map((spec) => spec.name)).toEqual([
      'A proper joinery',
      'A growing firm',
      'A big works',
      'A factory',
      'The empire',
    ]);
    expect(HALL_LEVELS.map((spec) => spec.price)).toEqual([50000, 150000, 400000, 1000000, 2500000]);
    for (const spec of HALL_LEVELS) {
      expect(spec.reputation).toBe(2);
      expect(spec.sentence.length).toBeGreaterThan(20);
    }
    expect(HALL_LEVEL_TOP).toBe(6);
    expect(hallLevelSpec(1)).toBeNull();
    expect(hallLevelSpec(7)).toBeNull();
    expect(hallLevelTier(1)).toBeNull();
    expect(hallLevelTier(4)).toBe('level4');
  });

  it('have every layer of every size of hall on disk, each on today s canvas', () => {
    const files = spriteFiles();
    for (const spec of HALL_LEVELS) {
      for (const layer of LAYERS) {
        const name = `${layer}.level${spec.level}.png`;
        expect(files, name).toContain(name);
        expect(pngSize(name), name).toEqual(pngSize(`${layer}.png`));
      }
      // The ground round the hall is one colour at every level: today's file serves.
      expect(files).not.toContain(`hallBackgroundGround.level${spec.level}.png`);
    }
  });
});

describe('the refit (v113)', () => {
  it('starts at the hall as it was built, with level 2 on offer', () => {
    const state = newGame({ difficulty: 'veryEasy' });
    expect(state.unit.hallLevel).toBe(1);
    expect(state.unit.hallRefit).toBeNull();
    expect(hallLevelOf(state)).toBe(1);
    expect(nextHallLevel(state)?.level).toBe(2);
  });

  it('is refused in the order the card reads: the top, the fitters in, the cash', () => {
    const broke = moneyed();
    broke.cash = -1e9;
    expect(refitHallCheck(broke)).toEqual({ ok: false, reason: 'Not enough cash' });
    const paid = act(moneyed(), { type: 'REFIT_HALL' });
    expect(refitHallCheck(paid)).toEqual({ ok: false, reason: 'The fitters are in' });
    const top = moneyed();
    top.unit.hallLevel = 6;
    expect(refitHallCheck(top)).toEqual({ ok: false, reason: 'The hall is at its best' });
    expect(refitHall(top)).toEqual({ ok: false, reason: 'The hall is at its best' });
  });

  it('pays at the click on a line of its own and opens the next morning with a card and the reputation', () => {
    const state = moneyed();
    const paid = act(state, { type: 'REFIT_HALL' });
    expect(paid.cash).toBe(state.cash - 50000);
    expect(paid.ledger.at(-1)).toMatchObject({ category: 'unitExtension', label: 'Hall refit: A proper joinery', amount: -50000 });
    expect(paid.unit.hallRefit).toEqual({ level: 2 });
    expect(paid.unit.hallLevel).toBe(1);
    const seen: GameEvent[] = [];
    const morning = nextDay(paid, seen);
    expect(morning.unit.hallLevel).toBe(2);
    expect(morning.unit.hallRefit).toBeNull();
    const card = seen.find((event) => event.kind === 'hallRefitted');
    expect(card?.title).toBe('The hall is refitted');
    expect(card?.body).toContain('The fitters are out: a proper joinery.');
    expect(card?.body).toContain('The next refit, a growing firm, is on the Premises page at 150,000.');
    const gained = 2 * REPUTATION_GAIN_FACTOR;
    expect(morning.reputation).toBeCloseTo(state.reputation + gained, 6);
    expect(morning.reputationLog.at(-1)).toMatchObject({ reason: 'Hall refit: A proper joinery', points: gained });
  });

  it('goes level by level to the top, where the card says there is no better hall', () => {
    let state = moneyed();
    const seen: GameEvent[] = [];
    for (const spec of HALL_LEVELS) {
      state.cash = 9000000;
      state = nextDay(act(state, { type: 'REFIT_HALL' }), seen);
      expect(state.unit.hallLevel).toBe(spec.level);
    }
    expect(nextHallLevel(state)).toBeNull();
    const cards = seen.filter((event) => event.kind === 'hallRefitted');
    expect(cards).toHaveLength(5);
    expect(cards.at(-1)?.body).toContain('There is no better hall to be had.');
  });
});

describe('the hall drawn in its level (v113)', () => {
  it('paints each layer from its level s file, and the hall as it was built from today s', () => {
    const built = newGame({ difficulty: 'veryEasy' });
    expect(layersDrawn(built)).toEqual(['hallBackground.png', 'hallOffice.png', 'hallCanteen.png']);
    const levelled = newGame({ difficulty: 'veryEasy' });
    levelled.unit.hallLevel = 3;
    expect(layersDrawn(levelled)).toEqual(['hallBackground.level3.png', 'hallOffice.level3.png', 'hallCanteen.level3.png']);
  });

  it('paints a hall grown longer and wider in its level, on today s ground', () => {
    let state = moneyed();
    state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
    state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'second' }));
    state.cash = 9000000;
    state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'long' }));
    state.cash = 9000000;
    state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'wide' }));
    state.unit.hallLevel = 5;
    const drawn = layersDrawn(state);
    expect(drawn.length).toBeGreaterThan(3);
    expect(drawn.every((file) => file.includes('.level5.'))).toBe(true);
    expect(drawn).toContain('hallBackgroundDeep.level5.png');
    expect(drawn).toContain('hallBackgroundLong.level5.png');
    expect(drawn).toContain('hallBackgroundWiderFront.level5.png');
    const ground = dom(renderHall(state)).querySelector('#hall-ground image')?.getAttribute('href');
    expect(ground).toContain('hallBackgroundGround.png');
  });
});

describe('the Premises page s hall card (v113)', () => {
  it('offers the next level with its price and words, says it is being done, and reads the top', () => {
    const page = dom(renderPremises(moneyed()));
    expect(Array.from(page.querySelectorAll(':scope > h3')).map((heading) => heading.textContent).at(-1)).toBe('Hall');
    const card = cardOf(moneyed());
    expect(card?.querySelector('h3')?.textContent).toBe('Refit the hall: A proper joinery');
    const lines = Array.from(card?.querySelectorAll('.figures') ?? []).map((line) => line.textContent);
    expect(lines[0]).toBe('£50,000 · level 2 of 6, ready the next morning. Today: the hall as it was built.');
    expect(lines[1]).toContain(hallLevelSpec(2)?.sentence ?? '');
    expect(card?.querySelector('[data-do="refitHall"]')?.textContent).toBe('Refit');
    const paid = cardOf(act(moneyed(), { type: 'REFIT_HALL' }));
    expect(paid?.textContent).toContain('Being refitted');
    expect(paid?.querySelector('.badge')?.textContent).toBe('Paid');
    const top = moneyed();
    top.unit.hallLevel = 6;
    expect(cardOf(top)?.querySelector('h3')?.textContent).toBe('The hall: The empire');
    expect(cardOf(top)?.textContent).toContain('level 6 of 6');
  });
});

describe('a v52 save (v113)', () => {
  it('opens with the hall as it was built and no fitters in', () => {
    const state = newGame({ difficulty: 'veryEasy' });
    const raw = JSON.parse(JSON.stringify(state)) as { version: number; unit: Record<string, unknown> };
    delete raw.unit.hallLevel;
    delete raw.unit.hallRefit;
    raw.version = 52;
    const opened = migrateState(raw, 52);
    if (opened === null) throw new Error('the save opens');
    expect(opened.unit.hallLevel).toBe(1);
    expect(opened.unit.hallRefit).toBeNull();
  });
});

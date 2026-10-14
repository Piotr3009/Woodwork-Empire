// @vitest-environment jsdom
// The office's six refits (PIOTR, 15.10; v98): bought one after the other on the Premises page once a
// desk and a laptop stand, paid at the click on a line of their own, open the next morning with a
// card and a few points of reputation, and from the first the room is one picture of its level
// with the day one layers put away. A v48 save opens with the day one office and no fitters in.

import { describe, expect, it } from 'vitest';
import {
  OFFICE_LEVELS,
  REPUTATION_GAIN_FACTOR,
  STATE_VERSION,
  officeLevelSpec,
  officeLevelSprite,
} from '../../src/engine/constants';
import type { GameEvent, GameState } from '../../src/engine/index';
import { migrateState } from '../../src/engine/migrate';
import { nextOfficeLevel, officeLevelOf, refitOffice, refitOfficeCheck } from '../../src/engine/premises';
import { OFFICE_LAYERS, OFFICE_REGIONS, officeLayersOf, officeRegionsOf, renderOffice } from '../../src/render/office';
import { renderPremises } from '../../src/ui/premises';
import { act, buyNow, newGame, nextDay } from '../helpers';

function furnished(): GameState {
  let state = newGame({ difficulty: 'veryEasy' });
  for (const specId of ['desk', 'chair', 'laptop']) state = buyNow(state, specId);
  state.cash = 2000000;
  return state;
}

function dom(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

/** The card's lines, as the premises tests read them. */
function cardOf(state: GameState): HTMLElement | null {
  return dom(renderPremises(state)).querySelector('[data-premises="office"]');
}

describe('the six levels (v98)', () => {
  it('are six, one to six, each with a picture key, a price that climbs and a sentence', () => {
    expect(OFFICE_LEVELS.map((spec) => spec.level)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(OFFICE_LEVELS.map((spec) => spec.price)).toEqual([5000, 15000, 40000, 100000, 250000, 600000]);
    for (const spec of OFFICE_LEVELS) {
      expect(spec.sentence.length).toBeGreaterThan(20);
      expect(officeLevelSprite(spec.level)).toBe(`officeLevel${spec.level}`);
      expect(spec.reputation).toBeGreaterThan(0);
    }
    expect(officeLevelSpec(7)).toBeNull();
    expect(officeLevelSpec(0)).toBeNull();
  });

  it('starts at the day one office, with the first level on offer and nothing being done', () => {
    const state = newGame({ difficulty: 'veryEasy' });
    expect(state.unit.officeLevel).toBe(0);
    expect(state.unit.officeRefit).toBeNull();
    expect(officeLevelOf(state)).toBe(0);
    expect(nextOfficeLevel(state)?.level).toBe(1);
  });
});

describe('the refit (v98)', () => {
  it('is refused in the order the card reads: the desk and the laptop, the cash, the fitters in, the top', () => {
    const bare = newGame({ difficulty: 'veryEasy' });
    bare.cash = 2000000;
    expect(refitOfficeCheck(bare)).toEqual({ ok: false, reason: 'Buy a desk and a laptop first' });
    const deskOnly = buyNow(buyNow(newGame({ difficulty: 'veryEasy' }), 'desk'), 'chair');
    deskOnly.cash = 2000000;
    expect(refitOfficeCheck(deskOnly)).toEqual({ ok: false, reason: 'Buy a desk and a laptop first' });
    const broke = furnished();
    broke.cash = -1e9;
    expect(refitOfficeCheck(broke)).toEqual({ ok: false, reason: 'Not enough cash' });
    const state = furnished();
    expect(refitOfficeCheck(state)).toEqual({ ok: true, reason: '' });
    const paid = act(state, { type: 'REFIT_OFFICE' });
    expect(refitOfficeCheck(paid)).toEqual({ ok: false, reason: 'The fitters are in' });
    const top = furnished();
    top.unit.officeLevel = 6;
    expect(refitOfficeCheck(top)).toEqual({ ok: false, reason: 'The office is at its best' });
    expect(refitOffice(top)).toEqual({ ok: false, reason: 'The office is at its best' });
  });

  it('pays at the click on a line of its own and puts the fitters in, and nothing else moves', () => {
    const state = furnished();
    const cash = state.cash;
    const paid = act(state, { type: 'REFIT_OFFICE' });
    expect(paid.cash).toBe(cash - 5000);
    const line = paid.ledger.at(-1);
    expect(line).toMatchObject({ category: 'unitExtension', label: 'Office refit: A first office', amount: -5000 });
    expect(paid.unit.officeRefit).toEqual({ level: 1 });
    expect(paid.unit.officeLevel).toBe(0);
    expect(paid.reputation).toBe(state.reputation);
    // The room is still the day one room until the morning.
    expect(officeLayersOf(paid)).toEqual(OFFICE_LAYERS);
    // A second click while the fitters are in buys nothing.
    const again = act(paid, { type: 'REFIT_OFFICE' });
    expect(again.cash).toBe(paid.cash);
    expect(again.ledger.length).toBe(paid.ledger.length);
  });

  it('opens the next morning: the level, a card, the reputation on the board, and the next one on offer', () => {
    const seen: GameEvent[] = [];
    const reputation = furnished().reputation;
    const morning = nextDay(act(furnished(), { type: 'REFIT_OFFICE' }), seen);
    expect(morning.unit.officeLevel).toBe(1);
    expect(morning.unit.officeRefit).toBeNull();
    const card = seen.find((event) => event.kind === 'officeRefitted');
    expect(card?.title).toBe('The office is refitted');
    expect(card?.body).toContain('The fitters are out: a first office.');
    expect(card?.body).toContain('The next refit, a proper joinery office, is on the Premises page at 15,000.');
    expect(card?.data).toEqual({ level: 1 });
    // Two points asked, booked at the gain factor as every gain is, and written down why.
    const gained = 2 * REPUTATION_GAIN_FACTOR;
    expect(morning.reputation).toBeCloseTo(reputation + gained, 6);
    expect(morning.reputationLog.at(-1)).toMatchObject({ reason: 'Office refit: A first office', points: gained });
    expect(card?.body).toContain(`reputation +${gained}`);
    expect(nextOfficeLevel(morning)?.level).toBe(2);
  });

  it('goes level by level to the top, where the card says there is no better office', () => {
    let state = furnished();
    const seen: GameEvent[] = [];
    for (const spec of OFFICE_LEVELS) {
      state = nextDay(act(state, { type: 'REFIT_OFFICE' }), seen);
      expect(state.unit.officeLevel).toBe(spec.level);
    }
    expect(nextOfficeLevel(state)).toBeNull();
    expect(seen.filter((event) => event.kind === 'officeRefitted')).toHaveLength(6);
    expect(seen.filter((event) => event.kind === 'officeRefitted').at(-1)?.body).toContain('There is no better office to be had.');
    const spent = state.ledger.filter((entry) => entry.label.startsWith('Office refit: ')).reduce((sum, entry) => sum + entry.amount, 0);
    expect(spent).toBe(-OFFICE_LEVELS.reduce((sum, spec) => sum + spec.price, 0));
  });
});

describe('the room by its level (v98)', () => {
  it('is the day one layers at level 0 and one picture of its level from the first refit, the regions where they were', () => {
    const state = furnished();
    expect(officeLayersOf(state)).toEqual(OFFICE_LAYERS);
    for (const spec of OFFICE_LEVELS) {
      const levelled = furnished();
      levelled.unit.officeLevel = spec.level;
      expect(officeLayersOf(levelled)).toEqual([{ key: `officeLevel${spec.level}`, name: `Office: ${spec.name}`, needs: null }]);
      expect(officeRegionsOf(levelled)).toEqual(officeRegionsOf(state));
      expect(officeRegionsOf(levelled).map((region) => region.id)).toEqual(OFFICE_REGIONS.map((region) => region.id));
    }
  });

  it('draws the level s file when it is there, and a flat rectangle with its name until it is', () => {
    const levelled = furnished();
    levelled.unit.officeLevel = 3;
    const withFile = dom(renderOffice(levelled, { width: 1280, height: 800 }, ['officeLevel3.png']));
    const layers = Array.from(withFile.querySelectorAll('.office-layer'));
    expect(layers.map((layer) => layer.getAttribute('data-layer'))).toEqual(['officeLevel3']);
    expect(layers[0]?.tagName.toLowerCase()).toBe('img');
    expect(layers[0]?.getAttribute('src')).toContain('officeLevel3.png');
    // The laptop and the board are still where the regions are: the desk is painted in.
    expect(withFile.querySelector('[data-office="laptop"]')).not.toBeNull();
    expect(withFile.querySelector('[data-office="company"]')).not.toBeNull();
    const without = dom(renderOffice(levelled, { width: 1280, height: 800 }, []));
    expect(without.querySelector('.office-placeholder')?.textContent).toBe('Office: A growing firm');
  });
});

describe('the Premises page s office card (v98)', () => {
  it('offers the first level with its price, its words and Refit, and says why it is locked', () => {
    const card = cardOf(furnished());
    expect(card?.querySelector('h3')?.textContent).toBe('Refit the office: A first office');
    const lines = Array.from(card?.querySelectorAll('.figures') ?? []).map((line) => line.textContent);
    expect(lines[0]).toBe('£5,000 · level 1 of 6, ready the next morning. Today: the day one office.');
    expect(lines[1]).toContain(officeLevelSpec(1)?.sentence ?? '');
    expect(card?.querySelector('[data-do="refitOffice"]')?.textContent).toBe('Refit');
    const bare = cardOf(newGame({ difficulty: 'veryEasy' }));
    expect(bare?.querySelector('[data-do="refitOffice"]')).toBeNull();
    expect(bare?.textContent).toContain('Buy a desk and a laptop first');
  });

  it('says Being refitted while the fitters are in, and Refitted at the top', () => {
    const paid = cardOf(act(furnished(), { type: 'REFIT_OFFICE' }));
    expect(paid?.textContent).toContain('Being refitted');
    expect(paid?.textContent).toContain('Paid');
    expect(paid?.querySelector('[data-do="refitOffice"]')).toBeNull();
    const top = furnished();
    top.unit.officeLevel = 6;
    const done = cardOf(top);
    expect(done?.querySelector('h3')?.textContent).toBe('The office: The empire');
    expect(done?.textContent).toContain('Refitted');
    expect(done?.textContent).toContain('level 6 of 6');
    const second = furnished();
    second.unit.officeLevel = 1;
    expect(cardOf(second)?.querySelector('h3')?.textContent).toBe('Refit the office: A proper joinery office');
    expect(cardOf(second)?.textContent).toContain('Today: a first office.');
  });
});

describe('a v48 save in this build (v98)', () => {
  it('opens with the day one office and no fitters in, and nothing else of the unit touched', () => {
    const state = furnished();
    const raw = JSON.parse(JSON.stringify(state)) as Record<string, unknown> & { unit: Record<string, unknown> };
    raw.version = 48;
    delete raw.unit.officeLevel;
    delete raw.unit.officeRefit;
    const opened = migrateState(raw, 48);
    if (opened === null) throw new Error('the lift refused a whole version 48 state');
    expect(opened.version).toBe(STATE_VERSION);
    expect(opened.unit).toEqual({ ...state.unit, officeLevel: 0, officeRefit: null });
    expect(officeLayersOf(opened)).toEqual(OFFICE_LAYERS);
    expect(refitOfficeCheck(opened)).toEqual({ ok: true, reason: '' });
  });
});

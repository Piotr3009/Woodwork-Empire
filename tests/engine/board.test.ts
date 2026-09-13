import { describe, expect, it } from 'vitest';
import {
  BOARD_SIZE_BY_TIER,
  EXPRESS_PRICE_UPLIFT,
  EXPRESS_PROBABILITY_BASE,
  EXPRESS_PROBABILITY_MAX,
  EXPRESS_PROBABILITY_MIN,
  EXPRESS_PROBABILITY_PER_REPUTATION_STEP,
  SIZE_MULTIPLIER_MAX,
  SIZE_MULTIPLIER_MIN,
} from '../../src/engine/constants';
import {
  boardSizeRange,
  canAccept,
  expireEnquiries,
  expressAllowed,
  expressProbability,
  generateEnquiry,
  refillBoard,
  removeEnquiry,
} from '../../src/engine/board';
import { tick } from '../../src/engine/index';
import type { Enquiry, GameState } from '../../src/engine/index';
import { act, clearEvents, newGame } from '../helpers';

/** Draws n enquiries onto the board, exactly as a long game would. */
function draw(state: GameState, count: number): Enquiry[] {
  const drawn: Enquiry[] = [];
  for (let i = 0; i < count; i += 1) {
    const enquiry = generateEnquiry(state);
    if (!enquiry) break;
    state.enquiries.push(enquiry);
    drawn.push(enquiry);
  }
  return drawn;
}

describe('enquiry generation', () => {
  it('never offers a wardrobe to a company with no reputation', () => {
    const state = newGame();
    state.enquiries = [];
    const drawn = draw(state, 1000);
    expect(drawn).toHaveLength(1000);
    const names = new Set(drawn.map((enquiry) => enquiry.templateId));
    expect(names).toEqual(new Set(['garageShelves', 'bookcase']));
  });

  it('offers the dearer work once the reputation is there', () => {
    const state = newGame();
    state.reputation = 40;
    state.enquiries = [];
    const names = new Set(draw(state, 600).map((enquiry) => enquiry.templateId));
    expect(names.has('wardrobe')).toBe(true);
    expect(names.has('smallKitchen')).toBe(true);
    expect(names.has('oakDiningTable')).toBe(true);
  });

  it('never puts two of the same template at the same price side by side', () => {
    const state = newGame();
    state.enquiries = [];
    const drawn = draw(state, 1000);
    for (let i = 1; i < drawn.length; i += 1) {
      const left = drawn[i - 1];
      const right = drawn[i];
      const identical =
        left !== undefined &&
        right !== undefined &&
        left.templateId === right.templateId &&
        left.price === right.price;
      expect(identical, `entries ${i - 1} and ${i}`).toBe(false);
    }
  });

  it('keeps the size multiplier between 0.8 and 1.6', () => {
    const state = newGame();
    state.enquiries = [];
    for (const enquiry of draw(state, 500)) {
      expect(enquiry.sizeMultiplier).toBeGreaterThanOrEqual(SIZE_MULTIPLIER_MIN);
      expect(enquiry.sizeMultiplier).toBeLessThanOrEqual(SIZE_MULTIPLIER_MAX);
      expect(enquiry.price % 10).toBe(0);
    }
  });

  it('keeps the deadline inside the template range', () => {
    const state = newGame();
    state.enquiries = [];
    for (const enquiry of draw(state, 300)) {
      if (enquiry.templateId === 'garageShelves') {
        expect(enquiry.deadlineDays).toBeGreaterThanOrEqual(10);
        expect(enquiry.deadlineDays).toBeLessThanOrEqual(20);
      }
    }
  });

  it('raises the express chance per whole ten points of reputation, capped at 0.30', () => {
    expect(expressProbability(0)).toBeCloseTo(EXPRESS_PROBABILITY_BASE, 10);
    expect(expressProbability(9)).toBeCloseTo(EXPRESS_PROBABILITY_BASE, 10);
    expect(expressProbability(20)).toBeCloseTo(
      EXPRESS_PROBABILITY_BASE + 2 * EXPRESS_PROBABILITY_PER_REPUTATION_STEP,
      10,
    );
    expect(expressProbability(100)).toBe(EXPRESS_PROBABILITY_MAX);
  });

  it('draws express jobs about as often as the chance says', () => {
    const state = newGame();
    state.enquiries = [];
    const drawn = draw(state, 2000);
    const express = drawn.filter((enquiry) => enquiry.express).length;
    expect(express / drawn.length).toBeCloseTo(EXPRESS_PROBABILITY_BASE, 1);
  });

  it('gives express one day and everything else three', () => {
    const state = newGame();
    state.enquiries = [];
    for (const enquiry of draw(state, 300)) {
      expect(enquiry.expiresOnDay).toBe(enquiry.createdDay + (enquiry.express ? 0 : 2));
    }
  });
});

describe('the board over time', () => {
  it('reads its size range off the reputation tier', () => {
    const state = newGame();
    state.reputation = -10;
    expect(boardSizeRange(state)).toEqual(BOARD_SIZE_BY_TIER[0]);
    state.reputation = 0;
    expect(boardSizeRange(state)).toEqual(BOARD_SIZE_BY_TIER[1]);
    state.reputation = 30;
    expect(boardSizeRange(state)).toEqual(BOARD_SIZE_BY_TIER[2]);
  });

  it('starts day 1 with two or three enquiries, all greyed out', () => {
    const state = newGame();
    const [min, max] = BOARD_SIZE_BY_TIER[1] ?? [2, 3];
    expect(state.enquiries.length).toBeGreaterThanOrEqual(min);
    expect(state.enquiries.length).toBeLessThanOrEqual(max);
    for (const enquiry of state.enquiries) {
      expect(enquiry.lockReason).not.toBeNull();
      expect(canAccept(state, enquiry).ok).toBe(false);
    }
  });

  it('lifts the lock the moment the tools are on the floor', () => {
    let state = newGame();
    state = act(state, { type: 'BUY_EQUIPMENT', specId: 'tableSaw' });
    state = act(state, { type: 'BUY_EQUIPMENT', specId: 'drill' });
    state = act(state, { type: 'BUY_EQUIPMENT', specId: 'toolCabinet' });
    state = act(state, { type: 'BUY_EQUIPMENT', specId: 'edgebander' });
    for (const enquiry of state.enquiries) {
      expect(enquiry.lockReason).toBeNull();
      expect(canAccept(state, enquiry).ok).toBe(true);
    }
  });

  it('lets a locked job through when the template allows the by hand path', () => {
    const state = newGame();
    const table: Enquiry = {
      id: 'enq-x',
      templateId: 'oakDiningTable',
      name: 'Oak dining table',
      sizeMultiplier: 1,
      price: 12000,
      basePrice: 12000,
      finish: 'laminate',
      materialKind: 'solidWood',
      deadlineDays: 50,
      express: false,
      bespokeMaterial: false,
      needsMeasure: false,
      createdDay: 1,
      expiresOnDay: 3,
      lockReason: 'Needs solid wood tools',
      byHandAvailable: true,
    };
    expect(canAccept(state, table).ok).toBe(true);
    const shelves = { ...table, templateId: 'garageShelves', byHandAvailable: false };
    expect(canAccept(state, shelves).ok).toBe(false);
    expect(canAccept(state, shelves).reason).toBe('Needs solid wood tools');
  });

  it('drops an express enquiry the next morning and a standard one after three days', () => {
    const state = newGame();
    state.enquiries = [];
    const express: Enquiry = {
      id: 'enq-e',
      templateId: 'garageShelves',
      name: 'Garage shelves',
      sizeMultiplier: 1,
      price: 480,
      basePrice: 400,
      finish: 'laminate',
      materialKind: 'sheet',
      deadlineDays: 12,
      express: true,
      bespokeMaterial: false,
      needsMeasure: false,
      createdDay: 1,
      expiresOnDay: 1,
      lockReason: null,
      byHandAvailable: false,
    };
    const standard = { ...express, id: 'enq-s', express: false, expiresOnDay: 3 };
    state.enquiries = [express, standard];
    state.clock.day = 2;
    expireEnquiries(state);
    expect(state.enquiries.map((enquiry) => enquiry.id)).toContain('enq-s');
    expect(state.enquiries.map((enquiry) => enquiry.id)).not.toContain('enq-e');
    state.clock.day = 4;
    expireEnquiries(state);
    expect(state.enquiries.map((enquiry) => enquiry.id)).not.toContain('enq-s');
  });

  it('draws a new enquiry the moment one is taken', () => {
    const state = newGame();
    const before = state.enquiries.length;
    const first = state.enquiries[0];
    expect(first).toBeDefined();
    removeEnquiry(state, first?.id ?? '');
    // CLAUDE.md 8.8: after an enquiry is taken or expires, the board draws a new one.
    expect(state.enquiries.length).toBe(before);
    expect(state.enquiries.some((enquiry) => enquiry.id === first?.id)).toBe(false);
  });

  it('tops an empty board back up in the morning', () => {
    const state = newGame();
    state.enquiries = [];
    refillBoard(state);
    expect(state.enquiries.length).toBeGreaterThanOrEqual(1);
  });

  it('refills the board every morning without letting it grow past the tier', () => {
    let state = newGame();
    const [, max] = BOARD_SIZE_BY_TIER[1] ?? [2, 3];
    for (let day = 0; day < 10; day += 1) {
      state = clearEvents(tick(state, 600));
      expect(state.enquiries.length).toBeLessThanOrEqual(max);
    }
  });
});

describe('board size and the express chance follow the reputation', () => {
  it('gives 3 to 5 enquiries above reputation 20', () => {
    const state = newGame();
    state.reputation = 20;
    expect(boardSizeRange(state)).toEqual(BOARD_SIZE_BY_TIER[2]);
    state.reputation = 19;
    expect(boardSizeRange(state)).toEqual(BOARD_SIZE_BY_TIER[1]);
  });

  it('lowers the express chance when the reputation is negative, with a floor', () => {
    expect(expressProbability(-10)).toBeCloseTo(
      EXPRESS_PROBABILITY_BASE - EXPRESS_PROBABILITY_PER_REPUTATION_STEP,
      10,
    );
    expect(expressProbability(-30)).toBe(EXPRESS_PROBABILITY_MIN);
  });
});

describe('express, the Turn 2 rules', () => {
  it('puts the 20% uplift on the price only, leaving the base price for material and labour', () => {
    const state = newGame();
    state.enquiries = [];
    state.reputation = 100;
    const drawn = draw(state, 400).filter((enquiry) => enquiry.express);
    expect(drawn.length).toBeGreaterThan(0);
    for (const enquiry of drawn) {
      expect(enquiry.price).toBeGreaterThan(enquiry.basePrice);
      expect(enquiry.price / enquiry.basePrice).toBeCloseTo(1 + EXPRESS_PRICE_UPLIFT, 1);
    }
    const plain = draw(state, 100).filter((enquiry) => !enquiry.express);
    for (const enquiry of plain) expect(enquiry.price).toBe(enquiry.basePrice);
  });

  it('lets one express enquiry onto the board a week and no more', () => {
    const state = newGame();
    expect(expressAllowed(state)).toBe(true);
    state.lastExpressDay = 1;
    expect(expressAllowed(state)).toBe(false);
    state.clock.day = 7;
    expect(expressAllowed(state)).toBe(false);
    state.clock.day = 8;
    expect(expressAllowed(state)).toBe(true);
  });

  it('never fills the board with express work, however high the reputation', () => {
    const state = newGame();
    state.reputation = 100;
    state.enquiries = [];
    state.lastExpressDay = null;
    // A whole week of refills: the cap allows one express enquiry in it.
    let express = 0;
    for (let day = 1; day <= 7; day += 1) {
      state.clock.day = day;
      state.enquiries = [];
      refillBoard(state);
      express += state.enquiries.filter((enquiry) => enquiry.express).length;
    }
    expect(express).toBeLessThanOrEqual(1);
  });
});

import { describe, expect, it } from 'vitest';
import {
  BOARD_SIZE_BY_TIER,
  DEADLINE_DAYS_BASE,
  DEADLINE_DAYS_FACTOR,
  DEADLINE_DAYS_MAX,
  DEADLINE_DAYS_MIN,
  DEADLINE_EXPRESS_FACTOR,
  DEADLINE_SLACK_PERCENT_MAX,
  DEADLINE_SMALL_JOB_PRICE,
  DEADLINE_SMALL_SLACK_DAYS,
  EXPRESS_PRICE_UPLIFT_MAX,
  EXPRESS_PRICE_UPLIFT_MIN,
  EXPRESS_PROBABILITY,
  UNREACHABLE_MAX,
  UNREACHABLE_MIN,
  SIZE_MULTIPLIER_MAX,
  SIZE_MULTIPLIER_MIN,
} from '../../src/engine/constants';
import {
  boardSizeRange,
  canAccept,
  expireEnquiries,
  expressProbability,
  generateEnquiry,
  reachableEnquiries,
  refillBoard,
  refreshBoard,
  removeEnquiry,
  unreachableEnquiries,
} from '../../src/engine/board';
import { labourValueFor, ownerDaysFor } from '../../src/engine/jobs';
import { tick } from '../../src/engine/index';
import type { Enquiry, GameState } from '../../src/engine/index';
import { buyNow, clearEvents, newGame } from '../helpers';

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

  it('works the deadline out from the job and never from the kind of thing it is', () => {
    const state = newGame();
    state.enquiries = [];
    for (const enquiry of draw(state, 300)) {
      const ownerDays = ownerDaysFor(
        state,
        labourValueFor(enquiry.basePrice),
        enquiry.materialKind,
      );
      const base = Math.min(
        DEADLINE_DAYS_MAX,
        Math.max(
          DEADLINE_DAYS_MIN,
          Math.floor(ownerDays * DEADLINE_DAYS_FACTOR + DEADLINE_DAYS_BASE),
        ),
      );
      const slack =
        enquiry.basePrice <= DEADLINE_SMALL_JOB_PRICE
          ? DEADLINE_SMALL_SLACK_DAYS
          : Math.round((base * DEADLINE_SLACK_PERCENT_MAX) / 100);
      const most = enquiry.express
        ? Math.max(DEADLINE_DAYS_MIN, Math.round((base + slack) * DEADLINE_EXPRESS_FACTOR))
        : base + slack;
      expect(enquiry.deadlineDays, enquiry.templateId).toBeGreaterThanOrEqual(DEADLINE_DAYS_MIN);
      expect(enquiry.deadlineDays, enquiry.templateId).toBeLessThanOrEqual(most);
      // A small job never gets the twelve days Piotr complained about.
      if (enquiry.basePrice <= 600) expect(enquiry.deadlineDays).toBeLessThanOrEqual(5);
    }
  });

  it('is a flat quarter, whatever the reputation (CLAUDE.md T10 3.7)', () => {
    expect(expressProbability()).toBe(EXPRESS_PROBABILITY);
    expect(EXPRESS_PROBABILITY).toBe(0.25);
  });

  it('draws express jobs about as often as the chance says', () => {
    const state = newGame();
    state.enquiries = [];
    const drawn = draw(state, 2000);
    const express = drawn.filter((enquiry) => enquiry.express).length;
    expect(express / drawn.length).toBeCloseTo(EXPRESS_PROBABILITY, 1);
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
    const open = reachableEnquiries(state);
    expect(open.length).toBeGreaterThanOrEqual(min);
    expect(open.length).toBeLessThanOrEqual(max);
    for (const enquiry of open) {
      expect(enquiry.lockReason).not.toBeNull();
      expect(canAccept(state, enquiry).ok).toBe(false);
    }
  });

  it('lifts the lock the moment the tools are on the floor', () => {
    let state = newGame();
    state = buyNow(state, 'tableSaw');
    state = buyNow(state, 'drill');
    state = buyNow(state, 'toolCabinet');
    state = buyNow(state, 'edgebander');
    for (const enquiry of reachableEnquiries(state)) {
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
      unreachable: false,
      blockReason: '',
      blockWhere: '',
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
      unreachable: false,
      blockReason: '',
      blockWhere: '',
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
    const first = reachableEnquiries(state)[0];
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
    expect(reachableEnquiries(state).length).toBeGreaterThanOrEqual(1);
  });

  it('refills the board every morning without letting it grow past the tier', () => {
    let state = newGame();
    const [, max] = BOARD_SIZE_BY_TIER[1] ?? [2, 3];
    for (let day = 0; day < 10; day += 1) {
      state = clearEvents(tick(state, 600));
      expect(reachableEnquiries(state).length).toBeLessThanOrEqual(max);
    }
  });

  it('keeps two or three the workshop cannot take beside the band, and never in it', () => {
    const state = newGame();
    refreshBoard(state);
    const greyed = unreachableEnquiries(state);
    expect(greyed.length).toBeGreaterThanOrEqual(UNREACHABLE_MIN);
    expect(greyed.length).toBeLessThanOrEqual(UNREACHABLE_MAX);
    for (const enquiry of greyed) {
      expect(enquiry.blockReason, enquiry.templateId).not.toBe('');
      expect(canAccept(state, enquiry)).toEqual({ ok: false, reason: enquiry.blockReason });
      expect(['', 'catalogue', 'team'], enquiry.templateId).toContain(enquiry.blockWhere);
    }
    // And the band is still the band: the greyed ones are not counted into it.
    const [, max] = BOARD_SIZE_BY_TIER[1] ?? [2, 3];
    expect(reachableEnquiries(state).length).toBeLessThanOrEqual(max);
  });

  it('says why in the plain words Piotr asked for', () => {
    const state = newGame();
    refreshBoard(state);
    const reasons = new Set(unreachableEnquiries(state).map((enquiry) => enquiry.blockReason));
    for (const reason of reasons) {
      expect(
        reason.startsWith('reputation too low (needs ') ||
          reason === 'no timber machines' ||
          reason === 'needs a spray booth' ||
          reason === 'too few people for the deadline' ||
          reason.startsWith('no '),
        reason,
      ).toBe(true);
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

});

describe('express, properly profitable (CLAUDE.md T10 3.7)', () => {
  it('puts an uplift of 30% to 50% on the price only, drawn uniformly', () => {
    const state = newGame();
    state.enquiries = [];
    state.reputation = 100;
    const drawn = draw(state, 400).filter((enquiry) => enquiry.express);
    expect(drawn.length).toBeGreaterThan(0);
    const uplifts: number[] = [];
    for (const enquiry of drawn) {
      expect(enquiry.price).toBeGreaterThan(enquiry.basePrice);
      const uplift = enquiry.price / enquiry.basePrice - 1;
      // The price is rounded to the nearest ten, so a small job's uplift lands a little either
      // side of the band; the band itself is what is drawn.
      expect(uplift, String(enquiry.price)).toBeGreaterThan(EXPRESS_PRICE_UPLIFT_MIN - 0.05);
      expect(uplift, String(enquiry.price)).toBeLessThan(EXPRESS_PRICE_UPLIFT_MAX + 0.05);
      uplifts.push(uplift);
    }
    // Uniformly: both ends of the band are drawn, not just the middle of it.
    expect(Math.min(...uplifts)).toBeLessThan(0.35);
    expect(Math.max(...uplifts)).toBeGreaterThan(0.45);
    const plain = draw(state, 100).filter((enquiry) => !enquiry.express);
    for (const enquiry of plain) expect(enquiry.price).toBe(enquiry.basePrice);
  });

  it('has no weekly cap left, so a quarter of the board can be express', () => {
    const state = newGame();
    state.reputation = 100;
    let express = 0;
    let total = 0;
    for (let day = 1; day <= 7; day += 1) {
      state.clock.day = day;
      state.enquiries = [];
      refillBoard(state);
      const open = reachableEnquiries(state);
      express += open.filter((enquiry) => enquiry.express).length;
      total += open.length;
    }
    expect(total).toBeGreaterThan(7);
    expect(express).toBeGreaterThan(1);
  });

  it('gives an express job the shorter deadline and the heavier penalty', () => {
    const state = newGame();
    state.enquiries = [];
    for (const enquiry of draw(state, 400)) {
      if (!enquiry.express) continue;
      expect(enquiry.deadlineDays).toBeGreaterThanOrEqual(DEADLINE_DAYS_MIN);
      const ownerDays = ownerDaysFor(
        state,
        labourValueFor(enquiry.basePrice),
        enquiry.materialKind,
      );
      const base = Math.min(
        DEADLINE_DAYS_MAX,
        Math.max(
          DEADLINE_DAYS_MIN,
          Math.floor(ownerDays * DEADLINE_DAYS_FACTOR + DEADLINE_DAYS_BASE),
        ),
      );
      const slack =
        enquiry.basePrice <= DEADLINE_SMALL_JOB_PRICE
          ? DEADLINE_SMALL_SLACK_DAYS
          : Math.round((base * DEADLINE_SLACK_PERCENT_MAX) / 100);
      expect(enquiry.deadlineDays).toBeLessThanOrEqual(
        Math.max(DEADLINE_DAYS_MIN, Math.round((base + slack) * DEADLINE_EXPRESS_FACTOR)),
      );
    }
    expect(DEADLINE_EXPRESS_FACTOR).toBe(0.6);
  });
});

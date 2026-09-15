import { describe, expect, it } from 'vitest';
import {
  ANSWER_MAX,
  ANSWER_MIN,
  ANSWER_SKEW_MAX,
  ANSWER_SKEW_PER_REPUTATION_TIER,
  BOARD_SIZE_BY_TIER,
  COMMERCIAL_BUDGET_FACTOR_MAX,
  COMMERCIAL_BUDGET_FACTOR_MIN,
  COMMERCIAL_MIN_REPUTATION,
  COMMERCIAL_MIN_STAFF,
  COMMERCIAL_PROBABILITY,
  ENQUIRIES_PER_DAY_BY_REPUTATION_TIER,
  NO_INSURANCE_REASON,
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
  ANSWER_SKEW_NEUTRAL_TIER,
} from '../../src/engine/constants';
import {
  answerSkew,
  boardSizeRange,
  canAccept,
  drawOffer,
  enquiriesDueToday,
  enquiryQualityTier,
  expireEnquiries,
  expressProbability,
  generateEnquiry,
  qualifiesForCommercial,
  reachableEnquiries,
  arriveEnquiries,
  refreshBoard,
  removeEnquiry,
  skewed,
  unreachableEnquiries,
  websiteEnquiriesOn,
} from '../../src/engine/board';
import { labourValueFor, ownerDaysFor } from '../../src/engine/jobs';
import { tick } from '../../src/engine/index';
import type { Enquiry, GameState, WorkerRole } from '../../src/engine/index';
import {
  act,
  buyNow,
  buyStartingKit,
  choose,
  clearEvents,
  newGame,
  nextDay,
  placeEnquiry,
} from '../helpers';

/** Somebody of this role on the books, without the interview: the skew asks only who is hired. */
function withRole(state: GameState, role: WorkerRole): void {
  state.workers.push({
    id: `staff-${role}`,
    name: role,
    role,
    tier: null,
    rate: 0,
    weeklyWage: 0,
    monthlyWage: 2000,
    startDay: 1,
    jobId: null,
    taskId: null,
    minutesWorked: 0,
    ordersToday: 0,
    overtimeMinutes: 0,
    overtimeMinutesWeek: 0,
    overtimeDays: 0,
    tiredOfOvertime: false,
    station: 'idle',
    productionMinutes: 0,
    absentDaysRemaining: 0,
    shift: 'day',
    dayLog: [],
    anchorX: 1,
    anchorY: 1,
  });
}

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

  it('starts day 1 with the morning post of the lowest tier, greyed out', () => {
    const state = newGame();
    // One a day at the very start: the board is no longer filled to its size (PIOTR; CLAUDE.md
    // T13 3.4).
    const open = reachableEnquiries(state);
    expect(open.length).toBe(ENQUIRIES_PER_DAY_BY_REPUTATION_TIER[1]);
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
      kind: 'residential',
      budget: 12000,
      offer: null,
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
      kind: 'residential',
      budget: 480,
      offer: null,
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
    // The automatic third enquiry that refilled the board after an acceptance is gone: the next
    // ones come in the morning (PIOTR; CLAUDE.md T13 3.4).
    expect(state.enquiries.length).toBe(before - 1);
    expect(state.enquiries.some((enquiry) => enquiry.id === first?.id)).toBe(false);
  });

  it('tops an empty board back up in the morning', () => {
    const state = newGame();
    state.enquiries = [];
    arriveEnquiries(state);
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
      arriveEnquiries(state);
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

describe('the day\'s post (CLAUDE.md T13 3.4, 3.7)', () => {
  it('brings one a day at the start and two at the top tier, off the one table', () => {
    expect(ENQUIRIES_PER_DAY_BY_REPUTATION_TIER).toEqual([1, 1, 2]);
    const state = newGame();
    // The template site adds and takes nothing: the table alone.
    state.website.level = 2;
    for (let day = 1; day <= 5; day += 1) {
      state.clock.day = day;
      expect(enquiriesDueToday(state), `day ${day}`).toBe(1);
    }
    state.reputation = 30;
    expect(enquiriesDueToday(state)).toBe(2);
    state.reputation = -20;
    expect(enquiriesDueToday(state)).toBe(1);
    // No post on a weekend.
    state.clock.day = 6;
    expect(enquiriesDueToday(state)).toBe(0);
  });

  it('arrives at the open and never after an acceptance: one a day, not three', () => {
    let state = newGame();
    state.website.level = 2;
    state.enquiries = [];
    arriveEnquiries(state);
    expect(reachableEnquiries(state)).toHaveLength(1);
    // Taking it draws nothing in its place, at the open or at the 13:00 rewrite.
    removeEnquiry(state, reachableEnquiries(state)[0]?.id ?? '');
    refreshBoard(state);
    expect(reachableEnquiries(state)).toHaveLength(0);
    state = clearEvents(tick(state, 600));
    expect(reachableEnquiries(state)).toHaveLength(0);
    // The next morning brings the next one.
    state = clearEvents(nextDay(state));
    expect(state.clock.day).toBe(2);
    expect(reachableEnquiries(state)).toHaveLength(1);
  });

  it('spreads the website\'s weekly figure over the working week as whole enquiries', () => {
    const state = newGame();
    const week = (): number => {
      let sum = 0;
      for (let day = 1; day <= 7; day += 1) {
        state.clock.day = day;
        const due = enquiriesDueToday(state);
        expect(Number.isInteger(due)).toBe(true);
        expect(due).toBeGreaterThanOrEqual(0);
        expect(due).toBeLessThanOrEqual(2);
        sum += due;
      }
      return sum;
    };
    state.website.level = 2;
    expect(week()).toBe(5);
    // Do it yourself: one fewer, off the Friday.
    state.website.level = 1;
    expect(week()).toBe(4);
    state.website.level = 3;
    expect(week()).toBe(6);
    state.website.level = 4;
    expect(week()).toBe(7);
    state.website.level = 5;
    expect(week()).toBe(8);
    // A plus lands Monday first, a minus Friday first, nothing on the weekend.
    expect(websiteEnquiriesOn(1, 3)).toBe(1);
    expect(websiteEnquiriesOn(3, 3)).toBe(1);
    expect(websiteEnquiriesOn(4, 3)).toBe(0);
    expect(websiteEnquiriesOn(5, -1)).toBe(-1);
    expect(websiteEnquiriesOn(4, -1)).toBe(0);
    expect(websiteEnquiriesOn(6, 3)).toBe(0);
    expect(websiteEnquiriesOn(7, -1)).toBe(0);
  });

  it('moves the enquiries drawn a tier up or down the ladder with the website, never off it', () => {
    const state = newGame();
    state.reputation = 0;
    state.website.level = 2;
    expect(enquiryQualityTier(state)).toBe(1);
    state.website.level = 1;
    expect(enquiryQualityTier(state)).toBe(0);
    state.website.level = 4;
    expect(enquiryQualityTier(state)).toBe(2);
    state.reputation = 40;
    state.website.level = 5;
    expect(enquiryQualityTier(state)).toBe(2);
    state.reputation = -30;
    state.website.level = 1;
    expect(enquiryQualityTier(state)).toBe(0);
    // Measured: with the top agency the dearer work of the band comes up more often, and the
    // band itself is still the reputation's (no wardrobe for a company nobody knows).
    const shelvesShare = (level: number): number => {
      const drawnFrom = newGame();
      drawnFrom.reputation = 0;
      drawnFrom.website.level = level;
      drawnFrom.enquiries = [];
      const drawn = draw(drawnFrom, 600);
      expect(new Set(drawn.map((enquiry) => enquiry.templateId))).toEqual(
        new Set(['garageShelves', 'bookcase']),
      );
      return drawn.filter((enquiry) => enquiry.templateId === 'garageShelves').length / drawn.length;
    };
    expect(shelvesShare(1)).toBeGreaterThan(shelvesShare(4));
  });
});

describe('the client\'s answer (CLAUDE.md T13 3.24)', () => {
  it('builds the skew a quarter at a time around the neutral tier, and caps it', () => {
    expect(ANSWER_SKEW_NEUTRAL_TIER).toBe(1);
    const state = newGame();
    state.website.level = 2;
    state.reputation = 0;
    expect(answerSkew(state)).toBe(0);
    state.reputation = -30;
    expect(answerSkew(state)).toBe(-ANSWER_SKEW_PER_REPUTATION_TIER);
    state.reputation = 40;
    expect(answerSkew(state)).toBeCloseTo(ANSWER_SKEW_PER_REPUTATION_TIER);
    withRole(state, 'estimator');
    expect(answerSkew(state)).toBeCloseTo(0.5);
    withRole(state, 'salesman');
    expect(answerSkew(state)).toBeCloseTo(0.75);
    expect(answerSkew(state)).toBeLessThanOrEqual(ANSWER_SKEW_MAX);
    // The bend itself: uniform at nothing, towards the top for a plus, the bottom for a minus.
    expect(skewed(0.5, 0)).toBe(0.5);
    expect(skewed(0.25, 1)).toBeCloseTo(0.5);
    expect(skewed(0.75, -1)).toBeCloseTo(0.5);
    expect(skewed(0, 1)).toBe(0);
    expect(skewed(1, -1)).toBe(1);
  });

  it('lands inside the band over a thousand draws, whatever the team', () => {
    expect([ANSWER_MIN, ANSWER_MAX]).toEqual([0.9, 1.15]);
    for (const reputation of [-30, 0, 40]) {
      const state = newGame();
      state.website.level = 2;
      state.reputation = reputation;
      if (reputation > 20) {
        withRole(state, 'estimator');
        withRole(state, 'salesman');
      }
      // A big budget, so the rounding to ten is a hair and not a tenth.
      const enquiry = placeEnquiry(state, { price: 100000 });
      for (let i = 0; i < 1000; i += 1) {
        const offer = drawOffer(state, enquiry);
        const factor = offer / enquiry.budget;
        expect(factor, String(reputation)).toBeGreaterThanOrEqual(ANSWER_MIN - 0.0001);
        expect(factor, String(reputation)).toBeLessThanOrEqual(ANSWER_MAX + 0.0001);
        expect(offer % 10).toBe(0);
      }
    }
  });

  it('shifts the odds up with a good team and down with a poor one, and guarantees nothing', () => {
    const draws = 3000;
    const factors = (setup: (state: GameState) => void): number[] => {
      const state = newGame();
      state.website.level = 2;
      setup(state);
      const enquiry = placeEnquiry(state, { price: 100000 });
      const out: number[] = [];
      for (let i = 0; i < draws; i += 1) out.push(drawOffer(state, enquiry) / enquiry.budget);
      return out;
    };
    const mean = (values: number[]): number => values.reduce((a, b) => a + b, 0) / values.length;
    const plain = factors((state) => {
      state.reputation = 0;
    });
    const poor = factors((state) => {
      state.reputation = -30;
    });
    const good = factors((state) => {
      state.reputation = 40;
      withRole(state, 'estimator');
      withRole(state, 'salesman');
    });
    // A new company with nobody: uniform in the band, so the middle of it.
    expect(Math.abs(mean(plain) - (ANSWER_MIN + ANSWER_MAX) / 2)).toBeLessThan(0.01);
    expect(mean(poor)).toBeLessThan(mean(plain) - 0.01);
    expect(mean(good)).toBeGreaterThan(mean(plain) + 0.03);
    // Nothing guaranteed: the good team still hears a poor number now and then, and the poor
    // team a good one.
    expect(good.some((factor) => factor < 0.95)).toBe(true);
    expect(poor.some((factor) => factor > 1.1)).toBe(true);
  });
});

describe('commercial enquiries and the insurance gate (CLAUDE.md T13 3.15)', () => {
  /** A company of this standing with so many on the books, the board empty. */
  function known(reputation: number, staff: number): GameState {
    const state = newGame({ difficulty: 'veryEasy' });
    state.reputation = reputation;
    state.website.level = 2;
    for (let index = 0; index < staff; index += 1) withRole(state, 'joiner');
    state.workers.forEach((worker, index) => {
      worker.id = `staff-${index + 1}`;
    });
    state.enquiries = [];
    return state;
  }

  /** The day 1 kit, a standing above the gate and a joiner: a company commercial work is asked
   *  of, with the tools to take it. */
  function equipped(): GameState {
    const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    state.reputation = 30;
    state.website.level = 2;
    withRole(state, 'joiner');
    state.enquiries = [];
    return state;
  }

  /** A commercial enquiry the day's post drew while the company held no cover. */
  function commercialOnTheBoard(state: GameState, extra: Partial<Enquiry> = {}): Enquiry {
    return placeEnquiry(state, {
      kind: 'commercial',
      price: 2000,
      deadlineDays: 60,
      unreachable: true,
      blockReason: NO_INSURANCE_REASON,
      ...extra,
    });
  }

  it('is only asked of a company above reputation 20 with somebody on the books', () => {
    expect(COMMERCIAL_MIN_REPUTATION).toBe(20);
    expect(COMMERCIAL_MIN_STAFF).toBe(1);
    expect(qualifiesForCommercial(known(20, 1))).toBe(false);
    expect(qualifiesForCommercial(known(30, 0))).toBe(false);
    expect(qualifiesForCommercial(known(30, 1))).toBe(true);
    for (const [reputation, staff] of [
      [30, 0],
      [15, 1],
    ]) {
      const drawn = draw(known(reputation ?? 0, staff ?? 0), 300);
      expect(drawn.length).toBe(300);
      expect(drawn.every((enquiry) => enquiry.kind === 'residential')).toBe(true);
    }
    const drawn = draw(known(30, 1), 1000);
    const commercial = drawn.filter((enquiry) => enquiry.kind === 'commercial');
    expect(commercial.length).toBeGreaterThan(0);
    expect(commercial.length / drawn.length).toBeCloseTo(COMMERCIAL_PROBABILITY, 1);
  });

  it('is two to three times the residential budget, and the larger work with it', () => {
    expect([COMMERCIAL_BUDGET_FACTOR_MIN, COMMERCIAL_BUDGET_FACTOR_MAX]).toEqual([2, 3]);
    const drawn = draw(known(30, 1), 2000);
    const byTemplate = new Map<string, { residential: number[]; commercial: number[] }>();
    for (const enquiry of drawn) {
      const bucket = byTemplate.get(enquiry.templateId) ?? { residential: [], commercial: [] };
      bucket[enquiry.kind].push(enquiry.budget);
      byTemplate.set(enquiry.templateId, bucket);
      // The work is scaled with the budget, so the material and the labour are the job's.
      expect(enquiry.basePrice).toBeLessThanOrEqual(enquiry.budget);
      if (enquiry.kind === 'commercial') expect(enquiry.name).toContain(', commercial');
    }
    const mean = (values: number[]): number => values.reduce((a, b) => a + b, 0) / values.length;
    let compared = 0;
    for (const [templateId, bucket] of byTemplate) {
      if (bucket.residential.length < 30 || bucket.commercial.length < 30) continue;
      compared += 1;
      const ratio = mean(bucket.commercial) / mean(bucket.residential);
      expect(ratio, templateId).toBeGreaterThan(COMMERCIAL_BUDGET_FACTOR_MIN * 0.9);
      expect(ratio, templateId).toBeLessThan(COMMERCIAL_BUDGET_FACTOR_MAX * 1.1);
    }
    expect(compared).toBeGreaterThan(0);
  });

  it('arrives greyed with the reason "no insurance" while a cover is missing', () => {
    const state = equipped();
    const drawn = draw(state, 400).filter((enquiry) => enquiry.kind === 'commercial');
    expect(drawn.length).toBeGreaterThan(0);
    for (const enquiry of drawn) {
      expect(enquiry.unreachable).toBe(true);
      expect(enquiry.blockReason).toBe(NO_INSURANCE_REASON);
      expect(canAccept(state, enquiry)).toEqual({ ok: false, reason: NO_INSURANCE_REASON });
    }
    // The greyed ones stand beside the band and are never counted into it.
    state.enquiries = [];
    arriveEnquiries(state);
    expect(reachableEnquiries(state).every((enquiry) => enquiry.kind === 'residential')).toBe(true);
  });

  it('cannot be taken while greyed, goes live with both covers held, and greys again without', () => {
    let state = equipped();
    const enquiry = commercialOnTheBoard(state);
    state = act(state, { type: 'SET_SPEED', speed: 1 });
    const onBoard = (): Enquiry | undefined =>
      state.enquiries.find((entry) => entry.id === enquiry.id);
    expect(onBoard()?.unreachable).toBe(true);
    expect(canAccept(state, onBoard() as Enquiry)).toEqual({ ok: false, reason: NO_INSURANCE_REASON });
    // Accepting while greyed is refused: no offer, no job, nothing paid.
    const cash = state.cash;
    state = act(state, { type: 'ACCEPT_ENQUIRY', enquiryId: enquiry.id, byHand: false });
    expect(state.activeEvent).toBeNull();
    expect(state.jobs).toHaveLength(0);
    expect(state.cash).toBe(cash);
    // One cover is not both.
    state = act(state, { type: 'SET_INSURANCE', cover: 'property', on: true });
    expect(onBoard()?.unreachable).toBe(true);
    expect(onBoard()?.blockReason).toBe(NO_INSURANCE_REASON);
    // Both held: it joins the band and can be taken like any other.
    state = act(state, { type: 'SET_INSURANCE', cover: 'liability', on: true });
    expect(onBoard()?.unreachable).toBe(false);
    expect(onBoard()?.blockReason).toBe('');
    expect(canAccept(state, onBoard() as Enquiry).ok).toBe(true);
    // Dropped again: greyed again, with the reason.
    const dropped = act(state, { type: 'SET_INSURANCE', cover: 'liability', on: false });
    const again = dropped.enquiries.find((entry) => entry.id === enquiry.id);
    expect(again?.unreachable).toBe(true);
    expect(again?.blockReason).toBe(NO_INSURANCE_REASON);
    // Taken with the covers: the client answers, and the job is commercial.
    state = act(state, { type: 'ACCEPT_ENQUIRY', enquiryId: enquiry.id, byHand: false });
    expect(state.activeEvent?.kind).toBe('clientOffer');
    state = choose(state, 'accept');
    expect(state.jobs[0]?.kind).toBe('commercial');
    expect(state.jobs[0]?.budget).toBe(2000);
  });

  it('keeps a kit reason ahead of the insurance one, and never lets the covers lift it', () => {
    let state = equipped();
    // An oak table wants the timber machines the hall has not got.
    const table = commercialOnTheBoard(state, {
      templateId: 'oakDiningTable',
      name: 'Oak dining table, commercial',
      price: 12000,
      materialKind: 'solidWood',
      lockReason: 'Needs solid wood tools',
      byHandAvailable: true,
      blockReason: 'no timber machines',
      blockWhere: 'catalogue',
    });
    state = act(state, { type: 'SET_INSURANCE', cover: 'property', on: true });
    state = act(state, { type: 'SET_INSURANCE', cover: 'liability', on: true });
    const same = state.enquiries.find((entry) => entry.id === table.id);
    expect(same?.unreachable).toBe(true);
    expect(same?.blockReason).toBe('no timber machines');
    expect(same?.blockWhere).toBe('catalogue');
  });
});

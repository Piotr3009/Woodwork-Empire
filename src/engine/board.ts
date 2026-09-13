// The order board. Enquiries arrive here, not by telephone: the player opens the board and picks
// (CLAUDE.md 8.8). Reputation decides how many and how dear, tools decide what is greyed out.

import {
  BESPOKE_PROBABILITY,
  BOARD_SIZE_BY_TIER,
  EXPIRY_EXPRESS_DAYS,
  EXPIRY_STANDARD_DAYS,
  EXPRESS_MAX_PER_WEEK,
  EXPRESS_PRICE_UPLIFT,
  EXPRESS_PROBABILITY_BASE,
  EXPRESS_PROBABILITY_MAX,
  EXPRESS_PROBABILITY_MIN,
  EXPRESS_PROBABILITY_PER_REPUTATION_STEP,
  EXPRESS_PROBABILITY_REPUTATION_STEP,
  SIZE_MULTIPLIER_MAX,
  SIZE_MULTIPLIER_MIN,
} from './constants';
import {
  availableFinishes,
  findTemplate,
  lockReasonFor,
  marketPriceFactor,
  priceFor,
  templatesForReputation,
} from './catalog';
import { weekOfDay } from './clock';
import { deadlineDaysFor, labourValueFor, ownerDaysFor } from './jobs';
import { reputationTier } from './reputation';
import { chance, float, int, makeId, pickWeighted } from './rng';
import type { Enquiry, GameState, ProductTemplate } from './types';

/** How many enquiries a company of this standing has waiting [TUNE]. */
export function boardSizeRange(state: GameState): [number, number] {
  const tier = reputationTier(state.reputation);
  return BOARD_SIZE_BY_TIER[Math.min(tier, BOARD_SIZE_BY_TIER.length - 1)] ?? [1, 2];
}

/** Chance the next enquiry is an express job: base plus a step per whole ten points of
 *  reputation, floored and capped [TUNE mapping]. */
export function expressProbability(reputation: number): number {
  const steps = Math.floor(reputation / EXPRESS_PROBABILITY_REPUTATION_STEP);
  const raw = EXPRESS_PROBABILITY_BASE + EXPRESS_PROBABILITY_PER_REPUTATION_STEP * steps;
  return Math.min(EXPRESS_PROBABILITY_MAX, Math.max(EXPRESS_PROBABILITY_MIN, raw));
}

/** One express enquiry a week and no more (PIOTR). */
export function expressAllowed(state: GameState): boolean {
  const alreadyThisWeek =
    state.lastExpressDay !== null &&
    weekOfDay(state.lastExpressDay) === weekOfDay(state.clock.day)
      ? 1
      : 0;
  return alreadyThisWeek < EXPRESS_MAX_PER_WEEK;
}

function drawTemplate(state: GameState): ProductTemplate | null {
  const tier = reputationTier(state.reputation);
  const candidates = templatesForReputation(state.reputation);
  return pickWeighted(state, candidates, (entry) => entry.weightsByTier[tier] ?? 0);
}

function buildEnquiry(state: GameState, entry: ProductTemplate): Enquiry | null {
  // The roll always runs, so the weekly cap never shifts the rest of the random stream.
  const express = chance(state, expressProbability(state.reputation)) && expressAllowed(state);
  const sizeMultiplier = float(state, SIZE_MULTIPLIER_MIN, SIZE_MULTIPLIER_MAX);
  const market = marketPriceFactor(state.reputation);
  const basePrice = priceFor(entry.basePrice, sizeMultiplier, 0, market);
  const price = express
    ? priceFor(entry.basePrice, sizeMultiplier, EXPRESS_PRICE_UPLIFT, market)
    : basePrice;
  const finishes = availableFinishes(state, entry);
  const finish = finishes[int(state, 0, Math.max(0, finishes.length - 1))];
  if (!finish) return null;
  // The deadline comes off the work in the job now, not off the kind of thing it is
  // (CLAUDE.md T6 3.7).
  const deadlineDays = deadlineDaysFor(state, {
    ownerDays: ownerDaysFor(state, labourValueFor(basePrice), entry.material),
    price: basePrice,
    express,
  });
  const bespokeMaterial = chance(state, BESPOKE_PROBABILITY);
  const expiryDays = express ? EXPIRY_EXPRESS_DAYS : EXPIRY_STANDARD_DAYS;
  return {
    id: makeId(state, 'enq'),
    templateId: entry.id,
    name: entry.name,
    sizeMultiplier: Math.round(sizeMultiplier * 100) / 100,
    price,
    basePrice,
    finish,
    materialKind: entry.material,
    deadlineDays,
    express,
    bespokeMaterial,
    needsMeasure: entry.needsMeasure,
    createdDay: state.clock.day,
    expiresOnDay: state.clock.day + expiryDays - 1,
    lockReason: lockReasonFor(state, entry),
    byHandAvailable: entry.byHandAllowed,
  };
}

/** Never two of the same template at the same price side by side (CLAUDE.md 8.8 step 8). */
function collides(state: GameState, candidate: Enquiry): boolean {
  const last = state.enquiries[state.enquiries.length - 1];
  if (!last) return false;
  return last.templateId === candidate.templateId && last.price === candidate.price;
}

const DRAW_ATTEMPTS = 12;

export function generateEnquiry(state: GameState): Enquiry | null {
  for (let attempt = 0; attempt < DRAW_ATTEMPTS; attempt += 1) {
    const entry = drawTemplate(state);
    if (!entry) return null;
    const candidate = buildEnquiry(state, entry);
    if (!candidate) return null;
    if (!collides(state, candidate)) return candidate;
  }
  return null;
}

/** Adds one enquiry if the board has room for it. The one place the board grows. */
function drawInto(state: GameState): boolean {
  const [, max] = boardSizeRange(state);
  if (state.enquiries.length >= max) return false;
  const enquiry = generateEnquiry(state);
  if (!enquiry) return false;
  state.enquiries.push(enquiry);
  if (enquiry.express) state.lastExpressDay = state.clock.day;
  return true;
}

/** Tops the board up to what the reputation supports. Runs at the start of every working day. */
export function refillBoard(state: GameState): void {
  const [min, max] = boardSizeRange(state);
  if (state.enquiries.length >= min) return;
  const target = int(state, min, max);
  while (state.enquiries.length < target) {
    if (!drawInto(state)) return;
  }
}

/** The lock reason follows the workshop: buy the tools and the greyed entry goes live. */
export function refreshLocks(state: GameState): void {
  for (const enquiry of state.enquiries) {
    const entry = findTemplate(enquiry.templateId);
    enquiry.lockReason = entry ? lockReasonFor(state, entry) : null;
  }
}

/** Drops what nobody took in time, and draws a replacement for each (CLAUDE.md 8.8). */
export function expireEnquiries(state: GameState): void {
  const before = state.enquiries.length;
  state.enquiries = state.enquiries.filter((enquiry) => enquiry.expiresOnDay >= state.clock.day);
  for (let gone = state.enquiries.length; gone < before; gone += 1) {
    if (!drawInto(state)) return;
  }
}

export function findEnquiry(state: GameState, enquiryId: string): Enquiry | null {
  return state.enquiries.find((enquiry) => enquiry.id === enquiryId) ?? null;
}

/** Takes an enquiry off the board and draws a new one in its place (CLAUDE.md 8.8). */
export function removeEnquiry(state: GameState, enquiryId: string): void {
  const before = state.enquiries.length;
  state.enquiries = state.enquiries.filter((enquiry) => enquiry.id !== enquiryId);
  if (state.enquiries.length < before) drawInto(state);
}

/** Locked entries can still be taken when the template allows the by hand path (CLAUDE.md 8.8). */
export function canAccept(state: GameState, enquiry: Enquiry): { ok: boolean; reason: string } {
  if (enquiry.lockReason === null) return { ok: true, reason: '' };
  if (enquiry.byHandAvailable) return { ok: true, reason: '' };
  void state;
  return { ok: false, reason: enquiry.lockReason };
}

// The order board. Enquiries arrive here, not by telephone: the player opens the board and picks
// (CLAUDE.md 8.8). Reputation decides how many and how dear, tools decide what is greyed out.

import {
  BESPOKE_PROBABILITY,
  BOARD_SIZE_BY_TIER,
  EXPIRY_EXPRESS_DAYS,
  EXPIRY_STANDARD_DAYS,
  EXPRESS_PRICE_UPLIFT,
  EXPRESS_PROBABILITY_BASE,
  EXPRESS_PROBABILITY_PER_REPUTATION,
  SIZE_MULTIPLIER_MAX,
  SIZE_MULTIPLIER_MIN,
} from './constants';
import {
  availableFinishes,
  findTemplate,
  lockReasonFor,
  priceFor,
  templatesForReputation,
} from './catalog';
import { reputationTier } from './reputation';
import { chance, float, int, makeId, pickWeighted } from './rng';
import type { Enquiry, GameState, ProductTemplate } from './types';

/** How many enquiries a company of this standing has waiting [TUNE]. */
export function boardSizeRange(state: GameState): [number, number] {
  const tier = reputationTier(state.reputation);
  return BOARD_SIZE_BY_TIER[Math.min(tier, BOARD_SIZE_BY_TIER.length - 1)] ?? [1, 2];
}

/** Chance the next enquiry is an express job [TUNE]. */
export function expressProbability(reputation: number): number {
  const whole = Math.floor(Math.max(0, reputation));
  return EXPRESS_PROBABILITY_BASE + EXPRESS_PROBABILITY_PER_REPUTATION * whole;
}

function drawTemplate(state: GameState): ProductTemplate | null {
  const tier = reputationTier(state.reputation);
  const candidates = templatesForReputation(state.reputation);
  return pickWeighted(state, candidates, (entry) => entry.weightsByTier[tier] ?? 0);
}

function buildEnquiry(state: GameState, entry: ProductTemplate): Enquiry | null {
  const express = chance(state, expressProbability(state.reputation));
  const sizeMultiplier = float(state, SIZE_MULTIPLIER_MIN, SIZE_MULTIPLIER_MAX);
  const price = priceFor(entry.basePrice, sizeMultiplier, express ? EXPRESS_PRICE_UPLIFT : 0);
  const finishes = availableFinishes(state, entry);
  const finish = finishes[int(state, 0, Math.max(0, finishes.length - 1))];
  if (!finish) return null;
  const deadlineDays = int(state, entry.deadlineMinDays, entry.deadlineMaxDays);
  const bespokeMaterial = chance(state, BESPOKE_PROBABILITY);
  const expiryDays = express ? EXPIRY_EXPRESS_DAYS : EXPIRY_STANDARD_DAYS;
  return {
    id: makeId(state, 'enq'),
    templateId: entry.id,
    name: entry.name,
    sizeMultiplier: Math.round(sizeMultiplier * 100) / 100,
    price,
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

/** Tops the board back up once it has dropped below what the reputation supports. */
export function refillBoard(state: GameState): void {
  const [min, max] = boardSizeRange(state);
  if (state.enquiries.length >= min) return;
  const target = int(state, min, max);
  while (state.enquiries.length < target) {
    const enquiry = generateEnquiry(state);
    if (!enquiry) return;
    state.enquiries.push(enquiry);
  }
}

/** The lock reason follows the workshop: buy the tools and the greyed entry goes live. */
export function refreshLocks(state: GameState): void {
  for (const enquiry of state.enquiries) {
    const entry = findTemplate(enquiry.templateId);
    enquiry.lockReason = entry ? lockReasonFor(state, entry) : null;
  }
}

/** Drops what nobody took in time. Runs at the start of every working day. */
export function expireEnquiries(state: GameState): void {
  state.enquiries = state.enquiries.filter((enquiry) => enquiry.expiresOnDay >= state.clock.day);
}

export function findEnquiry(state: GameState, enquiryId: string): Enquiry | null {
  return state.enquiries.find((enquiry) => enquiry.id === enquiryId) ?? null;
}

export function removeEnquiry(state: GameState, enquiryId: string): void {
  state.enquiries = state.enquiries.filter((enquiry) => enquiry.id !== enquiryId);
}

/** Locked entries can still be taken when the template allows the by hand path (CLAUDE.md 8.8). */
export function canAccept(state: GameState, enquiry: Enquiry): { ok: boolean; reason: string } {
  if (enquiry.lockReason === null) return { ok: true, reason: '' };
  if (enquiry.byHandAvailable) return { ok: true, reason: '' };
  void state;
  return { ok: false, reason: enquiry.lockReason };
}

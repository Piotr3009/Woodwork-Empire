// The order board. Enquiries arrive here, not by telephone: the player opens the board and picks
// (CLAUDE.md 8.8). Reputation decides how many and how dear, tools decide what is greyed out.

import {
  BESPOKE_PROBABILITY,
  BOARD_SIZE_BY_TIER,
  EXPIRY_EXPRESS_DAYS,
  EXPIRY_STANDARD_DAYS,
  EXPRESS_PRICE_UPLIFT_MAX,
  EXPRESS_PRICE_UPLIFT_MIN,
  EXPRESS_PROBABILITY,
  MINUTES_PER_WORKING_DAY,
  PRODUCT_TEMPLATES,
  SIZE_MULTIPLIER_MAX,
  SIZE_MULTIPLIER_MIN,
  SOLID_WOOD_EQUIPMENT,
  UNREACHABLE_MAX,
  UNREACHABLE_MIN,
} from './constants';
import { findSpec, has } from './machines';
import {
  availableFinishes,
  findTemplate,
  lockReasonFor,
  marketPriceFactor,
  priceFor,
  templatesForReputation,
} from './catalog';
import { deadlineDaysFor, labourValueFor, ownerDaysFor, stagedJob } from './jobs';
import { jobMinutesFor } from './stages';
import { hasOrOnOrder } from './orders';
import { workshopRate } from './plan';
import { reputationTier } from './reputation';
import { chance, float, int, makeId, pickWeighted } from './rng';
import type { Enquiry, GameState, ProductTemplate } from './types';

/** How many enquiries a company of this standing has waiting [TUNE]. */
export function boardSizeRange(state: GameState): [number, number] {
  const tier = reputationTier(state.reputation);
  return BOARD_SIZE_BY_TIER[Math.min(tier, BOARD_SIZE_BY_TIER.length - 1)] ?? [1, 2];
}

/** Chance the next enquiry drawn is an express job: a flat figure at every refresh of the board
 *  (PIOTR, 13.09: "more express jobs, properly profitable"; CLAUDE.md T10 3.7). The reputation
 *  ladder of Turns 1 to 9 and the one a week that capped it are both gone. */
export function expressProbability(): number {
  return EXPRESS_PROBABILITY;
}

function drawTemplate(state: GameState): ProductTemplate | null {
  const tier = reputationTier(state.reputation);
  const candidates = templatesForReputation(state.reputation);
  return pickWeighted(state, candidates, (entry) => entry.weightsByTier[tier] ?? 0);
}

function buildEnquiry(state: GameState, entry: ProductTemplate): Enquiry | null {
  const express = chance(state, expressProbability());
  // The uplift is drawn either way, so an express job and a standard one take the same number of
  // draws out of the seeded stream (PIOTR: 30% to 50%, uniformly; CLAUDE.md T10 3.7).
  const uplift = float(state, EXPRESS_PRICE_UPLIFT_MIN, EXPRESS_PRICE_UPLIFT_MAX);
  const sizeMultiplier = float(state, SIZE_MULTIPLIER_MIN, SIZE_MULTIPLIER_MAX);
  const market = marketPriceFactor(state.reputation);
  const basePrice = priceFor(entry.basePrice, sizeMultiplier, 0, market);
  const price = express
    ? priceFor(entry.basePrice, sizeMultiplier, uplift, market)
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
    unreachable: false,
    blockReason: '',
    blockWhere: '',
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

/** The enquiries of the band: the ones the company could take. The greyed ones stand beside the
 *  band and are never counted into it (CLAUDE.md T10 3.7). */
export function reachableEnquiries(state: GameState): Enquiry[] {
  return state.enquiries.filter((enquiry) => !enquiry.unreachable);
}

/** The ones on the board to be looked at and not taken. */
export function unreachableEnquiries(state: GameState): Enquiry[] {
  return state.enquiries.filter((enquiry) => enquiry.unreachable);
}

/** Adds one enquiry if the board has room for it. The one place the board grows. */
function drawInto(state: GameState): boolean {
  const [, max] = boardSizeRange(state);
  if (reachableEnquiries(state).length >= max) return false;
  const enquiry = generateEnquiry(state);
  if (!enquiry) return false;
  state.enquiries.push(enquiry);
  if (enquiry.express) state.lastExpressDay = state.clock.day;
  return true;
}

/** Tops the board up to what the reputation supports. Runs at the start of every working day. */
export function refillBoard(state: GameState): void {
  const [min, max] = boardSizeRange(state);
  if (reachableEnquiries(state).length >= min) return;
  const target = int(state, min, max);
  while (reachableEnquiries(state).length < target) {
    if (!drawInto(state)) return;
  }
}

// ---------------------------------------------------------------------------
// The jobs the company cannot take (PIOTR, 13.09: "show the jobs we cannot take and say why";
// CLAUDE.md T10 3.7). Two or three of them stand on the board at a time, greyed, with the reason
// in plain words and a way to the page that would put it right.
// ---------------------------------------------------------------------------

export interface BoardBlock {
  reason: string;
  where: '' | 'catalogue' | 'team';
}

/** Why this template is out of the company's reach, or null while it is not. The first thing in
 *  the way, in the order the player would meet it: the standing, then the kit, then the hands. */
export function blockFor(
  state: GameState,
  entry: ProductTemplate,
  deadlineDays: number,
  basePrice: number,
): BoardBlock | null {
  if (state.reputation < entry.minReputation) {
    return { reason: `reputation too low (needs ${entry.minReputation})`, where: '' };
  }
  if (entry.material === 'solidWood' && !SOLID_WOOD_EQUIPMENT.every((id) => hasOrOnOrder(state, id))) {
    return { reason: 'no timber machines', where: 'catalogue' };
  }
  if (entry.allowedFinishes.includes('lacquer') && !has(state, 'sprayBooth')) {
    return { reason: 'needs a spray booth', where: 'catalogue' };
  }
  const missing = entry.requiredEquipment.filter((specId) => !hasOrOnOrder(state, specId));
  if (missing.length > 0) {
    const names = missing.map((specId) => findSpec(specId)?.name ?? specId);
    return { reason: `no ${names.join(', ').toLowerCase()}`, where: 'catalogue' };
  }
  // The Turn 9 latest start arithmetic: what this workshop averages against the days the client
  // gives (CLAUDE.md T9 3.6, T10 3.7).
  const minutes = jobMinutesFor(
    state,
    stagedJob(labourValueFor(basePrice), entry.material, false),
    workshopRate(state),
  );
  if (minutes / MINUTES_PER_WORKING_DAY > deadlineDays) {
    return { reason: 'too few people for the deadline', where: 'team' };
  }
  return null;
}

/** One enquiry the company cannot take, or null when everything on the catalogue is within its
 *  reach. Drawn from the whole product catalogue and not from the reputation band, because being
 *  under the band is one of the reasons (CLAUDE.md T10 3.7). */
export function generateUnreachable(state: GameState): Enquiry | null {
  for (let attempt = 0; attempt < DRAW_ATTEMPTS; attempt += 1) {
    const entry = PRODUCT_TEMPLATES[int(state, 0, PRODUCT_TEMPLATES.length - 1)];
    if (!entry) return null;
    const candidate = buildEnquiry(state, entry);
    if (!candidate) return null;
    const block = blockFor(state, entry, candidate.deadlineDays, candidate.basePrice);
    if (block === null) continue;
    if (state.enquiries.some((other) => other.unreachable && other.templateId === entry.id)) {
      continue;
    }
    return { ...candidate, unreachable: true, blockReason: block.reason, blockWhere: block.where };
  }
  return null;
}

/** Tops the greyed ones up to two or three. Runs with every refresh of the board. */
export function refillUnreachable(state: GameState): void {
  const target = int(state, UNREACHABLE_MIN, UNREACHABLE_MAX);
  let guard = 0;
  while (unreachableEnquiries(state).length < target && guard < DRAW_ATTEMPTS) {
    guard += 1;
    const enquiry = generateUnreachable(state);
    if (!enquiry) return;
    state.enquiries.push(enquiry);
  }
}

/** The board written again: what nobody took goes, what the standing draws comes in, and the
 *  greyed ones are topped back up. Twice a day, at 08:00 and at 13:00, whether or not anything
 *  was taken (PIOTR, 13.09; CLAUDE.md T10 3.7). */
export function refreshBoard(state: GameState): void {
  expireEnquiries(state);
  refillBoard(state);
  refillUnreachable(state);
}

/** The lock reason follows the workshop: buy the tools and the greyed entry goes live. A greyed
 *  enquiry the company has caught up with is no longer out of reach either, and it joins the band
 *  where there is room for it (CLAUDE.md T10 3.7). */
export function refreshLocks(state: GameState): void {
  const [, max] = boardSizeRange(state);
  for (const enquiry of state.enquiries) {
    const entry = findTemplate(enquiry.templateId);
    enquiry.lockReason = entry ? lockReasonFor(state, entry) : null;
    if (!enquiry.unreachable || entry === null) continue;
    const block = blockFor(state, entry, enquiry.deadlineDays, enquiry.basePrice);
    if (block === null && reachableEnquiries(state).length < max) {
      enquiry.unreachable = false;
      enquiry.blockReason = '';
      enquiry.blockWhere = '';
      continue;
    }
    if (block !== null) {
      enquiry.blockReason = block.reason;
      enquiry.blockWhere = block.where;
    }
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

/** Locked entries can still be taken when the template allows the by hand path (CLAUDE.md 8.8).
 *  A greyed one never can: it is on the board to be read (CLAUDE.md T10 3.7). */
export function canAccept(state: GameState, enquiry: Enquiry): { ok: boolean; reason: string } {
  if (enquiry.unreachable) return { ok: false, reason: enquiry.blockReason };
  if (enquiry.lockReason === null) return { ok: true, reason: '' };
  if (enquiry.byHandAvailable) return { ok: true, reason: '' };
  void state;
  return { ok: false, reason: enquiry.lockReason };
}

// The order board. Enquiries arrive here, not by telephone: the player opens the board and picks
// (CLAUDE.md 8.8). Reputation decides how many and how dear, tools decide what is greyed out.

import {
  ANSWER_MAX,
  ANSWER_MIN,
  ANSWER_SKEW_ESTIMATOR,
  ANSWER_SKEW_MAX,
  ANSWER_SKEW_PER_REPUTATION_TIER,
  ANSWER_SKEW_SALESMAN,
  BESPOKE_PROBABILITY,
  BOARD_SIZE_BY_TIER,
  COMMERCIAL_BUDGET_FACTOR_MAX,
  COMMERCIAL_BUDGET_FACTOR_MIN,
  COMMERCIAL_MIN_REPUTATION,
  COMMERCIAL_MIN_STAFF,
  COMMERCIAL_PROBABILITY,
  ENQUIRIES_PER_DAY_BY_REPUTATION_TIER,
  EXPIRY_EXPRESS_DAYS,
  NO_INSURANCE_REASON,
  EXPIRY_STANDARD_DAYS,
  EXPRESS_PRICE_UPLIFT_MAX,
  EXPRESS_PRICE_UPLIFT_MIN,
  EXPRESS_PROBABILITY,
  MINUTES_PER_WORKING_DAY,
  PRODUCT_TEMPLATES,
  REPUTATION_TIERS,
  SIZE_MULTIPLIER_MAX,
  SIZE_MULTIPLIER_MIN,
  SOLID_WOOD_EQUIPMENT,
  UNREACHABLE_MAX,
  UNREACHABLE_MIN,
  WORKING_DAYS_PER_WEEK,
} from './constants';
import { findSpec } from './machines';
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
import { effectiveReputation, reputationTier } from './reputation';
import { chance, float, int, makeId, pickWeighted } from './rng';
import { websiteEnquiriesPerWeek, websiteQualityShift } from './website';
import { coversHeld } from './insurance';
import type { Enquiry, EnquiryKind, GameState, ProductTemplate } from './types';
import { isWorkingDay, weekday } from './clock';

/** How many enquiries a company of this standing has waiting [TUNE]. */
export function boardSizeRange(state: GameState): [number, number] {
  const tier = reputationTier(effectiveReputation(state));
  return BOARD_SIZE_BY_TIER[Math.min(tier, BOARD_SIZE_BY_TIER.length - 1)] ?? [1, 2];
}

/** Chance the next enquiry drawn is an express job: a flat figure at every refresh of the board
 *  (PIOTR, 13.09: "more express jobs, properly profitable"; CLAUDE.md T10 3.7). The reputation
 *  ladder of Turns 1 to 9 and the one a week that capped it are both gone. */
export function expressProbability(): number {
  return EXPRESS_PROBABILITY;
}

/** The tier of the template weights the day's enquiries are drawn with: the reputation tier,
 *  moved up or down by the website's quality shift and never off the ladder (CLAUDE.md T13 3.7).
 *  The templates themselves stay the ones the reputation allows: a better website brings the
 *  dearer work of the band more often, not work the company is not known for yet. */
export function enquiryQualityTier(state: GameState): number {
  const top = REPUTATION_TIERS.length - 1;
  const tier = reputationTier(effectiveReputation(state)) + websiteQualityShift(state);
  return Math.max(0, Math.min(top, tier));
}

function drawTemplate(state: GameState): ProductTemplate | null {
  const tier = enquiryQualityTier(state);
  const candidates = templatesForReputation(effectiveReputation(state));
  return pickWeighted(state, candidates, (entry) => entry.weightsByTier[tier] ?? 0);
}

/** A company known well enough, with somebody on the books, is asked about commercial work
 *  (PIOTR; CLAUDE.md T13 3.15). Whether it can take it is the insurance gate's question. */
export function qualifiesForCommercial(state: GameState): boolean {
  return (
    effectiveReputation(state) > COMMERCIAL_MIN_REPUTATION &&
    state.workers.length >= COMMERCIAL_MIN_STAFF
  );
}

/** The kind an enquiry is drawn as: commercial now and then for a company that qualifies, drawn
 *  either way so the seeded stream is the same shape (CLAUDE.md T13 3.15). */
function drawKind(state: GameState): EnquiryKind {
  const commercial = chance(state, COMMERCIAL_PROBABILITY);
  return commercial && qualifiesForCommercial(state) ? 'commercial' : 'residential';
}

// T13-C1: move to constants.ts
/** The reputation tier the client's answer is neutral at: at it the draw is uniform in the band,
 *  under it the skew is negative and the offers land nearer the bottom of the band more often,
 *  over it nearer the top [TUNE 1, the tier of a new company at reputation 0]
 *  (CLAUDE.md T13 3.24). */
export const ANSWER_SKEW_NEUTRAL_TIER = 1;

/** The skew the team puts on the client's answer: a quarter for every reputation tier over the
 *  neutral one and a quarter off for every tier under it, a quarter for an estimator on the books
 *  and a quarter for the salesman (one tier tonight), capped either side (CLAUDE.md T13 3.24).
 *  It shifts the odds and never the band. */
export function answerSkew(state: GameState): number {
  const estimator = state.workers.some((worker) => worker.role === 'estimator') ? 1 : 0;
  const salesman = state.workers.some((worker) => worker.role === 'salesman') ? 1 : 0;
  const tiers = reputationTier(effectiveReputation(state)) - ANSWER_SKEW_NEUTRAL_TIER;
  const skew =
    tiers * ANSWER_SKEW_PER_REPUTATION_TIER +
    estimator * ANSWER_SKEW_ESTIMATOR +
    salesman * ANSWER_SKEW_SALESMAN;
  return Math.max(-ANSWER_SKEW_MAX, Math.min(ANSWER_SKEW_MAX, skew));
}

/** A uniform draw bent towards the top of the band by a positive skew and towards the bottom by
 *  a negative one, never leaving [0, 1]: u to the power of one over (1 + k) for k above zero
 *  (CLAUDE.md T13 3.24). The odds shift; nothing is guaranteed. */
export function skewed(u: number, k: number): number {
  const clamped = Math.max(0, Math.min(1, u));
  if (k >= 0) return Math.pow(clamped, 1 / (1 + k));
  return 1 - Math.pow(1 - clamped, 1 / (1 - k));
}

/** The client's answer: the budget times a factor drawn in the band, skewed by the team, rounded
 *  to the nearest ten like every price (PIOTR: minus 10% to plus 15%; CLAUDE.md T13 3.24). */
export function drawOffer(state: GameState, enquiry: Enquiry): number {
  const u = float(state, 0, 1);
  const factor = ANSWER_MIN + (ANSWER_MAX - ANSWER_MIN) * skewed(u, answerSkew(state));
  return priceFor(enquiry.budget * factor, 1, 0, 1);
}

function buildEnquiry(state: GameState, entry: ProductTemplate): Enquiry | null {
  const express = chance(state, expressProbability());
  // The uplift is drawn either way, so an express job and a standard one take the same number of
  // draws out of the seeded stream (PIOTR: 30% to 50%, uniformly; CLAUDE.md T10 3.7).
  const uplift = float(state, EXPRESS_PRICE_UPLIFT_MIN, EXPRESS_PRICE_UPLIFT_MAX);
  const sizeMultiplier = float(state, SIZE_MULTIPLIER_MIN, SIZE_MULTIPLIER_MAX);
  const market = marketPriceFactor(effectiveReputation(state));
  const basePrice = priceFor(entry.basePrice, sizeMultiplier, 0, market);
  const price = express
    ? priceFor(entry.basePrice, sizeMultiplier, uplift, market)
    : basePrice;
  // What this workshop could offer, and what the client asks for when it can offer nothing: a
  // client who wants his kitchen sprayed still rings up, and the board greys the enquiry and says
  // the workshop needs a booth (CLAUDE.md T10 3.7, T11 3.7).
  const offered = availableFinishes(state, entry);
  const finishes = offered.length > 0 ? offered : entry.allowedFinishes;
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
  // Commercial work is two to three times the residential budget (CLAUDE.md T13 3.15). The
  // factor is drawn either way, like the express uplift, so the stream is the same shape.
  const kind = drawKind(state);
  const commercial = float(state, COMMERCIAL_BUDGET_FACTOR_MIN, COMMERCIAL_BUDGET_FACTOR_MAX);
  const scale = kind === 'commercial' ? commercial : 1;
  const budget = priceFor(price * scale, 1, 0, 1);
  return {
    id: makeId(state, 'enq'),
    templateId: entry.id,
    name: kind === 'commercial' ? `${entry.name}, commercial` : entry.name,
    sizeMultiplier: Math.round(sizeMultiplier * 100) / 100,
    price: budget,
    basePrice: priceFor(basePrice * scale, 1, 0, 1),
    kind,
    budget,
    offer: null,
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
    // Commercial work wants both covers held; without them it is on the board greyed, with the
    // reason (CLAUDE.md T13 3.15).
    unreachable: kind === 'commercial' && !coversHeld(state),
    blockReason: kind === 'commercial' && !coversHeld(state) ? NO_INSURANCE_REASON : '',
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

/** The website's share of one day's post: its weekly figure spread over the working week, one
 *  whole enquiry a day and never a fraction. A plus lands on the first days of the week, Monday
 *  first; a minus on the last, Friday first; so a working week always carries exactly the weekly
 *  figure, one a day either way at most (CLAUDE.md T13 3.7). Nothing on a weekend. */
export function websiteEnquiriesOn(day: number, weekly: number): number {
  if (weekly === 0 || !isWorkingDay(day)) return 0;
  const index = weekday(day);
  if (weekly > 0) return index < weekly ? 1 : 0;
  return index >= WORKING_DAYS_PER_WEEK + weekly ? -1 : 0;
}

/** New enquiries a day: the reputation tier's figure and the website's share, drawn at the day's
 *  open and never under nothing; no post on a weekend (PIOTR: one at the start, two at most;
 *  CLAUDE.md T13 3.4, 3.7). */
export function enquiriesDueToday(state: GameState): number {
  if (!isWorkingDay(state.clock.day)) return 0;
  const tier = reputationTier(effectiveReputation(state));
  const base =
    ENQUIRIES_PER_DAY_BY_REPUTATION_TIER[
      Math.min(tier, ENQUIRIES_PER_DAY_BY_REPUTATION_TIER.length - 1)
    ] ?? 1;
  return Math.max(0, base + websiteEnquiriesOn(state.clock.day, websiteEnquiriesPerWeek(state)));
}

/** The day's enquiries arrive at the open: so many, drawn into the room the board has. Nothing
 *  refills the board after an acceptance any more (PIOTR; CLAUDE.md T13 3.4). */
export function arriveEnquiries(state: GameState): void {
  const due = enquiriesDueToday(state);
  for (let drawn = 0; drawn < due; drawn += 1) {
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

/** What the company is short of for this template before any deadline is drawn: its standing and
 *  its kit. Null while it has both. The first thing in the way, in the order the player would
 *  meet it (CLAUDE.md T10 3.7). */
export function kitBlockFor(state: GameState, entry: ProductTemplate): BoardBlock | null {
  if (effectiveReputation(state) < entry.minReputation) {
    return { reason: `reputation too low (needs ${entry.minReputation})`, where: '' };
  }

  if (entry.material === 'solidWood' && !SOLID_WOOD_EQUIPMENT.every((id) => hasOrOnOrder(state, id))) {
    return { reason: 'no timber machines', where: 'catalogue' };
  }
  // Bought and on the road counts, the way it does for every other thing on this list: a company
  // that has ordered a booth is a company that can take sprayed work, and the job is days of
  // drawing and material before anybody sprays anything (CLAUDE.md T8 3.2, T10 3.7). Otherwise
  // the same product could stand on the board takeable and greyed at once.
  if (entry.allowedFinishes.includes('lacquer') && !hasOrOnOrder(state, 'sprayBooth')) {
    return { reason: 'needs a spray booth', where: 'catalogue' };
  }
  const missing = entry.requiredEquipment.filter((specId) => !hasOrOnOrder(state, specId));
  if (missing.length > 0) {
    const names = missing.map((specId) => findSpec(specId)?.name ?? specId);
    return { reason: `no ${names.join(', ').toLowerCase()}`, where: 'catalogue' };
  }
  return null;
}

/** Why this template is out of the company's reach, or null while it is not: what it is short of,
 *  and then the hands it has against the days the client gives. */
export function blockFor(
  state: GameState,
  entry: ProductTemplate,
  deadlineDays: number,
  basePrice: number,
): BoardBlock | null {
  const short = kitBlockFor(state, entry);
  if (short !== null) return short;
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
 *  under the band is one of the reasons. The templates it is short of are picked out first, so a
 *  workshop that is short of one thing is not asked to roll for it (CLAUDE.md T10 3.7). */
export function generateUnreachable(state: GameState): Enquiry | null {
  const already = new Set(
    state.enquiries.filter((other) => other.unreachable).map((other) => other.templateId),
  );
  const left = PRODUCT_TEMPLATES.filter((entry) => !already.has(entry.id));
  if (left.length === 0) return null;
  const short = left.filter((entry) => kitBlockFor(state, entry) !== null);
  // Where it is short of nothing, the only reason left is the hands against the deadline, and
  // that one is not known until the enquiry is drawn.
  const pool = short.length > 0 ? short : left;
  for (let attempt = 0; attempt < DRAW_ATTEMPTS; attempt += 1) {
    const entry = pool[int(state, 0, pool.length - 1)];
    if (!entry) return null;
    const candidate = buildEnquiry(state, entry);
    // One template that cannot be drawn is one attempt gone, not the end of the refill: the board
    // would otherwise stop at the first awkward one and stand there half filled.
    if (!candidate) continue;
    const block = blockFor(state, entry, candidate.deadlineDays, candidate.basePrice);
    if (block === null) continue;
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

/** The board written again: what nobody took goes, and the greyed ones are topped back up. Twice
 *  a day, at 08:00 and at 13:00 (PIOTR, 13.09; CLAUDE.md T10 3.7). The new enquiries of the day
 *  arrive at the open through `arriveEnquiries` and not here (CLAUDE.md T13 3.4). */
export function refreshBoard(state: GameState): void {
  expireEnquiries(state);
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
    // The insurance gate follows the covers: held, and the commercial enquiry joins the band;
    // dropped, and it is greyed again (CLAUDE.md T13 3.15).
    if (enquiry.kind === 'commercial') {
      if (!coversHeld(state)) {
        enquiry.unreachable = true;
        enquiry.blockReason = NO_INSURANCE_REASON;
        enquiry.blockWhere = '';
        continue;
      }
      if (enquiry.blockReason === NO_INSURANCE_REASON) {
        enquiry.unreachable = false;
        enquiry.blockReason = '';
      }
    }
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

/** Drops what nobody took in time. Nothing is drawn in its place: the next ones come in the
 *  morning (CLAUDE.md T13 3.4). */
export function expireEnquiries(state: GameState): void {
  state.enquiries = state.enquiries.filter((enquiry) => enquiry.expiresOnDay >= state.clock.day);
}

export function findEnquiry(state: GameState, enquiryId: string): Enquiry | null {
  return state.enquiries.find((enquiry) => enquiry.id === enquiryId) ?? null;
}

/** Takes an enquiry off the board. Nothing is drawn in its place: the automatic third enquiry
 *  that refilled the board after an acceptance is gone (PIOTR; CLAUDE.md T13 3.4). */
export function removeEnquiry(state: GameState, enquiryId: string): void {
  state.enquiries = state.enquiries.filter((enquiry) => enquiry.id !== enquiryId);
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

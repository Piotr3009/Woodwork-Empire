// The advertising agency and its big one off jobs (PIOTR, 02.10; CLAUDE.md T26 2.13). A monthly
// subscription like the software's, on and off at any time from the Office beside the website,
// charged on the 1st of every month it is on (economy.ts). While it is on, the board draws, beside
// the ordinary enquiries, one big job at a time: a job like any other, the one `Job` record, the
// one card, the deposit and the balance as today, with three things of its own from v65. It wants
// free joiners before it can be taken, and the ones that are free the minute it is ready go on it;
// its deadline is read off the days that crew needs and not off the ordinary rule's cap of thirty;
// and its drawing and its emails are capped, because two hundred bookcases are drawn once.

import {
  AGENCY_JOB_REPUTATION,
  AGENCY_JOB_VALUE_MAX,
  AGENCY_JOB_VALUE_MIN,
  AGENCY_JOB_VALUE_STEP,
  BIG_JOB_JOINERS_MAX,
  BIG_JOB_JOINERS_MIN,
  BIG_JOB_LEAD_DAYS,
  BIG_JOB_REFERENCE_RATE,
  BIG_JOB_SOON_DAYS,
  COMMERCIAL_PROBABILITY,
  DEADLINE_SLACK_PERCENT_MAX,
  DEADLINE_SLACK_PERCENT_MIN,
  EXPIRY_STANDARD_DAYS,
  MINUTES_PER_WORKING_DAY,
  NO_INSURANCE_REASON,
} from './constants';
import { availableFinishes, lockReasonFor, templatesForReputation } from './catalog';
import { enquiryQualityTier, offeredOnTheBoard, qualifiesForCommercial } from './board';
import { isWorkingDay, monthOfDay } from './clock';
import { coversHeld } from './insurance';
import { drawDeadline, freeJoiners, labourValueFor, stagedJob } from './jobs';
import { workPlan } from './plan';
import type { DeadlineDraw } from './jobs';
import { effectiveReputation } from './reputation';
import { chance, int, makeId, pickWeighted } from './rng';
import type { RngCarrier } from './rng';
import { jobMinutesFor } from './stages';
import type { StagedJob } from './stages';
import type { Enquiry, GameState, Job, Worker } from './types';

export interface AgencyCheck {
  ok: boolean;
  reason: string;
}

const OK: AgencyCheck = { ok: true, reason: '' };

/** Why the agency cannot be turned on or off now, or that it can. It is taken on from the
 *  standing its big jobs come from, so a shop never pays for a board it cannot be shown
 *  (docs/mockups/t26/agency-card.html) [TUNE]; it is let go at any time. */
export function agencyCheck(state: GameState, on: boolean): AgencyCheck {
  if (on === state.agency.on) return { ok: false, reason: on ? 'Already on' : 'Already off' };
  if (on && effectiveReputation(state) < AGENCY_JOB_REPUTATION) {
    return { ok: false, reason: `Takes on a shop with a standing of ${AGENCY_JOB_REPUTATION}` };
  }
  return OK;
}

/** The Office's switch. Nothing is paid at the click: the month is charged on the 1st, as the
 *  software's subscription is (CLAUDE.md T26 2.13). */
export function setAgency(state: GameState, on: boolean): AgencyCheck {
  const check = agencyCheck(state, on);
  if (!check.ok) return check;
  state.agency = on
    ? { on: true, sinceMonth: monthOfDay(state.clock.day) }
    : { on: false, sinceMonth: state.agency.sinceMonth };
  return OK;
}

/** True for one of the agency's big jobs: the only work that wants free joiners. */
export function isBigJob(work: Pick<Enquiry, 'joinersWanted'> | Pick<Job, 'joinersWanted'>): boolean {
  return work.joinersWanted > 0;
}

/** The free joiners a big job of this value wants before it can be taken: four at the least
 *  value, rising in a straight line to eight at the most [PIOTR, 02.10; TUNE the slope]. */
export function bigJobJoinersFor(value: number): number {
  const span = AGENCY_JOB_VALUE_MAX - AGENCY_JOB_VALUE_MIN;
  const share = Math.max(0, Math.min(1, (value - AGENCY_JOB_VALUE_MIN) / span));
  return Math.round(BIG_JOB_JOINERS_MIN + share * (BIG_JOB_JOINERS_MAX - BIG_JOB_JOINERS_MIN));
}

/** The joiners who are on a job now and will be off it soon: the job is one the Work Plan has
 *  ending within `BIG_JOB_SOON_DAYS` working days. A big job counts them with the free men,
 *  because nobody is put on it until its paperwork and its sheets are in, which is longer than
 *  that [PIOTR, 03.10: "they should let it through five days before the job ends, so there is
 *  time to prepare the papers"]. Jobs only: a man on a standing contract is not counted, because a
 *  contract is nearly always renewed [PIOTR: "do not count on contracts, 99% of them we extend"]
 *  (v72). */
export function joinersFreeSoon(state: GameState): Worker[] {
  const plan = workPlan(state);
  const ending = new Set(
    plan.rows.filter((row) => row.to - plan.now <= BIG_JOB_SOON_DAYS).map((row) => row.jobId),
  );
  return state.workers.filter(
    (worker) => worker.role === 'joiner' && worker.jobId !== null && ending.has(worker.jobId),
  );
}

/** The line the enquiry card carries: `Wants 4 joiners free: you have 2`, and with men coming off
 *  a job soon `Wants 6 joiners free: you have 2, and 4 more within 5 days` (v72). */
export function bigJobLine(state: GameState, enquiry: Enquiry): string {
  const soon = joinersFreeSoon(state).length;
  const coming = soon === 0 ? '' : `, and ${soon} more within ${BIG_JOB_SOON_DAYS} days`;
  return `Wants ${enquiry.joinersWanted} joiners free: you have ${freeJoiners(state).length}${coming}`;
}

/** Why a big job cannot be taken this minute, or that it can: it wants so many joiners on no job
 *  and no contract, or off their job within the week (`joinersFreeSoon`). Every other enquiry
 *  passes (CLAUDE.md T26 2.13; v72). */
export function bigJobCheck(state: GameState, enquiry: Enquiry): AgencyCheck {
  if (!isBigJob(enquiry)) return OK;
  if (freeJoiners(state).length + joinersFreeSoon(state).length < enquiry.joinersWanted) {
    return { ok: false, reason: bigJobLine(state, enquiry) };
  }
  return OK;
}

/** Puts the joiners who are free this minute on a big job, in the order they were taken on and no
 *  more of them than it wants: the minute its paperwork and its sheets are in, so it goes into
 *  production with them on it (`refreshJob`). Until v65 the Take it click put them on it and they
 *  stood by it, paid and idle, through two weeks of drawings; they are free for other work until
 *  there is something to cut [PIOTR, 02.10] (CLAUDE.md T26 2.13). With nobody free that minute it
 *  waits on the list like any job, for the player to put men on. */
export function putCrewOnBigJob(state: GameState, job: Job): void {
  if (!isBigJob(job)) return;
  for (const worker of freeJoiners(state).slice(0, job.joinersWanted)) {
    worker.jobId = job.id;
    job.assignees.push(worker.id);
  }
}

/** How long the client of a big job gives, in working days: the days its wanted crew needs at the
 *  very experienced man's grade with the machines the hall has now, the days its paperwork and its
 *  sheets take in front of them, and the ordinary rule's own slack on top, read off the one draw
 *  the way `deadlineDaysFrom` reads it. There is no cap: the ordinary rule stops at thirty days, so
 *  every big job had about thirty three whatever it was worth, and from a quarter of a million up
 *  no crew the unit holds made it [PIOTR, 02.10] (CLAUDE.md T26 2.13; v65). */
export function bigJobDeadlineDays(
  state: GameState,
  draw: DeadlineDraw,
  work: StagedJob,
  joinersWanted: number,
): number {
  const crew = Array.from({ length: Math.max(1, joinersWanted) }, () => BIG_JOB_REFERENCE_RATE);
  const crewDays = jobMinutesFor(state, work, crew) / MINUTES_PER_WORKING_DAY;
  const base = Math.ceil(crewDays) + BIG_JOB_LEAD_DAYS;
  // A copy: reading the draw twice gives the same figure and moves nothing.
  const cursor = { rng: draw.rng };
  const slack = Math.round((base * int(cursor, DEADLINE_SLACK_PERCENT_MIN, DEADLINE_SLACK_PERCENT_MAX)) / 100);
  return base + slack;
}

/** The agency's own draws, on a side stream of the day, so a shop with it on and a shop with it
 *  off draw the same ordinary board (the contract offer's way, `offerCarrier`). */
function agencyCarrier(state: GameState): RngCarrier {
  return { rng: (state.seed ^ Math.imul(state.clock.day + 3, 0x85ebca6b)) | 0 };
}

/** One big job, drawn as the board draws an enquiry: a template the hall can make at this
 *  standing, residential, or commercial for a shop that qualifies, at a value between the two
 *  figures of 2.13, with its own deadline read off its labour and its crew (`bigJobDeadlineDays`).
 *  Null when no template can be drawn. */
export function drawBigJob(state: GameState, carrier: RngCarrier = agencyCarrier(state)): Enquiry | null {
  const tier = enquiryQualityTier(state);
  const candidates = templatesForReputation(effectiveReputation(state))
    .filter(offeredOnTheBoard)
    .filter((entry) => lockReasonFor(state, entry) === null);
  const entry = pickWeighted(carrier, candidates, (candidate) => candidate.weightsByTier[tier] ?? 0);
  if (!entry) return null;
  const steps = Math.round((AGENCY_JOB_VALUE_MAX - AGENCY_JOB_VALUE_MIN) / AGENCY_JOB_VALUE_STEP);
  const value = AGENCY_JOB_VALUE_MIN + int(carrier, 0, steps) * AGENCY_JOB_VALUE_STEP;
  const finishes = availableFinishes(state, entry);
  const finish = finishes[int(carrier, 0, Math.max(0, finishes.length - 1))] ?? entry.allowedFinishes[0];
  if (!finish) return null;
  const commercial = chance(carrier, COMMERCIAL_PROBABILITY) && qualifiesForCommercial(state);
  const kind = commercial ? 'commercial' : 'residential';
  const count = Math.max(2, Math.round(value / entry.basePrice));
  const joinersWanted = bigJobJoinersFor(value);
  const deadlineDays = bigJobDeadlineDays(
    state,
    drawDeadline(carrier),
    stagedJob(
      labourValueFor(value),
      entry.material,
      false,
      finish,
      entry.requiredEquipment.includes('spindleMoulder'),
    ),
    joinersWanted,
  );
  const outOfReach = commercial && !coversHeld(state);
  return {
    id: makeId(state, 'enq'),
    templateId: entry.id,
    name: `${entry.name} x ${count}${commercial ? ', commercial' : ''}`,
    sizeMultiplier: Math.round((value / entry.basePrice) * 100) / 100,
    price: value,
    basePrice: value,
    kind,
    joinersWanted,
    budget: value,
    offer: null,
    finish,
    materialKind: entry.material,
    deadlineDays,
    express: false,
    // A big job's sheets are the standard ones [TUNE].
    bespokeMaterial: false,
    needsMeasure: entry.needsMeasure,
    createdDay: state.clock.day,
    expiresOnDay: state.clock.day + EXPIRY_STANDARD_DAYS - 1,
    lockReason: null,
    byHandAvailable: entry.byHandAllowed,
    unreachable: outOfReach,
    blockReason: outOfReach ? NO_INSURANCE_REASON : '',
    blockWhere: '',
  };
}

/** The day's open: one big job on the board at a time while the agency is on and the standing is
 *  there, on a working day (CLAUDE.md T26 2.13). */
export function arriveBigJob(state: GameState): void {
  if (!state.agency.on || !isWorkingDay(state.clock.day)) return;
  if (effectiveReputation(state) < AGENCY_JOB_REPUTATION) return;
  if (state.enquiries.some(isBigJob)) return;
  const enquiry = drawBigJob(state);
  if (enquiry !== null) state.enquiries.push(enquiry);
}

// Reputation: the tier thresholds that gate the board, the catalogue and the hiring pool, and the
// rating a client leaves when a job closes.

import {
  CALL_RATING_PENALTY,
  CALL_SATISFACTION_PENALTY,
  EMAIL_RATING_PENALTY,
  RATING_BY_HAND,
  RATING_EXPRESS_ON_TIME,
  RATING_ON_TIME,
  RATING_PER_DAY_LATE,
  REPUTATION_LOG_MAX,
  REPUTATION_MAX,
  REPUTATION_MIN,
  REPUTATION_TIERS,
} from './constants';
import { penalisedMisses } from './calls';
import type { GameState, Job } from './types';

/** Index into the tier tables: 0 for a new company, then 1 and 2 as the ratings come in. */
export function reputationTier(reputation: number): number {
  let tier = 0;
  for (let index = 0; index < REPUTATION_TIERS.length; index += 1) {
    const threshold = REPUTATION_TIERS[index];
    if (threshold !== undefined && reputation >= threshold) tier = index;
  }
  return tier;
}

export function clampReputation(value: number): number {
  return Math.min(REPUTATION_MAX, Math.max(REPUTATION_MIN, value));
}

/** Reputation as the player reads it: a whole number on the minus 50 to 100 scale, one decimal
 *  only when the emails cost a job part of its rating (CLAUDE.md T2 3.4, 3.5). */
export function formatReputation(value: number): string {
  return String(Math.round(value * 10) / 10);
}

/** The one write that moves the company's reputation, and the one that writes down why. The
 *  company board is this log read week by week, so nothing may move the number without leaving a
 *  line behind it (PIOTR, 13.09; CLAUDE.md T9 3.10). The points written down are the points the
 *  company actually moved: at the top or the bottom of the scale that is less than was asked for,
 *  and the week's total then adds up to what the player can see. */
export function changeReputation(state: GameState, points: number, reason: string): number {
  const before = state.reputation;
  state.reputation = clampReputation(before + points);
  const moved = Math.round((state.reputation - before) * 100) / 100;
  state.reputationLog.push({ day: state.clock.day, reason, points: moved });
  if (state.reputationLog.length > REPUTATION_LOG_MAX) state.reputationLog.shift();
  return moved;
}

/** What the client thinks of the job that just landed (CLAUDE.md 8.11). */
export function ratingFor(job: Job): number {
  let rating = job.daysLate > 0 ? 0 : job.express ? RATING_EXPRESS_ON_TIME : RATING_ON_TIME;
  rating += job.daysLate * RATING_PER_DAY_LATE;
  if (job.byHand) rating += RATING_BY_HAND;
  return Math.round(rating * 100) / 100;
}

/** Unanswered emails eat into what the client is willing to say about the job (CLAUDE.md T2 3.5).
 *  It only ever reduces a gain: a late job is already paying for being late. */
export function emailRatingFactor(unanswered: number): number {
  return Math.max(0, 1 - EMAIL_RATING_PENALTY * unanswered);
}

/** Calls nobody answered eat into the same thing the emails do, from the second miss on
 *  (CLAUDE.md T4 3.3). Like the emails, it only ever reduces a gain. */
export function callRatingFactor(missed: number): number {
  return Math.max(0, 1 - CALL_SATISFACTION_PENALTY * penalisedMisses(missed));
}

/** What the client's verdict is called on the company board (CLAUDE.md T9 3.10). */
function ratingReason(job: Job): string {
  if (job.daysLate > 0) {
    return `${job.name}: ${job.daysLate} ${job.daysLate === 1 ? 'day' : 'days'} late`;
  }
  return `${job.name}: ${job.express ? 'express, on time' : 'on time'}`;
}

/** Applies the rating and hands back the change, for the event body. Both halves of it go on the
 *  board: what the client thought of the job, and what the calls nobody picked up cost on top of
 *  it (CLAUDE.md T9 3.10). */
export function applyRating(state: GameState, job: Job): number {
  const raw = ratingFor(job);
  const share = emailRatingFactor(job.emailsUnanswered) * callRatingFactor(job.callsMissed);
  const scaled = Math.round((raw > 0 ? raw * share : raw) * 100) / 100;
  // And every one of those missed calls is a point off in its own right [TUNE].
  const missed = Math.round(penalisedMisses(job.callsMissed) * CALL_RATING_PENALTY * 100) / 100;
  const rating = Math.round((scaled - missed) * 100) / 100;
  job.rating = rating;
  changeReputation(state, scaled, ratingReason(job));
  if (missed > 0) changeReputation(state, -missed, `${job.name}: calls not answered`);
  return rating;
}

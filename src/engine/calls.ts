// Client calls. They are not a gate any more: the client rings while the work is going on, the
// phone stops the clock, and the owner answers or lets it ring (CLAUDE.md T4 3.3).
//
// This module owns the schedule and what a taken or a missed call does to the job. Who is asked,
// and whose minutes the call costs, is game.ts, which is the only module allowed to touch
// everybody at once.

import {
  CALL_MISSES_FREE,
  CALLS_ABOVE_BREAKS,
  CALLS_PRICE_BREAKS,
  MINUTES_PER_WORKING_DAY,
} from './constants';
import { isWorkingDay, nextWorkingDay } from './clock';
import { int } from './rng';
import type { GameState, Job } from './types';

/** The last minute of the working day a client will ring at. Nobody rings at one minute past
 *  four, because the office is shut. */
const LAST_CALL_MINUTE = MINUTES_PER_WORKING_DAY - 1;

/** 2 calls up to 1000, 3 up to 3000, 4 above (CLAUDE.md 8.10). The curve is unchanged: only what
 *  a call does to the day has changed. */
export function callsForPrice(price: number): number {
  for (const [max, calls] of CALLS_PRICE_BREAKS) {
    if (price <= max) return calls;
  }
  return CALLS_ABOVE_BREAKS;
}

/** Every working day of the job's expected span, both ends included. */
function callDays(job: Job): number[] {
  const days: number[] = [];
  for (let day = job.acceptedDay; day <= job.dueDay; day += 1) {
    if (isWorkingDay(day)) days.push(day);
  }
  return days;
}

/** A minute of that day the client has not already missed. */
function minuteOn(state: GameState, day: number): number {
  const earliest =
    day === state.clock.day ? Math.min(state.clock.minute + 1, LAST_CALL_MINUTE) : 0;
  return int(state, earliest, LAST_CALL_MINUTE);
}

/** Puts the job's calls in the diary: one in each slice of the span, at a random working minute,
 *  from the seeded RNG, so the same seed rings at the same minutes (CLAUDE.md T4 3.3). */
export function scheduleCalls(state: GameState, job: Job): void {
  const count = callsForPrice(job.price);
  const days = callDays(job);
  if (count <= 0 || days.length === 0) return;
  for (let index = 0; index < count; index += 1) {
    const from = Math.min(Math.floor((index * days.length) / count), days.length - 1);
    const to = Math.min(
      Math.max(from, Math.ceil(((index + 1) * days.length) / count) - 1),
      days.length - 1,
    );
    const day = days[int(state, from, to)] ?? days[days.length - 1] ?? job.acceptedDay;
    job.calls.push({ day, minute: minuteOn(state, day), state: 'waiting', retry: false });
  }
}

/** The call of this job the client is making now, or -1. A call whose day has gone by without
 *  anybody in the office rings as soon as somebody is. */
export function dueCall(state: GameState, job: Job): number {
  return job.calls.findIndex(
    (call) =>
      call.state === 'waiting' &&
      (call.day < state.clock.day ||
        (call.day === state.clock.day && call.minute <= state.clock.minute)),
  );
}

/** The one phone that is ringing this minute, oldest job first. */
export function nextDueCall(state: GameState): { job: Job; index: number } | null {
  for (const job of state.jobs) {
    if (job.stage === 'completed') continue;
    const index = dueCall(state, job);
    if (index >= 0) return { job, index };
  }
  return null;
}

/** Somebody picked the phone up. */
export function takeCall(job: Job, index: number): void {
  const call = job.calls[index];
  if (!call || call.state !== 'waiting') return;
  call.state = 'taken';
}

/** Nobody picked the phone up. The client tries once more, the next working day, and if that one
 *  rings out too it is the second miss and it costs (CLAUDE.md T4 3.3). */
export function missCall(state: GameState, job: Job, index: number): void {
  const call = job.calls[index];
  if (!call || call.state !== 'waiting') return;
  call.state = 'missed';
  job.callsMissed += 1;
  if (call.retry) return;
  const day = nextWorkingDay(state.clock.day);
  job.calls.push({ day, minute: minuteOn(state, day), state: 'waiting', retry: true });
}

/** How many calls the job was given. The second attempt after a missed one is the same call
 *  trying again, so it is not counted here. */
export function callsScheduled(job: Job): number {
  return job.calls.filter((call) => !call.retry).length;
}

export function callsTaken(job: Job): number {
  return job.calls.filter((call) => call.state === 'taken').length;
}

/** True only while the client is actually on the line. Calls hold nothing up, so this is the
 *  whole of what the Calls step of a job card has to say now. */
export function callRinging(state: GameState, job: Job): boolean {
  return dueCall(state, job) >= 0;
}

/** Missed calls that cost something. The first one a job loses is free (CLAUDE.md T4 3.3). */
export function penalisedMisses(missed: number): number {
  return Math.max(0, missed - CALL_MISSES_FREE);
}

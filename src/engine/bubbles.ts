// What is wrong with a man (PIOTR, 19.09; docs/mockups/t22/bubbles-v2.png; CLAUDE.md T22 2.5).
//
// One mark over a man's head, and only while something is wrong with him: he is waiting for a
// machine another man has, waiting for parts nobody has cut yet, on a job the rack has no sheets
// for, or standing with nothing to do at all. A man working, a helper at his chore, a man at his
// lunch, in the office or out measuring gets nothing: no mark, no words, no paper
// [PIOTR, 19.09: "when all is fine, no bubble; only when it is bad"].
//
// This file is the selector and nothing else: it reads the state and hands back the words with
// every slot filled, and `src/render/hall.ts` draws the disc and hangs the words off it for the
// hover. The words themselves are `BUBBLES` in the constants and are never written again here,
// because a word Piotr wants changed has to be one line in one table.
//
// Nothing in here decides anything. Every fact it reports is already decided somewhere else: the
// station by `updateStations` and `stationNow`, why a man stands by `placeHand` and
// `waitingWordsFor`, what is on the rack by `canWorkOn`. The mark reports them and re-derives none
// of them.

import { BUBBLES } from './constants';
import { contractOfWorker } from './contracts';
import { OWNER, machineShortWord } from './machines';
import { ownerIsAvailable } from './owner';
import { standsForAir } from './media';
import {
  NO_CUT_PARTS,
  WAITING_FOR_MATERIAL,
  jobOf,
  waitingWordsFor,
} from './production';
import { isWorkingToday } from './staff';
import { cncOptions, currentStage } from './stages';
import {
  STATION_LUNCH,
  roomBehindStation,
  stationNow,
  stationWaitingFor,
} from './stations';
import { findTask } from './tasks';
import type { Bubble, BubbleKey, GameState, Job } from './types';

/** The words of one mark with its slots filled. A slot the state cannot answer is left as it
 *  stands, so a missing fact shows up as `{job}` in a test and never as a half sentence in the
 *  hall. */
function words(key: BubbleKey, slots: Record<string, string> = {}): string {
  return BUBBLES[key].replace(/\{(\w+)\}/g, (whole, slot: string) => slots[slot] ?? whole);
}

/** One mark, ready to draw. */
function bubble(who: string, key: BubbleKey, slots: Record<string, string> = {}): Bubble {
  return { who, key, text: words(key, slots) };
}

/** True while this man has a job of work in his hands: a chore, a desk job or a site measure. He is
 *  doing what he is there for, so nothing is wrong with him and nothing is drawn over him
 *  [PIOTR, 19.09]. A dangling id is not work: the task has to be on the books. */
function holdsAJobOfWork(state: GameState, who: string): boolean {
  const id =
    who === OWNER
      ? state.owner.currentTaskId
      : state.workers.find((worker) => worker.id === who)?.taskId ?? null;
  if (id === null || id === undefined) return false;
  return findTask(state, id) !== null;
}

/** What is wrong with a man on a job in production: the rack first, then the machine he cannot have.
 *  Null while he is working, and null while his job is stopped by something the mark has no word
 *  for: the hall's own chips say the bags are full or the saw is broken, and a mark over a man whose
 *  job has stopped for a reason he cannot mend would be the one thing the section is against. */
function onAJob(state: GameState, who: string, job: Job): Bubble | null {
  if (job.blockedBy === WAITING_FOR_MATERIAL) {
    return bubble(who, 'noMaterial', { job: job.name });
  }
  const stage = currentStage(state, job, cncOptions(state, who, job));
  // A bench with nothing in the hose stands him still, and it is a thing the player can put
  // right with a compressor: media.ts decides it and the mark reports it (CLAUDE.md T23 2.7).
  if (standsForAir(state, stage)) return bubble(who, 'noCompressor');
  const waiting = waitingWordsFor(state, who, job);
  if (waiting === NO_CUT_PARTS) return bubble(who, 'noCutParts');
  if (waiting === null) return null;
  const family = stage?.family ?? null;
  return family === null ? null : bubble(who, 'waitingForMachine', { machine: machineShortWord(family) });
}

/** What is wrong with the man on a standing contract: the machine he is queueing for, and nothing
 *  else. He is at work on his week's pieces otherwise, so nothing is drawn over him at all; the
 *  count of them was the paper bubble of Turn 21 and is gone with it, and the Contracts tab is
 *  where that figure is read (CLAUDE.md T22 2.5). */
function onAContract(who: string, station: string): Bubble | null {
  const family = stationWaitingFor(station);
  return family === null ? null : bubble(who, 'waitingForMachine', { machine: machineShortWord(family) });
}

/** The mark over this man's head this minute, or null while there is nothing wrong with him. `who`
 *  is `OWNER` or a worker id (CLAUDE.md T22 2.5).
 *
 *  The order is read from the outside in: a man off the hall first, because a man at his lunch or
 *  behind the office door says nothing about the hall; then the chore in his hands; then the job;
 *  then the contract; and last the man who has none of them, who is the one man who can be told he
 *  has nothing to do. */
export function bubbleFor(state: GameState, who: string): Bubble | null {
  const station = stationNow(state, who);
  if (station === STATION_LUNCH) return null;
  if (holdsAJobOfWork(state, who)) return null;
  if (roomBehindStation(station) !== null) return null;
  const job = jobOf(state, who);
  if (job !== null) return onAJob(state, who, job);
  // A man the standing contract has is at work on it, whether or not the hall has a job for him:
  // the one thing that can be wrong with him is the machine he is queueing for (CLAUDE.md T20 2.1).
  if (who !== OWNER && contractOfWorker(state, who) !== null) return onAContract(who, station);
  return bubble(who, 'nothingToDo');
}

/** Every mark the hall has to draw this minute, in the order the figures are: the crew, and the
 *  owner last. The men the hall does not draw at all are not here either: a man who has not started
 *  yet, one who is off sick and one whose day this is not (CLAUDE.md T22 2.5). */
export function bubblesFor(state: GameState): Bubble[] {
  const found: Bubble[] = [];
  for (const worker of state.workers) {
    if (!isWorkingToday(state, worker)) continue;
    const one = bubbleFor(state, worker.id);
    if (one !== null) found.push(one);
  }
  if (ownerIsAvailable(state)) {
    const one = bubbleFor(state, OWNER);
    if (one !== null) found.push(one);
  }
  return found;
}

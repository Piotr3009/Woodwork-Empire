// What is wrong with a man (PIOTR, 19.09; docs/mockups/t22/bubbles-v2.png; CLAUDE.md T22 2.5).
//
// One mark over a man's head, and only while something is wrong with him: the hall has no place
// for him at the machine his work wants, his job has no sheets on the rack, his bench has no air,
// or he is standing with nothing to do at all. A man working, a helper at his chore, a man at his
// lunch, in the office or out measuring gets nothing: no mark, no words, no paper
// [PIOTR, 19.09: "when all is fine, no bubble; only when it is bad"].
//
// This file is the selector and nothing else: it reads the state and hands back the words with
// every slot filled, and `src/render/hall.ts` draws the disc and hangs the words off it for the
// hover. The words themselves are `BUBBLES` in the constants and are never written again here,
// because a word Piotr wants changed has to be one line in one table.
//
// Nothing in here decides anything. Every fact it reports is already decided somewhere else: the
// station by `updateStations` and `stationNow`, who has a place by the day plan (`planPlaces`),
// what is on the rack by `canWorkOn`. The mark reports them and re-derives none of them.

import { BUBBLES } from './constants';
import { contractOfWorker, contractWaitingForMaterial } from './contracts';
import { OWNER } from './machines';
import { ownerIsAvailable } from './owner';
import { standsForAir } from './media';
import { WAITING_FOR_MATERIAL, jobOf, stageOfMan } from './production';
import { isWorkingToday, waitsForTheBoss } from './staff';
import { STATION_LUNCH, roomBehindStation, stationNow } from './stations';
import { findTask } from './tasks';
import type { Bubble, BubbleKey, Contract, GameState, Job } from './types';

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

/** The family the hall has no place for this man at, or '' while he has one or wants none: what
 *  the day plan wrote on him (CLAUDE.md T25 2.3). */
function noPlaceOf(state: GameState, who: string): string {
  const man = who === OWNER ? state.owner : state.workers.find((worker) => worker.id === who);
  return man?.noPlaceFor ?? '';
}

/** What is wrong with a man on a job in production: no place for him, then the rack, then the air
 *  at his bench. Null while he is working, and null while his job is stopped by something the mark
 *  has no word for: the hall's own chips say the bags are full or the saw is broken, and a mark
 *  over a man whose job has stopped for a reason he cannot mend would be the one thing the section
 *  is against. */
function onAJob(state: GameState, who: string, job: Job): Bubble | null {
  // Every machine and bench he could work at is taken: the thing to put right is a machine, or a
  // man taken off (PIOTR, 21.09 and 24.09; CLAUDE.md T25 2.3; v53).
  if (noPlaceOf(state, who) !== '') return bubble(who, 'noPlace');
  if (job.blockedBy === WAITING_FOR_MATERIAL) {
    return bubble(who, 'noMaterial', { job: job.name });
  }
  // A bench with nothing in the hose stands him still, and it is a thing the player can put
  // right with a compressor: media.ts decides it and the mark reports it (CLAUDE.md T23 2.7).
  if (standsForAir(state, stageOfMan(state, who, job))) return bubble(who, 'noCompressor');
  return null;
}

/** What is wrong with the man on a standing contract: the sheets his contract has not got, the
 *  place the hall has not got for him, and nothing else. He is at work on his week's pieces
 *  otherwise, so nothing is drawn over him at all (CLAUDE.md T22 2.5).
 *
 *  A contract with no sheets is a thing the player can put right with an order, so it is said over
 *  his head in the contract's own name, and he is standing at the canteen door while it is
 *  [PIOTR, 22.09] (CLAUDE.md T24 2.3). `contractStationFor` stands him there off the same
 *  `contractWaitingForMaterial`, so the mark and the cell are one answer. */
function onAContract(state: GameState, who: string, contract: Contract): Bubble | null {
  if (contractWaitingForMaterial(state, contract)) {
    return bubble(who, 'noMaterial', { job: contract.name });
  }
  return noPlaceOf(state, who) === '' ? null : bubble(who, 'noPlace');
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
  // what can be wrong with him is the sheets it has not got and the place the hall has not got
  // for him (CLAUDE.md T20 2.1, T24 2.3, T25 2.3).
  const contract = who === OWNER ? null : contractOfWorker(state, who);
  if (contract !== null) return onAContract(state, who, contract);
  // Nobody has put him on anything and there is no manager on duty to: he stands until the
  // boss's word, which is a click in the Work Plan (PIOTR, 20.09; CLAUDE.md T23 2.1). The owner
  // waits for nobody, so the older words are still his.
  const worker = who === OWNER ? null : state.workers.find((entry) => entry.id === who) ?? null;
  if (worker !== null && waitsForTheBoss(state, worker)) return bubble(who, 'waitingForBoss');
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

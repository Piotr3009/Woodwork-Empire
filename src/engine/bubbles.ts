// What the men say (PIOTR, 19.09; docs/mockups/t21/bubbles.html; CLAUDE.md T21 2.6).
//
// One bubble over a man's head, only while there is something to say: why he is standing, or where
// he has gone. This file is the selector and nothing else: it reads the state and hands back the
// words with every slot filled, and `src/render/bubbles.ts` draws them. The words themselves are
// `BUBBLES` in the constants and are never written again here, because a word Piotr wants changed
// has to be one line in one table.
//
// Nothing in here decides anything. Every fact it reports is already decided somewhere else: the
// station by `updateStations` and `stationNow`, why a man stands by `placeHand` and
// `waitingWordsFor` (CLAUDE.md T21 2.7), what is on the rack by `canWorkOn`. The bubble reports
// them and re-derives none of them.

import { BUBBLES } from './constants';
import { formatTime } from './clock';
import { contractOfWorker, contractPiece, weekWanted } from './contracts';
import { OWNER, machineShortWord } from './machines';
import { ownerIsAvailable } from './owner';
import {
  NO_CUT_PARTS,
  WAITING_FOR_MATERIAL,
  jobOf,
  waitingWordsFor,
} from './production';
import { isWorkingToday } from './staff';
import { cncOptions, currentStage, stageDoing } from './stages';
import {
  STATION_LUNCH,
  roomBehindStation,
  stationNow,
  stationWaitingFor,
} from './stations';
import { findTask } from './tasks';
import { pluralOf } from './text';
import type { Bubble, BubbleKey, GameState, Job, TaskInstance } from './types';

/** The words of one bubble with its slots filled. A slot the state cannot answer is left as it
 *  stands, so a missing fact shows up as `{job}` in a test and never as a half sentence in the
 *  hall. */
function words(key: BubbleKey, slots: Record<string, string> = {}): string {
  return BUBBLES[key].text.replace(/\{(\w+)\}/g, (whole, slot: string) => slots[slot] ?? whole);
}

/** One bubble, ready to draw. */
function bubble(who: string, key: BubbleKey, slots: Record<string, string> = {}): Bubble {
  return { who, key, tone: BUBBLES[key].tone, text: words(key, slots) };
}

/** The job of work in this man's hands, or null. */
function taskOf(state: GameState, who: string): TaskInstance | null {
  const id = who === OWNER ? state.owner.currentTaskId : state.workers.find((worker) => worker.id === who)?.taskId ?? null;
  return id === null || id === undefined ? null : findTask(state, id);
}

/** When he will be back, off the minutes the job of work has left in it: the clock this minute plus
 *  what he still owes it, which is the same arithmetic the Tasks page prints. A task he shares with
 *  the rest of his day comes back later than this says and the drawing asks for one line, not a
 *  forecast [TUNE]. */
function backAt(state: GameState, task: TaskInstance): string {
  return formatTime(state.clock.minute + Math.max(0, Math.round(task.minutesRemaining)));
}

/** What a man on a job in production has to say: the rack first, then the machine he cannot have,
 *  then the stage he is at. Null while his job is stopped by something the drawing has no word for:
 *  the hall's own chips say the bags are full or the saw is broken, and a bubble that said "cutting"
 *  over a man whose job has stopped would be the one thing the section is against. */
function onAJob(state: GameState, who: string, job: Job): Bubble | null {
  if (job.blockedBy === WAITING_FOR_MATERIAL) {
    return bubble(who, 'noMaterial', { job: job.name });
  }
  const waiting = waitingWordsFor(state, who, job);
  if (waiting === NO_CUT_PARTS) return bubble(who, 'noCutParts');
  const stage = currentStage(state, job, cncOptions(state, who, job));
  if (waiting !== null) {
    const family = stage?.family ?? null;
    return family === null ? null : bubble(who, 'waitingForMachine', { machine: machineShortWord(family) });
  }
  if (job.blockedBy !== '') return null;
  if (stage === null) return null;
  return bubble(who, 'working', {
    stage: stageDoing(stage.id, job.finish === 'lacquer'),
    job: job.name,
  });
}

/** What the man on a standing contract has to say: the machine he is queueing for, or the count of
 *  the week's pieces. The count is the one the Contracts tab prints, off the same two figures
 *  (`contractCounterLine`), because there is one answer to "how many this week" in this game. */
function onAContract(state: GameState, who: string, station: string): Bubble | null {
  const contract = contractOfWorker(state, who);
  if (contract === null) return null;
  const family = stationWaitingFor(station);
  if (family !== null) {
    return bubble(who, 'waitingForMachine', { machine: machineShortWord(family) });
  }
  const piece = contractPiece(contract);
  return bubble(who, 'pieces', {
    made: String(contract.piecesThisWeek),
    wanted: String(weekWanted(contract, state.clock.day)),
    piece: pluralOf(piece.name).toLowerCase(),
  });
}

/** The bubble over this man's head this minute, or null while he has nothing to say. `who` is
 *  `OWNER` or a worker id (CLAUDE.md T21 2.6).
 *
 *  The order is the order of the drawing's own table read from the outside in: where he has gone
 *  first, because a man who is off the hall says nothing about the hall; then the chore in his
 *  hands; then the job; then the contract; and last the man who has none of them. */
export function bubbleFor(state: GameState, who: string): Bubble | null {
  const station = stationNow(state, who);
  if (station === STATION_LUNCH) return bubble(who, 'atLunch');
  const task = taskOf(state, who);
  if (task !== null) {
    // A site measure is the one job of work that takes a man out of the building altogether, and
    // the drawing has him saying when he is back. The rest of the desk work is the office.
    if (task.kind === 'siteMeasure') {
      return bubble(who, 'offToMeasure', { time: backAt(state, task) });
    }
    if (task.kind === 'cleaning') return bubble(who, 'sweeping');
    if (task.kind === 'emptyBags') return bubble(who, 'emptyingBags');
    if (task.kind === 'unload') return bubble(who, 'unloading');
  }
  if (roomBehindStation(station) !== null) return bubble(who, 'inTheOffice');
  // Anything else in his hands is work the player can see him doing, at a station with a name, and
  // the drawing gives him no words for it.
  if (task !== null) return null;
  const job = jobOf(state, who);
  if (job !== null) return onAJob(state, who, job);
  const contract = who === OWNER ? null : onAContract(state, who, station);
  if (contract !== null) return contract;
  return bubble(who, 'nothingToDo');
}

/** Every bubble the hall has to draw this minute, in the order the figures are: the crew, and the
 *  owner last. The men the hall does not draw at all are not here either: a man who has not started
 *  yet, one who is off sick and one whose day this is not (CLAUDE.md T21 2.6). */
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

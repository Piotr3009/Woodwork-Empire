// What the men say (PIOTR, 19.09; docs/mockups/t21/bubbles.html; CLAUDE.md T21 2.6). The table on
// that page is the contract and this file is that table, line by line: the state a man is in, the
// words over his head, and the colour they are drawn in.
//
// Nothing here is about the paper: the drawing is `tests/render/bubbles.test.ts`. What is asserted
// here is that the words come out of the one table in the constants with every slot filled off the
// state, and that the phrase a man says about a machine is the very phrase the Work Plan prints
// under the same job.

import { describe, expect, it } from 'vitest';
import { BUBBLES } from '../../src/engine/constants';
import { bubbleFor, bubblesFor } from '../../src/engine/bubbles';
import { acceptContract, assignContract, drawContract } from '../../src/engine/contracts';
import { waitingLine } from '../../src/engine/jobs';
import { machineShortWord } from '../../src/engine/machines';
import { WAITING_FOR_MATERIAL } from '../../src/engine/production';
import { stageDoing } from '../../src/engine/stages';
import { STATION_IDLE, STATION_LUNCH, STATION_OFFICE, stationNow } from '../../src/engine/stations';
import { pluralOf } from '../../src/engine/text';
import type { BubbleKey, GameState, Job, TaskInstance } from '../../src/engine/index';
import {
  CREW,
  act,
  newGame,
  runClock,
  sixJoinersOnSheetWork,
} from '../helpers';

/** Three men on one job at its cutting stage with one saw in the hall, the first of them standing at
 *  it: the drawing's own scene, Callum at the saw and Ravi behind him. */
function queueAtTheSaw(): { state: GameState; job: Job } {
  let state = sixJoinersOnSheetWork({ saws: 1 });
  const first = state.jobs[0];
  if (!first) throw new Error('a job is wanted');
  state = act(state, { type: 'ADD_TO_JOB', jobId: first.id, workerId: 'staff-2' });
  state = act(state, { type: 'ADD_TO_JOB', jobId: first.id, workerId: 'staff-3' });
  const job = state.jobs.find((entry) => entry.id === first.id);
  if (!job) throw new Error('the job went missing');
  job.labourRemaining = job.labourValue * 0.95;
  const saw = state.equipment.find((item) => item.specId === 'tableSaw');
  if (!saw) throw new Error('one saw is wanted');
  saw.takenBy = 'staff-1';
  return { state, job };
}

/** One joiner and nothing else of the hall's book: the other five men and the other five jobs go, so
 *  what is asserted is one man. */
function oneManAlone(): GameState {
  const state = sixJoinersOnSheetWork({ saws: 1 });
  state.jobs = [];
  state.workers = state.workers.filter((worker) => worker.id === 'staff-1');
  const worker = state.workers[0];
  if (!worker) throw new Error('one man is wanted');
  worker.jobId = null;
  worker.taskId = null;
  worker.station = STATION_IDLE;
  return state;
}

/** The one man of `oneManAlone`, at a desk in the office. */
function atADesk(): GameState {
  const state = oneManAlone();
  const worker = state.workers[0];
  if (!worker) throw new Error('one man is wanted');
  worker.station = STATION_OFFICE;
  return state;
}

function taskOn(state: GameState, who: string, kind: TaskInstance['kind'], minutes = 90): TaskInstance {
  const task: TaskInstance = {
    id: `task-${kind}`,
    kind,
    category: 'admin',
    label: kind,
    minutesTotal: minutes,
    minutesRemaining: minutes,
    jobId: null,
    equipmentId: null,
    deliveryId: null,
    orderIds: [],
    day: state.clock.day,
    done: false,
    doneDay: null,
    doneBy: who,
    orders: [],
  };
  state.tasks.push(task);
  const worker = state.workers.find((entry) => entry.id === who);
  if (worker) worker.taskId = task.id;
  return task;
}

function keyOver(state: GameState, who: string): BubbleKey | null {
  return bubbleFor(state, who)?.key ?? null;
}

describe('the red bubbles: what the player can fix (CLAUDE.md T21 2.6)', () => {
  it('says what machine the first man of a queue is waiting for, in the Work Plan s own words', () => {
    const { state } = queueAtTheSaw();
    const bubble = bubbleFor(state, 'staff-2');
    expect(bubble?.key).toBe('waitingForMachine');
    expect(bubble?.tone).toBe('wait');
    expect(bubble?.text).toBe('waiting for the saw');
    // The one phrase: the bubble fills its slot from the same word the job's own line is built from,
    // so the man and the bar can never say different things (CLAUDE.md T21 2.6, 2.7).
    expect(bubble?.text).toBe(waitingLine('tableSaw'));
    expect(machineShortWord('tableSaw')).toBe('saw');
  });

  it('says no cut parts yet to the men behind him, because the parts are still on the saw', () => {
    const { state } = queueAtTheSaw();
    const bubble = bubbleFor(state, 'staff-3');
    expect(bubble?.key).toBe('noCutParts');
    expect(bubble?.tone).toBe('wait');
    expect(bubble?.text).toBe('no cut parts yet');
  });

  it('names the job the rack has no sheets for', () => {
    const { state, job } = queueAtTheSaw();
    job.blockedBy = WAITING_FOR_MATERIAL;
    const bubble = bubbleFor(state, 'staff-2');
    expect(bubble?.key).toBe('noMaterial');
    expect(bubble?.tone).toBe('wait');
    expect(bubble?.text).toBe(`no sheets for ${job.name}`);
  });

  it('says nothing to do to a man on no job, no contract and no job of work', () => {
    const state = oneManAlone();
    const bubble = bubbleFor(state, 'staff-1');
    expect(bubble?.key).toBe('nothingToDo');
    expect(bubble?.tone).toBe('wait');
    expect(bubble?.text).toBe('nothing to do');
  });

  it('says nothing at all while the job is stopped by something the drawing has no word for', () => {
    const { state, job } = queueAtTheSaw();
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    if (!saw) throw new Error('one saw is wanted');
    // The man who has the saw, on a job the hall has stopped for a reason of its own: the warning
    // strip and the chips say the bags are full, and a bubble saying "cutting" would be a lie.
    job.blockedBy = 'bags full';
    expect(keyOver(state, 'staff-1')).toBeNull();
  });
});

describe('the green bubbles: a helper about his work', () => {
  it('says sweeping, emptying the bags and unloading, one a chore', () => {
    for (const [kind, key] of [
      ['cleaning', 'sweeping'],
      ['emptyBags', 'emptyingBags'],
      ['unload', 'unloading'],
    ] as Array<[TaskInstance['kind'], BubbleKey]>) {
      const state = oneManAlone();
      taskOn(state, 'staff-1', kind);
      const bubble = bubbleFor(state, 'staff-1');
      expect(bubble?.key, kind).toBe(key);
      expect(bubble?.tone, kind).toBe('chore');
      expect(bubble?.text, kind).toBe(BUBBLES[key].text);
    }
  });

  it('says nothing over a man on a job of work the drawing has no words for', () => {
    const state = oneManAlone();
    taskOn(state, 'staff-1', 'service');
    expect(keyOver(state, 'staff-1')).toBeNull();
  });
});

describe('the grey bubbles: where he has gone (CLAUDE.md T21 2.11, 2.12)', () => {
  it('says in the office for desk work, the phone with it', () => {
    const state = atADesk();
    const bubble = bubbleFor(state, 'staff-1');
    expect(bubble?.key).toBe('inTheOffice');
    expect(bubble?.tone).toBe('away');
    expect(bubble?.text).toBe('in the office');
  });

  it('says when the man out measuring is back', () => {
    const state = atADesk();
    state.clock.minute = 60;
    taskOn(state, 'staff-1', 'siteMeasure', 300);
    const bubble = bubbleFor(state, 'staff-1');
    expect(bubble?.key).toBe('offToMeasure');
    expect(bubble?.tone).toBe('away');
    // 09:00 and five hours of it left in his hands.
    expect(bubble?.text).toBe('off to measure, back at 14:00');
  });

  it('says at lunch to everybody on the floor while the dinner hour runs, and to nobody after it', () => {
    const state = runClock(sixJoinersOnSheetWork({ saws: 1 }), 0);
    const atDinner = runClock(state, 250);
    expect(stationNow(atDinner, 'staff-1')).toBe(STATION_LUNCH);
    for (const worker of atDinner.workers) {
      expect(keyOver(atDinner, worker.id), worker.id).toBe('atLunch');
    }
    expect(keyOver(atDinner, 'owner')).toBe('atLunch');
    expect(bubbleFor(atDinner, 'owner')?.text).toBe('at lunch');
    // And the man who works through it does not go: the owner is the only one who may
    // (CLAUDE.md T21 2.12). The choice is his own answer to the break time event, so it is set on
    // the hall that is already at its dinner.
    atDinner.owner.breakSkipped = true;
    expect(stationNow(atDinner, 'owner')).not.toBe(STATION_LUNCH);
    expect(keyOver(atDinner, 'owner')).not.toBe('atLunch');
    // The crew go all the same: nobody but the owner may work through it.
    expect(keyOver(atDinner, 'staff-1')).toBe('atLunch');
  });
});

describe('the paper bubbles: the stage he has just begun', () => {
  it('says the act and the job, in the trade s own word for the stage', () => {
    const { state, job } = queueAtTheSaw();
    const bubble = bubbleFor(state, 'staff-1');
    expect(bubble?.key).toBe('working');
    expect(bubble?.tone).toBe('work');
    expect(bubble?.text).toBe(`cutting ${job.name}`);
    // The stage as an act and not as a thing: the bars and the lists keep "Cutting" and "Assembly".
    expect(stageDoing('assembly', false)).toBe('assembling');
    expect(stageDoing('cutting', false)).toBe('cutting');
    // The drawing's "spraying" is true of a lacquered job and of no other: everything else is
    // finished by hand, which is the division the hall's own sound already makes.
    expect(stageDoing('finishing', true)).toBe('spraying');
    expect(stageDoing('finishing', false)).toBe('sanding');
  });

  it('counts the pieces of a man on a standing contract', () => {
    const state = oneManAlone();
    const worker = state.workers[0];
    if (!worker) throw new Error('one man is wanted');
    // The game's own path on to a contract, so what is asserted is a contract the game could have.
    const contract = drawContract(state);
    contract.pieceId = 'drawerBox';
    contract.quantityPerWeek = 40;
    state.contracts.push(contract);
    expect(acceptContract(state, contract.id).ok).toBe(true);
    expect(assignContract(state, contract.id, worker.id, true).ok).toBe(true);
    contract.piecesThisWeek = 12;
    const bubble = bubbleFor(state, worker.id);
    expect(bubble?.key).toBe('pieces');
    expect(bubble?.tone).toBe('work');
    expect(bubble?.text).toBe('12 of 40 drawer boxes');
    expect(pluralOf('Drawer box')).toBe('Drawer boxes');
    expect(pluralOf('Cut sheet pack')).toBe('Cut sheet packs');
    expect(pluralOf('Wardrobe front')).toBe('Wardrobe fronts');
  });
});

describe('the table itself', () => {
  it('leaves no slot unfilled in any bubble the hall can draw', () => {
    // Every bubble of every man of a working hall, a queue at a saw and the dinner hour: not one of
    // them may come out with a `{slot}` still in it.
    const scenes: GameState[] = [
      queueAtTheSaw().state,
      runClock(sixJoinersOnSheetWork({ saws: 1 }), 250),
      oneManAlone(),
    ];
    let seen = 0;
    for (const state of scenes) {
      for (const bubble of bubblesFor(state)) {
        expect(bubble.text, bubble.key).not.toContain('{');
        expect(bubble.text.length, bubble.key).toBeGreaterThan(0);
        expect(BUBBLES[bubble.key].tone).toBe(bubble.tone);
        seen += 1;
      }
    }
    expect(seen).toBeGreaterThan(CREW);
  });

  it('draws one bubble a man and none for a man the hall does not draw', () => {
    const state = queueAtTheSaw().state;
    const worker = state.workers[0];
    if (!worker) throw new Error('a man is wanted');
    const before = bubblesFor(state).length;
    const whos = new Set(bubblesFor(state).map((bubble) => bubble.who));
    expect(whos.size).toBe(before);
    // A man who is off sick is not on the hall and says nothing over an empty floor.
    worker.absentDaysRemaining = 2;
    expect(bubblesFor(state).some((bubble) => bubble.who === worker.id)).toBe(false);
    // Nor is a man who has not started yet.
    worker.absentDaysRemaining = 0;
    worker.startDay = state.clock.day + 5;
    expect(bubblesFor(state).some((bubble) => bubble.who === worker.id)).toBe(false);
  });

  it('says nothing at all over a company with nobody in it but an owner at his bench', () => {
    const state = newGame();
    // Day one: no crew, and the owner has nothing on. He is the one man who can be told he has
    // nothing to do, which is the table's own last line.
    expect(bubblesFor(state).map((bubble) => bubble.key)).toEqual(['nothingToDo']);
  });
});

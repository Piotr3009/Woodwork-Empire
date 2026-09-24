// What is wrong with a man (PIOTR, 19.09; docs/mockups/t22/bubbles-v2.png; CLAUDE.md T22 2.5). The
// red column of that picture is the whole contract now, and this file is its four lines: the state
// a man is in, and the words the mark over his head says when the player points at it.
//
// Nothing here is about the drawing: the disc, its tail and the hover are
// `tests/render/bubbles.test.ts`. What is asserted here is that the words come out of the one table
// in the constants with every slot filled off the state, that the phrase a man says when every
// place he could take is taken is the one phrase his card says too (`placeLine`), and that a man
// nothing is wrong with carries nothing at all (CLAUDE.md T25 2.3; PIOTR, 24.09; v53).

import { describe, expect, it } from 'vitest';
import { BUBBLES } from '../../src/engine/constants';
import { bubbleFor, bubblesFor } from '../../src/engine/bubbles';
import { acceptContract, assignContract, drawContract } from '../../src/engine/contracts';
import { OWNER } from '../../src/engine/machines';
import { WAITING_FOR_MATERIAL, placeLine, planPlaces } from '../../src/engine/production';
import { STATION_IDLE, STATION_LUNCH, STATION_OFFICE, stationNow } from '../../src/engine/stations';
import type { BubbleKey, GameState, Job, TaskInstance } from '../../src/engine/index';
import {
  CREW,
  act,
  newGame,
  runClock,
  sixJoinersOnSheetWork, withOnlyCuttingLeft } from '../helpers';

/** Three men on one job at its cutting stage, one budget saw of one place and the day one kit's one
 *  bench, the five other benches taken out: the saw and that bench are every place the hall has.
 *  Nobody waits for the saw, so the first man cuts, the second takes the bench, and the third and
 *  the three men on the other jobs stand with every place they could take taken
 *  (PIOTR, 24.09; v53). Until v53 the one saw alone stood the second man. */
function everyPlaceTaken(): { state: GameState; job: Job } {
  let state = sixJoinersOnSheetWork({ saws: 1, sawVariant: 'budget' });
  const first = state.jobs[0];
  if (!first) throw new Error('a job is wanted');
  state = act(state, { type: 'ADD_TO_JOB', jobId: first.id, workerId: 'staff-2' });
  state = act(state, { type: 'ADD_TO_JOB', jobId: first.id, workerId: 'staff-3' });
  const kit = state.equipment.find((item) => item.specId === 'workbench');
  state.equipment = state.equipment.filter((item) => item.specId !== 'workbench' || item === kit);
  const job = state.jobs.find((entry) => entry.id === first.id);
  if (!job) throw new Error('the job went missing');
  job.labourRemaining = job.labourValue * 0.95;
  job.stageLabour = {};
  // Every job with nothing but its cutting left, so the saw is every man's first family and the
  // bench his second.
  withOnlyCuttingLeft(state);
  planPlaces(state);
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

describe('the four things the player can put right (CLAUDE.md T22 2.5)', () => {
  it('says no free machines to a man with every place he could take taken', () => {
    const { state } = everyPlaceTaken();
    const bubble = bubbleFor(state, 'staff-3');
    expect(bubble?.key).toBe('noPlace');
    expect(bubble?.text).toBe('no free machines');
    // The one phrase: the mark and his card say the words of the one table, so the man and his
    // card can never say different things, and the words name no machine, because he stands only
    // when every one he could work at is taken (CLAUDE.md T22 2.5, T25 2.3; PIOTR, 24.09; v53).
    expect(bubble?.text).toBe(placeLine());
    expect(BUBBLES.noPlace).toBe('no free machines');
  });

  it('says the same to every man past the last place, and nothing to the man at the saw or the man at the bench', () => {
    const { state } = everyPlaceTaken();
    // Nobody waits for the saw: the second man on the job works at the bench and nothing is
    // wrong with him (PIOTR, 24.09; v53).
    expect(keyOver(state, 'staff-1')).toBeNull();
    expect(keyOver(state, 'staff-2')).toBeNull();
    for (const who of ['staff-3', 'staff-4', 'staff-5', 'staff-6']) {
      expect(bubbleFor(state, who), who).toEqual({ who, key: 'noPlace', text: 'no free machines' });
    }
  });

  it('names the job the rack has no sheets for', () => {
    const { state, job } = everyPlaceTaken();
    job.blockedBy = WAITING_FOR_MATERIAL;
    const bubble = bubbleFor(state, 'staff-1');
    expect(bubble?.key).toBe('noMaterial');
    expect(bubble?.text).toBe(`no sheets for ${job.name}`);
  });

  it('says waiting for the boss to a man nobody has put on anything', () => {
    // From Turn 23 nobody takes a job by himself without a production manager on duty, so the man
    // standing at his bench is not a man with nothing to do: he is a man waiting for a click in
    // the Work Plan, and the mark over his head says which (PIOTR, 20.09; CLAUDE.md T23 2.1).
    const state = oneManAlone();
    const bubble = bubbleFor(state, 'staff-1');
    expect(bubble?.key).toBe('waitingForBoss');
    expect(bubble?.text).toBe('waiting for the boss');
  });

  it('says nothing to do to the owner, who waits for nobody', () => {
    const state = oneManAlone();
    const bubble = bubbleFor(state, OWNER);
    expect(bubble?.key).toBe('nothingToDo');
    expect(bubble?.text).toBe('nothing to do');
  });

  it('says nothing at all while the job is stopped by something the mark has no word for', () => {
    const { state, job } = everyPlaceTaken();
    // The man who has the saw, on a job the hall has stopped for a reason of its own: the warning
    // strip and the chips say the hall has no extraction, and a mark the player cannot act on
    // would be the one thing the section is against. Full bags stopped a job here until v53; they
    // take the machines that make dust out of the places now and stop nothing, so the whole hall's
    // reason is the one left to ask with (PIOTR, 24.09; v53).
    job.blockedBy = 'no extraction';
    expect(keyOver(state, 'staff-1')).toBeNull();
  });
});

describe('nothing at all over a man nothing is wrong with [PIOTR, 19.09]', () => {
  it('draws no mark over a man at work', () => {
    const { state } = everyPlaceTaken();
    // He has his place at the saw and he is cutting: the stage he is at is the T11 hover line's to say, and the
    // paper bubble that used to say it for three seconds is gone (CLAUDE.md T22 2.5).
    expect(keyOver(state, 'staff-1')).toBeNull();
    // Nor over the man at the bench, who works the same job at its one pace (PIOTR, 24.09; v53).
    expect(keyOver(state, 'staff-2')).toBeNull();
  });

  it('draws no mark over a helper at his chore', () => {
    for (const kind of ['cleaning', 'emptyBags', 'unload'] as Array<TaskInstance['kind']>) {
      const state = oneManAlone();
      taskOn(state, 'staff-1', kind);
      expect(keyOver(state, 'staff-1'), kind).toBeNull();
    }
  });

  it('draws no mark over a man at a desk, out measuring or on any other job of work', () => {
    expect(keyOver(atADesk(), 'staff-1')).toBeNull();
    const measuring = atADesk();
    measuring.clock.minute = 60;
    taskOn(measuring, 'staff-1', 'siteMeasure', 300);
    expect(keyOver(measuring, 'staff-1')).toBeNull();
    const serviced = oneManAlone();
    taskOn(serviced, 'staff-1', 'service');
    expect(keyOver(serviced, 'staff-1')).toBeNull();
  });

  it('draws no mark over anybody while the dinner hour runs', () => {
    const atDinner = runClock(sixJoinersOnSheetWork({ saws: 1 }), 250);
    expect(stationNow(atDinner, 'staff-1')).toBe(STATION_LUNCH);
    for (const worker of atDinner.workers) expect(keyOver(atDinner, worker.id), worker.id).toBeNull();
    expect(keyOver(atDinner, 'owner')).toBeNull();
    expect(bubblesFor(atDinner)).toEqual([]);
  });

  it('draws no mark over a man on a standing contract who has his place', () => {
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
    planPlaces(state);
    // The count of the week's pieces was a paper bubble and is gone with the paper: the Contracts
    // tab is where that figure is read (CLAUDE.md T22 2.5).
    expect(keyOver(state, worker.id)).toBeNull();
  });
});

describe('the table itself', () => {
  it('keeps six lines and no colour, and every one of them is a thing that is wrong', () => {
    // Four until Turn 23, which hung the bench on the compressor and stood a man who nobody has
    // put on anything (CLAUDE.md T23 2.1, 2.7); v43 took "no cut parts yet" out with the rule it
    // explained; v52 put the machine and the bench into one line, the place the hall has not got
    // for him, and nobody waits for a machine any more (CLAUDE.md T25 2.2, 2.3). v53 made that
    // line `no free machines`, every place he could take taken, and added the sixth, the one mark
    // drawn over a machine and not a man: a family with too few places for the crew
    // (PIOTR, 24.09; v53).
    expect(Object.keys(BUBBLES).sort()).toEqual([
      'noCompressor',
      'noMaterial',
      'noPlace',
      'nothingToDo',
      'tooFewPlaces',
      'waitingForBoss',
    ]);
    expect(BUBBLES.noPlace).toBe('no free machines');
    expect(BUBBLES.tooFewPlaces).toBe('too few {machines} for the crew');
    for (const words of Object.values(BUBBLES)) expect(typeof words).toBe('string');
  });

  it('leaves no slot unfilled in any mark the hall can draw', () => {
    // Every mark of every man of a working hall, a hall with every place taken and the dinner
    // hour: not one of them may come out with a `{slot}` still in it.
    const scenes: GameState[] = [
      everyPlaceTaken().state,
      runClock(sixJoinersOnSheetWork({ saws: 1 }), 250),
      oneManAlone(),
    ];
    let seen = 0;
    for (const state of scenes) {
      for (const bubble of bubblesFor(state)) {
        expect(bubble.text, bubble.key).not.toContain('{');
        expect(bubble.text.length, bubble.key).toBeGreaterThan(0);
        expect(BUBBLES[bubble.key].length, bubble.key).toBeGreaterThan(0);
        seen += 1;
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('draws one mark a man and none for a man the hall does not draw', () => {
    const state = everyPlaceTaken().state;
    // The third man on the job, who stands with every place taken and carries a mark: the second
    // works at the bench from v53 and carries none (PIOTR, 24.09; v53).
    const worker = state.workers.find((entry) => entry.id === 'staff-3');
    if (!worker) throw new Error('a man is wanted');
    expect(bubblesFor(state).some((bubble) => bubble.who === worker.id)).toBe(true);
    const before = bubblesFor(state).length;
    const whos = new Set(bubblesFor(state).map((bubble) => bubble.who));
    expect(whos.size).toBe(before);
    expect(before).toBeLessThan(CREW);
    // A man who is off the hall is not on it and says nothing over an empty floor.
    worker.absentDaysRemaining = 2;
    expect(bubblesFor(state).some((bubble) => bubble.who === worker.id)).toBe(false);
    // Nor is a man who has not started yet.
    worker.absentDaysRemaining = 0;
    worker.startDay = state.clock.day + 5;
    expect(bubblesFor(state).some((bubble) => bubble.who === worker.id)).toBe(false);
  });

  it('says nothing to do over a company with nobody in it but an owner at his bench', () => {
    const state = newGame();
    // Day one: no crew, and the owner has nothing on. He is the one man who can be told he has
    // nothing to do, which is the table's own last line.
    expect(bubblesFor(state).map((bubble) => bubble.key)).toEqual(['nothingToDo']);
  });
});

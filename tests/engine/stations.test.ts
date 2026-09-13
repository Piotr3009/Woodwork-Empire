import { describe, expect, it } from 'vitest';
import {
  STATION_BENCH,
  STATION_GATE,
  STATION_IDLE,
  STATION_OFFICE,
  STATION_RACK,
  machineStation,
  stationForTask,
  stationMachine,
  stationWaitingFor,
  waitingStation,
} from '../../src/engine/stations';
import { stationForProduction } from '../../src/engine/production';
import { OWNER } from '../../src/engine/machines';
import { createTask } from '../../src/engine/tasks';
import { tick } from '../../src/engine/index';
import type { GameState } from '../../src/engine/index';
import {
  act,
  buyStartingKit,
  clearEvents,
  doAllEmails,
  fillRack,
  firstJob,
  newGame,
  placeEnquiry,
} from '../helpers';

/** The day 1 kit, a job at the bench, and the owner standing at it. */
function atTheBench(): GameState {
  let state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
  state.enquiries = [];
  const enquiry = placeEnquiry(state, { price: 4000, deadlineDays: 90 });
  state = fillRack(act(state, { type: 'ACCEPT_ENQUIRY', enquiryId: enquiry.id, byHand: false }));
  state = doAllEmails(state);
  firstJob(state).stage = 'ready';
  return act(state, { type: 'WORK_HERE', jobId: null });
}

describe('the station of a stage', () => {
  it('reads a machine station and a waiting one back', () => {
    expect(stationMachine(machineStation('tableSaw'))).toBe('tableSaw');
    expect(stationMachine(STATION_BENCH)).toBeNull();
    expect(stationWaitingFor(waitingStation('tableSaw'))).toBe('tableSaw');
    expect(stationWaitingFor(machineStation('tableSaw'))).toBeNull();
  });

  it('keeps a figure at the bench when the workshop has not bought the machine', () => {
    // One minute of work is what puts him at a machine: until then he has taken nothing.
    const state = tick(atTheBench(), 1);
    const job = firstJob(state);
    // The job opens on its cutting, which is the saw the day 1 kit bought.
    expect(stationForProduction(state, OWNER, job)).toBe(machineStation('tableSaw'));
    const bare = { ...state, equipment: [] };
    expect(stationForProduction(bare, OWNER, job)).toBe(STATION_BENCH);
  });
});

describe('where the owner stands', () => {
  it('stands at the saw for the cutting and at his bench for the assembly', () => {
    const state = atTheBench();
    // The stage is what puts him somewhere, not a cycle of minutes (CLAUDE.md T7 3.1).
    expect(tick(state, 1).owner.station).toBe(machineStation('tableSaw'));
    const job = firstJob(state);
    job.labourRemaining = job.labourValue * 0.5;
    const assembling = tick(state, 1);
    expect(assembling.owner.station).toBe(STATION_BENCH);
    // The edgebander comes out of a tool cabinet, so the machining is done at the bench too
    // (CLAUDE.md T6 3.5).
    job.labourRemaining = job.labourValue * 0.7;
    expect(tick(state, 1).owner.station).toBe(STATION_BENCH);
  });

  it('stands at the office door on a desk task, and at the gate unloading', () => {
    let state = buyStartingKit(newGame());
    state.enquiries = [];
    const enquiry = placeEnquiry(state, { price: 400, deadlineDays: 30 });
    state = act(state, { type: 'ACCEPT_ENQUIRY', enquiryId: enquiry.id, byHand: false });
    const email = state.tasks.find((task) => task.kind === 'emails');
    state = act(state, { type: 'START_TASK', taskId: email?.id ?? '' });
    expect(state.owner.station).toBe(STATION_OFFICE);

    const unload = createTask(state, { kind: 'unload', label: 'Unload', minutes: 45 });
    state.owner.currentTaskId = null;
    const started = act(state, { type: 'START_TASK', taskId: unload.id });
    expect(started.owner.station).toBe(STATION_GATE);
  });

  it('stands idle with nothing on, and at the rack fetching sheets', () => {
    const state = buyStartingKit(newGame());
    expect(state.owner.station).toBe(STATION_IDLE);
    const fetch = createTask(state, { kind: 'fetchStorage', label: 'Fetch', minutes: 60 });
    expect(stationForTask(state, fetch)).toBe(STATION_RACK);
  });

  it('stands at the machine it is changing a bag on', () => {
    const state = buyStartingKit(newGame());
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    const bag = createTask(state, {
      kind: 'bagChange',
      label: 'Bag change',
      minutes: 15,
      equipmentId: saw?.id ?? null,
    });
    expect(stationForTask(state, bag)).toBe(machineStation('tableSaw'));
  });

  it('puts a day off figure nowhere at all', () => {
    const state = clearEvents(act(buyStartingKit(newGame()), { type: 'SKIP_DAY' }));
    expect(state.owner.station).toBe(STATION_IDLE);
  });
});

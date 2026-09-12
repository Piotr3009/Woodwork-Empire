import { describe, expect, it } from 'vitest';
import {
  PRODUCTION_CYCLE_MINUTES,
  STATION_BENCH,
  STATION_GATE,
  STATION_IDLE,
  STATION_OFFICE,
  STATION_RACK,
  cycleStation,
  machineStation,
  stationForProduction,
  stationForTask,
  stationMachine,
} from '../../src/engine/stations';
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

describe('the cycle a figure works to', () => {
  it('is 15 at the bench, 5 at the saw, 15 at the bench, 5 at the edgebander', () => {
    expect(PRODUCTION_CYCLE_MINUTES).toBe(40);
    expect(cycleStation(0)).toBe(STATION_BENCH);
    expect(cycleStation(14)).toBe(STATION_BENCH);
    expect(cycleStation(15)).toBe(machineStation('tableSaw'));
    expect(cycleStation(19)).toBe(machineStation('tableSaw'));
    expect(cycleStation(20)).toBe(STATION_BENCH);
    expect(cycleStation(34)).toBe(STATION_BENCH);
    expect(cycleStation(35)).toBe(machineStation('edgebander'));
    expect(cycleStation(39)).toBe(machineStation('edgebander'));
    // And round again.
    expect(cycleStation(40)).toBe(STATION_BENCH);
    expect(cycleStation(55)).toBe(machineStation('tableSaw'));
  });

  it('reads a machine station back', () => {
    expect(stationMachine(machineStation('tableSaw'))).toBe('tableSaw');
    expect(stationMachine(STATION_BENCH)).toBeNull();
  });

  it('keeps a figure at the bench when the workshop has not bought the machine', () => {
    const bare = newGame();
    expect(stationForProduction(bare, 20)).toBe(STATION_BENCH);
    const kitted = buyStartingKit(newGame());
    expect(stationForProduction(kitted, 20)).toBe(machineStation('tableSaw'));
    expect(stationForProduction(kitted, 0)).toBe(STATION_BENCH);
  });
});

describe('where the owner stands', () => {
  it('walks to the saw after 20 minutes of production and back to the bench by 35', () => {
    const state = atTheBench();
    expect(state.owner.station).toBe(STATION_BENCH);
    const twenty = tick(state, 20);
    expect(twenty.owner.productionMinutes).toBe(20);
    expect(twenty.owner.station).toBe(machineStation('tableSaw'));
    const thirtyFive = tick(state, 35);
    expect(thirtyFive.owner.station).toBe(STATION_BENCH);
    const forty = tick(state, 40);
    expect(forty.owner.station).toBe(machineStation('edgebander'));
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

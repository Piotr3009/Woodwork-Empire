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
  unloadLegAt,
  unloadStation,
  unloadTrips,
  waitingStation,
} from '../../src/engine/stations';
import { SHEETS_PER_TRIP } from '../../src/engine/constants';
import { stationForProduction } from '../../src/engine/production';
import { OWNER } from '../../src/engine/machines';
import { createTask } from '../../src/engine/tasks';
import { tick } from '../../src/engine/index';
import type { GameState } from '../../src/engine/index';
import {
  acceptNow,
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
  state = fillRack(acceptNow(state, enquiry.id, false));
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

describe('the walk between the pallet and the rack (CLAUDE.md T13 3.21)', () => {
  it('is so many trips of so many sheets, never fewer than one', () => {
    expect(SHEETS_PER_TRIP).toBe(2);
    expect(unloadTrips(20)).toBe(10);
    expect(unloadTrips(7)).toBe(4);
    expect(unloadTrips(1)).toBe(1);
    expect(unloadTrips(0)).toBe(1);
  });

  it('shares the minutes over the legs, and the man alternates gate and rack over them', () => {
    // Four sheets is two trips, four legs over forty five minutes: gate, rack, gate, rack.
    const task = { minutesTotal: 45, minutesRemaining: 45 };
    const legs: number[] = [];
    const stations: string[] = [];
    for (let minute = 0; minute < 45; minute += 1) {
      const at = { ...task, minutesRemaining: 45 - minute };
      legs.push(unloadLegAt(at, 4));
      stations.push(unloadStation({ ...at, kind: 'unload' } as never, 4));
    }
    expect(new Set(legs)).toEqual(new Set([0, 1, 2, 3]));
    expect(stations[0]).toBe(STATION_GATE);
    expect(stations[12]).toBe(STATION_RACK);
    expect(stations[23]).toBe(STATION_GATE);
    expect(stations[44]).toBe(STATION_RACK);
    // Every leg lasts the same quarter of the task, the odd minute on the first.
    expect([0, 1, 2, 3].map((leg) => legs.filter((at) => at === leg).length)).toEqual([12, 11, 11, 11]);
    // Twenty sheets, ten trips: the same forty five minutes, twenty legs, and he is at the rack
    // on every odd one.
    const many = Array.from({ length: 45 }, (_, minute) =>
      unloadLegAt({ minutesTotal: 45, minutesRemaining: 45 - minute }, 20),
    );
    expect(Math.max(...many)).toBe(19);
    expect(unloadStation({ minutesTotal: 45, minutesRemaining: 45 - 3, kind: 'unload' } as never, 20)).toBe(STATION_RACK);
    // The task done: he is on the last leg and no further.
    expect(unloadLegAt({ minutesTotal: 45, minutesRemaining: 0 }, 20)).toBe(19);
  });

  it('puts the man unloading a load of sheets on the walk, and a man unloading a machine at the gate', () => {
    const state = buyStartingKit(newGame());
    state.deliveries.push({
      id: 'del-1',
      jobId: null,
      sheets: 4,
      orderedDay: 1,
      pricePaid: 0,
      arriveDay: 1,
      arrived: true,
      unloaded: false,
      bespoke: false,
      overflowSheets: 0,
    });
    const sheets = createTask(state, { kind: 'unload', label: 'Unload 4 sheets', minutes: 45, deliveryId: 'del-1' });
    expect(stationForTask(state, sheets)).toBe(STATION_GATE);
    sheets.minutesRemaining = 30;
    expect(stationForTask(state, sheets)).toBe(STATION_RACK);
    sheets.minutesRemaining = 20;
    expect(stationForTask(state, sheets)).toBe(STATION_GATE);
    sheets.minutesRemaining = 5;
    expect(stationForTask(state, sheets)).toBe(STATION_RACK);
    const kit = createTask(state, { kind: 'unload', label: 'Unload the saw', minutes: 120, orderIds: ['order-1'] });
    kit.minutesRemaining = 30;
    expect(stationForTask(state, kit)).toBe(STATION_GATE);
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
    state = acceptNow(state, enquiry.id, false);
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

  it('stands at the extractor to empty the bags, which is where the bags are', () => {
    const state = buyStartingKit(newGame());
    const bags = createTask(state, {
      kind: 'emptyBags',
      label: 'Empty the bags (1 bag, 15 min)',
      minutes: 15,
    });
    expect(stationForTask(state, bags)).toBe(machineStation('extractor'));
  });

  it('puts a day off figure nowhere at all', () => {
    const state = clearEvents(act(buyStartingKit(newGame()), { type: 'SKIP_DAY' }));
    expect(state.owner.station).toBe(STATION_IDLE);
  });
});

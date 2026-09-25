import { describe, expect, it } from 'vitest';
import {
  STATION_BENCH,
  STATION_GATE,
  STATION_IDLE,
  STATION_OFFICE,
  STATION_RACK,
  itemAtCell,
  machineStation,
  placeCellsAt,
  standingCell,
  stationForTask,
  stationMachine,
  unloadLegAt,
  unloadStation,
  unloadTrips,
} from '../../src/engine/stations';
import { footprintCells, isFree } from '../../src/engine/walk';
import { placeEquipment } from '../helpers';
import { SHEETS_PER_TRIP } from '../../src/engine/constants';
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
  it('reads a machine station back', () => {
    expect(stationMachine(machineStation('tableSaw'))).toBe('tableSaw');
    expect(stationMachine(STATION_BENCH)).toBeNull();
  });

  it('keeps a figure at his bench when the workshop has not bought the machine', () => {
    // The job opens on its cutting, which is the saw the day 1 kit bought: a place at it.
    const state = tick(atTheBench(), 1);
    expect(state.owner.station).toBe(machineStation('tableSaw'));
    // Without the saw the cutting is done by hand (CLAUDE.md T7 3.6). Until v53 that wanted no
    // place and stood him at his bench with none; now the bench is one of the families every job
    // is made on, so he takes a place at it and works the job there (PIOTR, 24.09; v53).
    const bare = atTheBench();
    bare.equipment = bare.equipment.filter((item) => item.specId !== 'tableSaw');
    expect(tick(bare, 1).owner.station).toBe(machineStation('workbench'));
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
  it('stands at the saw one half hour and at his bench the next, whatever the bar says', () => {
    const state = atTheBench();
    // From v55 the half hour is what puts him somewhere: the men go round their job's machines,
    // the saw and a bench on this hall, and the bar of the job says where its work has got to and
    // nothing about where he stands [PIOTR, 24.09]. The first half hour is the saw.
    expect(tick(state, 1).owner.station).toBe(machineStation('tableSaw'));
    const job = firstJob(state);
    job.labourRemaining = job.labourValue * 0.5;
    expect(tick(state, 1).owner.station).toBe(machineStation('tableSaw'));
    // The second half hour is a place at the bench, a family with places like any other
    // (CLAUDE.md T25 2.2).
    const later = tick(state, 31);
    expect(later.owner.station).toBe(machineStation('workbench'));
    // The edgebander comes out of a tool cabinet, so the edging is done at the bench too
    // (CLAUDE.md T6 3.5): from v53 at a place at it, with the tool out of the cabinet in his hands,
    // where until v53 he stood at his bench with no place. With the bar at the edging, his half
    // hour at the bench is the bander's half hour of hours.
    job.labourRemaining = job.labourValue * 0.7;
    const edging = tick(state, 60);
    expect(edging.equipment.find((item) => item.specId === 'edgebander')?.hoursUsed).toBeCloseTo(0.5, 4);
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

describe('the places at one thing (CLAUDE.md T19 2.5, T25 2.6)', () => {
  /** A hall with nothing in it but the one thing being asked about. */
  function only(specId: string, variantId = 'standard'): { state: GameState; item: ReturnType<typeof placeEquipment> } {
    const state = newGame({ difficulty: 'veryEasy' });
    state.equipment = [];
    state.pipes = [];
    return { state, item: placeEquipment(state, specId, { variantId, x: 8, y: 4 }) };
  }

  it('gives a machine the operator, then free cells along the same side', () => {
    const { state, item } = only('tableSaw');
    const cells = placeCellsAt(state, item, 6);
    expect(cells).toHaveLength(6);
    expect(cells[0]).toEqual(standingCell(state, item, 'operator'));
    // No two men in one place while the floor has room, and nobody standing on the saw.
    expect(new Set(cells.map((cell) => `${cell.x},${cell.y}`)).size).toBe(6);
    for (const cell of cells) {
      expect(isFree(state, cell)).toBe(true);
      expect(itemAtCell(state, cell)).toBeNull();
    }
    // As many as are asked for and not one more, and nothing at all for nobody.
    expect(placeCellsAt(state, item, 0)).toEqual([]);
    expect(placeCellsAt(state, item, 2)).toEqual(cells.slice(0, 2));
  });

  it('gives a bench a row of places along its front, one to each of its own columns', () => {
    // The second place was behind the bench and on a two wide one it was a cell off its top
    // corner, so at the fit the second man read as standing past the end of it [REPORT-T23 0.12]
    // (CLAUDE.md T24 2.5).
    const { state, item } = only('workbench');
    const box = footprintCells(item);
    const cells = placeCellsAt(state, item, 5);
    expect(cells).toHaveLength(5);
    expect(cells[0]).toEqual(standingCell(state, item, 'operator'));
    // Every place is in front of the bench, and the first of them are its own columns in order.
    for (const cell of cells) expect(cell.y).toBeGreaterThanOrEqual(box.y + box.depth);
    for (let column = 0; column < box.width; column += 1) {
      expect(cells[column]).toEqual({ x: box.x + column, y: box.y + box.depth });
    }
    expect(new Set(cells.map((cell) => `${cell.x},${cell.y}`)).size).toBe(5);
  });

  it('never hands back fewer cells than men, even in a corner with no room', () => {
    // A bench in the far corner of the unit: the front runs off the floor after a cell or two and
    // the list still has a place for every man (CLAUDE.md T19 2.5).
    const state = newGame({ difficulty: 'veryEasy' });
    state.equipment = [];
    state.pipes = [];
    const item = placeEquipment(state, 'workbench', {
      variantId: 'standard',
      x: state.unit.widthCells - 2,
      y: state.unit.depthCells - 1,
    });
    const cells = placeCellsAt(state, item, 8);
    expect(cells).toHaveLength(8);
    for (const cell of cells) expect(Number.isFinite(cell.x) && Number.isFinite(cell.y)).toBe(true);
  });
});

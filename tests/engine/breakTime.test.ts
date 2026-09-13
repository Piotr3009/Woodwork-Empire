// The day has a break in it. Nobody works through it, it costs the owner none of his 480 minutes,
// and the day runs on by its length instead: 16:00 became 16:30.

import { describe, expect, it } from 'vitest';
import {
  BREAK_MINUTES,
  BREAK_START_MINUTE,
  MINUTES_PER_WORKING_DAY,
} from '../../src/engine/constants';
import { formatTime, isBreak, tick } from '../../src/engine/index';
import { createTask, findTask } from '../../src/engine/tasks';
import { STATION_IDLE } from '../../src/engine/stations';
import { renderTopbar } from '../../src/ui/topbar';
import {
  act,
  buyStartingKit,
  clearEvents,
  fillRack,
  firstJob,
  newGame,
  placeEnquiry,
  withLicence,
} from '../helpers';

describe('nobody works through the break', () => {
  it('spends none of his day on it, and the task waits where it stood', () => {
    let state = withLicence(newGame());
    const design = createTask(state, { kind: 'design', label: 'Long drawing', minutes: 480 });
    state = act(state, { type: 'START_TASK', taskId: design.id });
    // Up to the minute the workshop stops.
    state = tick(state, BREAK_START_MINUTE);
    const atDinner = findTask(state, design.id)?.minutesRemaining;
    expect(atDinner).toBe(480 - BREAK_START_MINUTE);
    expect(state.owner.minutesWorked).toBe(BREAK_START_MINUTE);
    // Through the whole of it.
    state = tick(state, BREAK_MINUTES);
    expect(isBreak(BREAK_START_MINUTE + 1)).toBe(true);
    expect(findTask(state, design.id)?.minutesRemaining).toBe(atDinner);
    expect(state.owner.minutesWorked).toBe(BREAK_START_MINUTE);
    // And he picks it up again on the other side.
    state = tick(state, 10);
    expect(findTask(state, design.id)?.minutesRemaining).toBe((atDinner ?? 0) - 10);
    expect(state.owner.minutesWorked).toBe(BREAK_START_MINUTE + 10);
  });

  it('stops production too, and nothing is made while the hall is empty', () => {
    let state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
    state.enquiries = [];
    const enquiry = placeEnquiry(state, { price: 4000, deadlineDays: 60 });
    state = act(state, { type: 'ACCEPT_ENQUIRY', enquiryId: enquiry.id, byHand: false });
    firstJob(state).stage = 'ready';
    state = clearEvents(act(state, { type: 'WORK_HERE', jobId: null }));
    state = clearEvents(tick(state, BREAK_START_MINUTE));
    const made = firstJob(state).labourRemaining;
    expect(made).toBeLessThan(firstJob(state).labourValue);
    state = clearEvents(tick(state, BREAK_MINUTES));
    // The piece is exactly where it was when they went for their dinner.
    expect(firstJob(state).labourRemaining).toBe(made);
    state = clearEvents(tick(state, 10));
    expect(firstJob(state).labourRemaining).toBeLessThan(made);
  });

  it('puts the whole workshop in the canteen, the owner with them', () => {
    let state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
    state.enquiries = [];
    const enquiry = placeEnquiry(state, { price: 4000, deadlineDays: 60 });
    state = act(state, { type: 'ACCEPT_ENQUIRY', enquiryId: enquiry.id, byHand: false });
    firstJob(state).stage = 'ready';
    state = clearEvents(act(state, { type: 'WORK_HERE', jobId: null }));
    state = clearEvents(tick(state, BREAK_START_MINUTE - 1));
    expect(state.owner.station).not.toBe(STATION_IDLE);
    state = clearEvents(tick(state, 2));
    expect(isBreak(state.clock.minute)).toBe(true);
    expect(state.owner.station).toBe(STATION_IDLE);
  });
});

describe('the day is longer by the break, not shorter by it', () => {
  it('gives the owner all 480 minutes and ends the day at 16:30', () => {
    let state = withLicence(newGame());
    const design = createTask(state, { kind: 'design', label: 'A whole day', minutes: 480 });
    state = act(state, { type: 'START_TASK', taskId: design.id });
    state = tick(state, MINUTES_PER_WORKING_DAY + BREAK_MINUTES);
    // A drawing worth a full day is finished in a day, as it was before the break existed.
    expect(findTask(state, design.id)?.done).toBe(true);
    expect(state.owner.minutesWorked).toBe(MINUTES_PER_WORKING_DAY);
    expect(state.owner.overtimeMinutes).toBe(0);
    expect(formatTime(state.clock.minute)).toBe('16:30');
    // The clock does not throw him out at 16:30 any more than it did at 16:00: he says when the
    // day is done, and by then his day is in, so it is the end of it and not going home early.
    state = act(state, { type: 'END_DAY' });
    expect(state.activeEvent?.kind).toBe('dayEnd');
  });

  it('starts the next day at 08:00 with a clean clock', () => {
    const evening = tick(newGame(), MINUTES_PER_WORKING_DAY + BREAK_MINUTES);
    let state = clearEvents(act(evening, { type: 'END_DAY' }));
    expect(state.clock.day).toBe(2);
    expect(state.clock.minute).toBe(0);
    expect(formatTime(state.clock.minute)).toBe('08:00');
    // And the second day has its break in the same place as the first.
    state = tick(state, BREAK_START_MINUTE);
    expect(isBreak(state.clock.minute)).toBe(true);
  });
});

describe('the top bar says what is happening', () => {
  it('says Break while it is on, and nothing of the kind before or after', () => {
    let state = newGame();
    expect(renderTopbar(state, 'hall')).not.toContain('Break');
    state = clearEvents(tick(state, BREAK_START_MINUTE));
    const bar = renderTopbar(state, 'hall');
    expect(bar).toContain('Break');
    // The speeds stay on the bar: the player can run the clock through his dinner.
    expect(bar).toContain('data-do="setSpeed" data-speed="4"');
    state = clearEvents(tick(state, BREAK_MINUTES));
    expect(renderTopbar(state, 'hall')).not.toContain('Break');
  });
});

describe('the helper has his dinner too', () => {
  it('leaves a bag change on the list until the break is over', () => {
    let state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
    state.workers.push({
      id: 'help-1',
      name: 'Sam',
      role: 'helper',
      tier: null,
      rate: 0,
      weeklyWage: 420,
      monthlyWage: 0,
      startDay: 1,
      jobId: null,
      taskId: null,
      minutesWorked: 0,
      ordersToday: 0,
      station: 'idle',
      productionMinutes: 0,
      absentDaysRemaining: 0,
      anchorX: 0,
      anchorY: 0,
    });
    state = clearEvents(tick(state, BREAK_START_MINUTE));
    expect(isBreak(state.clock.minute)).toBe(true);
    // A bag goes as they sit down. The helper needs no minutes, so nothing but the break stops him.
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    const task = createTask(state, {
      kind: 'bagChange',
      label: 'Bag change: table saw',
      minutes: 15,
      equipmentId: saw?.id ?? null,
    });
    state = clearEvents(tick(state, 5));
    expect(findTask(state, task.id)?.done).toBe(false);
    expect(findTask(state, task.id)?.doneBy).toBeNull();
    // And he has it cleared the minute they are back at it.
    state = clearEvents(tick(state, BREAK_MINUTES));
    expect(findTask(state, task.id)?.done).toBe(true);
    expect(findTask(state, task.id)?.doneBy).toBe('help-1');
  });
});

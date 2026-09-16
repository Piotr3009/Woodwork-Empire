// The five numbers on the laptop's home screen come from one engine function, and the screen
// computes nothing (CLAUDE.md T14 2.1): the open tasks and the ones due today, the free sheets
// and the low lines, and the jobs accepted without their material list yet.

import { describe, expect, it } from 'vitest';
import { LOW_STOCK_SHEETS } from '../../src/engine/constants';
import {
  freeSheets,
  laptopHome,
  openTasks,
  stockLines,
  takeOffOutstanding,
} from '../../src/engine/index';
import { acceptNow, buyStartingKit, doTask, fillRack, newGame, nextDay, placeEnquiry } from '../helpers';

describe('laptopHome', () => {
  it('counts nothing on a game that has nothing yet, and never a negative figure', () => {
    const home = laptopHome(newGame());
    expect(home.drawingsWaiting).toBe(0);
    expect(home.lowLines).toBe(0);
    expect(home.sheetsFree).toBe(0);
    for (const figure of Object.values(home)) expect(figure).toBeGreaterThanOrEqual(0);
  });

  it('counts the open tasks the Tasks page lists, and the ones that belong to today', () => {
    let state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 60);
    state.enquiries = [];
    const enquiry = placeEnquiry(state, { price: 6000, deadlineDays: 40 });
    state = acceptNow(state, enquiry.id);
    const listed = openTasks(state).filter((task) => task.kind !== 'design');
    expect(listed.length).toBeGreaterThan(0);
    // The drawing is the Drawings page's and is not on the Tasks page's count.
    expect(openTasks(state).some((task) => task.kind === 'design')).toBe(true);
    let home = laptopHome(state);
    expect(home.tasksOpen).toBe(listed.length);
    expect(home.tasksDueToday).toBe(listed.filter((task) => task.day === state.clock.day).length);
    // Everything on the list was made today, so every open task is due today.
    expect(home.tasksDueToday).toBe(home.tasksOpen);
    // Tomorrow the day's chores are new and due, and the job's paperwork is still open and not.
    state = nextDay(state);
    home = laptopHome(state);
    const open = openTasks(state).filter((task) => task.kind !== 'design');
    expect(home.tasksOpen).toBe(open.length);
    expect(home.tasksDueToday).toBe(open.filter((task) => task.day === state.clock.day).length);
    expect(home.tasksDueToday).toBeLessThan(home.tasksOpen);
    expect(home.tasksDueToday).toBeGreaterThan(0);
  });

  it('reads the stock page: the free sheets and the low lines', () => {
    const state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 20);
    let home = laptopHome(state);
    expect(home.sheetsFree).toBe(freeSheets(state));
    expect(home.sheetsFree).toBe(20);
    expect(home.lowLines).toBe(0);
    // Under the low figure the one line of sheets wears the badge, and the count says so.
    fillRack(state, LOW_STOCK_SHEETS - 1);
    home = laptopHome(state);
    expect(home.sheetsFree).toBe(LOW_STOCK_SHEETS - 1);
    expect(home.lowLines).toBe(stockLines(state).filter((line) => line.low).length);
    expect(home.lowLines).toBe(1);
  });

  it('counts the jobs accepted without their material list yet, and drops one when the list is made', () => {
    let state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 60);
    state.enquiries = [];
    const first = placeEnquiry(state, { price: 600, deadlineDays: 40 });
    const second = placeEnquiry(state, { price: 800, deadlineDays: 40 });
    state = acceptNow(acceptNow(state, first.id), second.id);
    expect(state.jobs.every((job) => takeOffOutstanding(state, job))).toBe(true);
    expect(laptopHome(state).drawingsWaiting).toBe(2);
    // The drawing first, then the list: the take off waits on the drawing (CLAUDE.md T13 3.8).
    state = doTask(state, 'design');
    state = doTask(state, 'materialTakeOff');
    expect(state.jobs.filter((job) => takeOffOutstanding(state, job))).toHaveLength(1);
    expect(laptopHome(state).drawingsWaiting).toBe(1);
  });
});

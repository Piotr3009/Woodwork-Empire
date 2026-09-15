// The laptop's home screen, in numbers (CLAUDE.md T14 2.1): what the three big tiles say under
// their names. One function, so the screen prints and computes nothing: the open tasks and the
// ones due today, the free sheets and the low lines of the stock page (T13 3.2), and the jobs
// accepted without their material list yet, which is the estimator's queue (T13 3.8).

import { openJobs, takeOffOutstanding } from './jobs';
import { freeSheets, stockLines } from './materials';
import { openTasks } from './tasks';
import type { GameState } from './types';

export interface LaptopHome {
  /** Every task still waiting for somebody that the Tasks page lists: the desk's and the hall's,
   *  not the drawings, which are the Drawings page's. */
  tasksOpen: number;
  /** Of those, the ones that belong to today: the day's chores, and the paperwork of a job taken
   *  on today. A task's day is the day it belongs to (types.ts), and there is no other due day on
   *  a task tonight (CLAUDE.md T14 3). */
  tasksDueToday: number;
  /** Sheets on the rack nobody has a claim on (T13 3.2). */
  sheetsFree: number;
  /** Stock lines wearing the Low stock badge (T13 3.2). */
  lowLines: number;
  /** Jobs accepted and without their material list yet (T13 3.8). */
  drawingsWaiting: number;
}

export function laptopHome(state: GameState): LaptopHome {
  const open = openTasks(state).filter((task) => task.kind !== 'design');
  return {
    tasksOpen: open.length,
    tasksDueToday: open.filter((task) => task.day === state.clock.day).length,
    sheetsFree: freeSheets(state),
    lowLines: stockLines(state).filter((line) => line.low).length,
    drawingsWaiting: openJobs(state).filter((job) => takeOffOutstanding(state, job)).length,
  };
}

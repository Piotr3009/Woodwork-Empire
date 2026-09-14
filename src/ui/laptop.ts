// The laptop on the office desk. Four tabs, because four things the owner does sit inside one
// machine: the day's jobs of work, the material, the team and the drawings (CLAUDE.md T4 3.1).
//
// The jobs on the books moved out to the Work Plan board on the office wall.

import { findJob, jobsAtGate, openTasks, staffMinutesLeft, workerById } from '../engine/index';
import type { GameState, TaskInstance } from '../engine/index';
import { renderDrawings } from './drawings';
import { gateSection } from './jobCard';
import { renderMaterials } from './materials';
import {
  emptyLine,
  escapeHtml,
  minutes,
  money,
  plural,
  tabBar,
  taskStartAction,
} from './modal';

/** The four tabs, in the order the contract names them (docs/art/SPRITES.md 8.2). Team is a chip
 *  that opens the Team board, which is a page of the game now and not a tab inside the laptop
 *  (PIOTR, 13.09; CLAUDE.md T10 3.6): the laptop never renders a body for it. */
export type LaptopTab = 'tasks' | 'materials' | 'team' | 'drawings';

const TABS: Array<[LaptopTab, string]> = [
  ['tasks', 'Tasks'],
  ['materials', 'Materials'],
  ['team', 'Team'],
  ['drawings', 'Drawings'],
];

export function laptopTabFrom(value: string): LaptopTab {
  const found = TABS.find(([tab]) => tab === value);
  return found ? found[0] : 'tasks';
}

/** Who has this one, and how much of his day is left (CLAUDE.md T2 3.8). */
function onItLine(state: GameState, task: TaskInstance): string {
  if (task.doneBy === null || task.doneBy === 'owner') return '';
  const worker = workerById(state, task.doneBy);
  if (!worker) return '';
  if (task.done) return `done by ${worker.name}`;
  return `${worker.name} is on it, ${minutes(staffMinutesLeft(worker))} of his day left`;
}

function taskRow(state: GameState, task: TaskInstance): string {
  const running = state.owner.currentTaskId === task.id;
  const staffLine = onItLine(state, task);
  const job = task.jobId === null ? null : findJob(state, task.jobId);
  // The task label already names the job, so the row adds the price and nothing else (T2 3.11).
  const jobLine = job === null ? '' : ` · ${money(job.price)}`;
  const action = taskStartAction(state, task, staffLine === '' ? 'Start' : 'Take it on');
  return (
    `<div class="row${task.done ? ' is-done' : ''}${running ? ' is-running' : ''}">` +
    `<span class="row-main">${escapeHtml(task.label)}${jobLine}</span>` +
    `<span class="row-figure">${minutes(task.minutesRemaining)} left of ` +
    `${minutes(task.minutesTotal)}${staffLine === '' ? '' : ` · ${escapeHtml(staffLine)}`}` +
    '</span>' +
    `<span class="row-action">${action}</span></div>`
  );
}

/** Today's desk: everything still open, and what was finished today. Yesterday's is gone. */
function tasksTab(state: GameState): string {
  const office = state.tasks.filter(
    (task) =>
      task.category !== 'workshop' &&
      task.kind !== 'design' &&
      (!task.done || task.day === state.clock.day),
  );
  const workshop = openTasks(state).filter((task) => task.category === 'workshop');
  return (
    '<h3>Office tasks today</h3>' +
    (office.length === 0
      ? emptyLine('Nothing on the desk.')
      : office.map((task) => taskRow(state, task)).join('')) +
    '<h3>Workshop jobs of work</h3>' +
    (workshop.length === 0
      ? emptyLine('Nothing waiting in the hall.')
      : workshop.map((task) => taskRow(state, task)).join('')) +
    `<h3>At the gate, ${plural(jobsAtGate(state).length, 'piece', 'pieces')}</h3>` +
    gateSection(state)
  );
}

export interface LaptopView {
  tab: LaptopTab;
  /** What the player has typed into the sheet count on the Materials tab. */
  stockSheets: string;
}

export function renderLaptop(state: GameState, view: LaptopView): string {
  const body =
    view.tab === 'materials'
      ? renderMaterials(state, view.stockSheets)
      : view.tab === 'drawings'
        ? renderDrawings(state)
        : tasksTab(state);
  return tabBar('laptopTab', TABS, view.tab) + body;
}

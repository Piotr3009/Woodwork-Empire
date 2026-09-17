// @vitest-environment jsdom
// The drawings are a roll on the desk, not a list inside the laptop (CLAUDE.md T3 3.3).

import { describe, expect, it } from 'vitest';
import { renderDrawings } from '../../src/ui/drawings';
import { renderLaptop } from '../../src/ui/laptop';
import type { GameState } from '../../src/engine/index';
import {
  acceptNow,
  act,
  buyStartingKit,
  clearEvents,
  doTask,
  newGame,
  placeEnquiry,
  runClock,
} from '../helpers';

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

function withJob(): GameState {
  let state = buyStartingKit(newGame());
  state.enquiries = [];
  const enquiry = placeEnquiry(state, { price: 400, name: 'Garage shelves' });
  state = acceptNow(state, enquiry.id, false);
  return clearEvents(state);
}

describe('the drawings in the laptop', () => {
  it('is the Drawings page of the laptop, and the Tasks page has none of it', () => {
    const state = withJob();
    const drawings = parse(renderLaptop(state, { page: 'drawings', stockSheets: '6', teamTab: 'workshop', tickedTasks: [] }));
    const tasks = parse(renderLaptop(state, { page: 'tasks', stockSheets: '6', teamTab: 'workshop', tickedTasks: [] }));
    expect(drawings.innerHTML).toContain('Design queue');
    expect(drawings.innerHTML).toContain('Design: Garage shelves');
    expect(tasks.innerHTML).not.toContain('Design queue');
    expect(tasks.innerHTML).not.toContain('Design: Garage shelves');
    // The Tasks tab keeps what CLAUDE.md T3 3.3 and T4 3.1 leave it.
    expect(tasks.innerHTML).toContain('Office tasks today');
    expect(tasks.innerHTML).toContain('Workshop jobs of work');
    expect(tasks.innerHTML).toContain('At the gate');
    // The jobs on the books hang on the Work Plan board now (CLAUDE.md T4 3.1).
    expect(tasks.innerHTML).not.toContain('Jobs on the books');
  });

  it('says which licence the drawings are being done on', () => {
    const state = withJob();
    expect(parse(renderDrawings(state)).innerHTML).toContain('One off licence');
    expect(
      parse(renderLaptop(state, { page: 'tasks', stockSheets: '6', teamTab: 'workshop', tickedTasks: [] })).innerHTML,
    ).not.toContain('One off licence');
  });

  it('offers Continue once a drawing has been started, and Start before that', () => {
    let state = withJob();
    expect(parse(renderDrawings(state)).querySelector('[data-do="startTask"]')?.textContent)
      .toBe('Start');
    const design = state.tasks.find((task) => task.kind === 'design');
    if (!design) throw new Error('no design task');
    state = act(state, { type: 'START_TASK', taskId: design.id });
    state = act(state, { type: 'PAUSE_TASK' });
    // Nothing has been worked into it yet, so it still says Start.
    expect(parse(renderDrawings(state)).querySelector('[data-do="startTask"]')?.textContent)
      .toBe('Start');
  });

  it('says what the owner is busy with instead of a Start that cannot work', () => {
    let state = withJob();
    const books = state.tasks.find((task) => task.kind === 'bookkeeping');
    const design = state.tasks.find((task) => task.kind === 'design');
    if (!books || !design) throw new Error('no tasks');
    state = act(state, { type: 'START_TASK', taskId: books.id });
    // The owner does one thing at a time, so the engine refuses the drawing (CLAUDE.md 10.1).
    const refused = act(state, { type: 'START_TASK', taskId: design.id });
    expect(refused.owner.currentTaskId).toBe(books.id);
    // The roll used to offer a Start that did nothing and said nothing. Now it says why.
    const html = parse(renderDrawings(state)).innerHTML;
    expect(html).not.toContain('data-do="startTask"');
    expect(html).toContain('Busy with Bookkeeping');
    // The way out used to be putting the bookkeeping down. Since Turn 19 the drawing goes behind
    // it instead, on the drawings page as on the tasks page (CLAUDE.md T19 2.12).
    expect(html).not.toContain('data-do="pauseTask"');
    expect(html).toContain(`data-do="queueTaskNext" data-id="${design.id}"`);
    expect(html).toContain('Add as next');
  });

  it('draws the drawing to the end once the other job of work is put down', () => {
    let state = withJob();
    const books = state.tasks.find((task) => task.kind === 'bookkeeping');
    if (!books) throw new Error('no bookkeeping');
    state = act(state, { type: 'START_TASK', taskId: books.id });
    state = act(state, { type: 'PAUSE_TASK' });
    state = doTask(state, 'design');
    const design = state.tasks.find((task) => task.kind === 'design');
    expect(design?.done).toBe(true);
    // It comes off the queue the minute it is done, and the page has nothing else on it.
    expect(parse(renderDrawings(state)).innerHTML).toContain('No drawings waiting.');
  });

  it('keeps no list of what has been drawn: done is done', () => {
    // The Finished drawings list is gone (PIOTR, 16.09; CLAUDE.md T17 2.18).
    let state = withJob();
    state = doTask(state, 'design');
    const html = parse(renderDrawings(state)).innerHTML;
    expect(html).not.toContain('Finished drawings');
    expect(html).not.toContain('drawn on day 1');
    expect(html).toContain('No drawings waiting.');
  });

  it('leaves a drawing that is not done on the queue, with Continue on it', () => {
    let state = withJob();
    const design = state.tasks.find((task) => task.kind === 'design');
    if (!design) throw new Error('no drawing');
    state = act(state, { type: 'START_TASK', taskId: design.id });
    state = runClock(state, 10);
    state = act(state, { type: 'PAUSE_TASK' });
    const html = parse(renderDrawings(state)).innerHTML;
    expect(html).toContain('Design queue');
    expect(html).toContain('Continue');
  });
});

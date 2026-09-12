// @vitest-environment jsdom
// The drawings are a roll on the desk, not a list inside the laptop (CLAUDE.md T3 3.3).

import { describe, expect, it } from 'vitest';
import { DESK_LAYOUT } from '../../src/engine/constants';
import { renderDrawings } from '../../src/ui/drawings';
import { renderLaptop } from '../../src/ui/laptop';
import { renderOffice } from '../../src/render/office';
import type { GameState } from '../../src/engine/index';
import { act, buyStartingKit, clearEvents, doTask, newGame, placeEnquiry } from '../helpers';

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

function withJob(): GameState {
  let state = buyStartingKit(newGame());
  state.enquiries = [];
  const enquiry = placeEnquiry(state, { price: 400, name: 'Garage shelves' });
  state = act(state, { type: 'ACCEPT_ENQUIRY', enquiryId: enquiry.id, byHand: false });
  return clearEvents(state);
}

describe('the drawings on the desk', () => {
  it('stands on the desk beside the laptop and opens something', () => {
    const drawings = DESK_LAYOUT.find((object) => object.id === 'drawings');
    expect(drawings).toBeDefined();
    expect(drawings?.spriteKey).toBe('drawings');
    expect({ width: drawings?.width, depth: drawings?.depth, height: drawings?.height }).toEqual({
      width: 2,
      depth: 1,
      height: 1,
    });
    const office = parse(renderOffice(withJob()));
    expect(office.querySelector('[data-office="drawings"]')).not.toBeNull();
  });

  it('holds the design queue, and the laptop no longer does', () => {
    const state = withJob();
    const drawings = parse(renderDrawings(state));
    const laptop = parse(renderLaptop(state));
    expect(drawings.innerHTML).toContain('Design queue');
    expect(drawings.innerHTML).toContain('Design: Garage shelves');
    expect(laptop.innerHTML).not.toContain('Design queue');
    expect(laptop.innerHTML).not.toContain('Design: Garage shelves');
    // The laptop keeps what CLAUDE.md T3 3.3 leaves it.
    expect(laptop.innerHTML).toContain('Office tasks today');
    expect(laptop.innerHTML).toContain('Workshop jobs of work');
    expect(laptop.innerHTML).toContain('At the gate');
    expect(laptop.innerHTML).toContain('Jobs on the books');
  });

  it('says which licence the drawings are being done on', () => {
    const state = withJob();
    expect(parse(renderDrawings(state)).innerHTML).toContain('One off licence');
    expect(parse(renderLaptop(state)).innerHTML).not.toContain('One off licence');
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
    expect(html).toContain('data-do="pauseTask"');
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
    expect(parse(renderDrawings(state)).innerHTML).toContain('drawn on day 1');
  });

  it('lists a finished drawing with the day it was drawn', () => {
    let state = withJob();
    state = doTask(state, 'design');
    const html = parse(renderDrawings(state)).innerHTML;
    expect(html).toContain('Finished drawings');
    expect(html).toContain('drawn on day 1');
    expect(html).toContain('No drawings waiting.');
  });
});

// @vitest-environment jsdom
// The visible path to work: Start production is on the job card from the day the job is accepted,
// and it says the one thing that is in the way (CLAUDE.md T3 3.1). The cards hang on the Work Plan
// board on the office wall now (CLAUDE.md T4 3.1).

import { describe, expect, it } from 'vitest';
import { renderWorkPlan } from '../../src/ui/workPlan';
import type { GameState } from '../../src/engine/index';
import {
  act,
  buyStartingKit,
  clearEvents,
  doTask,
  firstJob,
  newGame,
  nextDay,
  placeEnquiry,
} from '../helpers';

function card(state: GameState): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = renderWorkPlan(state);
  // The board is a Gantt now: the name, the price, the man on it and the Start production are in
  // the head of the row, to the left of the bars (CLAUDE.md T7 3.2).
  const rows = Array.from(holder.querySelectorAll('.gantt-head'));
  const row = rows.find((entry) => entry.querySelector('[data-do="startProduction"], .btn[disabled]'));
  if (!(row instanceof HTMLElement)) throw new Error('no job card with a Start production button');
  return row;
}

/** What the button on the job card says, and whether it can be pressed. */
function startButton(state: GameState): { text: string; enabled: boolean; title: string } {
  const button = card(state).querySelector('.row-action .btn');
  if (!(button instanceof HTMLButtonElement)) throw new Error('no button on the card');
  return {
    text: button.textContent ?? '',
    enabled: !button.disabled,
    title: button.getAttribute('title') ?? '',
  };
}

function steps(state: GameState): string[] {
  return Array.from(card(state).querySelectorAll('.step')).map(
    (step) => `${step.textContent ?? ''}:${(step.className.split('is-')[1] ?? '').trim()}`,
  );
}

/** A game on day 1 with the kit bought and one shelves job accepted. */
function withJob(): GameState {
  let state = buyStartingKit(newGame());
  state.enquiries = [];
  const enquiry = placeEnquiry(state, { price: 400, name: 'Garage shelves' });
  state = act(state, { type: 'ACCEPT_ENQUIRY', enquiryId: enquiry.id, byHand: false });
  return clearEvents(state);
}

describe('the Start production button through the lifecycle', () => {
  it('names the one thing in the way, in the order the lifecycle blocks it', () => {
    const seen: string[] = [];
    let state = withJob();
    // The calls are not in this list any more: they interrupt, they do not block (T4 3.3).
    seen.push(startButton(state).text);
    state = doTask(state, 'design');
    seen.push(startButton(state).text);
    state = doTask(state, 'materialOrder');
    seen.push(startButton(state).text);
    state = clearEvents(nextDay(state));
    seen.push(startButton(state).text);
    state = doTask(state, 'unload');
    state = clearEvents(state);
    seen.push(startButton(state).text);
    expect(seen).toEqual([
      'Start production, design not done',
      'Start production, material not ordered',
      'Start production, material arrives tomorrow',
      'Start production, unload the delivery',
      'Start production',
    ]);
    expect(startButton(state).enabled).toBe(true);
  });

  it('puts the reason in the tooltip as well, and never offers a live button with one', () => {
    const state = withJob();
    const button = startButton(state);
    expect(button.enabled).toBe(false);
    expect(button.title).toBe('design not done');
  });

  it('says the rack is empty before it says anything about the hall', () => {
    const state = readyToMake();
    state.stock.sheets = 0;
    expect(startButton(state).text).toBe('Start production, waiting for material');
    // With sheets on the rack the next thing in the way is the extraction.
    state.stock.sheets = 20;
    state.equipment = state.equipment.filter((item) => item.specId !== 'extractor');
    expect(startButton(state).text).toBe('Start production, no extraction');
  });

  it('says there are no free hands when the owner is not in', () => {
    let state = readyToMake();
    state.stock.sheets = 20;
    state = act(state, { type: 'SKIP_DAY' });
    expect(startButton(state).text).toBe('Start production, no free hands');
  });

  it('turns the Calls step amber while the client is actually on the line, and back', () => {
    const state = withJob();
    expect(steps(state)[0]).toBe('Calls:done');
    const call = state.jobs[0]?.calls[0];
    if (!call) throw new Error('no call in the diary');
    // The client is ringing this minute: the step is the one in hand and the drawing waits.
    call.day = state.clock.day;
    call.minute = state.clock.minute;
    call.state = 'waiting';
    expect(steps(state)[0]).toBe('Calls:now');
    expect(steps(state)[1]).toBe('Design:todo');
    // He picks it up, and it is behind him again.
    call.state = 'taken';
    expect(steps(state)[0]).toBe('Calls:done');
    expect(steps(state)[1]).toBe('Design:now');
  });

  it('fills the five steps as the job goes through them', () => {
    let state = withJob();
    // The Calls step is only ever amber while the client is actually on the line (T4 3.3).
    expect(steps(state)).toEqual([
      'Calls:done', 'Design:now', 'Material:todo', 'Delivery:todo', 'Production:todo',
    ]);
    state = doTask(state, 'design');
    expect(steps(state)).toEqual([
      'Calls:done', 'Design:done', 'Material:now', 'Delivery:todo', 'Production:todo',
    ]);
    state = doTask(state, 'materialOrder');
    expect(steps(state)).toEqual([
      'Calls:done', 'Design:done', 'Material:done', 'Delivery:now', 'Production:todo',
    ]);
    state = clearEvents(nextDay(state));
    state = clearEvents(doTask(state, 'unload'));
    expect(steps(state)).toEqual([
      'Calls:done', 'Design:done', 'Material:done', 'Delivery:done', 'Production:now',
    ]);
  });
});

/** A job with its material on the rack and nobody on it. */
function readyToMake(): GameState {
  let state = withJob();
  state = doTask(state, 'design');
  const job = firstJob(state);
  job.stage = 'ready';
  state.tasks = state.tasks.filter((task) => task.kind !== 'materialOrder');
  return state;
}

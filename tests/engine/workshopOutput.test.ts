// @vitest-environment jsdom
// One Output number, the workshop's average (PIOTR, 21.09; v40): what a minute of production has
// been worth on average today, the hall, every man, his manager, the owner's absence and the class
// of machine at his stage in it, weighted by the minutes worked. The top bar shows it and the
// company board says it beside the hall's own number. The boss's own overtime factor is his own
// minutes' and lives in the day meter's tip, not on the bar as a second Output.

import { describe, expect, it } from 'vitest';
import { WORKER_RATES } from '../../src/engine/constants';
import { tick } from '../../src/engine/index';
import type { GameState } from '../../src/engine/index';
import { hallProductivityFactor, variantFor, workshopOutputToday } from '../../src/engine/machines';
import { renderTopbar } from '../../src/ui/topbar';
import { renderCompany } from '../../src/ui/company';
import {
  acceptNow,
  act,
  buyStartingKit,
  choose,
  fillRack,
  firstJob,
  newGame,
  placeEnquiry,
  twoMenOnSheetWork,
  withExtraction,
} from '../helpers';

function parse(html: string): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = html;
  return root;
}

/** The owner alone at his bench on sheet work, with a saw of this class and enough extraction. */
function ownerAtTheBench(sawVariant: string): GameState {
  const state = withExtraction(
    fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' }), { sawVariant })),
  );
  state.enquiries = [];
  const enquiry = placeEnquiry(state, { price: 40000, deadlineDays: 90 });
  const taken = acceptNow(state, enquiry.id, false);
  firstJob(taken).stage = 'ready';
  return act(taken, { type: 'WORK_HERE', jobId: null });
}

describe('the workshop\'s average output today (v40)', () => {
  it('is the hall\'s own factor before anybody has worked a minute', () => {
    const state = newGame();
    expect(state.dayStats.workMinutes).toBe(0);
    expect(workshopOutputToday(state)).toBe(hallProductivityFactor(state));
  });

  it('is the owner\'s minutes at the saw\'s class over a clean hall when he works alone', () => {
    const worked = tick(ownerAtTheBench('standard'), 60);
    expect(worked.dayStats.workMinutes).toBe(60);
    const saw = worked.equipment.find((item) => item.specId === 'tableSaw');
    const sawClass = saw === undefined ? 1 : (variantFor(saw)?.outputFactor ?? 1);
    // Sixty minutes of cutting at the standard saw's class, the owner at 1.0, the hall clean:
    // the average is the class itself, and the sum behind it is sixty of it.
    expect(worked.dayStats.outputWorth).toBeCloseTo(60 * sawClass * hallProductivityFactor(worked), 3);
    expect(workshopOutputToday(worked)).toBe(Math.round(sawClass * hallProductivityFactor(worked) * 100) / 100);
  });

  it('weights the two of them by their minutes, the joiner at his rate', () => {
    const worked = tick(twoMenOnSheetWork({ sawVariant: 'standard' }), 60);
    expect(worked.dayStats.workMinutes).toBe(120);
    const hall = hallProductivityFactor(worked);
    const owner = worked.days.length; // no day has closed: the two are on today's stats
    expect(owner).toBe(0);
    // One of them at 1.0 and one at the novice's 0.6, each for sixty minutes at his own stage's
    // class: the average is between the two and nearer neither than the minutes say.
    const average = workshopOutputToday(worked);
    expect(average).toBeLessThan(1 * 1.3 * hall + 0.001);
    expect(average).toBeGreaterThan(WORKER_RATES.novice * hall - 0.001);
    expect(worked.dayStats.outputWorth / worked.dayStats.workMinutes).toBeCloseTo(average, 2);
  });

  it('is the one Output on the top bar, and the board says it beside the hall\'s own', () => {
    const worked = tick(twoMenOnSheetWork({ sawVariant: 'standard' }), 60);
    const average = workshopOutputToday(worked);
    const bar = parse(renderTopbar(worked, 'hall'));
    const chip = bar.querySelector('[data-output="today"]');
    expect(chip?.textContent).toBe(`Output ${average.toFixed(2)}`);
    expect(bar.querySelectorAll('.output')).toHaveLength(1);
    const board = parse(renderCompany(worked));
    const note = board.querySelector('[data-figure="workshopToday"]');
    expect(note?.querySelector('strong')?.textContent).toBe(average.toFixed(2));
    expect(board.querySelector('[data-figure="output"]')?.textContent).toBe(
      hallProductivityFactor(worked).toFixed(2),
    );
  });

  it('writes the day\'s average into the day\'s record at the close', () => {
    const state = tick(ownerAtTheBench('standard'), 60);
    const average = workshopOutputToday(state);
    // Run to the end of the day and past the summary: the record carries the figure the bar
    // showed, and the next morning starts the sum afresh.
    let next = state;
    for (let guard = 0; guard < 2000 && next.days.length === 0; guard += 1) {
      next = tick(next, 30);
      if (next.activeEvent !== null) {
        const first = next.activeEvent.choices[0];
        if (first !== undefined) next = choose(next, first.id);
      }
    }
    const last = next.days[next.days.length - 1];
    expect(last).toBeDefined();
    expect(last?.outputToday).toBeGreaterThan(0);
    // The record's figure is the day's average, the sum over the minutes, as the bar showed it.
    expect(last?.outputToday).toBe(Math.round((next.dayStats.outputWorth / next.dayStats.workMinutes) * 100) / 100);
    expect(average).toBeGreaterThan(0);
    // The next morning starts the sum afresh, with the minutes.
    let morning = next;
    const day = next.clock.day;
    for (let guard = 0; guard < 200 && morning.clock.day === day; guard += 1) {
      morning = tick(morning, 30);
      if (morning.activeEvent !== null) {
        const first = morning.activeEvent.choices[0];
        if (first !== undefined) morning = choose(morning, first.id);
      }
    }
    expect(morning.clock.day).toBeGreaterThan(day);
    expect(morning.dayStats.outputWorth).toBe(0);
    expect(morning.dayStats.workMinutes).toBe(0);
  });
});

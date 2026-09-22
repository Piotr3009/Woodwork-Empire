// @vitest-environment jsdom
// The Output sheet's "Who made it today" block, drawn in the sheet's own classes and with nothing
// new in the stylesheet (PIOTR, 22.09; CLAUDE.md T24 2.1; docs/mockups/v47/output-who-made-it.png).
// The block prints what `workshopBreakdownToday` hands it and works nothing out for itself.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { migrateState } from '../../src/engine/migrate';
import { workshopBreakdownToday, workshopOutputToday } from '../../src/engine/machines';
import { renderCompany } from '../../src/ui/company';
import type { GameState } from '../../src/engine/index';
import { buyStartingKit, fillRack, newGame, runClock } from '../helpers';

const CSS = readFileSync('src/ui/styles.css', 'utf8');
const MOCKUP = readFileSync('docs/mockups/v47/output-who-made-it.html', 'utf8');

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

function outputSheet(state: GameState): Element {
  const sheet = parse(renderCompany(state)).querySelector('[data-sheet="output"]');
  if (sheet === null) throw new Error('no Output sheet');
  return sheet;
}

function worked(): GameState {
  const raw = JSON.parse(readFileSync('tests/fixtures/day149-v25.woodwork.json', 'utf8')) as {
    state: Record<string, unknown> & { version: number };
  };
  const state = migrateState(raw.state, raw.state.version);
  if (state === null) throw new Error('the day 149 save did not open');
  return runClock(state, 1);
}

describe('who made it today, on the Output sheet', () => {
  it('stands under the workshop line and over "What moves it", in the mockup\'s own words', () => {
    const sheet = outputSheet(worked());
    const heads = Array.from(sheet.querySelectorAll('.ledger-head')).map((head) => head.textContent);
    // The mockup's order: the workshop's figure, then who made it, then what moves it.
    expect(heads[0]).toBe(
      `Who made it today, ${worked().dayStats.workMinutes} min worked` + 'a minute',
    );
    expect(heads[1]).toBe('What moves itpoints');
    // The head the mockup writes, word for word.
    expect(MOCKUP).toContain('<span>Who made it today,');
    expect(MOCKUP).toContain('<span>a minute</span>');
  });

  it('draws one row a man and the hall, in the sheet\'s own classes, with the engine\'s words', () => {
    const state = worked();
    const made = workshopBreakdownToday(state);
    const list = outputSheet(state).querySelector('.ledger-list[data-figure="workshopBreakdown"]');
    const rows = Array.from(list?.querySelectorAll('.ledger-row') ?? []);
    expect(rows).toHaveLength(made.men.length + 1);
    expect(rows.map((row) => row.querySelector('.ledger-main')?.childNodes[0]?.textContent)).toEqual([
      ...made.men.map((row) => row.main),
      'Hall',
    ]);
    expect(rows.map((row) => row.querySelector('small')?.textContent)).toEqual([
      ...made.men.map((row) => row.words),
      made.hall?.words,
    ]);
    expect(rows.map((row) => row.querySelector('.ledger-points')?.textContent)).toEqual([
      ...made.men.map((row) => row.figure.toFixed(2)),
      made.hall?.figure.toFixed(2),
    ]);
    // Red under 1.00 and green over it, through the sheet's own tone and no class of its own.
    const tones = rows.map((row) => row.querySelector('.ledger-points')?.className);
    for (const tone of tones) expect(['ledger-points good', 'ledger-points bad', 'ledger-points dim']).toContain(tone);
  });

  it('closes with the total the line above it carries, and nothing else on the sum line', () => {
    const state = worked();
    const list = outputSheet(state).querySelector('.ledger-list[data-figure="workshopBreakdown"]');
    const sum = list?.querySelector('.ledger-sum');
    expect(sum?.querySelector('[data-sum="total"]')?.textContent).toBe(
      `= ${workshopOutputToday(state).toFixed(2)}`,
    );
    expect(sum?.querySelector('[data-sum="plus"]')).toBeNull();
    expect(sum?.querySelector('[data-sum="minus"]')).toBeNull();
    // The same figure as the workshop line over the block.
    expect(outputSheet(state).querySelector('[data-figure="workshopToday"] strong')?.textContent).toBe(
      workshopOutputToday(state).toFixed(2),
    );
  });

  it('says the one thing the rows cannot, once', () => {
    const state = worked();
    const list = outputSheet(state).querySelector('.ledger-list[data-figure="workshopBreakdown"]');
    const notes = Array.from(list?.querySelectorAll('.ledger-note') ?? []);
    expect(notes).toHaveLength(1);
    expect(notes[0]?.textContent).toBe(workshopBreakdownToday(state).note);
  });

  it('draws no block at all on a hall that has not worked a minute today', () => {
    const quiet = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 0);
    const sheet = outputSheet(quiet);
    expect(sheet.querySelector('.ledger-list[data-figure="workshopBreakdown"]')).toBeNull();
    expect(sheet.textContent).not.toContain('Who made it today');
    // And the sheet below it is untouched.
    expect(sheet.querySelector('.ledger-head')?.textContent).toBe('What moves itpoints');
  });

  it('adds no token and no class of its own to the stylesheet', () => {
    expect(CSS).not.toContain('who-made');
    expect(CSS).not.toContain('workshopBreakdown');
  });
});

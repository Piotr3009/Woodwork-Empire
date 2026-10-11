/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// @vitest-environment jsdom
// Turn 30, 2.10: the four upgrades of the line, to one window an hour [PIOTR, 11.10: "later add ons
// can be bought, better new knives, better software, so that it later speeds up to one window an
// hour"; TUNE: chat: the four, their prices and the fifteen minutes each] (CLAUDE.md T30 2.10,
// section 7).

import { describe, expect, it } from 'vitest';
import {
  DAY_END_MINUTE,
  LINE_MODULES,
  LINE_UPGRADE_DAYS,
  LINE_UPGRADES,
  LINE_WINDOW_MINUTES,
  LINE_WINDOW_MINUTES_MIN,
} from '../../src/engine/constants';
import type { GameEvent, GameState, Worker } from '../../src/engine/index';
import { addWorkingDays, applyAction, formatCalendarDay, runMinutes } from '../../src/engine/index';
import { sellMachine } from '../../src/engine/game';
import { lineUpgradeCheck, lineWindowEvery, lineWindowMinutes, lineWindowsAWeek } from '../../src/engine/lineContract';
import { lineFactor } from '../../src/engine/machines';
import { boardsForJob } from '../../src/engine/materials';
import { catalogueTabFrom, renderCatalogue } from '../../src/ui/catalogue';
import { act, buyStartingKit, newGame, nextDay, placeEquipment, testJoiner, withAir } from '../helpers';

/** A company in the 800 m² unit with the day one kit, air enough for a CNC, and money. */
function bigUnit(): GameState {
  let state = newGame({ difficulty: 'veryEasy' });
  state.cash = 9000000;
  state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
  state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'second' }));
  state = withAir(buyStartingKit(state), 'industrial');
  state.cash = 3000000;
  state.enquiries = [];
  return state;
}

function engineer(id: string): Worker {
  return { ...testJoiner(id, id), role: 'lineEngineer', tier: null, rate: 0, monthlyWage: 15000 };
}

/** The whole line standing from (2, 14), with its two engineers on the books. */
function withLine(state: GameState): GameState {
  LINE_MODULES.forEach((id, index) => placeEquipment(state, id, { x: 2 + 6 * index, y: 14, id: `kit-line-${index + 1}` }));
  for (const id of ['eng-1', 'eng-2']) state.workers.push(engineer(id));
  return state;
}

/** Every upgrade on the list, fitted as of today. */
function allFitted(state: GameState): GameState {
  state.windowLine.upgrades = LINE_UPGRADES.map((upgrade) => ({ id: upgrade.id, fittedOnDay: state.clock.day }));
  return state;
}

/** Plays minutes of the clock, answering every card with the choice the answer gives it. */
function play(state: GameState, minutes: number, answer: (event: GameEvent) => string): GameState {
  let next = state;
  let left = minutes;
  let guard = 0;
  while (left > 0 && guard < 400) {
    guard += 1;
    if (next.activeEvent !== null) {
      next = applyAction(next, { type: 'RESOLVE_EVENT', choiceId: answer(next.activeEvent) });
      continue;
    }
    const result = runMinutes(next, left);
    next = result.state;
    left -= result.minutesRun;
    if (result.minutesRun === 0 && next.activeEvent === null) break;
  }
  return next;
}

describe('the minutes a window (CLAUDE.md T30 2.7, 2.10)', () => {
  it('takes fifteen off for each upgrade fitted, 120, 105, 90, 75 and 60, and never less', () => {
    const state = withLine(bigUnit());
    const minutes = [lineWindowMinutes(state)];
    for (const upgrade of LINE_UPGRADES) {
      state.windowLine.upgrades.push({ id: upgrade.id, fittedOnDay: state.clock.day });
      minutes.push(lineWindowMinutes(state));
    }
    expect(minutes).toEqual([120, 105, 90, 75, 60]);
    expect(LINE_UPGRADES.reduce((total, upgrade) => total + upgrade.price, 0)).toBe(1800000);
    // A fifth on the list, if one ever came, takes nothing past one window an hour.
    state.windowLine.upgrades.push({ id: 'extra', fittedOnDay: state.clock.day });
    expect(lineWindowMinutes(state)).toBe(LINE_WINDOW_MINUTES_MIN);
    // One on its way takes nothing off until its day.
    const waiting = withLine(bigUnit());
    waiting.windowLine.upgrades.push({ id: 'lineTooling', fittedOnDay: waiting.clock.day + 1 });
    expect(lineWindowMinutes(waiting)).toBe(LINE_WINDOW_MINUTES);
  });

  it('says the card s and the block s words off the same minutes: every 1 h 45 min, about 22 a week', () => {
    const state = withLine(bigUnit());
    state.windowLine.upgrades.push({ id: 'lineTooling', fittedOnDay: state.clock.day });
    expect(lineWindowEvery(lineWindowMinutes(state))).toBe('1 h 45 min');
    expect(lineWindowsAWeek(state)).toBe(22);
    expect(lineWindowEvery(lineWindowMinutes(allFitted(state)))).toBe('1 hour');
    expect(lineWindowsAWeek(state)).toBe(40);
  });

  it('makes eight windows a working day with all four fitted', () => {
    const seen: GameEvent[] = [];
    const state = nextDay(allFitted(withLine(bigUnit())), seen);
    // The offer is taken off its card by nextDay's first answer.
    expect(seen.some((event) => event.kind === 'lineContractOffered')).toBe(true);
    // Eight windows want sixteen boards and eight glass in hand from Turn 31 (CLAUDE.md T31 2.1).
    state.windowLine.boards += 40;
    state.stock.sheets += 40;
    state.windowLine.glass += 20;
    const morning = state.clock.day;
    const day = play(state, DAY_END_MINUTE + 60, (event) => (event.kind === 'goingHome' ? 'home' : event.choices[0]?.id ?? 'ok'));
    // The day's own windows, on its one growing line: past five the play runs into the next morning.
    const windows = day.ledger.filter((entry) => entry.label === 'Windows off the line: windows' && entry.day === morning);
    expect(windows.map((entry) => entry.amount)).toEqual([8 * 1500]);
  });
});

describe('buying an upgrade (CLAUDE.md T30 2.10)', () => {
  it('is refused in the order its card reads: the line, on its way, fitted, the cash', () => {
    const none = bigUnit();
    none.cash = 1000;
    expect(lineUpgradeCheck(none, 'lineTooling')).toEqual({ ok: false, reason: 'Needs the production line' });
    const state = withLine(bigUnit());
    expect(lineUpgradeCheck(state, 'lineTooling')).toEqual({ ok: true, reason: '' });
    const bought = act(state, { type: 'BUY_LINE_UPGRADE', upgradeId: 'lineTooling' });
    const ready = addWorkingDays(state.clock.day, LINE_UPGRADE_DAYS);
    expect(bought.windowLine.upgrades).toEqual([{ id: 'lineTooling', fittedOnDay: ready }]);
    expect(lineUpgradeCheck(bought, 'lineTooling')).toEqual({
      ok: false,
      reason: `Being fitted: ready on ${formatCalendarDay(ready)}`,
    });
    // One of each: a second click buys nothing more.
    const again = act(bought, { type: 'BUY_LINE_UPGRADE', upgradeId: 'lineTooling' });
    expect(again.windowLine.upgrades).toHaveLength(1);
    expect(again.cash).toBe(bought.cash);
    const fitted = structuredClone(bought);
    fitted.clock.day = ready;
    expect(lineUpgradeCheck(fitted, 'lineTooling')).toEqual({ ok: false, reason: 'Fitted' });
    const poor = withLine(bigUnit());
    poor.cash = 1000;
    expect(lineUpgradeCheck(poor, 'lineSprayRobot')).toEqual({ ok: false, reason: 'Not enough cash' });
  });

  it('pays at the click on a line of its own and is fitted ten working days after the order', () => {
    const state = withLine(bigUnit());
    const cash = state.cash;
    let next = act(state, { type: 'BUY_LINE_UPGRADE', upgradeId: 'linePress' });
    expect(next.cash).toBe(cash - 500000);
    const entry = next.ledger.find((line) => line.label === 'Line upgrade: Servo press');
    expect(entry?.category).toBe('equipment');
    expect(entry?.amount).toBe(-500000);
    // Not kit: nothing on order, nothing on the floor, nothing in the insured value.
    expect(next.onOrder).toEqual(state.onOrder);
    expect(next.equipment.length).toBe(state.equipment.length);
    const ready = addWorkingDays(state.clock.day, LINE_UPGRADE_DAYS);
    for (let day = 0; day < 40 && next.clock.day < ready; day += 1) {
      expect(lineWindowMinutes(next), `${next.clock.day}`).toBe(LINE_WINDOW_MINUTES);
      next = nextDay(next);
    }
    expect(next.clock.day).toBe(ready);
    expect(lineWindowMinutes(next)).toBe(LINE_WINDOW_MINUTES - 15);
  });

  it('changes nothing of the jobs: the same factor and the same boards with all four fitted', () => {
    const state = withLine(bigUnit());
    const factor = lineFactor(state);
    const boards = boardsForJob(state, 5600, true);
    allFitted(state);
    expect(lineFactor(state)).toBe(factor);
    expect(boardsForJob(state, 5600, true)).toBe(boards);
  });

  it('goes with the line when it is sold, for nothing', () => {
    const state = allFitted(withLine(bigUnit()));
    const cash = state.cash;
    expect(sellMachine(state, 'kit-line-2').ok).toBe(true);
    expect(state.windowLine.upgrades).toEqual([]);
    expect(state.cash).toBe(cash);
  });
});

describe('the upgrade cards in the line s folder (CLAUDE.md T30 2.10)', () => {
  function folder(state: GameState): HTMLElement {
    const holder = document.createElement('div');
    holder.innerHTML = renderCatalogue(state, '', catalogueTabFrom('line'), 'windowLine1');
    return holder;
  }

  it('stands four cards under the line s card, each with its name, price, sentence and Buy', () => {
    const page = folder(withLine(bigUnit()));
    const tiles = Array.from(page.querySelectorAll<HTMLElement>('.tile-grid > .tile'));
    expect(tiles[0]?.getAttribute('data-line')).toBe('1');
    expect(tiles.slice(1).map((tile) => tile.getAttribute('data-upgrade'))).toEqual(LINE_UPGRADES.map((upgrade) => upgrade.id));
    for (const [index, upgrade] of LINE_UPGRADES.entries()) {
      const tile = tiles[index + 1];
      if (tile === undefined) throw new Error('the card is drawn');
      expect(tile.querySelector('.tile-name')?.textContent).toBe(upgrade.name);
      expect(tile.querySelector('.tile-price')?.textContent).toBe(`£${upgrade.price.toLocaleString('en-GB')}`);
      expect(tile.querySelector('.card-description')?.textContent).toBe(upgrade.sentence);
      expect(Array.from(tile.querySelectorAll('.card-effects .tile-figures')).map((node) => node.textContent)).toEqual([
        "Takes 15 minutes off each window of the line's contract",
        'Fitted 10 working days after the order',
      ]);
      const buy = tile.querySelector('[data-do="buyLineUpgrade"]');
      expect(buy?.getAttribute('data-id')).toBe(upgrade.id);
      expect(tile.querySelector('.lock')).toBeNull();
    }
    expect(page.textContent).toContain('Sold whole, for half its price; the upgrades go with it');
  });

  it('shows a refusal as the locked Buy with its reason under it', () => {
    expect(folder(bigUnit()).querySelector('[data-upgrade="lineTooling"] .lock')?.textContent).toBe('Needs the production line');
    const state = withLine(bigUnit());
    const bought = act(state, { type: 'BUY_LINE_UPGRADE', upgradeId: 'lineSoftware' });
    const ready = addWorkingDays(state.clock.day, LINE_UPGRADE_DAYS);
    const card = folder(bought).querySelector('[data-upgrade="lineSoftware"]');
    expect(card?.querySelector('.lock')?.textContent).toBe(`Being fitted: ready on ${formatCalendarDay(ready)}`);
    expect(card?.querySelector('button[disabled]')?.textContent).toBe('Buy');
    expect(card?.classList.contains('is-locked')).toBe(true);
    bought.clock.day = ready;
    expect(folder(bought).querySelector('[data-upgrade="lineSoftware"] .lock')?.textContent).toBe('Fitted');
    bought.cash = 1000;
    expect(folder(bought).querySelector('[data-upgrade="lineTooling"] .lock')?.textContent).toBe('Not enough cash');
  });
});

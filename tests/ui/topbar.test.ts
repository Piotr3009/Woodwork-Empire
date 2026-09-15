// @vitest-environment jsdom
// The top bar as a machine cabinet, and the boss's day on it: a lamp, what he is on, how much of
// the day has gone and the day itself in seven bands (PIOTR, 15.09; CLAUDE.md T11 3.1).

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DAY_CATEGORY_LABELS } from '../../src/engine/constants';
import { applyAction, dayPercentages } from '../../src/engine/index';
import type { DayCategory, GameState } from '../../src/engine/index';
import { renderTopbar } from '../../src/ui/topbar';
import { renderDaySummary } from '../../src/ui/dayEnd';
import { currentState, mount } from '../../src/ui/app';
import { buyStartingKit, fillRack, newGame } from '../helpers';

/** A hall with the day 1 kit and a day scripted onto the owner, so the bar has something to
 *  draw. The order of the log is the order the bar paints in. */
function withScriptedDay(pairs: Array<[DayCategory, number]>): GameState {
  const state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
  state.enquiries = [];
  state.owner.dayLog = pairs.map(([category, minutes]) => ({ category, minutes }));
  state.owner.minutesWorked = pairs.reduce((sum, [, minutes]) => sum + minutes, 0);
  return state;
}

const SCRIPTED: Array<[DayCategory, number]> = [
  ['office', 40],
  ['emails', 20],
  ['calls', 10],
  ['workshop', 120],
  ['fixing', 30],
  ['meetings', 60],
  ['siteMeasure', 90],
];

/** The bands of the bar, in the order they are painted. */
function bandsOf(html: string): string[] {
  const bar = html.slice(html.indexOf('<div class="day-bar">'));
  const found: string[] = [];
  const pattern = /class="seg seg-([A-Za-z]+)" data-band="([A-Za-z]+)"/g;
  let match = pattern.exec(bar);
  while (match !== null) {
    found.push(match[2] ?? '');
    match = pattern.exec(bar);
  }
  return found;
}

describe('the cabinet', () => {
  it('is 70 px high, in the darkest machine green, with a rivet in each corner', () => {
    const css = readFileSync('src/ui/styles.css', 'utf8');
    const bar = css.slice(css.indexOf('.topbar {'), css.indexOf('.name-plate {'));
    expect(bar).toContain('height: 70px;');
    expect(bar).toContain('#102518');
    expect(bar).toContain('#0a1a10');
    // Four rivets, drawn in CSS and not a picture (CLAUDE.md T11 3.1).
    expect(bar.match(/radial-gradient/g) ?? []).toHaveLength(4);
    expect(bar).not.toContain('url(');
  });

  it('puts the money on a cream name plate and the date over the knobs', () => {
    const html = renderTopbar(withScriptedDay(SCRIPTED), 'hall');
    expect(html).toContain('class="name-plate"');
    expect(html).toContain('class="cash"');
    expect(html).toContain('class="clock-block"');
    expect(html).toContain('class="chip knob"');
  });
});

describe("the boss's day meter", () => {
  it('draws the seven bands in the order they happened', () => {
    const html = renderTopbar(withScriptedDay(SCRIPTED), 'hall');
    expect(bandsOf(html)).toEqual(SCRIPTED.map(([category]) => category));
  });

  it('paints each band the width of its own minutes out of the 480', () => {
    const html = renderTopbar(withScriptedDay([['workshop', 240]]), 'hall');
    expect(html).toContain('class="seg seg-workshop" data-band="workshop" style="width:50.0000%"');
  });

  it('leaves the break and the idle time unpainted', () => {
    const html = renderTopbar(withScriptedDay([['workshop', 120]]), 'hall');
    expect(bandsOf(html)).toEqual(['workshop']);
    // A quarter of the day painted, and nothing at all for the other three quarters.
    expect(html).toContain('style="width:25.0000%"');
  });

  it('grows past the 480 once overtime runs, rather than clipping the evening', () => {
    const html = renderTopbar(withScriptedDay([['workshop', 480], ['office', 120]]), 'hall');
    expect(html).toContain('600 / 480 min');
    expect(html).toContain('style="width:80.0000%"');
    expect(html).toContain('style="width:20.0000%"');
  });

  it('carries no legend under the bar, and holds the minutes on the hover plate', () => {
    const state = withScriptedDay(SCRIPTED);
    const html = renderTopbar(state, 'hall');
    expect(html).toContain('class="day-tip"');
    for (const [category, minutes] of SCRIPTED) {
      expect(html, category).toContain(`data-band="${category}"`);
      expect(html, category).toContain(DAY_CATEGORY_LABELS[category]);
      expect(html, category).toContain(`${minutes} min</span>`);
    }
    // The plate is behind the hover and nowhere else: the stylesheet keeps it out of sight.
    const css = readFileSync('src/ui/styles.css', 'utf8');
    expect(css).toContain('.day-meter:hover .day-tip {');
  });

  it('says whose day it is, what he is on and how much of it has gone', () => {
    const state = withScriptedDay(SCRIPTED);
    const html = renderTopbar(state, 'hall');
    expect(html).toContain("Piotr's day \u00b7 idle");
    expect(html).toContain('370 / 480 min');
    expect(html).toContain('class="lamp is-idle"');
  });

  it('turns the lamp orange while he is on something and grey while he is out', () => {
    const state = withScriptedDay(SCRIPTED);
    const task = state.tasks.find((entry) => !entry.done);
    if (task === undefined) throw new Error('no open task');
    state.owner.currentTaskId = task.id;
    expect(renderTopbar(state, 'hall')).toContain('class="lamp is-busy"');
    expect(renderTopbar(state, 'hall')).toContain(`${task.label},`);
    state.owner.present = false;
    expect(renderTopbar(state, 'hall')).toContain('class="lamp is-away"');
    expect(renderTopbar(state, 'hall')).toContain('not in today');
  });
});

describe('the push buttons', () => {
  it('carries a count on the two lists, and the view that is not the one he is on', () => {
    const state = withScriptedDay(SCRIPTED);
    const html = renderTopbar(state, 'hall');
    expect(html).toContain('class="push" data-do="openModal" data-modal="shopping">Orders: 0');
    expect(html).toContain('data-do="setView" data-view="office">Office');
    expect(renderTopbar(state, 'office')).toContain('data-do="setView" data-view="hall">Hall');
    expect(html).toContain('data-do="toggleMenu">Menu');
  });

  it('lights orange when there is something behind it he has not seen', () => {
    const state = withScriptedDay(SCRIPTED);
    const quiet = renderTopbar(state, 'hall', false, { board: false, orders: false });
    expect(quiet).not.toContain('is-new');
    const fresh = renderTopbar(state, 'hall', false, { board: true, orders: true });
    expect(fresh).toContain('class="push is-new" data-do="openModal" data-modal="shopping"');
    expect(fresh).toContain('class="push is-new" data-do="openModal" data-modal="board"');
  });
});

describe('the plate at the top of the day end summary', () => {
  it('names the day, the shares and the minutes, and the shares come to a hundred', () => {
    const state = withScriptedDay(SCRIPTED);
    const html = renderDaySummary({
      day: 3,
      title: 'End of day 3',
      minutesByCategory: { admin: 0, design: 0, workshop: 0 },
      minutesWorked: 370,
      minutesAvailable: 480,
      overtimeMinutes: 0,
      tomorrowFactor: 1,
      breakSkipped: false,
      spanLabel: 'daily',
      income: 0,
      costs: 0,
      cash: state.cash,
      jobsAdvanced: 0,
      jobsCompleted: [],
      dustAtStart: 0,
      dustAtEnd: 0,
      deliveriesTomorrow: [],
      labourValue: 0,
      workMinutes: 0,
      dayLog: state.owner.dayLog,
    });
    expect(html).toContain('Day 3 done');
    expect(html).toContain('370 of 480 min · overtime 0');
    const shares = dayPercentages(state.owner.dayLog);
    expect(shares.reduce((sum, share) => sum + share.percent, 0)).toBe(100);
    for (const share of shares) {
      expect(html, share.category).toContain(
        `${DAY_CATEGORY_LABELS[share.category]} ${share.percent}%`,
      );
    }
  });
});

describe('the Orders button, in the game itself', () => {
  it('stays cream for an order the player placed and lights when the lorry lands', () => {
    document.body.innerHTML = '<div id="app"></div>';
    const root = document.querySelector('#app');
    if (!(root instanceof HTMLElement)) throw new Error('no root');
    mount(root);
    const press = (selector: string): void => {
      const element = root.querySelector(selector);
      if (element === null) throw new Error(`nothing to click: ${selector}`);
      element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    };
    press('[data-do="startGame"]');
    press('[data-do="setSpeed"][data-speed="1"]');
    let guard = 0;
    while (root.querySelector('[data-do="resolveEvent"]') !== null && guard < 50) {
      press('[data-do="resolveEvent"]');
      guard += 1;
    }
    press('[data-do="openModal"][data-modal="shopping"]');
    press('[data-modal="shopping"] [data-do="closeModal"]');
    const orders = (): Element | null =>
      root.querySelector('[data-do="openModal"][data-modal="shopping"]');
    expect(orders()?.className).toBe('push');
    // He buys something himself: he knows it is on the road, so the button says nothing.
    const state = currentState();
    if (state === null) throw new Error('no game');
    Object.assign(state, applyAction(state, { type: 'BUY_STOCK', sheets: 10 }));
    press('[data-do="setSpeed"][data-speed="1"]');
    expect(orders()?.className).toBe('push');
    // The lorry lands while he is looking somewhere else: now it is orange.
    const waiting = currentState();
    if (waiting === null) throw new Error('no game');
    waiting.deliveries.length = 0;
    press('[data-do="setSpeed"][data-speed="1"]');
    expect(orders()?.className).toBe('push is-new');
    // And looking at the list puts it back to cream.
    press('[data-do="openModal"][data-modal="shopping"]');
    press('[data-modal="shopping"] [data-do="closeModal"]');
    expect(orders()?.className).toBe('push');
  });

  it('says nothing about an order the player called off himself', () => {
    const root = document.querySelector('#app');
    if (!(root instanceof HTMLElement)) throw new Error('no root');
    const press = (selector: string): void => {
      const element = root.querySelector(selector);
      if (element === null) throw new Error(`nothing to click: ${selector}`);
      element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    };
    const state = currentState();
    if (state === null) throw new Error('no game');
    Object.assign(state, applyAction(state, { type: 'BUY_STOCK', sheets: 10 }));
    press('[data-do="setSpeed"][data-speed="1"]');
    press('[data-do="openModal"][data-modal="shopping"]');
    press('[data-do="cancelOrder"]');
    press('[data-modal="shopping"] [data-do="closeModal"]');
    expect(
      root.querySelector('[data-do="openModal"][data-modal="shopping"]')?.className,
    ).toBe('push');
  });
});

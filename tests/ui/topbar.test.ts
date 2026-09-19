// @vitest-environment jsdom
// The top bar as a machine cabinet, and the boss's day on it: a lamp, what he is on, how much of
// the day has gone and the day itself in seven bands (PIOTR, 15.09; CLAUDE.md T11 3.1).

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  DAY_CATEGORY_LABELS,
  EFFICIENCY_CAUSES,
  OWNER_IDLE_REASONS,
} from '../../src/engine/constants';
import {
  applyAction,
  dayPercentages,
  formatCalendarDay,
  netOf,
  workshopEfficiency,
} from '../../src/engine/index';
import type { DayCategory, GameState } from '../../src/engine/index';
import { renderTopbar } from '../../src/ui/topbar';
import { renderDaySummary } from '../../src/ui/dayEnd';
import { signedMoney } from '../../src/ui/modal';
import { currentState, mount } from '../../src/ui/app';
import { buyStartingKit, fillRack, newGame, runClock, twoMenOnSheetWork } from '../helpers';

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

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

describe('the red plate that says what the company owes', () => {
  /** The hall of the scripted day, with a debt on it: Piotr's own figures of 15 May. */
  function owing(arrears: number, months: number): GameState {
    const state = withScriptedDay(SCRIPTED);
    state.cash = -7259;
    state.finance.arrearsAmount = arrears;
    state.finance.arrearsMonths = months;
    state.finance.firstArrearsDay = 1;
    return state;
  }

  it('stands between the cash and the clock, and only while the company owes something', () => {
    const quiet = renderTopbar(withScriptedDay(SCRIPTED), 'hall');
    expect(quiet).not.toContain('owes-plate');
    const html = renderTopbar(owing(25740, 1), 'hall');
    expect(html).toContain('class="owes-plate"');
    // In the bar itself, after the name plate and before the clock block (CLAUDE.md T21 2.1).
    expect(html.indexOf('name-plate')).toBeLessThan(html.indexOf('owes-plate'));
    expect(html.indexOf('owes-plate')).toBeLessThan(html.indexOf('clock-block'));
  });

  it('says what is owed on the first line and how long it has been owed on the second', () => {
    const plate = parse(renderTopbar(owing(25740, 1), 'hall')).querySelector('.owes-plate');
    expect(plate?.querySelector('.owes-figure')?.textContent).toBe('owes \u00a325,740');
    expect(plate?.querySelector('.owes-line')?.textContent).toBe(
      'arrears, 1 month \u00b7 bailiff in 2',
    );
  });

  it('counts the months of the arrears and the months left before the bailiff', () => {
    const two = parse(renderTopbar(owing(25740, 2), 'hall')).querySelector('.owes-line');
    expect(two?.textContent).toBe('arrears, 2 months \u00b7 bailiff in 1');
    // At the bailiff's own month there is nothing left to count down: he is the next thing to
    // happen, so the line says so.
    const three = parse(renderTopbar(owing(25740, 3), 'hall')).querySelector('.owes-line');
    expect(three?.textContent).toBe('arrears, 3 months \u00b7 bailiff due');
  });

  it('is one button carrying the one action that opens the books at the Summary', () => {
    const plate = parse(renderTopbar(owing(25740, 1), 'hall')).querySelector('.owes-plate');
    expect(plate?.tagName).toBe('BUTTON');
    expect((plate as HTMLButtonElement | null)?.dataset.do).toBe('openArrears');
    // One click and no second control on it: the plate is the whole of it (CLAUDE.md T21 2.1).
    expect(plate?.querySelectorAll('button')).toHaveLength(0);
  });

  // The handler for `openArrears` sets ui.accountingTab to 'summary' and opens the accounting
  // modal. It lives in src/ui/app.ts, which was frozen for the agent that built this plate, so the
  // case is written out in docs/notes-t21-b1.md for the lead to apply and this is the test of it,
  // to be turned on in the same commit as the case itself.

  it('is gone the day the arrears are cleared', () => {
    const state = owing(25740, 1);
    expect(renderTopbar(state, 'hall')).toContain('owes-plate');
    state.finance.arrearsAmount = 0;
    state.finance.arrearsMonths = 0;
    state.finance.firstArrearsDay = null;
    expect(renderTopbar(state, 'hall')).not.toContain('owes-plate');
  });
});

describe("the boss's day meter", () => {
  it('draws the seven bands in the order they happened', () => {
    const html = renderTopbar(withScriptedDay(SCRIPTED), 'hall');
    expect(bandsOf(html)).toEqual(SCRIPTED.map(([category]) => category));
  });

  it('paints each band the width of its own minutes out of the 540 the day runs', () => {
    // The bar is the working day on the clock, 08:00 to 17:00 (CLAUDE.md T17 2.13).
    const html = renderTopbar(withScriptedDay([['workshop', 270]]), 'hall');
    expect(html).toContain('class="seg seg-workshop" data-band="workshop" style="width:50.0000%"');
  });

  it('leaves the break and the minutes nobody spent unpainted', () => {
    // The minutes he stood are painted grey from Turn 21 and are asserted below; these are the
    // minutes of the day that have not run yet, which are nothing at all (CLAUDE.md T21 2.8).
    const html = renderTopbar(withScriptedDay([['workshop', 135]]), 'hall');
    expect(bandsOf(html)).toEqual(['workshop']);
    // A quarter of the day painted, and nothing at all for the other three quarters.
    expect(html).toContain('style="width:25.0000%"');
  });

  it('grows from 540 to 660 as the evening runs, and the figure grows with it', () => {
    // Two hours of overtime worked: the bar ends at 19:00 and says so (CLAUDE.md T17 2.13).
    const state = withScriptedDay([['workshop', 480], ['office', 120]]);
    state.owner.overtimeMinutes = 120;
    const html = renderTopbar(state, 'hall');
    expect(html).toContain('600 worked \u00b7 0 idle \u00b7 660');
    expect(html).toContain('style="width:72.7273%"');
  });

  it('paints the evening in its own colour, whatever he spent it on', () => {
    const state = withScriptedDay([['workshop', 480], ['office', 120]]);
    state.owner.overtimeMinutes = 120;
    // The last two hours of the log are the evening: the band is the overtime one.
    expect(bandsOf(renderTopbar(state, 'hall'))).toEqual(['workshop', 'overtime']);
    // Half an hour of it, and the band he was in when five o'clock came is cut in two.
    state.owner.overtimeMinutes = 30;
    expect(bandsOf(renderTopbar(state, 'hall'))).toEqual(['workshop', 'office', 'overtime']);
    expect(renderTopbar(state, 'hall')).toContain('600 worked \u00b7 0 idle \u00b7 570');
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
    // Three figures where there were two: the minutes he worked, the minutes he stood, and the day
    // (PIOTR, 19.09: "my time runs two to three times slower than the clock"; CLAUDE.md T21 2.8).
    expect(html).toContain('370 worked \u00b7 0 idle \u00b7 540');
    expect(html).toContain('class="lamp is-idle"');
  });

  it('paints the minutes he stood grey, between the worked bands and the empty rest', () => {
    const state = withScriptedDay([['workshop', 120]]);
    state.owner.idleMinutes = 90;
    state.owner.idleByReason = {
      noMachine: 40,
      noMaterial: 20,
      nothingAssigned: 20,
      officeEmpty: 10,
    };
    const html = renderTopbar(state, 'hall');
    // The grey is the last run of the bar and the rest of it is unpainted: 120 worked, 90 stood, and
    // 330 of the 540 not spent at all (CLAUDE.md T21 2.8).
    expect(bandsOf(html)).toEqual(['workshop', 'idle']);
    expect(html).toContain('class="seg seg-idle" data-band="idle" style="width:16.6667%"');
    expect(html).toContain('120 worked \u00b7 90 idle \u00b7 540');
  });

  it('has no grey at all on a day he stood through none of', () => {
    const html = renderTopbar(withScriptedDay([['workshop', 120]]), 'hall');
    expect(bandsOf(html)).toEqual(['workshop']);
    expect(html).not.toContain('seg-idle" data-band');
  });

  it('lists the four reasons he stood on the same plate as the bands, with their minutes', () => {
    const state = withScriptedDay([['workshop', 120]]);
    state.owner.idleMinutes = 91;
    state.owner.idleByReason = {
      noMachine: 41,
      noMaterial: 20,
      nothingAssigned: 20,
      officeEmpty: 10,
    };
    const html = renderTopbar(state, 'hall');
    // One plate and not two: the rows are the same `.tip-row` the bands use, in the order the
    // constants name the reasons in (CLAUDE.md T21 2.8).
    const plate = html.slice(html.indexOf('<div class="day-tip">'));
    const order = Array.from(plate.matchAll(/data-idle="([a-zA-Z]+)"/g)).map((hit) => hit[1]);
    expect(order).toEqual(OWNER_IDLE_REASONS.map((reason) => reason.id));
    for (const reason of OWNER_IDLE_REASONS) {
      expect(plate, reason.id).toContain(reason.label);
    }
    expect(plate).toContain('<span class="tip-key seg-idle"></span>');
    expect(plate).toContain('41 min');
    expect(plate).toContain('10 min');
    // And the four add up to the figure beside the bar, which is the one the grey is drawn from.
    const summed = OWNER_IDLE_REASONS.reduce(
      (sum, reason) => sum + state.owner.idleByReason[reason.id],
      0,
    );
    expect(summed).toBe(state.owner.idleMinutes);
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

describe('the efficiency number next to the clock', () => {
  it('is one live number, worked over possible, in the clock block', () => {
    const state = runClock(twoMenOnSheetWork({ saws: 1 }), 200);
    const html = renderTopbar(state, 'hall');
    const clock = parse(html).querySelector('.clock-block');
    const number = clock?.querySelector('details.efficiency > summary');
    expect(number?.textContent).toBe('Efficiency 50%');
    expect(clock?.querySelector('details.efficiency')?.getAttribute('data-efficiency')).toBe('50');
    // The number is the engine's, not the bar's own arithmetic.
    expect(workshopEfficiency(state).percent).toBe(50);
  });

  it('opens on a click, with no handler, on to the plate of the four lines', () => {
    const state = runClock(twoMenOnSheetWork({ saws: 1 }), 200);
    const page = parse(renderTopbar(state, 'hall'));
    const details = page.querySelector('details.efficiency');
    expect(details?.querySelector('summary')?.hasAttribute('data-do')).toBe(false);
    const plate = details?.querySelector('.efficiency-plate');
    expect(plate).not.toBeNull();
    const lines = Array.from(plate?.querySelectorAll('.efficiency-line') ?? []);
    expect(lines.map((line) => line.getAttribute('data-cause'))).toEqual(
      EFFICIENCY_CAUSES.map((cause) => cause.id),
    );
    for (const cause of EFFICIENCY_CAUSES) {
      expect(plate?.textContent, cause.id).toContain(cause.label);
    }
    // Each line is its share of the lost minutes: the man waiting for the saw is all of it.
    const waiting = lines.find((line) => line.getAttribute('data-cause') === 'noMachine');
    expect(waiting?.textContent).toBe('No machine free100%');
    expect(plate?.textContent).toContain('200 min worked of 400 min, 200 min lost');
    // A summary click toggles a details element in the browser itself; here in jsdom too.
    details?.querySelector('summary')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(details?.hasAttribute('open')).toBe(true);
  });

  it('reads 100 before the first production minute, and erodes from there', () => {
    const fresh = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    expect(parse(renderTopbar(fresh, 'hall')).querySelector('details.efficiency > summary')?.textContent)
      .toBe('Efficiency 100%');
  });
});

describe("the day figure on the name plate", () => {
  it("equals the sum of that day's ledger lines, signed and coloured (CLAUDE.md T13 10.2)", () => {
    const state = runClock(twoMenOnSheetWork(), 300);
    const day = state.clock.day;
    const ledger = state.ledger
      .filter((entry) => entry.day === day && !entry.unpaid)
      .reduce((sum, entry) => sum + entry.amount, 0);
    expect(ledger).not.toBe(0);
    expect(netOf(state.finance.day)).toBeCloseTo(ledger, 6);
    const net = parse(renderTopbar(state, 'hall')).querySelector('.name-plate .net');
    expect(net?.textContent).toBe(`${signedMoney(ledger)} today`);
    expect(net?.classList.contains(ledger < 0 ? 'bad' : 'good')).toBe(true);
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
      title: `End of ${formatCalendarDay(3)}`,
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
      dustMadeM3: 0,
      deliveriesTomorrow: [],
      labourValue: 0,
      workMinutes: 0,
      dayLog: state.owner.dayLog,
      efficiency: { possible: 0, worked: 0, lost: { noPeople: 0, noMachine: 0, noMaterial: 0, ownerAway: 0 } },
      nightMinutes: 0,
      paidHours: 0,
      expressUplift: 0,
      hallFactor: 1,
    });
    expect(html).toContain(`${formatCalendarDay(3)} done`);
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
    while (root.querySelector('[data-do="closeHouseCard"], [data-do="resolveEvent"]') !== null && guard < 50) {
      press('[data-do="closeHouseCard"], [data-do="resolveEvent"]');
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

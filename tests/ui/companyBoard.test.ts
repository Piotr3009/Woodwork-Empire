// @vitest-environment jsdom
// The company board on the office wall: two cream sheets pinned straight to the felt, a ledger
// each, with the result at the top over a line and the balance at the bottom like Excel; the
// big cross that closes it; and the board itself in the middle of the wall between the door and
// the corner (PIOTR, 13.09 and 16.09; CLAUDE.md T9 3.10, T15 2.1).

import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { changeReputation, companyTotals, effectiveReputation, formatReputation } from '../../src/engine/reputation';
import { outputBreakdown } from '../../src/engine/machines';
import { COMPANY_BOARD_BOX, OFFICE_TEXTS } from '../../src/render/office';
import { machineSavings } from '../../src/engine/machines';
import { plural } from '../../src/engine/text';
import { weekRate } from '../../src/engine/rate';
import { daySummaryOf } from '../../src/engine/index';
import { renderCompany, weeksOf } from '../../src/ui/company';
import { currentState, mount, render } from '../../src/ui/app';
import type { GameState } from '../../src/engine/index';
import { buyStartingKit, fillRack, newGame } from '../helpers';

const CSS = readFileSync('src/ui/styles.css', 'utf8');
const COMPANY = readFileSync('src/ui/company.ts', 'utf8');

function root(): HTMLElement {
  const element = document.querySelector('#app');
  if (!(element instanceof HTMLElement)) throw new Error('no root');
  return element;
}

function click(selector: string): void {
  const element = root().querySelector(selector);
  if (element === null) throw new Error(`nothing to click: ${selector}`);
  element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

/** Every rule of the stylesheet as [selector list, body], comments stripped. */
function rules(): Array<[string, string]> {
  const bare = CSS.replace(/\/\*[\s\S]*?\*\//g, '');
  return Array.from(bare.matchAll(/([^{}]+)\{([^{}]*)\}/g)).map((found) => [
    (found[1] ?? '').trim(),
    found[2] ?? '',
  ]);
}

function ruleBody(selector: string): string {
  return rules()
    .filter(([selectors]) => selectors === selector)
    .map(([, body]) => body)
    .join('');
}

/** A company with a fortnight of history behind it and a day of the owner's on the log. */
function traded(): GameState {
  const state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy', companyName: 'Joinery Core' })), 40);
  state.clock.day = 3;
  changeReputation(state, 3, 'Bookcase: on time');
  changeReputation(state, -1, 'Bookcase: calls not answered');
  state.clock.day = 9;
  changeReputation(state, 5, 'Wardrobe: express, on time');
  state.clock.day = 11;
  changeReputation(state, -10, 'Dropped: Garage shelves');
  state.owner.dayLog = [
    { category: 'workshop', minutes: 240 },
    { category: 'calls', minutes: 60 },
    { category: 'office', minutes: 180 },
  ];
  state.dayLogs = [{ day: 10, segments: [{ category: 'emails', minutes: 120 }] }];
  return state;
}

function texts(nodes: Iterable<Element>): string[] {
  return Array.from(nodes).map((node) => node.textContent ?? '');
}

beforeAll(() => {
  document.body.innerHTML = `<style>${CSS}</style><div id="app"></div>`;
  mount(root());
  click('[data-do="startGame"]');
  click('[data-do="setSpeed"][data-speed="1"]');
  const state = currentState();
  if (state === null) throw new Error('no game');
  Object.assign(state, traded());
  render();
});

describe('the board on the wall', () => {
  it('hangs in the middle of the free wall between the door and the corner, under the clock, square', () => {
    // Measured on officeBackground.png: the door frame ends at x 971 and the corner is at 1214,
    // so the free wall's centre is 1092 (CLAUDE.md T15 2.1).
    expect(COMPANY_BOARD_BOX).toEqual({ x: 1002, y: 168, width: 180, height: 180 });
    expect(COMPANY_BOARD_BOX.x + COMPANY_BOARD_BOX.width / 2).toBe(1092);
    expect(COMPANY_BOARD_BOX.x - 971).toBeGreaterThanOrEqual(30);
    expect(1214 - (COMPANY_BOARD_BOX.x + COMPANY_BOARD_BOX.width)).toBeGreaterThanOrEqual(30);
    click('[data-do="setView"][data-view="office"]');
    const board = root().querySelector('[data-office="company"]');
    expect(board?.getAttribute('style')).toBe(
      `left:${COMPANY_BOARD_BOX.x}px;top:${COMPANY_BOARD_BOX.y}px;width:${COMPANY_BOARD_BOX.width}px;height:${COMPANY_BOARD_BOX.height}px`,
    );
    // The two totals on the wall sit on the pinned sheet of the picture, off the same box.
    expect(OFFICE_TEXTS.companyTotals).toEqual({ x: 1037, y: 241, width: 110, height: 72, fontSize: 12 });
    const state = currentState();
    if (state === null) throw new Error('no game');
    const totals = companyTotals(state);
    const wall = root().querySelector('[data-office-text="companyTotals"]');
    expect(wall?.querySelector('[data-total="reputation"]')?.textContent).toBe(totals.reputation);
    expect(wall?.querySelector('[data-total="output"]')?.textContent).toBe(totals.output);
  });

  it('opens the felt board full page, drawn in CSS, and the picture stays on the wall', () => {
    click('[data-office="company"]');
    const modal = root().querySelector('.modal-layer .modal');
    expect(modal?.getAttribute('data-modal')).toBe('company');
    expect(modal?.classList.contains('modal-full')).toBe(true);
    expect(modal?.classList.contains('modal-felt')).toBe(true);
    expect(modal?.classList.contains('modal-board')).toBe(true);
    expect(CSS).not.toContain("url('/sprites/officeCompanyBoard.png')");
    expect(root().querySelector('[data-office="company"] img[data-sprite="officeCompanyBoard"]')).not.toBeNull();
    click('[data-modal="company"] [data-do="closeModal"]');
  });

  it('is read on a stopped clock, like the Work Plan', () => {
    click('[data-do="setSpeed"][data-speed="0"]');
    click('[data-office="company"]');
    expect(currentState()?.speed).toBe(0);
    expect(root().querySelector('[data-modal="company"]')).not.toBeNull();
    click('[data-modal="company"] [data-do="closeModal"]');
    click('[data-do="setSpeed"][data-speed="1"]');
  });
});

describe('the cross', () => {
  it('is the one close of every modal, a big disc on the corner of the frame, and a real click shuts the board', () => {
    click('[data-office="company"]');
    const cross = root().querySelector('[data-modal="company"] .modal-head .modal-close');
    expect(cross).not.toBeNull();
    expect(cross?.getAttribute('data-do')).toBe('closeModal');
    // The disc: CLOSE_DISC 54 px, a 3 px oak border, the glyph in the title hand at the display
    // size, half outside the top right corner.
    const disc = ruleBody('.modal-felt .modal-close');
    expect(disc).toContain('height: 54px;');
    expect(disc).toContain('width: 54px;');
    expect(disc).toContain('border-radius: 50%;');
    expect(disc).toContain('border: 3px solid var(--oak-2);');
    expect(disc).toContain('font-family: var(--font-title);');
    expect(disc).toContain('font-size: var(--fs-display);');
    expect(disc).toContain('right: -27px;');
    expect(disc).toContain('top: -27px;');
    // The root cause of the dead cross: the head and the body were both absolute with no stacking
    // order and the body came later, so it covered the head. The head is above the body now.
    const head = ruleBody('.modal-felt .modal-head');
    expect(head).toContain('position: absolute;');
    expect(head).toContain('z-index: 2;');
    const body = ruleBody('.modal-felt .modal-body');
    expect(body).not.toContain('position: absolute;');
    expect(body).not.toContain('inset: 0;');
    if (cross !== null) {
      expect(getComputedStyle(cross.parentElement as Element).zIndex).toBe('2');
    }
    // A real click on the cross, bubbling up as the browser sends it: the board shuts.
    cross?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(root().querySelector('[data-modal="company"]')).toBeNull();
  });
});

describe('the three sheets', () => {
  it('are exactly three, straight, and there is no fourth block and no paragraph of explanation', () => {
    // Turn 17 pins the Machines sheet right of Output (CLAUDE.md T17 2.24); the two of Turn 15
    // are unchanged beside it, and the grid has the third track for it.
    const page = parse(renderCompany(traded()));
    const felt = page.querySelector('.felt');
    const sheets = felt?.querySelectorAll('.sheets > *') ?? [];
    expect(sheets).toHaveLength(3);
    expect(texts(sheets).map((text) => text.startsWith('Reputation'))).toEqual([true, false, false]);
    expect(Array.from(sheets).map((sheet) => sheet.getAttribute('data-sheet'))).toEqual([
      'reputation',
      'output',
      'machines',
    ]);
    expect(ruleBody('.sheets')).toContain('grid-template-columns: repeat(3, 1fr);');
    expect(felt?.querySelectorAll('.col, .board-column, .board-columns, .hint, p:not(.empty)')).toHaveLength(0);
    expect(page.textContent).not.toContain('never counted twice');
    expect(page.textContent).not.toContain('Reputation started at');
    // Each pinned once at the top centre.
    for (const sheet of Array.from(sheets)) expect(sheet.querySelectorAll(':scope > .pin')).toHaveLength(1);
    // Straight: no rule of the stylesheet tilts a sheet, and none of the board family's cards
    // rules reaches it.
    const tilted = rules().filter(([selectors, body]) => selectors.includes('.sheet') && /rotate\(/.test(body));
    expect(tilted).toEqual([]);
    document.body.insertAdjacentHTML(
      'beforeend',
      `<div class="modal modal-full modal-board modal-felt" data-modal="probe"><div class="modal-body">${renderCompany(traded())}</div></div>`,
    );
    for (const sheet of Array.from(document.querySelectorAll('[data-modal="probe"] .sheet'))) {
      expect(getComputedStyle(sheet).transform).toMatch(/^(none|)$/);
    }
    document.querySelector('[data-modal="probe"]')?.remove();
  });

  it('keeps the week line on the felt above them, in the same seven bands as the top bar', () => {
    const page = parse(renderCompany(traded()));
    expect(page.querySelector('.felt-name')?.textContent).toBe('Joinery Core');
    expect(page.querySelector('.felt-week')?.textContent).toBe('Week 2 · −5');
    const shares = page.querySelector('.felt-shares')?.textContent ?? '';
    expect(shares).toContain('Workshop');
    expect(shares).toContain('Emails');
    const percents = (shares.match(/(\d+)%/g) ?? []).map((text) => Number(text.replace('%', '')));
    expect(percents.reduce((sum, value) => sum + value, 0)).toBe(100);
  });

  it('counts the day that has just closed once, and not twice', () => {
    const state = traded();
    state.dayLogs = [{ day: state.clock.day, segments: [{ category: 'workshop', minutes: 100 }] }];
    state.owner.dayLog = [{ category: 'workshop', minutes: 100 }];
    expect(parse(renderCompany(state)).querySelector('.felt-shares')?.textContent).toBe('Workshop 100%');
    state.dayLogs = [{ day: state.clock.day - 1, segments: [{ category: 'emails', minutes: 100 }] }];
    const both = parse(renderCompany(state)).querySelector('.felt-shares')?.textContent ?? '';
    expect(both).toContain('Workshop 50%');
    expect(both).toContain('Emails 50%');
  });
});

describe('the Reputation sheet', () => {
  it('cuts the log into weeks, newest first, each with its pluses, its minuses and its total', () => {
    const weeks = weeksOf(traded());
    expect(weeks.map((week) => week.week)).toEqual([2, 1]);
    expect(weeks[0]).toMatchObject({ plus: 5, minus: -10, total: -5 });
    expect(weeks[1]).toMatchObject({ plus: 3, minus: -1, total: 2 });
    expect(weeks[0]?.entries.map((entry) => entry.reason)).toEqual([
      'Dropped: Garage shelves',
      'Wardrobe: express, on time',
    ]);
  });

  it('puts the reputation at the top, equal to the state\'s, over the rule', () => {
    const state = traded();
    const sheet = parse(renderCompany(state)).querySelector('[data-sheet="reputation"]');
    expect(sheet?.querySelector('h3')?.textContent).toBe('Reputation');
    const total = sheet?.querySelector('.ledger-total');
    expect(total?.querySelector('.ledger-total-label')?.textContent).toBe('this week');
    expect(total?.querySelector('[data-figure="reputation"]')?.textContent).toBe(
      formatReputation(effectiveReputation(state)),
    );
    expect(formatReputation(effectiveReputation(state))).toBe(String(state.reputation));
    expect(ruleBody('.ledger-total')).toContain('border-bottom: 2px solid var(--sheet-ink);');
    expect(ruleBody('.ledger-total-figure')).toContain('font-size: var(--fs-display);');
  });

  it('lists every rating newest first with its points and colour, the day under it, the weeks labelled', () => {
    const state = traded();
    const sheet = parse(renderCompany(state)).querySelector('[data-sheet="reputation"]');
    const rows = Array.from(sheet?.querySelectorAll('.ledger-row[data-rating]') ?? []);
    expect(rows.map((row) => row.querySelector('.ledger-main')?.firstChild?.textContent)).toEqual([
      'Dropped: Garage shelves',
      'Wardrobe: express, on time',
      'Bookcase: calls not answered',
      'Bookcase: on time',
    ]);
    expect(rows.map((row) => row.querySelector('small')?.textContent)).toEqual([
      'day 11',
      'day 9',
      'day 3',
      'day 3',
    ]);
    expect(rows.map((row) => row.querySelector('.ledger-points')?.textContent)).toEqual([
      '−10',
      '+5',
      '−1',
      '+3',
    ]);
    expect(rows.map((row) => row.querySelector('.ledger-points')?.className)).toEqual([
      'ledger-points bad',
      'ledger-points good',
      'ledger-points bad',
      'ledger-points good',
    ]);
    expect(texts(sheet?.querySelectorAll('.ledger-week') ?? [])).toEqual(['Week 2', 'Week 1']);
    // The head row, and the list that scrolls inside the sheet while the total does not.
    expect(sheet?.querySelector('.ledger-head')?.textContent).toBe('Who said whatpoints');
    expect(ruleBody('.ledger-list')).toContain('overflow-y: auto;');
    expect(ruleBody('.ledger-total')).toContain('flex: none;');
  });

  it('carries last week over as the last row of this week, and balances at the bottom to the figure at the top', () => {
    const state = traded();
    const sheet = parse(renderCompany(state)).querySelector('[data-sheet="reputation"]');
    const carry = sheet?.querySelector('.ledger-row[data-carry]');
    expect(carry?.querySelector('.ledger-main')?.firstChild?.textContent).toBe('Start of the week');
    expect(carry?.querySelector('small')?.textContent).toBe('carried over');
    // Week 2 did minus 5; the reputation is what it is now, so the week started 5 higher.
    const now = effectiveReputation(state);
    expect(carry?.querySelector('.ledger-points')?.textContent).toBe(`+${now + 5}`);
    // The carry over sits after this week's ratings and before the next label.
    const list = Array.from(sheet?.querySelectorAll('.ledger-list > *') ?? []);
    const index = list.indexOf(carry as Element);
    expect(list[index + 1]?.textContent).toBe('Week 1');
    expect(list[index - 1]?.getAttribute('data-rating')).toBe('1');
    // The balance: the pluses of this week with the carry, the minuses, and the figure.
    const sum = sheet?.querySelector('.ledger-sum');
    expect(sum?.querySelector('[data-sum="plus"]')?.textContent).toBe(`+${now + 5 + 5}`);
    expect(sum?.querySelector('[data-sum="minus"]')?.textContent).toBe('−10');
    expect(sum?.querySelector('[data-sum="total"]')?.textContent).toBe(`= ${formatReputation(now)}`);
    expect(now + 5 + 5 - 10).toBe(now);
  });

  it('reads plainly when nothing has moved the reputation yet: the carry over and nothing else', () => {
    const quiet = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 0);
    const sheet = parse(renderCompany(quiet)).querySelector('[data-sheet="reputation"]');
    expect(sheet?.querySelectorAll('.ledger-row[data-rating]')).toHaveLength(0);
    expect(sheet?.querySelector('.ledger-row[data-carry] .ledger-points')?.textContent).toBe(
      points(quiet.reputation),
    );
    expect(sheet?.querySelector('[data-sum="total"]')?.textContent).toBe(`= ${quiet.reputation}`);
  });
});

/** The sign the sheet writes, for the test's own expectations. */
function points(value: number): string {
  return `${value < 0 ? '−' : '+'}${Math.abs(value)}`;
}

describe('the Output sheet', () => {
  it('prints the engine\'s breakdown: the hall\'s lines with their balance, base first and dim', () => {
    const state = traded();
    state.dust = 80;
    const breakdown = outputBreakdown(state);
    const sheet = parse(renderCompany(state)).querySelector('[data-sheet="output"]');
    expect(sheet?.querySelector('h3')?.textContent).toBe('Output');
    expect(sheet?.querySelector('.ledger-total-label')?.textContent).toBe(
      'every minute of production is multiplied by it',
    );
    expect(sheet?.querySelector('[data-figure="output"]')?.textContent).toBe(breakdown.total.toFixed(2));
    const base = sheet?.querySelector('.ledger-row[data-line="base"]');
    expect(base?.querySelector('.ledger-main')?.textContent).toBe('Base');
    expect(base?.querySelector('.ledger-points')?.textContent).toBe('1.00');
    expect(base?.querySelector('.ledger-points')?.className).toBe('ledger-points dim');
    const hall = breakdown.lines.filter((line) => line.hall);
    const rows = Array.from(sheet?.querySelectorAll('.ledger-row[data-line="hall"]') ?? []);
    expect(rows.map((row) => row.querySelector('.ledger-main')?.textContent)).toEqual(hall.map((line) => line.label));
    expect(hall.some((line) => line.label === 'Hall dirty')).toBe(true);
    for (const [index, row] of rows.entries()) {
      const line = hall[index];
      if (line === undefined) throw new Error('a row without a line');
      const written = `${line.points < 0 ? '−' : '+'}${Math.abs(line.points).toFixed(2)}`;
      expect(row.querySelector('.ledger-points')?.textContent, line.label).toBe(written);
      expect(row.querySelector('.ledger-points')?.className, line.label).toBe(
        `ledger-points ${line.points > 0 ? 'good' : line.points < 0 ? 'bad' : 'dim'}`,
      );
      // No tip or warning of the game has matching wording for a hall line, so no second line.
      expect(row.querySelector('small'), line.label).toBeNull();
    }
    // The Excel line: plus, minus and the total of the breakdown, nothing computed here.
    const sum = sheet?.querySelector('.ledger-sum');
    expect(sum?.querySelector('[data-sum="plus"]')?.textContent).toBe(`+${breakdown.plus.toFixed(2)}`);
    expect(sum?.querySelector('[data-sum="minus"]')?.textContent).toBe(`−${Math.abs(breakdown.minus).toFixed(2)}`);
    expect(sum?.querySelector('[data-sum="total"]')?.textContent).toBe(`= ${breakdown.total.toFixed(2)}`);
  });

  it('puts every line that is not the hall\'s under the second rule, with where it acts', () => {
    const state = traded();
    state.owner.overtimeDebt = 0.1;
    const breakdown = outputBreakdown(state);
    const elsewhere = breakdown.lines.filter((line) => !line.hall);
    expect(elsewhere.length).toBeGreaterThan(1);
    const sheet = parse(renderCompany(state)).querySelector('[data-sheet="output"]');
    const list = Array.from(sheet?.querySelectorAll('.ledger-list > *') ?? []);
    const rule = list.findIndex((node) => node.classList.contains('ledger-rule'));
    const heading = list[rule + 1];
    expect(heading?.textContent).toBe('Act where they are, not in the number above');
    expect(heading?.className).toContain('ledger-head');
    const rows = list.slice(rule + 2);
    expect(rows.every((row) => row.getAttribute('data-line') === 'elsewhere')).toBe(true);
    expect(rows.map((row) => row.querySelector('.ledger-main')?.firstChild?.textContent)).toEqual(
      elsewhere.map((line) => line.label),
    );
    expect(rows.map((row) => row.querySelector('small')?.textContent)).toEqual(
      elsewhere.map((line) => line.where),
    );
    expect(rows.some((row) => row.querySelector('small')?.textContent === 'your own minutes')).toBe(true);
    expect(rows.some((row) => row.querySelector('small')?.textContent === 'the stage it does')).toBe(true);
    // And the sum line sits above the rule, on the hall's lines alone: no sum under this group.
    expect(list.slice(rule).some((node) => node.classList.contains('ledger-sum'))).toBe(false);
    // Nobody and nothing: the sheet says so instead of a blank.
    const bare = newGame({ difficulty: 'veryEasy' });
    expect(parse(renderCompany(bare)).querySelector('[data-sheet="output"] .empty')?.textContent).toBe(
      'Nobody on the books and no machines in the hall.',
    );
  });

  it('computes nothing: every figure is a field of the breakdown or a rating\'s points', () => {
    // The one fold in company.ts is the log into weeks; the output sheet adds and multiplies
    // nothing.
    const outputPart = COMPANY.slice(COMPANY.indexOf('function outputRow'), COMPANY.indexOf('export function renderCompany'));
    expect(outputPart).not.toMatch(/points\s*[+*/-]\s*\w/);
    expect(outputPart).not.toContain('plus +');
    expect(outputPart).toContain('breakdown.plus');
    expect(outputPart).toContain('breakdown.minus');
    expect(outputPart).toContain('breakdown.total');
  });
});

describe('the workshop rate at the top (CLAUDE.md T17 2.26)', () => {
  /** A company with two closed weeks behind it: five days at 320 a day, and five before them at
   *  half of that, each day paying for the owner's eight hours. */
  function weeks(): GameState {
    const state = traded();
    const blank = daySummaryOf(newGame());
    state.days = [1, 2, 3, 4, 5, 8, 9, 10, 11, 12].map((day, index) => ({
      ...blank,
      day,
      labourValue: index < 5 ? 160 : 320,
      paidHours: 8,
    }));
    state.clock.day = 15;
    return state;
  }

  it('prints the figure big in the hand font, with last week and per man small beside it', () => {
    const state = weeks();
    const page = parse(renderCompany(state));
    const figure = page.querySelector('.felt .rate-figure');
    expect(figure).not.toBeNull();
    const week = weekRate(state);
    expect(week.rate).toBe(40);
    expect(page.querySelector('.rate-big')?.textContent).toBe('Workshop earns £40 an hour');
    const side = page.querySelector('.rate-side')?.textContent ?? '';
    expect(side).toContain('last week £20');
    expect(side).toContain('per man £40');
    // The hand font, and the figure on the felt above the sheets rather than on a sheet.
    expect(ruleBody('.rate-big')).toContain('font-family: var(--font-title);');
    expect(page.querySelector('.sheets .rate-figure')).toBeNull();
  });

  it('says so plainly before a day has closed', () => {
    const fresh = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 0);
    const page = parse(renderCompany(fresh));
    expect(page.querySelector('.rate-big')?.textContent).toBe('Workshop earns nothing an hour yet');
    expect(page.querySelector('.rate-side')).toBeNull();
  });
});

describe('the Machines sheet (CLAUDE.md T17 2.24)', () => {
  function withMachines(): GameState {
    const state = traded();
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    if (saw) {
      saw.hoursThisWeek = 10;
      saw.variantId = 'standard';
    }
    return state;
  }

  it('gives a row to every machine in the hall with its class, its hours and what it saved', () => {
    const state = withMachines();
    const savings = machineSavings(state, 'week');
    const sheet = parse(renderCompany(state)).querySelector('[data-sheet="machines"]');
    expect(sheet?.querySelector('h3')?.textContent).toBe('Machines');
    const rows = Array.from(sheet?.querySelectorAll('.ledger-row[data-machine]') ?? []);
    expect(rows).toHaveLength(savings.rows.length);
    const saw = rows.find((row) => row.textContent?.includes('Standard table saw'));
    expect(saw?.querySelector('small')?.textContent).toBe('ran 10 h at +5%');
    expect(saw?.querySelector('.ledger-points')?.textContent).toBe('+30 min');
    expect(saw?.querySelector('.ledger-points')?.className).toBe('ledger-points good');
    // The figure at the top and the sentence at the bottom are the engine's own totals.
    expect(sheet?.querySelector('[data-figure="machines"]')?.textContent).toBe(`${savings.hoursSaved} h`);
    expect(sheet?.querySelector('[data-sum="total"]')?.textContent).toBe(
      `Machines saved us ${plural(savings.hoursSaved, 'hour', 'hours')} this week`,
    );
  });

  it('says what is wrong with a machine that is short of its extraction, in the minus', () => {
    const state = withMachines();
    state.pipes = [];
    const sheet = parse(renderCompany(state)).querySelector('[data-sheet="machines"]');
    const saw = Array.from(sheet?.querySelectorAll('.ledger-row[data-machine]') ?? []).find((row) =>
      row.textContent?.includes('Standard table saw'),
    );
    expect(saw?.querySelector('small')?.textContent).toContain('no pipe to the extraction, −30%');
    expect(saw?.querySelector('.ledger-points')?.className).toBe('ledger-points bad');
  });
});

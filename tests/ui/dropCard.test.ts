// @vitest-environment jsdom
// Drop project, and what it costs before the click (PIOTR, 18.09; CLAUDE.md T21 2.3;
// docs/mockups/t21/debt.html part 2).
//
// Piotr dropped a 50,000 job with 7,000 in the bank and nothing on the screen had told him what the
// click would do. So the one action in the game that takes two clicks: the first opens this card,
// which says what the drop costs and what it does to the company, and the red button on the card is
// the only thing that drops anything. Everything else on it, the cross, Escape and a click outside
// included, keeps the job.

import { describe, expect, it } from 'vitest';
import { currentState, mount, render } from '../../src/ui/app';
import { MODAL_SKINS } from '../../src/ui/modal';
import {
  accountAfterDrop,
  depositCanBePaid,
  dropCardTitle,
  materialWrittenOff,
  renderDropCard,
  renderDropCardFooter,
} from '../../src/ui/dropCard';
import { dropReputationCost } from '../../src/engine/index';
import type { GameState, Job } from '../../src/engine/index';
import {
  acceptNow,
  buyStartingKit,
  clearEvents,
  fillRack,
  newGame,
  placeEnquiry,
} from '../helpers';

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

/** A hall with one job of a chosen price on the books, and the clock stopped: a frame loop running
 *  behind this test is a day going by under it (CLAUDE.md T7 3.10). */
function withJob(price: number, kind: 'residential' | 'commercial' = 'residential'): {
  state: GameState;
  job: Job;
} {
  let state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
  state.enquiries = [];
  const enquiry = placeEnquiry(state, { price, kind, deadlineDays: 60 });
  state = clearEvents(acceptNow(state, enquiry.id, false));
  state.speed = 0;
  const job = state.jobs[0];
  if (job === undefined) throw new Error('no job');
  return { state, job };
}

/** The label and figure of every row of the card, in the order the card prints them. */
function rowsOf(html: string): Array<[string, string]> {
  return Array.from(parse(html).querySelectorAll('.row'), (node) => [
    node.querySelector('.row-main')?.textContent ?? '',
    node.querySelector('.row-figure')?.textContent ?? '',
  ]);
}

describe('the card', () => {
  it('is a card in a folder, like a machine card and every event', () => {
    expect(MODAL_SKINS.dropJob).toBe('folder');
  });

  it('asks the question by name, and says when the client is a trade one', () => {
    const { job } = withJob(1600);
    expect(dropCardTitle(job)).toBe(`Drop ${job.name}?`);
    const trade = withJob(1600, 'commercial').job;
    expect(dropCardTitle(trade)).toBe(`Drop ${trade.name}, commercial?`);
  });

  it('prints the deposit, the material, the reputation and where the account stands', () => {
    const { state, job } = withJob(20000);
    const rows = rowsOf(renderDropCard(state, job));
    expect(rows.map(([label]) => label)).toEqual([
      'Deposit to return to the client',
      'Material bought for it, written off',
      'Reputation',
      'You have',
    ]);
    expect(rows[0]?.[1]).toBe(`-£${job.depositPaid.toLocaleString('en-GB')}`);
    // Nothing was ordered in for this job, so there is nothing written off: what the bench has not
    // cut goes back on the rack, which costs the company nothing (`dropJob`).
    expect(materialWrittenOff(state, job)).toBe(0);
    expect(rows[1]?.[1]).toBe('£0');
    // The scale, not the flat ten: a 20,000 job is 25 points (CLAUDE.md T21 2.4).
    expect(rows[2]?.[1]).toBe(`-${dropReputationCost(job)}`);
    expect(rows[2]?.[1]).toBe('-25');
    expect(rows[3]?.[1]).toBe(
      `£${Math.round(state.cash).toLocaleString('en-GB')} of -£10,000 overdraft`,
    );
  });

  it('writes off the material that was really ordered in for the job, and only that', () => {
    const { state, job } = withJob(20000);
    state.deliveries.push({
      id: 'del-test',
      jobId: job.id,
      sheets: job.sheets,
      orderedDay: state.clock.day,
      pricePaid: job.materialCost,
      arriveDay: state.clock.day + 1,
      arrived: true,
      unloaded: true,
      bespoke: false,
      overflowSheets: 0,
    });
    expect(materialWrittenOff(state, job)).toBe(job.materialCost);
    const rows = rowsOf(renderDropCard(state, job));
    expect(rows[1]?.[1]).toBe(`-£${Math.round(job.materialCost).toLocaleString('en-GB')}`);
  });

  it('shows a small job in green, with no red box at all', () => {
    const { state, job } = withJob(1600);
    const html = renderDropCard(state, job);
    expect(depositCanBePaid(state, job)).toBe(true);
    expect(html).not.toContain('drop-danger');
    // The account is in the black, so the one figure on the card that can carry a sign is green.
    const account = parse(html).querySelectorAll('.row')[3]?.querySelector('.figure');
    expect(account?.className).toBe('figure good');
    // And the three costs are money out whatever the job is worth.
    for (const at of [0, 1, 2]) {
      const figure = parse(html).querySelectorAll('.row')[at]?.querySelector('.figure');
      expect(figure?.className).not.toBe('figure good');
    }
  });

  it('turns the account figure red once the company is in its overdraft', () => {
    const { state, job } = withJob(1600);
    state.cash = -7259;
    const account = parse(renderDropCard(state, job))
      .querySelectorAll('.row')[3]
      ?.querySelector('.figure');
    expect(account?.className).toBe('figure bad');
    expect(account?.textContent).toBe('-£7,259');
  });
});

describe('the red box', () => {
  it('says what the deposit does and that the drop closes the company at the next check', () => {
    // Piotr's own evening: a 50,000 job on the books and 7,000 in the bank.
    const { state, job } = withJob(50000);
    state.cash = 7000;
    expect(depositCanBePaid(state, job)).toBe(false);
    const box = parse(renderDropCard(state, job)).querySelector('.drop-danger');
    const { account, allowed } = accountAfterDrop(state, job);
    expect(account).toBe(7000 - job.depositPaid);
    expect(allowed).toBe(-15000);
    expect(box?.textContent).toBe(
      'You cannot pay the deposit back from the overdraft. The account goes to ' +
        `-£${Math.abs(account).toLocaleString('en-GB')} against the bank's ` +
        "-£15,000. Dropping this job closes the company at tomorrow's check.",
    );
  });

  it('says the other rule instead when the drop would not close the company', () => {
    // A deposit the overdraft will not cover, but not one that takes the company past what the
    // bank allows: 3,000 out of an account at the bottom of its 10,000 overdraft is -13,000
    // against -15,000. The game does not say how many days that leaves, because it cannot know,
    // so it says the thing that is true of every account below the limit (CLAUDE.md T22 2.3).
    const { state, job } = withJob(6000);
    state.cash = -9999;
    expect(depositCanBePaid(state, job)).toBe(false);
    const { account, allowed } = accountAfterDrop(state, job);
    expect(account).toBe(-9999 - job.depositPaid);
    expect(account).toBeGreaterThan(allowed);
    const text = parse(renderDropCard(state, job)).querySelector('.drop-danger')?.textContent ?? '';
    expect(text).toBe(
      'You cannot pay the deposit back from the overdraft. The account goes to ' +
        `-£${Math.abs(account).toLocaleString('en-GB')} against the bank's ` +
        '-£15,000. The bank counts every day below its limit.',
    );
    expect(text).not.toContain('tomorrow');
    expect(text).not.toContain('days from');
  });

  it('is not drawn at all while the deposit can be paid back', () => {
    const { state, job } = withJob(50000);
    expect(state.cash).toBeGreaterThan(job.depositPaid + state.finance.overdraftLimit);
    expect(renderDropCard(state, job)).not.toContain('drop-danger');
  });
});

describe('the footer', () => {
  it('is the red button that does it and the one that does not, and nothing else', () => {
    const { job } = withJob(20000);
    const buttons = Array.from(parse(renderDropCardFooter(job)).querySelectorAll('button'));
    expect(buttons.map((node) => node.textContent)).toEqual(['Drop it anyway', 'Keep the job']);
    // One class attribute each, and the red one is the only red button in the game.
    expect(buttons[0]?.className).toBe('btn btn-danger');
    expect(buttons[0]?.dataset.do).toBe('dropJob');
    expect(buttons[0]?.dataset.confirm).toBe('1');
    expect(buttons[0]?.dataset.id).toBe(job.id);
    expect(buttons[1]?.className).toBe('btn');
    expect(buttons[1]?.dataset.do).toBe('keepJob');
    // One class attribute on each button: the helper puts the class in the markup and the extra
    // attributes after it, so nothing carries two (src/ui/modal.ts `dangerButton`).
    for (const node of buttons) expect(node.outerHTML.match(/class=/g) ?? []).toHaveLength(1);
  });
});

describe('the two clicks, in the game itself', () => {
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

  function clickOutside(): void {
    root().dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }

  function press(key: string): void {
    window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  }

  function shown(selector: string): boolean {
    return root().querySelector(selector) !== null;
  }

  let mounted = false;

  /** A mounted game with one 20,000 job on the books and the Work Plan open over it. The app is
   *  mounted once for the file, the way the popover test does it, and every test puts its own hall
   *  into the running game. */
  function started(): GameState {
    if (!mounted) {
      document.body.innerHTML = '<div id="app"></div>';
      mount(root());
      mounted = true;
    }
    if (shown('[data-do="startGame"]')) click('[data-do="startGame"]');
    const live = currentState();
    if (live === null) throw new Error('no game');
    Object.assign(live, withJob(20000).state);
    let guard = 0;
    while (shown('[data-do="closeHouseCard"], [data-do="resolveEvent"]') && guard < 50) {
      click('[data-do="closeHouseCard"], [data-do="resolveEvent"]');
      guard += 1;
    }
    render();
    // Nothing of the last test left open, and the Work Plan the drop is asked for from.
    press('Escape');
    press('Escape');
    if (!shown('.modal-layer [data-modal="workPlan"]')) {
      click('[data-do="openModal"][data-modal="workPlan"]');
    }
    return live;
  }

  it('opens the card on the first click and drops nothing at all', () => {
    const state = started();
    expect(state.jobs).toHaveLength(1);
    click('[data-do="dropJob"]');
    expect(shown('.modal-layer [data-modal="dropJob"]')).toBe(true);
    expect(currentState()?.jobs).toHaveLength(1);
    // The card is over the Work Plan it was opened from, and both are still there.
    expect(shown('.modal-layer [data-modal="workPlan"]')).toBe(true);
    // The one cross of the game, and the two buttons of the drawing.
    const card = root().querySelector('.modal-layer [data-modal="dropJob"]');
    expect(card?.querySelectorAll('.modal-close')).toHaveLength(1);
    expect(card?.querySelector('[data-do="dropJob"][data-confirm="1"]')).not.toBeNull();
    press('Escape');
  });

  it('keeps the job on Keep the job, on the cross, on Escape and on a click outside', () => {
    const state = started();
    for (const shut of ['[data-modal="dropJob"] [data-do="keepJob"]', '[data-modal="dropJob"] .modal-close']) {
      click('[data-do="dropJob"]');
      expect(shown('.modal-layer [data-modal="dropJob"]')).toBe(true);
      click(shut);
      expect(shown('.modal-layer [data-modal="dropJob"]')).toBe(false);
      expect(currentState()?.jobs).toHaveLength(1);
    }
    click('[data-do="dropJob"]');
    press('Escape');
    expect(shown('.modal-layer [data-modal="dropJob"]')).toBe(false);
    expect(shown('.modal-layer [data-modal="workPlan"]')).toBe(true);
    click('[data-do="dropJob"]');
    clickOutside();
    expect(shown('.modal-layer [data-modal="dropJob"]')).toBe(false);
    expect(currentState()?.jobs).toHaveLength(1);
    expect(state.jobs).toHaveLength(1);
  });

  it('drops the job on the red button, and only on the red button', () => {
    const state = started();
    const reputation = state.reputation;
    const job = state.jobs[0];
    if (job === undefined) throw new Error('no job');
    click('[data-do="dropJob"]');
    click('[data-modal="dropJob"] [data-do="dropJob"][data-confirm="1"]');
    const after = currentState();
    expect(after?.jobs).toHaveLength(0);
    expect(shown('.modal-layer [data-modal="dropJob"]')).toBe(false);
    expect(after?.reputation).toBe(reputation - dropReputationCost(job));
  });
});

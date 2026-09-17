// @vitest-environment jsdom
// The Team board: a page of the game, in tabs by trade, with the candidates as tiles (PIOTR,
// 13.09; CLAUDE.md T10 3.6). The office admin is the one who must be there; the draftsman takes
// the drawings off the owner.

import { describe, expect, it } from 'vitest';
import {
  DRAFTSMAN_MONTHLY_WAGE,
  DRAFTSMAN_RATE,
  DRAFTSMAN_REPUTATION,
  HIRING_SPECS,
  JOINERY_CORE_PRICE_YEARLY,
} from '../../src/engine/constants';
import { hiringOptions, openJobs } from '../../src/engine/index';
import { canHire, hasWorkingDay } from '../../src/engine/staff';

import { jobTasks, taskWorkRate } from '../../src/engine/tasks';
import { renderTeam, tradeOf } from '../../src/ui/team';
import { money } from '../../src/ui/modal';
import { officeDoor } from '../../src/render/hall';
import { laptopPageFrom } from '../../src/ui/laptop';
import type { GameState, Worker } from '../../src/engine/index';
import {
  acceptNow,
  act,
  buyStartingKit,
  clearEvents,
  firstJob,
  hireNow,
  newGame,
  placeEnquiry,
  runClock,
  withLicence,
} from '../helpers';

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

function known(reputation = 40): GameState {
  const state = newGame({ difficulty: 'veryEasy' });
  state.reputation = reputation;
  return state;
}

describe('the board itself', () => {
  it('is a page of the laptop and has the three tabs Piotr named, and the Technical one', () => {
    // A page inside the laptop's screen since Turn 15, not a modal (CLAUDE.md T15 2.3).
    expect(laptopPageFrom('team')).toBe('team');
    const page = parse(renderTeam(known(), 'workshop'));
    const tabs = Array.from(page.querySelectorAll('[data-do="teamTab"]'));
    // The estimator's tab joined in Turn 13 (CLAUDE.md T13 3.8).
    expect(tabs.map((tab) => tab.getAttribute('data-id'))).toEqual([
      // Our team leads them: the roll call, which hires nobody (CLAUDE.md T17 2.9).
      'ourTeam',
      'workshop',
      'office',
      'technical',
      'management',
    ]);
    expect(tabs.find((tab) => tab.getAttribute('data-id') === 'workshop')?.className).toContain(
      'is-on',
    );
  });

  it('puts every role of the hiring pool on one of the four, and none on two', () => {
    for (const spec of HIRING_SPECS) {
      const trade = tradeOf(spec.role);
      expect(['workshop', 'office', 'technical', 'management'], spec.role).toContain(trade);
      // Every desk has a working day: the office, the estimator and the manager (T13 3.8, 3.9).
      expect(trade !== 'workshop', spec.role).toBe(hasWorkingDay(spec.role));
    }
  });

  it('draws the workshop trades on one tab and the desks on the other', () => {
    const workshop = parse(renderTeam(known(), 'workshop'));
    const names = Array.from(workshop.querySelectorAll('[data-candidate]')).map((tile) =>
      tile.getAttribute('data-candidate'),
    );
    expect(names).toEqual([
      'joiner.poor',
      'joiner.normal',
      'joiner.super',
      'helper.',
    ]);
    const office = parse(renderTeam(known(), 'office'));
    expect(
      Array.from(office.querySelectorAll('[data-candidate]')).map((tile) =>
        tile.getAttribute('data-candidate'),
      ),
    ).toEqual(['officeAdmin.', 'purchasingClerk.', 'draftsman.', 'salesman.']);
  });

  it('offers the production manager on Management, and the estimator on Technical', () => {
    // The first management role in the game (CLAUDE.md T13 3.9); the chief executive is parked.
    const management = parse(renderTeam(known(), 'management'));
    expect(
      Array.from(management.querySelectorAll('[data-candidate]')).map((tile) =>
        tile.getAttribute('data-candidate'),
      ),
    ).toEqual(['productionManager.']);
    const technical = parse(renderTeam(known(), 'technical'));
    expect(
      Array.from(technical.querySelectorAll('[data-candidate]')).map((tile) =>
        tile.getAttribute('data-candidate'),
      ),
    ).toEqual(['estimator.poor', 'estimator.normal', 'estimator.super']);
  });

  it('carries the rate, the wage and the reputation on every tile, and one Hire', () => {
    const page = parse(renderTeam(known(), 'workshop'));
    const poor = page.querySelector('[data-candidate="joiner.poor"]');
    expect(poor?.textContent).toContain('a week');
    expect(poor?.textContent).toContain('60% of your speed');
    expect(poor?.textContent).toContain('Available from reputation');
    // A joiner wants his bench, his locker, his seat, his cabinet and his tools first, so his
    // tile says what to buy instead of offering a Hire (CLAUDE.md 9.3).
    expect(poor?.querySelectorAll('[data-do="hire"]')).toHaveLength(0);
    expect(poor?.textContent).toContain('To make this hire possible');
    // A helper needs none of it: one tile, one Hire, one click (CLAUDE.md T7 3.10).
    const helper = page.querySelector('[data-candidate="helper."]');
    expect(helper?.querySelectorAll('[data-do="hire"]')).toHaveLength(1);
  });

  it('frames the roles the company already has, with the count', () => {
    const one = hireNow(known(), 'helper', null);
    const page = parse(renderTeam(one, 'workshop'));
    const helper = page.querySelector('[data-candidate="helper."]');
    expect(helper?.className).toContain('is-owned');
    expect(helper?.textContent).toContain('On the books');
    const two = hireNow(one, 'helper', null);
    expect(
      parse(renderTeam(two, 'workshop')).querySelector('[data-candidate="helper."]')?.textContent,
    ).toContain('On the books × 2');
  });

  it('is no longer behind the office door of the hall: that door walks into the office', () => {
    // Turn 10 put the team behind the door; Piotr reversed it, and the team is on the laptop's
    // Office tile (PIOTR, 15.09; CLAUDE.md T14 2.3).
    const door = officeDoor({ x: 1, y: 0, width: 2, depth: 4 });
    expect(door).toContain('data-door="office"');
    expect(door).toContain('To the office');
    expect(door).not.toContain('The team');
    expect(door).toContain('clickable');
  });
});

describe('the office admin is the one who must be there', () => {
  it('blocks every other desk until she is on the books, and says so', () => {
    const state = known();
    for (const role of ['purchasingClerk', 'salesman', 'draftsman'] as Worker['role'][]) {
      expect(canHire(state, role, null), role).toEqual({
        ok: false,
        reason: 'Hire an office admin first',
      });
    }
    // And she herself is not blocked by it.
    expect(canHire(state, 'officeAdmin', null).ok).toBe(true);
    // Nor is anybody on the floor.
    const options = hiringOptions(state);
    expect(options.find((entry) => entry.role === 'helper')?.blockReason).not.toBe(
      'Hire an office admin first',
    );
  });

  it('lets the clerk in the moment she is', () => {
    const state = hireNow(known(), 'officeAdmin', null);
    expect(canHire(state, 'purchasingClerk', null).ok).toBe(true);
    const page = parse(renderTeam(state, 'office'));
    const clerk = page.querySelector('[data-candidate="purchasingClerk."]');
    expect(clerk?.querySelectorAll('[data-do="hire"]')).toHaveLength(1);
  });
});

describe('the draftsman', () => {
  it('is an office role at Piotr’s wage and standing', () => {
    const spec = HIRING_SPECS.find((entry) => entry.role === 'draftsman');
    expect(spec?.monthlyWage).toBe(DRAFTSMAN_MONTHLY_WAGE);
    expect(DRAFTSMAN_MONTHLY_WAGE).toBe(2400);
    expect(spec?.minReputation).toBe(DRAFTSMAN_REPUTATION);
    expect(DRAFTSMAN_REPUTATION).toBe(15);
    expect(hasWorkingDay('draftsman')).toBe(true);
    expect(tradeOf('draftsman')).toBe('office');
    // Nobody of that standing answers a workshop nobody has heard of.
    expect(canHire(known(10), 'draftsman', null).ok).toBe(false);
  });

  it('draws at 0.8 of the owner, and the software factor is counted once', () => {
    expect(DRAFTSMAN_RATE).toBe(0.8);
    const worker = { role: 'draftsman' } as Worker;
    expect(taskWorkRate(worker, { kind: 'design' } as never)).toBe(DRAFTSMAN_RATE);
    // And nothing else he could be handed is worked at that rate.
    expect(taskWorkRate(worker, { kind: 'emails' } as never)).toBe(1);
  });

  it('takes the drawing off the owner, and the owner’s queue shrinks', () => {
    let state = withLicence(known());
    state.enquiries = [];
    const enquiry = placeEnquiry(state, { price: 4000, deadlineDays: 40 });
    state = acceptNow(state, enquiry.id, false);
    const design = jobTasks(state, firstJob(state).id).find((task) => task.kind === 'design');
    if (!design) throw new Error('no drawing to do');
    // Until he is hired the drawing is the owner's: nobody else has it.
    expect(design.doneBy).toBeNull();
    const ownersQueue = (current: GameState): number =>
      openJobs(current)
        .flatMap((job) => jobTasks(current, job.id))
        .filter((task) => task.kind === 'design' && !task.done && task.doneBy === null).length;
    expect(ownersQueue(state)).toBe(1);
    let hired = hireNow(hireNow(state, 'officeAdmin', null), 'draftsman', null);
    for (const worker of hired.workers) worker.startDay = hired.clock.day;
    hired = clearEvents(runClock(hired, 1));
    const taken = jobTasks(hired, firstJob(hired).id).find((task) => task.kind === 'design');
    const draftsman = hired.workers.find((worker) => worker.role === 'draftsman');
    expect(taken?.doneBy).toBe(draftsman?.id);
    expect(ownersQueue(hired)).toBe(0);
    // And he works it off at 0.8 of a minute a minute.
    const before = taken?.minutesRemaining ?? 0;
    const later = clearEvents(runClock(hired, 10));
    const after = jobTasks(later, firstJob(later).id).find((task) => task.kind === 'design');
    expect(before - (after?.minutesRemaining ?? 0)).toBeCloseTo(10 * DRAFTSMAN_RATE, 6);
  });
});

describe('the Technical tab (CLAUDE.md T13 3.8)', () => {
  it('sells Joinery Core beside the estimator, with the capacity and the yearly prices', () => {
    const state = buyStartingKit(known());
    const page = parse(renderTeam(state, 'technical'));
    expect(page.querySelectorAll('[data-do="buyJoineryCore"]')).toHaveLength(1);
    expect(page.textContent).toContain('5 a day, 10 with Joinery Core');
    expect(page.textContent).toContain(`${money(JOINERY_CORE_PRICE_YEARLY)} a year`);
    // The extension waits for the core: a reason, not a button.
    expect(page.querySelectorAll('[data-do="buyJoineryCoreExtension"]')).toHaveLength(0);
    expect(page.textContent).toContain('Joinery Core first');
    const bought = parse(renderTeam(act(state, { type: 'BUY_JOINERY_CORE' }), 'technical'));
    expect(bought.querySelectorAll('[data-do="buyJoineryCore"]')).toHaveLength(0);
    expect(bought.querySelectorAll('[data-do="buyJoineryCoreExtension"]')).toHaveLength(1);
    expect(bought.textContent).toContain('10 take offs a day');
  });

  it('says so when there is no laptop to put it on', () => {
    const page = parse(renderTeam(known(), 'technical'));
    expect(page.querySelectorAll('[data-do="buyJoineryCore"]')).toHaveLength(0);
    expect(page.textContent).toContain('Needs the laptop');
  });
});

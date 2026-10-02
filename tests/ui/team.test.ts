// @vitest-environment jsdom
// The Team board: a page of the game, in tabs by trade, with the candidates as tiles (PIOTR,
// 13.09; CLAUDE.md T10 3.6). The office admin is the one who must be there; the draftsman takes
// the drawings off the owner.

import { describe, expect, it } from 'vitest';
import {
  DRAFTSMAN_MONTHLY_WAGE,
  DRAFTSMAN_RATE,
  DRAFTSMAN_MIN_REPUTATION,
  HIRING_SPECS,
  JOINERY_CORE_PRICE_YEARLY,
  PRODUCTION_MANAGER_MONTHLY_WAGE,
  TIERS,
  productionManagerDuties,
} from '../../src/engine/constants';
import { hiringOptions, openJobs } from '../../src/engine/index';
import { canHire, hasWorkingDay } from '../../src/engine/staff';

import { jobTasks, taskWorkRate } from '../../src/engine/tasks';
import { renderTeam, tradeOf, wageText } from '../../src/ui/team';
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
    // The Technical tab joined in Turn 13 (CLAUDE.md T13 3.8), the draftsman's from Turn 26.
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
      // Every desk has a working day: the office, the draftsman and the manager (T13 3.9, T26 2.8).
      expect(trade !== 'workshop', spec.role).toBe(hasWorkingDay(spec.role));
    }
  });

  it('draws the workshop trades on one tab and the desks on the other', () => {
    const workshop = parse(renderTeam(known(), 'workshop'));
    const names = Array.from(workshop.querySelectorAll('[data-candidate]')).map((tile) =>
      tile.getAttribute('data-candidate'),
    );
    // The joiners and the labourer, and nobody else on the floor (PIOTR, 02.10; CLAUDE.md T26
    // 2.6): the booth's own trade's four cards went with it.
    expect(names).toEqual(['joiner.novice', 'joiner.experienced', 'joiner.senior', 'joiner.master', 'helper.']);
    const office = parse(renderTeam(known(), 'office'));
    expect(
      Array.from(office.querySelectorAll('[data-candidate]')).map((tile) =>
        tile.getAttribute('data-candidate'),
      ),
    ).toEqual(['officeAdmin.', 'salesman.']);
  });

  it('offers the production manager on Management, and the draftsman on Technical', () => {
    // The first management role in the game (CLAUDE.md T13 3.9); the chief executive is parked.
    const management = parse(renderTeam(known(), 'management'));
    expect(
      Array.from(management.querySelectorAll('[data-candidate]')).map((tile) =>
        tile.getAttribute('data-candidate'),
      ),
    // Four grades from Turn 23, a card each, like the joiner (PIOTR, 20.09; CLAUDE.md T23 2.4).
    ).toEqual([
      'productionManager.novice',
      'productionManager.experienced',
      'productionManager.senior',
      'productionManager.master',
    ]);
    const technical = parse(renderTeam(known(), 'technical'));
    expect(
      Array.from(technical.querySelectorAll('[data-candidate]')).map((tile) =>
        tile.getAttribute('data-candidate'),
      ),
    // The draftsman's three grades, at the drawing (CLAUDE.md T26 2.8).
    ).toEqual(['draftsman.experienced', 'draftsman.senior', 'draftsman.master']);
  });

  it('says each manager grade\u2019s three figures in words on his own card', () => {
    // The duties line is the spec's, through `productionManagerDuties`, and it carries the three
    // things a grade is: how many men he carries, the order he assigns in and his pace. The card
    // used to read a table of its own in team.ts, which said the same sentence about all four
    // (PIOTR, 20.09; CLAUDE.md T23 2.4).
    const page = parse(renderTeam(known(), 'management'));
    for (const tier of TIERS) {
      const tile = page.querySelector(`[data-candidate="productionManager.${tier}"]`);
      expect(tile?.querySelector('.tile-text')?.textContent).toBe(productionManagerDuties(tier));
    }
    const experienced = page.querySelector('[data-candidate="productionManager.experienced"]');
    // The brief's own sentence, word for word.
    expect(experienced?.querySelector('.tile-text')?.textContent).toBe(
      'Assigns up to 12 men, soonest deadline first, +5% pace',
    );
    // And the four wages are Piotr's own figures and not the one wage ladder.
    for (const tier of TIERS) {
      const tile = page.querySelector(`[data-candidate="productionManager.${tier}"]`);
      expect(tile?.textContent).toContain(wageText(PRODUCTION_MANAGER_MONTHLY_WAGE[tier]));
    }
  });

  it('carries the rate, the wage and the reputation on every tile, and one Hire', () => {
    const page = parse(renderTeam(known(), 'workshop'));
    const novice = page.querySelector('[data-candidate="joiner.novice"]');
    expect(novice?.textContent).toContain('a month');
    // The four tiers run Piotr's own 0.6, 0.8, 1.0 and 1.2 of the owner (CLAUDE.md T21 2.9).
    expect(novice?.textContent).toContain('60% of your speed');
    expect(novice?.textContent).toContain('Available from reputation');
    // A joiner wants his bench, his locker, his seat, his cabinet and his tools first, so his
    // tile says what to buy instead of offering a Hire (CLAUDE.md 9.3).
    expect(novice?.querySelectorAll('[data-do="hire"]')).toHaveLength(0);
    expect(novice?.textContent).toContain('To make this hire possible');
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
    for (const [role, tier] of [['salesman', null], ['draftsman', 'experienced']] as const) {
      expect(canHire(state, role, tier), role).toEqual({
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

  it('lets the salesman in the moment she is', () => {
    const state = hireNow(known(), 'officeAdmin', null);
    expect(canHire(state, 'salesman', null).ok).toBe(true);
    const page = parse(renderTeam(state, 'office'));
    const salesman = page.querySelector('[data-candidate="salesman."]');
    expect(salesman?.querySelectorAll('[data-do="hire"]')).toHaveLength(1);
  });
});

describe('the draftsman', () => {
  it('comes in three grades, on his own gate and his own wages, by the month', () => {
    // No novice at a drawing board: experienced from 15, very experienced from 50 and excellent
    // from 90 (PIOTR, 02.10), at 2,400, 2,900 and 3,400 a month [TUNE] (CLAUDE.md T26 2.8). Until
    // Turn 26 he was one man at 2,400 from 15.
    const specs = HIRING_SPECS.filter((entry) => entry.role === 'draftsman');
    expect(specs.map((spec) => spec.tier)).toEqual(['experienced', 'senior', 'master']);
    expect(specs.map((spec) => spec.monthlyWage)).toEqual([2400, 2900, 3400]);
    expect(specs.map((spec) => spec.minReputation)).toEqual([15, 50, 90]);
    for (const spec of specs) {
      const tier = spec.tier as 'experienced' | 'senior' | 'master';
      expect(spec.monthlyWage).toBe(DRAFTSMAN_MONTHLY_WAGE[tier]);
      expect(spec.minReputation).toBe(DRAFTSMAN_MIN_REPUTATION[tier]);
    }
    expect(hasWorkingDay('draftsman')).toBe(true);
    // At the drawing, the Technical tab, from Turn 26.
    expect(tradeOf('draftsman')).toBe('technical');
    // Nobody of that standing answers a workshop nobody has heard of.
    expect(canHire(known(10), 'draftsman', 'experienced').ok).toBe(false);
  });

  it('draws at his grade s speed, 0.8, 1.0 and 1.2 of the owner, and the software factor once', () => {
    expect(DRAFTSMAN_RATE).toEqual({ experienced: 0.8, senior: 1.0, master: 1.2 });
    for (const tier of ['experienced', 'senior', 'master'] as const) {
      const worker = { role: 'draftsman', tier } as Worker;
      expect(taskWorkRate(worker, { kind: 'design' } as never), tier).toBe(DRAFTSMAN_RATE[tier]);
      // And nothing else he could be handed is worked at that rate.
      expect(taskWorkRate(worker, { kind: 'emails' } as never), tier).toBe(1);
    }
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
    let hired = hireNow(hireNow(state, 'officeAdmin', null), 'draftsman', 'experienced');
    for (const worker of hired.workers) worker.startDay = hired.clock.day;
    hired = clearEvents(runClock(hired, 1));
    const taken = jobTasks(hired, firstJob(hired).id).find((task) => task.kind === 'design');
    const draftsman = hired.workers.find((worker) => worker.role === 'draftsman');
    expect(taken?.doneBy).toBe(draftsman?.id);
    expect(ownersQueue(hired)).toBe(0);
    // And he works it off at 0.8 of a minute a minute, his grade's.
    const before = taken?.minutesRemaining ?? 0;
    const later = clearEvents(runClock(hired, 10));
    const after = jobTasks(later, firstJob(later).id).find((task) => task.kind === 'design');
    expect(before - (after?.minutesRemaining ?? 0)).toBeCloseTo(10 * DRAFTSMAN_RATE.experienced, 6);
  });
});

describe('the Technical tab (CLAUDE.md T13 3.8)', () => {
  it('sells Joinery Core beside the drawings, with the capacity and the yearly prices', () => {
    const state = buyStartingKit(known());
    const page = parse(renderTeam(state, 'technical'));
    expect(page.querySelectorAll('[data-do="buyJoineryCore"]')).toHaveLength(1);
    // As many a day as the minutes allow, at the owner's own speed, whose the take offs are with
    // the admin's from Turn 26: 16 at half an hour each, 32 with the software (CLAUDE.md T20 2.3,
    // T26 2.9). Until Turn 26 they were the experienced take off man's 12 and 25.
    expect(page.textContent).toContain('16 a day, 32 with Joinery Core');
    expect(page.textContent).toContain('42 and 56 with its extensions');
    expect(page.textContent).toContain(`${money(JOINERY_CORE_PRICE_YEARLY)} a year`);
    // The extension waits for the core: a reason, not a button.
    expect(page.querySelectorAll('[data-do="buyJoineryCoreExtension"]')).toHaveLength(0);
    expect(page.textContent).toContain('Joinery Core first');
    const bought = parse(renderTeam(act(state, { type: 'BUY_JOINERY_CORE' }), 'technical'));
    expect(bought.querySelectorAll('[data-do="buyJoineryCore"]')).toHaveLength(0);
    expect(bought.querySelectorAll('[data-do="buyJoineryCoreExtension"]')).toHaveLength(1);
    expect(bought.textContent).toContain('32 take offs a day');
    // The software's quarter of an hour, at the owner's own speed (CLAUDE.md T26 2.9).
    expect(bought.textContent).toContain('15 min each');
  });

  it('works the day out for the office admin on the books, and names her', () => {
    // With nobody at the desk the take offs are the owner's own, and the line says so.
    const empty = parse(renderTeam(buyStartingKit(known()), 'technical'));
    expect(empty.textContent).toContain('Take offs at your own desk: 16 a day');
    // With the admin at it they are hers, at the owner's own speed (CLAUDE.md T26 2.9).
    const state = hireNow(buyStartingKit(known()), 'officeAdmin', null);
    const admin = state.workers[0];
    if (!admin) throw new Error('nobody at the desk');
    const page = parse(renderTeam(state, 'technical'));
    expect(page.textContent).toContain(`Take offs for ${admin.name}, the office admin: 16 a day`);
    expect(page.textContent).toContain('32 with Joinery Core');
  });

  it('says so when there is no laptop to put it on', () => {
    const page = parse(renderTeam(known(), 'technical'));
    expect(page.querySelectorAll('[data-do="buyJoineryCore"]')).toHaveLength(0);
    expect(page.textContent).toContain('Needs the laptop');
  });
});

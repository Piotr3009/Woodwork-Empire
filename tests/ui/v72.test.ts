// @vitest-environment jsdom
// v72 (PIOTR, 03.10), three things.
//
// Our team says how much of each trade is used: a tile a trade with the share of its paid hours
// that were worked last week, and under the tiles the people of the trade that is picked. "If the
// draftsman or the labourer is at ninety per cent, that is the sign a second one has to be taken
// on."
//
// A second flexi system stands beside the first and not on it: from v73 behind the rear wall,
// where tests/ui/v73.test.ts holds it.
//
// A big job of the agency's counts the joiners who come off a job within five working days with
// the ones who are free, because nobody is put on it until its paperwork is in. Jobs only: a
// standing contract is nearly always renewed.

import { describe, expect, it } from 'vitest';
import { bigJobLine, joinersFreeSoon, setAgency } from '../../src/engine/agency';
import { canAccept } from '../../src/engine/board';
import { isWorkingDay, weekOfDay } from '../../src/engine/clock';
import {
  AGENCY_JOB_REPUTATION,
  AGENCY_JOB_VALUE_MIN,
  BIG_JOB_SOON_DAYS,
  USAGE_NEAR_FULL_PERCENT,
} from '../../src/engine/constants';
import { acceptContract, assignContract, drawContract } from '../../src/engine/contracts';
import type { GameState, Worker } from '../../src/engine/index';
import { freeJoiners } from '../../src/engine/jobs';
import { weekMetersOf } from '../../src/engine/staff';
import { tradeUsage, usageOfMan } from '../../src/engine/usage';
import { renderTeam } from '../../src/ui/team';
import { acceptNow, buyStartingKit, fillRack, newGame, placeEnquiry, testJoiner } from '../helpers';

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

/** A man of this role on the books, in the shape the one helper makes a joiner in. */
function man(id: string, name: string, role: Worker['role'], tier: Worker['tier'] = null): Worker {
  return { ...testJoiner(id, name), role, tier };
}

/** Writes a whole last week on a man: so many minutes worked, in his own band, of 2,400 paid. */
function lastWeek(state: GameState, holder: Worker | GameState['owner'], worked: number, band: 'jobs' | 'cleaning' | 'desk'): void {
  const meters = weekMetersOf(holder, weekOfDay(state.clock.day) - 1);
  meters.minutes[band] = worked;
  meters.paidMinutes = 2400;
}

describe('how much of each trade is used', () => {
  function shop(): GameState {
    const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    state.workers.push(
      testJoiner('staff-1', 'Nathan'),
      testJoiner('staff-2', 'Jack'),
      man('staff-3', 'Pete', 'helper'),
      man('staff-4', 'Ben', 'officeAdmin'),
      man('staff-5', 'Ollie', 'productionManager', 'master'),
    );
    lastWeek(state, state.owner, 2400, 'jobs');
    lastWeek(state, state.workers[0] as Worker, 2400, 'jobs');
    lastWeek(state, state.workers[1] as Worker, 2160, 'jobs');
    lastWeek(state, state.workers[2] as Worker, 2208, 'cleaning');
    lastWeek(state, state.workers[3] as Worker, 456, 'desk');
    return state;
  }

  it('reads a man off last week, and a manager off the men he carries', () => {
    const state = shop();
    expect(usageOfMan(state, 'staff-3')).toMatchObject({ percent: 92, basis: 'lastWeek', band: 'full' });
    expect(usageOfMan(state, 'staff-4')).toMatchObject({ percent: 19, band: 'low' });
    // A joiner at a hundred is doing what he is paid for: near full is not his sign.
    expect(usageOfMan(state, 'staff-1')).toMatchObject({ percent: 100, band: 'fine' });
    expect(usageOfMan(state, 'owner')).toMatchObject({ percent: 100, band: 'fine' });
    // Four others on the books, of the twenty five an excellent manager carries.
    expect(usageOfMan(state, 'staff-5')).toMatchObject({ percent: 16, basis: 'carried', band: 'fine', words: 'carries 4 of 25 men' });
  });

  it('says of every trade how much is used, and what that means for taking another on', () => {
    const trades = new Map(tradeUsage(shop()).map((entry) => [entry.trade, entry]));
    expect(USAGE_NEAR_FULL_PERCENT).toBe(90);
    expect(trades.get('joiner')).toMatchObject({ label: 'Joiners', percent: 95, band: 'fine' });
    expect(trades.get('helper')).toMatchObject({
      label: 'Labourer',
      percent: 92,
      band: 'full',
      words: 'Near full. More work of this kind wants a second man.',
    });
    expect(trades.get('officeAdmin')).toMatchObject({ percent: 19, band: 'low', words: '1 man, standing most of the week.' });
    expect(trades.get('productionManager')).toMatchObject({ label: 'Manager', words: 'Carries 4 of the 25 men his grade can.' });
    // Nobody hired is said too: whose work it is meanwhile.
    expect(trades.get('draftsman')).toMatchObject({
      label: 'Draftsman',
      men: [],
      percent: null,
      band: 'none',
      words: 'Nobody. You draw, measure and meet the clients yourself.',
    });
  });

  it('draws a tile a trade and the people of the one that is picked', () => {
    const state = shop();
    const page = parse(renderTeam(state, 'ourTeam', 'helper'));
    const tiles = Array.from(page.querySelectorAll('[data-do="teamTrade"]'));
    expect(tiles.map((tile) => tile.getAttribute('data-id'))).toEqual([
      'owner',
      'joiner',
      'helper',
      'officeAdmin',
      'salesman',
      'draftsman',
      'productionManager',
      // From v84 the line engineer's tile last (CLAUDE.md T29 2.8).
      'lineEngineer',
    ]);
    const picked = page.querySelector('[data-trade="helper"]');
    expect(picked?.classList.contains('is-on')).toBe(true);
    expect(picked?.getAttribute('data-band')).toBe('full');
    expect(picked?.querySelector('.usage-percent')?.textContent).toBe('92%');
    expect(picked?.querySelector('.seg-full')?.getAttribute('style')).toBe('width:92%');
    // One labourer, one row, with the trade's own bar and his one button.
    const rows = Array.from(page.querySelectorAll('[data-person]'));
    expect(rows.map((row) => row.getAttribute('data-person'))).toEqual(['staff-3']);
    expect(rows[0]?.querySelector('[data-usage]')?.getAttribute('data-usage')).toBe('92');
    expect(rows[0]?.querySelector('[data-do="letGo"]')).not.toBeNull();
    // The joiners are the list a caller that names no trade gets.
    const joiners = parse(renderTeam(state, 'ourTeam'));
    expect(Array.from(joiners.querySelectorAll('[data-person]')).map((row) => row.getAttribute('data-person'))).toEqual([
      'staff-1',
      'staff-2',
    ]);
    // A trade nobody is hired in says where one is taken on.
    const none = parse(renderTeam(state, 'ourTeam', 'draftsman'));
    expect(none.querySelectorAll('[data-person]')).toHaveLength(0);
    expect(none.querySelector('.empty')?.textContent).toBe('Nobody yet. One is taken on under Technical.');
  });
});

describe('a big job counts the men who come off a job within five days', () => {
  /** The agency's shop with two free joiners, and a big job wanting four on the board. */
  function shop(): GameState {
    const state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 60);
    state.reputation = AGENCY_JOB_REPUTATION + 10;
    state.enquiries = [];
    for (let index = 1; index <= 2; index += 1) state.workers.push(testJoiner(`staff-${index}`, `Joiner ${index}`, 3 + index, 6));
    while (!isWorkingDay(state.clock.day)) state.clock.day += 1;
    setAgency(state, true);
    return state;
  }

  function bigJob(state: GameState) {
    return placeEnquiry(state, {
      id: 'enq-big',
      name: 'Wardrobe x 63',
      templateId: 'wardrobe',
      price: AGENCY_JOB_VALUE_MIN,
      basePrice: AGENCY_JOB_VALUE_MIN,
      budget: AGENCY_JOB_VALUE_MIN,
      joinersWanted: 4,
      deadlineDays: 33,
    });
  }

  /** Two more joiners on a job in production, with this share of its labour left. */
  function twoOnAJob(state: GameState, price: number, left: number): GameState {
    const enquiry = placeEnquiry(state, { id: `enq-${price}`, price, deadlineDays: 40 });
    const next = acceptNow(state, enquiry.id);
    const job = next.jobs[next.jobs.length - 1];
    if (!job) throw new Error('a job is wanted');
    job.stage = 'inProduction';
    job.labourRemaining = job.labourValue * left;
    for (const id of ['staff-3', 'staff-4']) {
      const worker = testJoiner(id, `Joiner ${id}`, 9, 6);
      worker.jobId = job.id;
      next.workers.push(worker);
      job.assignees.push(id);
    }
    return next;
  }

  it('lets it be taken with two free and two on a job that is nearly made', () => {
    expect(BIG_JOB_SOON_DAYS).toBe(5);
    // A small job with a tenth of it left: off it well inside the five days.
    const state = twoOnAJob(shop(), 3000, 0.1);
    const enquiry = bigJob(state);
    expect(freeJoiners(state)).toHaveLength(2);
    expect(joinersFreeSoon(state).map((worker) => worker.id)).toEqual(['staff-3', 'staff-4']);
    expect(bigJobLine(state, enquiry)).toBe('Wants 4 joiners free: you have 2, and 2 more within 5 days');
    expect(canAccept(state, enquiry).ok).toBe(true);
  });

  it('refuses it while their job has weeks in it, and never counts a man on a contract', () => {
    // The same two on a job a hundred times the size, hardly started.
    const state = twoOnAJob(shop(), 300000, 1);
    const enquiry = bigJob(state);
    expect(joinersFreeSoon(state)).toEqual([]);
    expect(canAccept(state, enquiry)).toEqual({ ok: false, reason: 'Wants 4 joiners free: you have 2' });
    // A man on a standing contract is the contract's until it ends, and is not counted however
    // near its end is: a contract is nearly always renewed.
    const contract = drawContract(state);
    contract.pieceId = 'cutSheetPack';
    state.contracts.push(contract);
    expect(acceptContract(state, contract.id).ok).toBe(true);
    expect(assignContract(state, contract.id, 'staff-1', true).ok).toBe(true);
    contract.endDay = state.clock.day + 1;
    expect(freeJoiners(state).map((worker) => worker.id)).toEqual(['staff-2']);
    expect(joinersFreeSoon(state)).toEqual([]);
  });
});

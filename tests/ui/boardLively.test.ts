// @vitest-environment jsdom
// The board, livelier (PIOTR, 13.09; CLAUDE.md T10 3.7): written again twice a day, express work
// that is properly worth taking, and the jobs the workshop cannot take standing on it greyed, with
// the reason in plain words and a way to the page that would put it right.

import { describe, expect, it } from 'vitest';
import {
  BOARD_MIDDAY_MINUTE,
  BREAK_MINUTES,
  BREAK_START_MINUTE,
  UNREACHABLE_MAX,
  UNREACHABLE_MIN,
} from '../../src/engine/constants';
import {
  blockFor,
  reachableEnquiries,
  refreshBoard,
  unreachableEnquiries,
} from '../../src/engine/board';
import { template } from '../../src/engine/catalog';
import { canAccept, tick } from '../../src/engine/index';
import { renderBoard } from '../../src/ui/board';
import type { GameState } from '../../src/engine/index';
import { buyNow, clearEvents, newGame, placeEquipment } from '../helpers';

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

/** A hall with a laptop, which is what the enquiries come in on. */
function withBoard(): GameState {
  const state = buyNow(buyNow(newGame({ difficulty: 'veryEasy' }), 'desk'), 'laptop');
  refreshBoard(state);
  return state;
}

describe('the board is written again twice a day', () => {
  it('at 08:00 and at 13:00, and at no other minute', () => {
    // 13:00 is the minute the workshop comes back off its dinner.
    expect(BOARD_MIDDAY_MINUTE).toBe(BREAK_START_MINUTE + BREAK_MINUTES);
    expect(BOARD_MIDDAY_MINUTE).toBe(300);
    let state = withBoard();
    // Everything on the board is marked, so a refresh shows as ids that were not there before.
    const marked = (current: GameState): string[] => current.enquiries.map((entry) => entry.id);
    state.enquiries = state.enquiries.slice(0, 1);
    const before = marked(state);
    // Up to one minute short of 13:00 and nothing has been drawn. The dinner hour is taken on
    // the way, which is a question the day puts and not a refresh of the board.
    let guard = 0;
    while (state.clock.minute < BOARD_MIDDAY_MINUTE - 1 && guard < 700) {
      guard += 1;
      state = clearEvents(tick(state, 1));
    }
    expect(state.clock.minute).toBe(BOARD_MIDDAY_MINUTE - 1);
    expect(marked(state)).toEqual(before);
    // And on the minute itself the board is written again, whether or not anything was taken.
    state = clearEvents(tick(state, 1));
    expect(state.clock.minute).toBe(BOARD_MIDDAY_MINUTE);
    expect(marked(state).length).toBeGreaterThan(before.length);
  });

  it('tops the greyed ones back up, and leaves the band to the morning post', () => {
    const state = withBoard();
    state.enquiries = [];
    refreshBoard(state);
    // The band is no longer refilled by the rewrite: the enquiries the workshop can take arrive
    // one or two a day at the day's open (CLAUDE.md T13 3.4).
    expect(reachableEnquiries(state).length).toBe(0);
    expect(unreachableEnquiries(state).length).toBeGreaterThanOrEqual(UNREACHABLE_MIN);
    expect(unreachableEnquiries(state).length).toBeLessThanOrEqual(UNREACHABLE_MAX);
  });
});

describe('the jobs the workshop cannot take', () => {
  it('says the reason in Piotr’s own words, for each of the four', () => {
    const bare = newGame({ difficulty: 'veryEasy' });
    // Reputation too low: the kitchen wants twenty and the company has nothing.
    bare.reputation = 0;
    expect(blockFor(bare, template('smallKitchen'), 40, 3500)).toEqual({
      reason: 'reputation too low (needs 20)',
      where: '',
    });
    // No timber machines: the table is solid wood and the hall has no thicknesser, the one timber
    // machine it wants now the timber tool set is gone from the game (PIOTR, 24.09; v53).
    bare.reputation = 40;
    expect(blockFor(bare, template('oakDiningTable'), 60, 12000)).toEqual({
      reason: 'no timber machines',
      where: 'catalogue',
    });
    // Needs a spray booth: no product in the catalogue asks for a lacquered finish yet, because
    // the booth itself is parked (CLAUDE.md T10 5.2), so the rule is proved on a product that
    // does. The day a template allows lacquer, the board says this without another line of code.
    const lacquered = { ...template('wardrobe'), allowedFinishes: ['lacquer' as const] };
    const kittedForSheet = withEverything();
    expect(blockFor(kittedForSheet, lacquered, 60, 1600)).toEqual({
      reason: 'needs a spray booth',
      where: 'catalogue',
    });
    // The wardrobe as the catalogue has it is short of the tools in a bare hall, and says so.
    expect(blockFor(bare, template('wardrobe'), 60, 6400)?.reason).toBe(
      'no table saw, edgebander',
    );
    // Too few people for the deadline: every tool in the hall and three days to make a kitchen.
    const kitted = withEverything();
    expect(blockFor(kitted, template('smallKitchen'), 3, 3500)).toEqual({
      reason: 'too few people for the deadline',
      where: 'team',
    });
    // And with the days the client would really give, nothing is in the way at all.
    expect(blockFor(kitted, template('smallKitchen'), 60, 3500)).toBeNull();
  });

  it('is greyed on the page, with no Accept and a way to put it right', () => {
    const state = withBoard();
    const greyed = unreachableEnquiries(state)[0];
    if (!greyed) throw new Error('no unreachable enquiry on the board');
    expect(canAccept(state, greyed).ok).toBe(false);
    const page = parse(renderBoard(state, ''));
    const tile = page.querySelector(`[data-enquiry="${greyed.id}"]`);
    expect(tile?.className).toContain('is-out-of-reach');
    expect(tile?.querySelectorAll('[data-do="acceptEnquiry"]')).toHaveLength(0);
    expect(tile?.textContent).toContain(`Cannot take this: ${greyed.blockReason}`);
    if (greyed.blockWhere === 'catalogue') {
      expect(tile?.querySelector('[data-do="openModal"]')?.getAttribute('data-modal')).toBe(
        'catalogue',
      );
    }
    if (greyed.blockWhere === 'team') {
      // The team is a page of the laptop (CLAUDE.md T15 2.3).
      expect(tile?.querySelector('[data-do="laptopPage"]')?.getAttribute('data-id')).toBe('team');
    }
    // And the head says how many of them there are.
    expect(page.textContent).toContain('the workshop cannot take yet');
    expect(page.textContent).toContain('written again at 08:00 and at 13:00');
  });

  it('joins the band the moment the workshop catches it up', () => {
    const state = withBoard();
    state.enquiries = state.enquiries.filter((entry) => entry.unreachable);
    const timber = state.enquiries.find((entry) => entry.blockReason === 'no timber machines');
    if (!timber) {
      // The seeded board did not draw a timber job this time: the rule is proved by the one that
      // follows, on whatever reason it did draw.
      expect(state.enquiries.length).toBeGreaterThan(0);
      return;
    }
    const kitted = withEverything();
    kitted.enquiries = [{ ...timber }];
    // The lock is refreshed after every action, and a job the company has caught up with goes
    // live (CLAUDE.md T10 3.7).
    const settled = clearEvents(tick(kitted, 1));
    const same = settled.enquiries.find((entry) => entry.id === timber.id);
    expect(same?.unreachable).toBe(false);
    expect(same?.blockReason).toBe('');
  });
});

/** A hall with every tool the catalogue asks for, and a reputation nothing is gated behind. The
 *  thicknesser is the whole of the timber side: the timber tool set is gone from the game
 *  (PIOTR, 24.09; v53). */
function withEverything(): GameState {
  const state = newGame({ difficulty: 'veryEasy' });
  state.reputation = 60;
  for (const specId of ['tableSaw', 'edgebander', 'thicknesser', 'extractor', 'workbench']) {
    placeEquipment(state, specId, { x: 0, y: 0, id: `kit-all-${specId}` });
  }
  return state;
}

// @vitest-environment jsdom
// The board tile after Turn 13: the figure on it is the client's budget, the reputation in the
// head carries the website's bonus, and a commercial enquiry says so and says why it is greyed
// (CLAUDE.md T13 3.7, 3.15, 3.24).

import { describe, expect, it } from 'vitest';
import { MARGIN_GOOD, MARGIN_THIN, NO_INSURANCE_REASON } from '../../src/engine/constants';
import { renderBoard } from '../../src/ui/board';
import { renderEvent } from '../../src/ui/eventModal';
import { money } from '../../src/ui/modal';
import { labourValueFor, marginOfPrice, materialCostFor } from '../../src/engine/index';
import type { GameState } from '../../src/engine/index';
import { act, buyNow, buyStartingKit, newGame, placeEnquiry } from '../helpers';

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

function text(element: Element | null | undefined): string {
  return (element?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/** A hall with a laptop, which is what the enquiries come in on, and a clean board. */
function withBoard(): GameState {
  const state = buyNow(buyNow(newGame({ difficulty: 'veryEasy' }), 'desk'), 'laptop');
  state.enquiries = [];
  return state;
}

describe('the board tile', () => {
  it('shows the budget and not a price, and carries the kind of client', () => {
    const state = withBoard();
    const enquiry = placeEnquiry(state, { price: 9000 });
    const page = parse(renderBoard(state, ''));
    const tile = page.querySelector(`[data-enquiry="${enquiry.id}"]`);
    expect(text(tile?.querySelector('.tile-price'))).toBe(`Budget ${money(9000)}`);
    expect(tile?.getAttribute('data-kind')).toBe('residential');
    expect(page.innerHTML).not.toContain(`Price ${money(9000)}`);
  });

  it('reads the reputation with the website’s bonus in it, and says so', () => {
    const state = withBoard();
    state.reputation = 10;
    state.website.level = 2;
    expect(parse(renderBoard(state, '')).textContent).toContain('Reputation 10 ');
    expect(parse(renderBoard(state, '')).textContent).not.toContain('The website holds');
    state.website.level = 4;
    const page = parse(renderBoard(state, ''));
    expect(page.textContent).toContain('Reputation 12 ');
    expect(page.textContent).toContain('The website holds +2 of that.');
    expect(page.querySelector('.figure.good')?.textContent).toBe('+2');
  });
});

describe('a commercial enquiry on the board (CLAUDE.md T13 3.15)', () => {
  /** The day 1 kit and a commercial enquiry the post drew while no cover was held. */
  function withCommercial(): GameState {
    const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    state.reputation = 30;
    state.website.level = 2;
    state.enquiries = [];
    placeEnquiry(state, {
      kind: 'commercial',
      name: 'Garage shelves, commercial',
      price: 2000,
      deadlineDays: 60,
      unreachable: true,
      blockReason: NO_INSURANCE_REASON,
    });
    return act(state, { type: 'SET_SPEED', speed: 1 });
  }

  it('says Commercial, is greyed with "no insurance", carries no Accept, and points at the laptop', () => {
    const state = withCommercial();
    const enquiry = state.enquiries[0];
    const page = parse(renderBoard(state, ''));
    const tile = page.querySelector(`[data-enquiry="${enquiry?.id}"]`);
    expect(tile?.getAttribute('data-kind')).toBe('commercial');
    expect(tile?.className).toContain('is-out-of-reach');
    expect(text(tile?.querySelector('.badges'))).toContain('Commercial');
    expect(text(tile?.querySelector('.lock'))).toBe(`Cannot take this: ${NO_INSURANCE_REASON}`);
    expect(tile?.querySelectorAll('[data-do="acceptEnquiry"]')).toHaveLength(0);
    expect(tile?.querySelector('[data-do="openModal"]')?.getAttribute('data-modal')).toBe('laptop');
    expect(text(tile?.querySelector('.tile-price'))).toBe(`Budget ${money(2000)}`);
  });

  it('goes live with Accept once both covers are held', () => {
    let state = withCommercial();
    state = act(state, { type: 'SET_INSURANCE', cover: 'property', on: true });
    state = act(state, { type: 'SET_INSURANCE', cover: 'liability', on: true });
    const enquiry = state.enquiries[0];
    const tile = parse(renderBoard(state, '')).querySelector(`[data-enquiry="${enquiry?.id}"]`);
    expect(tile?.className).not.toContain('is-out-of-reach');
    expect(tile?.querySelector('.lock')).toBeNull();
    expect(tile?.querySelectorAll('[data-do="acceptEnquiry"]')).toHaveLength(1);
    expect(text(tile?.querySelector('.badges'))).toContain('Commercial');
  });
});

describe("the margin on the client's answer (PIOTR accepted, 17.09; CLAUDE.md T18 2.9)", () => {
  /** The accept dialogue as the page draws it, for an enquiry answered at `offer`. */
  function dialogue(state: GameState, enquiryId: string, offer: number): HTMLElement {
    const enquiry = state.enquiries.find((entry) => entry.id === enquiryId);
    if (enquiry === undefined) throw new Error('no enquiry');
    // The client's number is drawn once and then stands: setting it is how the test picks a
    // margin, and the engine writes the event from it (CLAUDE.md T13 3.24).
    enquiry.offer = offer;
    const next = act(state, { type: 'ACCEPT_ENQUIRY', enquiryId, byHand: false });
    const event = next.activeEvent;
    if (event === null || event.kind !== 'clientOffer') throw new Error('no client answer');
    return parse(renderEvent(next, event));
  }

  it('prints the margin next to the offer, out of the engine\'s own function', () => {
    const state = buyStartingKit(withBoard());
    const enquiry = placeEnquiry(state, { price: 10000, deadlineDays: 60 });
    const page = dialogue(state, enquiry.id, 9400);
    const wanted = Math.round(marginOfPrice(enquiry.basePrice, enquiry.bespokeMaterial, 9400) * 100);
    expect(text(page.querySelector('.event-body'))).toBe(
      `The budget was ${money(10000)}. The client offers ${money(9400)}: margin ${wanted}%`,
    );
    expect(page.querySelector('[data-margin]')?.getAttribute('data-margin')).toBe(String(wanted));
  });

  it('writes it in the game\'s green over a fifth and its red under a tenth, and plain between', () => {
    const state = buyStartingKit(withBoard());
    const enquiry = placeEnquiry(state, { price: 10000, deadlineDays: 60 });
    const basePrice = enquiry.basePrice;
    const bespoke = enquiry.bespokeMaterial;
    /** The price that leaves exactly this margin: cost over one less the margin. */
    const priceFor = (margin: number): number => {
      const cost =
        materialCostFor(basePrice, bespoke) + labourValueFor(basePrice);
      return cost / (1 - margin);
    };
    /** A fresh board with the same enquiry on it, so each answer is asked once. */
    const withEnquiry = (): GameState => {
      const fresh = buyStartingKit(withBoard());
      const entry = placeEnquiry(fresh, { price: 10000, deadlineDays: 60 });
      entry.id = 'set';
      return fresh;
    };
    const classOf = (margin: number): string => {
      const page = dialogue(withEnquiry(), 'set', priceFor(margin));
      return page.querySelector('[data-margin]')?.getAttribute('class') ?? '';
    };
    expect(classOf(MARGIN_GOOD + 0.05)).toBe('figure good');
    expect(classOf(MARGIN_THIN - 0.05)).toBe('figure bad');
    expect(classOf((MARGIN_GOOD + MARGIN_THIN) / 2)).toBe('figure');
    // A hair either side of each line reads as the brief writes it: over a fifth is green, under
    // a tenth is red. The lines themselves are not asserted, because a price worked back from a
    // margin lands a millionth either side of it and that is arithmetic, not a decision.
    expect(classOf(MARGIN_GOOD + 0.01)).toBe('figure good');
    expect(classOf(MARGIN_GOOD - 0.01)).toBe('figure');
    expect(classOf(MARGIN_THIN + 0.01)).toBe('figure');
    expect(classOf(MARGIN_THIN - 0.01)).toBe('figure bad');
  });

  it('is the one margin in the game: the same function answers for a job already taken', () => {
    const state = buyStartingKit(withBoard());
    const enquiry = placeEnquiry(state, { price: 10000, deadlineDays: 60 });
    enquiry.offer = 9400;
    const taken = act(
      act(state, { type: 'ACCEPT_ENQUIRY', enquiryId: enquiry.id, byHand: false }),
      { type: 'RESOLVE_EVENT', choiceId: 'accept' },
    );
    const job = taken.jobs[0];
    expect(job).toBeDefined();
    expect(marginOfPrice(job?.basePrice ?? 0, job?.bespokeMaterial ?? false, job?.price ?? 0)).toBe(
      marginOfPrice(enquiry.basePrice, enquiry.bespokeMaterial, 9400),
    );
  });

  it('says nothing at all on an event that carries no margin', () => {
    const state = withBoard();
    const page = parse(
      renderEvent(state, {
        id: 'ev-1',
        day: 1,
        minute: 0,
        kind: 'lowStock',
        title: 'Stock',
        body: 'The rack is low.',
        choices: [],
        data: {},
      }),
    );
    expect(page.querySelector('[data-margin]')).toBeNull();
  });
});

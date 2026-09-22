// @vitest-environment jsdom
// The Contracts tab of the Work Plan (PIOTR, the mockup of docs/mockups/t20/contracts-tab.html;
// CLAUDE.md T20 2.1): the offer costed for the man who would do it, his day as blocks, the running
// contract with the whole of his day on it, and the ended one greyed. From v42 the client's
// quantity is the least he takes and not the most, so the card's week is what the man can make.

import { beforeAll, describe, expect, it } from 'vitest';
import {
  BREAK_MINUTES,
  DAY_END_MINUTE,
  JOINER_MONTHLY_WAGE,
  MINUTES_PER_WORKING_DAY,
  WORKER_RATES,
} from '../../src/engine/constants';
import {
  acceptContract,
  assignContract,
  contractPiece,
  contractPriceFor,
  contractMenNeeded,
  contractResultFor,
  drawContract,
  endContract,
} from '../../src/engine/contracts';
import { renderWorkPlan } from '../../src/ui/workPlan';
import { advanceMinutes, currentState, mount, render } from '../../src/ui/app';
import { money, signedMoney } from '../../src/ui/modal';
import type { Contract, GameState, Worker } from '../../src/engine/index';
import {
  acceptNow,
  buyStartingKit,
  fillRack,
  newGame,
  placeEnquiry,
  placeEquipment,
  withAir,
  withExtraction,
} from '../helpers';

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

function joiner(id: string, name: string, tier: 'novice' | 'experienced' | 'senior'): Worker {
  return {
    id,
    name,
    role: 'joiner',
    tier,
    rate: WORKER_RATES[tier],
    monthlyWage: JOINER_MONTHLY_WAGE[tier],
    leavesOnDay: null,
    startDay: 1,
    jobId: null,
    taskId: null,
    minutesWorked: 0,
    ordersToday: 0,
    overtimeMinutes: 0,
    overtimeMinutesWeek: 0,
    overtimeDays: 0,
    tiredOfOvertime: false,
    station: 'idle',
    productionMinutes: 0,
    absentDaysRemaining: 0,
    shift: 'day',
    dayLog: [],
    monthMinutes: 0,
    monthDaysOff: 0,
    idleMinutes: 0,
    idleByReason: { waitingForBoss: 0, noMachine: 0, noMaterial: 0 },
    accidents: 0,
    anchorX: 6,
    anchorY: 6,
  };
}

/** The day 1 kit, the air and the fan, sheets on the rack and two joiners on the books. */
function hall(): GameState {
  const state = withAir(
    withExtraction(fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 60)),
  );
  placeEquipment(state, 'workbench', { variantId: 'budget', x: 6, y: 6 });
  state.enquiries = [];
  state.workers.push(joiner('staff-1', 'Ben', 'experienced'), joiner('staff-2', 'Ravi', 'senior'));
  state.clock.minute = 60;
  return state;
}

/** An offer for cut sheet packs on the board, whatever the stream drew. */
function offered(state: GameState, quantityPerWeek = 40): Contract {
  const contract = drawContract(state);
  contract.pieceId = 'cutSheetPack';
  contract.name = 'Cut sheet packs for a shop';
  contract.pricePerPiece = contractPriceFor(contractPiece(contract));
  contract.quantityPerWeek = quantityPerWeek;
  state.contracts.push(contract);
  return contract;
}

function tab(state: GameState, assignOpen: string | null = null, man: string | null = null): HTMLElement {
  return parse(renderWorkPlan(state, 'contracts', assignOpen, man));
}

describe('On offer, costed for the man who would do it (CLAUDE.md T20 2.1.1)', () => {
  it('draws a card an offer with the piece, the men who would do it and the first joiner picked', () => {
    const state = hall();
    const contract = offered(state);
    const card = tab(state).querySelector(`.contract-offer[data-contract="${contract.id}"]`);
    expect(card).not.toBeNull();
    expect(card?.querySelector('h3')?.textContent).toBe(contract.name);
    expect(card?.querySelector('.figures')?.textContent).toContain(
      `40 a week, 13 weeks, ${money(contract.pricePerPiece)} a piece, 45 min a piece by hand`,
    );
    // The owner and both joiners are offered, and the first joiner is the one it is worked out for.
    const chips = Array.from(card?.querySelectorAll('[data-do="pickContractMan"]') ?? []);
    expect(chips.map((chip) => chip.getAttribute('data-worker'))).toEqual(['owner', 'staff-1', 'staff-2']);
    expect(chips.map((chip) => chip.className)).toEqual(['chip', 'chip is-on', 'chip']);
    // His tier is in the game's words and his minutes are his own.
    const ben = contractResultFor(state, contract, state.workers[0] as Worker);
    expect(chips[1]?.textContent).toBe(`Benexperienced joiner, ${ben.minutes} min a piece`);
  });

  it('works every figure on the card out for the man who is picked', () => {
    const state = hall();
    const contract = offered(state);
    const ravi = state.workers[1] as Worker;
    const result = contractResultFor(state, contract, ravi);
    const card = tab(state, null, 'staff-2').querySelector('.contract-offer');
    const figures = Array.from(card?.querySelectorAll('.row-figure') ?? []).map(
      (figure) => figure.textContent,
    );
    expect(figures).toContain(money(contract.pricePerPiece));
    expect(figures).not.toContain(signedMoney(contract.pricePerPiece));
    expect(figures).toContain(`-${money(result.material)}`);
    expect(figures).toContain(`-${money(result.labourCost)}`);
    expect(figures).toContain(signedMoney(result.margin));
    expect(figures).toContain(
      `${result.piecesPerDay}, the client asks ${result.piecesNeededPerDay} at the least`,
    );
    expect(figures).toContain(signedMoney(result.weekResult));
    expect(figures).toContain(signedMoney(result.termResult));
    expect(card?.textContent).toContain(`Ravi's labour a piece`);
    // And the button takes it with him on it, in one click.
    const take = card?.querySelector('[data-do="takeContract"]');
    expect(take?.getAttribute('data-worker')).toBe('staff-2');
    expect(take?.textContent).toBe('Take it, Ravi on it');
    expect(card?.querySelector('[data-do="declineContract"]')?.getAttribute('data-id')).toBe(contract.id);
  });

  it('draws his day as one block a piece, the lunch block and the free time at the end', () => {
    const state = hall();
    const contract = offered(state);
    const result = contractResultFor(state, contract, state.workers[0] as Worker);
    const card = tab(state).querySelector('.contract-offer');
    const day = card?.querySelector('.contract-day');
    const blocks = Array.from(day?.querySelectorAll('.contract-day-block') ?? []);
    const pieces = blocks.filter((block) => block.className === 'contract-day-block');
    // One block a piece, and the count is the pieces he makes in a day.
    expect(pieces).toHaveLength(result.piecesPerDay);
    expect(pieces.map((block) => block.textContent)).toEqual(
      pieces.map((_block, at) => String(at + 1)),
    );
    expect(day?.querySelectorAll('.contract-day-block.is-lunch')).toHaveLength(1);
    expect(day?.textContent).toContain(`${result.freeMinutes} min into the next`);
    // The blocks are laid across the working day and the last of them ends at 17:00.
    const free = day?.querySelector('.contract-day-block.is-free');
    expect(free?.getAttribute('style')).toContain('width:');
    expect(day?.querySelector('.contract-day-ticks')?.textContent).toBe('08:0010:0012:0014:0017:00');
    // The lunch is a whole hour of the day.
    const lunch = day?.querySelector('.contract-day-block.is-lunch')?.getAttribute('style') ?? '';
    expect(lunch).toContain(`width:${Math.round((BREAK_MINUTES / DAY_END_MINUTE) * 10000) / 100}%`);
  });

  it('draws the next best man beside him for comparison, and names the machine that would help', () => {
    const state = hall();
    offered(state, 80);
    const days = tab(state).querySelectorAll('.contract-day');
    expect(days).toHaveLength(2);
    expect(days[1]?.textContent).toContain('for comparison');
    // The hall has a saw and no CNC, so the CNC is the machine that would shorten the piece most.
    const tip = tab(state).querySelector('.contract-tip')?.textContent ?? '';
    expect(tip).toContain('A CNC would take the piece to');
    expect(tip).toMatch(/\+£[0-9,]+ a week/);
    // The same tip, to the pound, on a smaller order: what a machine gains no longer depends on
    // how many the client asked for, because he takes every piece that is made (PIOTR, 21.09;
    // v42). Until tonight the week was capped at the order, so at forty a week the card said a
    // CNC gained nothing and the tip went silent.
    const smaller = hall();
    offered(smaller, 40);
    expect(tab(smaller).querySelector('.contract-tip')?.textContent).toBe(tip);
  });

  it('costs the owner as well, and says on his own row that he cannot be put on it', () => {
    const state = hall();
    const contract = offered(state);
    const card = tab(state, null, 'owner').querySelector('.contract-offer');
    expect(card?.textContent).toContain('Your labour a piece');
    // The take button still does what it says: it takes the contract, and the reason is beside it.
    const take = card?.querySelector('[data-do="acceptContract"]');
    expect(take?.textContent).toBe('Take it');
    expect(take?.getAttribute('data-id')).toBe(contract.id);
    expect(card?.querySelector('[data-do="takeContract"]')).toBeNull();
    expect(card?.querySelector('.reason')?.textContent).toBe(
      'A contract is work for a joiner: you cannot be put on one',
    );
  });
});

describe("Running, and the whole day that goes to it (PIOTR, 21.09; v42)", () => {
  it('shows the week live, the result so far, and a day track of nothing but pieces', () => {
    let state = hall();
    const contract = offered(state, 5);
    acceptContract(state, contract.id);
    // A job of work under him first: going on the contract takes him off it, so the day track has
    // no job block to draw any more (PIOTR, 21.09).
    const enquiry = placeEnquiry(state, { price: 6000, deadlineDays: 40 });
    state = acceptNow(state, enquiry.id);
    const job = state.jobs[0];
    if (!job) throw new Error('a job is wanted');
    job.stage = 'inProduction';
    job.assignees = ['staff-1'];
    assignContract(state, contract.id, 'staff-1', true);
    expect(job.assignees).toEqual([]);
    const running = tab(state).querySelector('.contract-bar');
    expect(running?.textContent).toContain('0 of 5, on course');
    expect(running?.textContent).toContain('Margin a piece with the men on it');
    expect(running?.textContent).toContain('Delivered in full');
    // His day is the contract's from 8:00 to 17:00: one block a piece, every piece he can make,
    // and not the one piece the old daily line stopped him at.
    const day = running?.querySelector('.contract-day');
    expect(day?.querySelector('.contract-day-block.is-job')).toBeNull();
    const pieces = Array.from(day?.querySelectorAll('.contract-day-block') ?? []).filter(
      (block) => block.className === 'contract-day-block',
    );
    const result = contractResultFor(state, contract, state.workers[0] as Worker);
    expect(pieces).toHaveLength(result.piecesPerDay);
    expect(result.piecesPerDay).toBeGreaterThan(1);
    expect(day?.textContent).toContain(`${result.freeMinutes} min into the next`);
    expect(MINUTES_PER_WORKING_DAY).toBeGreaterThan(result.piecesPerDay * result.minutes - 1);
  });

  it('says how many men the contract is for when one cannot make the client s day (PIOTR, 22.09; v51)', () => {
    // Piotr's day 115: Dave alone made eleven packs a day of a contract that wanted fourteen, and
    // nothing on the card said the contract was two men's work. "So the hint is: this contract is
    // for two men at the least."
    const state = hall();
    const ben = state.workers[0] as Worker;
    const one = contractResultFor(state, offered(state, 5), ben);
    state.contracts = [];
    // A week that wants more than one Ben makes: the offer card and the running card both say it.
    const heavy = offered(state, one.piecesPerDay * 5 + 5);
    const needed = contractMenNeeded(state, heavy, ben);
    expect(needed).toBe(2);
    const offer = tab(state).querySelector('.contract-offer');
    expect(offer?.querySelector('.contract-hands')?.textContent).toBe('This contract is for 2 men at the least.');
    acceptContract(state, heavy.id);
    assignContract(state, heavy.id, 'staff-1', true);
    const running = tab(state).querySelector('.contract-bar');
    expect(running?.querySelector('.contract-hands')?.textContent).toBe(
      'This contract is for 2 men at the least, 1 man on it.',
    );
    // With the second man on it the hint goes.
    assignContract(state, heavy.id, 'staff-2', true);
    expect(tab(state).querySelector('.contract-bar .contract-hands')).toBeNull();
    // And a week one man makes has no hint at all.
    state.contracts = [];
    offered(state, 5);
    expect(tab(state).querySelector('.contract-offer .contract-hands')).toBeNull();
  });

  it('says the week is short when the pace will not reach it, and offers the way out', () => {
    const state = hall();
    const contract = offered(state, 60);
    acceptContract(state, contract.id);
    state.clock.day = 5;
    const running = tab(state).querySelector('.contract-bar');
    // Friday, nobody on it and nothing made: the week cannot be reached.
    const week = Array.from(running?.querySelectorAll('.row') ?? []).find((row) =>
      row.textContent?.startsWith('This week'),
    );
    expect(week?.querySelector('.row-figure')?.textContent).toBe('0 of 60, short');
    expect(week?.querySelector('.row-figure')?.className).toContain('bad');
    // Inside the first month the way out is locked, with the reason on it.
    expect(running?.querySelector('[data-do="endContract"]')).toBeNull();
    expect(running?.textContent).toContain('End the contract');
  });
});

describe('Ended, greyed (CLAUDE.md T20 2.1.3)', () => {
  it('shows the closing report as the engine gives it', () => {
    const state = hall();
    const contract = offered(state, 60);
    acceptContract(state, contract.id);
    contract.piecesMade = 60;
    contract.revenue = 3000;
    contract.materialCost = 1800;
    contract.labourMinutes = 600;
    contract.piecesThisWeek = 60;
    contract.endDay = 7;
    state.clock.day = 8;
    endContract(state, contract);
    const ended = tab(state).querySelector(`.contract-ended[data-contract="${contract.id}"]`);
    expect(ended?.className).toContain('dim');
    expect(ended?.textContent).toContain('the term is over');
    const figures = Array.from(ended?.querySelectorAll('.row-figure') ?? []).map(
      (figure) => figure.textContent,
    );
    expect(figures).toContain('60');
    expect(figures).toContain('+£3,000');
    expect(figures).toContain('-£1,800');
  });
});

describe('the one click that takes the contract (CLAUDE.md T20 2.1.1)', () => {
  function root(): HTMLElement {
    const element = document.querySelector('#app');
    if (!(element instanceof HTMLElement)) throw new Error('no root');
    return element;
  }

  function game(): GameState {
    const state = currentState();
    if (state === null) throw new Error('no game');
    return state;
  }

  function click(selector: string): void {
    const element = root().querySelector(selector);
    if (element === null) throw new Error(`nothing to click: ${selector}`);
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }

  beforeAll(() => {
    document.body.innerHTML = '<div id="app"></div>';
    mount(root());
    click('[data-do="startGame"]');
    const state = hall();
    offered(state);
    Object.assign(game(), state);
    // The clock is stopped for this one: the Work Plan is read on a stopped clock anyway
    // (CLAUDE.md T7 3.10), and a frame loop running behind a test is a day going by under it.
    game().speed = 0;
    render();
  });

  it('works the card out for the man the player picks, through the real DOM', () => {
    // The route sets `ui.contractMan` and the modal body has to be given it: without that fifth
    // argument the chips move and the card keeps the first man's figures (REPORT-T20.md, B1's notes
    // applied in T20-C1).
    const toOffice = root().querySelector('[data-do="setView"][data-view="office"]');
    if (toOffice !== null) toOffice.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    click('[data-office="workPlan"]');
    click('[data-do="workPlanTab"][data-id="contracts"]');
    const state = game();
    const contract = state.contracts[0] as Contract;
    const ben = contractResultFor(state, contract, state.workers[0] as Worker);
    const ravi = contractResultFor(state, contract, state.workers[1] as Worker);
    // The two men are not the same man: the card has something to change.
    expect(ravi.minutes).not.toBe(ben.minutes);
    expect(ravi.margin).not.toBe(ben.margin);
    const first = root().querySelector('[data-do="takeContract"]');
    expect(first?.getAttribute('data-worker')).toBe('staff-1');
    expect(first?.textContent).toBe('Take it, Ben on it');
    expect(root().querySelector('.contract-offer')?.textContent).toContain(`Ben's labour a piece`);
    click('[data-do="pickContractMan"][data-worker="staff-2"]');
    const second = root().querySelector('[data-do="takeContract"]');
    expect(second?.getAttribute('data-worker')).toBe('staff-2');
    expect(second?.textContent).toBe('Take it, Ravi on it');
    // And the figures moved with him, not only his name.
    const card = root().querySelector('.contract-offer');
    expect(card?.textContent).toContain(`Ravi's labour a piece`);
    const figures = Array.from(card?.querySelectorAll('.row-figure') ?? []).map(
      (figure) => figure.textContent,
    );
    expect(figures).toContain(signedMoney(ravi.margin));
    expect(figures).not.toContain(signedMoney(ben.margin));
    expect(figures).toContain(signedMoney(ravi.weekResult));
    const day = card?.querySelector('.contract-day');
    expect(day?.querySelectorAll('.contract-day-block:not(.is-lunch):not(.is-free)')).toHaveLength(
      ravi.piecesPerDay,
    );
    // Back to Ben, so the click that takes the contract below starts where the card does.
    click('[data-do="pickContractMan"][data-worker="staff-1"]');
    expect(root().querySelector('[data-do="takeContract"]')?.getAttribute('data-worker')).toBe(
      'staff-1',
    );
  });

  it('will not take the contract for a man the engine refuses, and says why', () => {
    // The owner is costed on the card and cannot stand at a contract (REPORT-T20.md 0.6), so the tab
    // draws him the plain `acceptContract` button and never this one. The route is shut all the
    // same, so that a button written in a later turn cannot take the offer and leave it with
    // nobody on it (REPORT-T20.md, B1's notes applied in T20-C1). Nothing on screen dispatches this,
    // so the test makes the
    // click itself.
    click('[data-do="pickContractMan"][data-worker="owner"]');
    expect(root().querySelector('[data-do="takeContract"]')).toBeNull();
    expect(root().querySelector('[data-do="acceptContract"]')?.textContent).toBe('Take it');
    const contract = game().contracts[0] as Contract;
    expect(contract.status).toBe('offered');
    const button = document.createElement('button');
    button.dataset.do = 'takeContract';
    button.dataset.id = contract.id;
    button.dataset.worker = 'owner';
    root().appendChild(button);
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(game().contracts[0]?.status).toBe('offered');
    expect(game().contracts[0]?.assigned).toEqual([]);
    expect(root().querySelector('.toast')?.textContent).toBe(
      'A contract is work for a joiner: you cannot be put on one',
    );
    click('[data-do="pickContractMan"][data-worker="staff-1"]');
  });

  it('accepts the offer and puts the man on it, in one click, and the list has the cross', () => {
    expect(root().querySelector('.contract-offer')).not.toBeNull();
    const before = game().contracts[0];
    expect(before?.status).toBe('offered');
    click('[data-do="takeContract"]');
    advanceMinutes(1);
    const after = game().contracts[0];
    expect(after?.status).toBe('active');
    expect(after?.assigned).toEqual(['staff-1']);
    // And the list Running opens carries the one cross every popover has.
    click('[data-do="openAssign"]');
    const list = root().querySelector('.assign-list[data-popover="assign-contract"]');
    expect(list).not.toBeNull();
    expect(list?.querySelectorAll('.modal-close')).toHaveLength(1);
  });
});

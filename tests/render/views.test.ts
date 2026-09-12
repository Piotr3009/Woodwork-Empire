import { describe, expect, it } from 'vitest';
import { renderHall } from '../../src/render/hall';
import { renderOffice } from '../../src/render/office';
import { renderGameOver } from '../../src/ui/dayEnd';
import { tick } from '../../src/engine/index';
import { act, buyStartingKit, clearEvents, firstJob, newGame, placeEnquiry, runToDay } from '../helpers';

describe('the hall on day 1', () => {
  it('draws the three rooms, the floor and the rack, and nothing that was not bought', () => {
    const svg = renderHall(newGame());
    expect(svg).toContain('data-room="office"');
    expect(svg).toContain('data-room="wc"');
    expect(svg).toContain('data-room="canteen"');
    expect(svg).toContain('Office');
    expect(svg).toContain('WC');
    expect(svg).toContain('Canteen');
    expect(svg).toContain('data-rack="1"');
    expect(svg).toContain('0 / 12');
    expect(svg).not.toContain('Table saw');
    expect(svg).not.toContain('Extractor');
    expect(svg).not.toContain('data-kit=');
    expect(svg).not.toContain('data-van=');
  });

  it('draws what has been bought, and leaves the office furniture in the office', () => {
    const svg = renderHall(buyStartingKit(newGame()));
    expect(svg).toContain('Table saw');
    expect(svg).toContain('Hand edgebander');
    expect(svg).toContain('Extractor');
    expect(svg).toContain('Workbench');
    // The desk, the chair and the laptop belong to the office view.
    expect(svg).not.toContain('>Desk<');
    expect(svg).not.toContain('>Laptop<');
  });

  it('is a valid single svg with a view box', () => {
    const svg = renderHall(newGame());
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg.match(/<svg/g)).toHaveLength(1);
    expect(svg).toMatch(/viewBox="-?\d+ -?\d+ \d+ \d+"/);
    expect(svg).toContain('</svg>');
  });

  it('says how dirty the hall is, and never with a side panel of numbers', () => {
    const clean = renderHall(newGame());
    expect(clean).toContain('Hall: clean');
    const dirty = newGame();
    dirty.dust = 75;
    expect(renderHall(dirty)).toContain('Hall: dirty');
    expect(renderHall(dirty)).not.toContain('75');
  });

  it('grows a sawdust pile for every ten points of dust', () => {
    const state = newGame();
    expect(renderHall(state).match(/<ellipse[^>]*sawdust/g)).toBeNull();
    state.dust = 42;
    expect(renderHall(state).match(/var\(--sawdust\)/g)).toHaveLength(4);
    state.dust = 100;
    expect(renderHall(state).match(/var\(--sawdust\)/g)).toHaveLength(10);
  });

  it('turns the extractor red and says so when it has stopped', () => {
    const state = buyStartingKit(newGame());
    const extractor = state.equipment.find((item) => item.specId === 'extractor');
    if (extractor) extractor.broken = true;
    const svg = renderHall(state);
    expect(svg).toContain('var(--stopped)');
    expect(svg).toContain('the extractor is broken');
  });

  it('marks a machine whose bag is full', () => {
    const state = buyStartingKit(newGame());
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    if (saw) saw.bagFull = true;
    expect(renderHall(state)).toContain('Table saw (bag full)');
  });

  it('puts a van at the gate while a delivery waits', () => {
    let state = buyStartingKit(newGame());
    state.enquiries = [];
    const enquiry = placeEnquiry(state, { price: 400 });
    state = act(state, { type: 'ACCEPT_ENQUIRY', enquiryId: enquiry.id, byHand: false });
    state.deliveries.push({
      id: 'del-1',
      jobId: firstJob(state).id,
      sheets: 4,
      arriveDay: 1,
      arrived: true,
      unloaded: false,
      bespoke: false,
      overflowSheets: 0,
      overflowResolved: true,
    });
    const svg = renderHall(state);
    expect(svg).toContain('data-van="del-1"');
    expect(svg).toContain('Delivery: 4 sheets');
  });

  it('shows the owner, and the crew with their names', () => {
    let state = buyStartingKit(newGame());
    expect(renderHall(state)).toContain('data-owner="1"');
    expect(renderHall(state)).toContain('Piotr');
    state.workers.push({
      id: 'staff-1',
      name: 'Ben',
      role: 'joiner',
      tier: 'poor',
      rate: 0.6,
      weeklyWage: 480,
      monthlyWage: 0,
      startDay: 1,
      jobId: null,
      taskId: null,
      absentDaysRemaining: 0,
      anchorX: 4,
      anchorY: 4,
    });
    expect(renderHall(state)).toContain('data-worker="staff-1"');
    expect(renderHall(state)).toContain('Ben');
    const ben = state.workers[0];
    if (ben) ben.absentDaysRemaining = 2;
    expect(renderHall(state)).toContain('Ben (off)');
    state = act(state, { type: 'SKIP_DAY' });
    expect(renderHall(state)).not.toContain('data-owner="1"');
    expect(renderHall(state)).toContain('The owner is not in today');
  });

  it('keeps the bigger unit bigger', () => {
    const easy = renderHall(newGame());
    const veryEasy = renderHall(newGame({ difficulty: 'veryEasy' }));
    expect(veryEasy).toContain('0 / 20');
    const easyBox = easy.match(/viewBox="(-?\d+) (-?\d+) (\d+) (\d+)"/);
    const bigBox = veryEasy.match(/viewBox="(-?\d+) (-?\d+) (\d+) (\d+)"/);
    expect(Number(bigBox?.[3] ?? 0)).toBeGreaterThan(Number(easyBox?.[3] ?? 0));
  });

  it('does not change when nothing in the state changed', () => {
    const state = runToDay(buyStartingKit(newGame()), 3).state;
    expect(renderHall(state)).toBe(renderHall(state));
    expect(renderHall(clearEvents(tick(state, 0)))).toBe(renderHall(state));
  });
});

describe('the office', () => {
  it('offers the catalogue from the first minute, and locks what needs buying', () => {
    const svg = renderOffice(newGame());
    expect(svg).toContain('data-office="catalogue"');
    expect(svg).toContain('data-office="hiring"');
    expect(svg).toContain('data-office="phone"');
    expect(svg).toContain('data-office="materials"');
    expect(svg).toContain('Laptop: Buy a laptop');
    expect(svg).toContain('Accounting: Buy a laptop');
    expect(svg).toContain('Desk: Buy a desk');
    expect(svg).toContain('var(--locked)');
  });

  it('unlocks the laptop and the accounting folder once they are there', () => {
    const svg = renderOffice(buyStartingKit(newGame()));
    expect(svg).toContain('>Laptop<');
    expect(svg).toContain('>Accounting<');
    expect(svg).not.toContain('Buy a laptop');
    expect(svg).not.toContain('var(--locked)');
  });

  it('is one svg with a view box', () => {
    const svg = renderOffice(newGame());
    expect(svg.match(/<svg/g)).toHaveLength(1);
    expect(svg).toMatch(/viewBox="/);
  });
});

describe('the game over screen', () => {
  it('says what happened, how long the company lasted, and offers a fresh start', () => {
    const state = newGame();
    state.gameOver = { reason: 'Three months of arrears and nothing left to seize.', day: 97 };
    state.reputation = 1.25;
    const html = renderGameOver(state);
    expect(html).toContain('Three months of arrears');
    expect(html).toContain('97 days');
    expect(html).toContain('1.25');
    expect(html).toContain('data-do="restart"');
  });
});

describe('the warnings on the hall line', () => {
  it('warns that somebody will get hurt from the dirty band on, as 9.7 asks', () => {
    const state = newGame();
    state.dust = 50;
    expect(renderHall(state)).not.toContain('get hurt');
    state.dust = 75;
    expect(renderHall(state)).toContain('Hall: dirty, somebody will get hurt');
    state.dust = 95;
    expect(renderHall(state)).toContain('Hall: dangerous, somebody will get hurt');
  });
});

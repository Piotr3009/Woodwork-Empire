import { describe, expect, it } from 'vitest';
import { footprintIn, hallProblems, renderHall, stationCell } from '../../src/render/hall';
import { renderOffice } from '../../src/render/office';
import { renderGameOver } from '../../src/ui/dayEnd';
import { renderLaptop } from '../../src/ui/laptop';
import { FINISHED_GOODS_LAYOUT } from '../../src/engine/constants';
import { centreOf } from '../../src/render/iso';
import type { GameState } from '../../src/engine/index';
import { tick } from '../../src/engine/index';
import {
  acceptNow,
  act,
  buyStartingKit,
  clearEvents,
  fillBags,
  firstJob,
  newGame,
  placeEnquiry,
  runToDay,
} from '../helpers';

describe('the hall on day 1', () => {
  it('draws the three rooms and the floor, and nothing that was not bought', () => {
    const svg = renderHall(newGame());
    expect(svg).toContain('data-room="office"');
    expect(svg).toContain('data-room="wc"');
    expect(svg).toContain('data-room="canteen"');
    expect(svg).toContain('Office');
    expect(svg).toContain('WC');
    expect(svg).toContain('Canteen');
    // The rack is bought from the catalogue now, so on day 1 there is none.
    expect(svg).not.toContain('data-rack="1"');
    expect(svg).not.toContain('Table saw');
    expect(svg).not.toContain('Extractor');
    expect(svg).not.toContain('data-kit=');
    expect(svg).not.toContain('data-van=');
  });

  it('draws the shelving with what is on it once it has been bought', () => {
    const state = buyStartingKit(newGame());
    state.stock.sheets = 12;
    const svg = renderHall(state);
    expect(svg).toContain('data-rack="1"');
    expect(svg).toContain('Sheet rack: 12 / 50');
  });

  it('draws what has been bought, and leaves the office furniture in the office', () => {
    const svg = renderHall(buyStartingKit(newGame()));
    expect(svg).toContain('Table saw');
    // The hand edgebander is in a tool cabinet now, so the hall never draws it (T6 3.5).
    expect(svg).not.toContain('Hand edgebander');
    expect(svg).toContain('Extractor');
    expect(svg).toContain('Workbench');
    // The desk, the chair and the laptop belong to the office view.
    expect(svg).not.toContain('>Desk<');
    expect(svg).not.toContain('>Laptop<');
  });

  it('is a valid single svg with a view box', () => {
    // A figure drawn from a sheet clips its cell inside a nested svg (T9 3.13); the hall as
    // delivered before any art is the one root svg, so the test draws it without files.
    const svg = renderHall(newGame(), { files: [], characters: {} });
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg.match(/<svg/g)).toHaveLength(1);
    expect(svg).toMatch(/viewBox="-?\d+ -?\d+ \d+ \d+"/);
    expect(svg).toContain('</svg>');
  });

  it('says how dirty the hall is on a chip, and never with a side panel of numbers', () => {
    // A clean hall has nothing to say about itself at all (CLAUDE.md T17 2.5).
    expect(hallProblems(newGame()).filter((problem) => problem.kind === 'dirty')).toEqual([]);
    const dirty = newGame();
    dirty.dust = 75;
    expect(hallProblems(dirty)[0]?.text).toContain('The hall is dirty');
    const drawn = renderHall(dirty, { files: [], characters: {} });
    expect(drawn).not.toContain('75');
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
    // The red box is the placeholder's; with a sprite delivered the picture carries the state
    // instead, so the test draws the hall as if no file had landed (art lands without code).
    const svg = renderHall(state, { files: [] });
    expect(svg).toContain('var(--stopped)');
    expect(hallProblems(state)[0]?.text).toContain('The extractor is broken');
  });

  it('marks the extractor when the bags on it are full, and no machine', () => {
    // The full state is worn where the bags are (CLAUDE.md T12 3.3).
    const state = fillBags(buyStartingKit(newGame()));
    expect(renderHall(state)).toContain('Extractor (bags full)');
    expect(renderHall(state)).not.toContain('Table saw (bag');
    // And hovering the extractor reads the hall's store, full or not.
    expect(renderHall(state)).toContain('Extractor (bags full). Bags 1 / 1 m\u00b3.');
    state.bagFillM3 = 0.4;
    expect(renderHall(state)).toContain('Extractor. Bags 0.4 / 1 m\u00b3.');
  });

  it('puts a pallet at the gate while a delivery waits, with the lorry\u2019s own click hook', () => {
    let state = buyStartingKit(newGame());
    state.enquiries = [];
    const enquiry = placeEnquiry(state, { price: 400 });
    state = acceptNow(state, enquiry.id, false);
    state.deliveries.push({
      id: 'del-1',
      jobId: firstJob(state).id,
      sheets: 4,
      orderedDay: 1,
      pricePaid: 0,
      arriveDay: 1,
      arrived: true,
      unloaded: false,
      bespoke: false,
      overflowSheets: 0,
    });
    const svg = renderHall(state);
    expect(svg).toContain('data-van="del-1"');
    expect(svg).toContain('Delivery: 4 sheets');
    // One of anything is never printed as one of many (CLAUDE.md T2 3.11).
    const single = state.deliveries[0];
    if (single) single.sheets = 1;
    expect(renderHall(state)).toContain('Delivery: 1 sheet<');
  });

  it('stands the finished pieces on the apron beside the gate, with the count', () => {
    const state = buyStartingKit(newGame());
    state.enquiries = [];
    expect(renderHall(state)).not.toContain('data-finished=');
    for (let index = 0; index < 4; index += 1) {
      const enquiry = placeEnquiry(state, { price: 400 + index * 10 });
      state.jobs.push({
        ...firstJob(acceptNow(state, enquiry.id, false)),
        id: `job-gate-${index}`,
        stage: 'awaitingTransport',
      });
      state.enquiries = [];
    }
    const svg = renderHall(state);
    expect(svg).toContain('data-finished="0"');
    // The apron is the far end of the lane, so what does not fit on it shows in the count
    // instead of as a box (docs/art/SPRITES.md 9.3).
    expect(svg).toContain(`data-finished="${FINISHED_GOODS_LAYOUT.width - 1}"`);
    expect(svg).not.toContain(`data-finished="${FINISHED_GOODS_LAYOUT.width}"`);
    expect(svg).toContain('At the gate: 4');
    expect(svg).toContain('var(--kit-stock)');
    expect(
      hallProblems(state).some((problem) => problem.text.includes('no room at the gate')),
    ).toBe(true);
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
  });

  it('draws the one painted hall at the same size whatever the difficulty', () => {
    // There is one set of hall layers, registered to one 20 by 10 m floor, so every difficulty
    // gets the same room (docs/art/SPRITES.md 9.3). What differs is the cash and the benches.
    const easy = renderHall(newGame());
    const veryEasy = renderHall(newGame({ difficulty: 'veryEasy' }));
    const boxOf = (svg: string): string => svg.match(/viewBox="([^"]+)"/)?.[1] ?? '';
    expect(boxOf(veryEasy)).toBe(boxOf(easy));
    expect(boxOf(easy)).not.toBe('');
  });

  it('does not change when nothing in the state changed', () => {
    const state = runToDay(buyStartingKit(newGame()), 3).state;
    expect(renderHall(state)).toBe(renderHall(state));
    expect(renderHall(clearEvents(tick(state, 0)))).toBe(renderHall(state));
  });
});

describe('the game over screen', () => {
  it('says what happened, how long the company lasted, and offers a fresh start', () => {
    const state = newGame();
    state.gameOver = { reason: 'Three months of arrears and nothing left to seize.', day: 97 };
    state.reputation = 12.5;
    const html = renderGameOver(state);
    expect(html).toContain('Three months of arrears');
    expect(html).toContain('97 days');
    expect(html).toContain('12.5');
    expect(html).toContain('data-do="restart"');
  });
});

describe('the warnings on the hall chips', () => {
  it('warns that somebody will get hurt from the dirty band on, as 9.7 asks', () => {
    const state = newGame();
    const said = (): string => hallProblems(state).map((problem) => problem.text).join(' ');
    state.dust = 50;
    expect(said()).toContain('The hall is messy');
    expect(said()).not.toContain('get hurt');
    state.dust = 75;
    expect(said()).toContain('The hall is dirty, somebody will get hurt');
    state.dust = 95;
    expect(said()).toContain('The hall is dangerous, somebody will get hurt');
  });
});

describe('the placeholder art rules of 10.3', () => {
  it('uses flat colours: no gradient, no texture, and the one contact shadow', () => {
    const state = buyStartingKit(newGame());
    state.dust = 60;
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
      anchorX: 0,
      anchorY: 4,
    });
    const svg = renderHall(state);
    expect(svg).not.toContain('Gradient');
    expect(svg).not.toContain('filter=');
    // The one placeholder helper of Turn 13 shades the right face of its diamond with an opacity
    // of its own (src/render/placeholder.ts, phase A's, frozen for phase B): the pipe tiles over
    // the floor come from it, so those groups are set aside and the rule holds for the rest of
    // the hall (CLAUDE.md T13 1, 3.19).
    const drawn = svg.replace(/<g class="placeholder"[\s\S]*?<\/g>/g, '');
    expect(drawn).not.toContain('opacity');
    // The one shadow in the hall is the contact shadow the game draws under every object, which
    // is what keeps a sprite from floating (CLAUDE.md T3 3.6). It carries no colour of its own.
    expect(svg.split('shadow').length - 1).toBe(svg.split('class="contact-shadow"').length - 1);
  });

  it('keeps the sawdust grey and near the machines', () => {
    const state = buyStartingKit(newGame());
    state.dust = 30;
    const svg = renderHall(state);
    const piles = (svg.match(/<ellipse[^>]*>/g) ?? []).filter((pile) =>
      pile.includes('var(--sawdust)'),
    );
    expect(piles).toHaveLength(3);
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    // The first pile sits at the near edge of the first machine.
    const first = piles[0] ?? '';
    expect(first).toContain('var(--sawdust)');
    expect(saw).toBeDefined();
  });

  it('says whether a bench is free or who is at it', () => {
    const state = buyStartingKit(newGame());
    expect(renderHall(state)).toContain('Workbench (free)');
    const bench = state.equipment.find((item) => item.specId === 'workbench');
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
      anchorX: bench?.anchorX ?? 0,
      anchorY: bench?.anchorY ?? 0,
    });
    expect(renderHall(state)).toContain('Workbench: Ben');
    expect(renderHall(state)).not.toContain('Workbench (free)');
  });

  it('gives the rooms the one line tooltip 10.1 asks for', () => {
    const svg = renderHall(newGame());
    expect(svg).toContain('<title>The WC. Cold tap, one towel.</title>');
    expect(svg).toContain('<title>The canteen.');
  });

  it('carries a sprite key on every placed object, for the sprite pipeline later', () => {
    const svg = renderHall(buyStartingKit(newGame()));
    expect(svg).toContain('data-sprite="tableSaw"');
    expect(svg).toContain('data-sprite="extractor"');
  });
});

describe('the laptop', () => {
  it('says who is on a task and how much of his day is left (CLAUDE.md T2 3.8)', () => {
    const state = newGame();
    state.workers.push({
      id: 'a1',
      name: 'Ben',
      role: 'officeAdmin',
      tier: null,
      rate: 0,
      weeklyWage: 0,
      monthlyWage: 1900,
      startDay: 1,
      jobId: null,
      taskId: null,
      minutesWorked: 180,
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
      anchorX: 1,
      anchorY: 1,
    });
    const books = state.tasks.find((task) => task.kind === 'bookkeeping');
    if (books) books.doneBy = 'a1';
    const html = renderLaptop(state, { page: 'tasks', stockSheets: '6', teamTab: 'workshop' });
    expect(html).toContain('Ben is on it, 300 min of his day left');
    expect(html).toContain('Take it on');
  });

  it('lists what is standing at the gate with a way to order transport', () => {
    const state = newGame();
    const html = renderLaptop(state, { page: 'tasks', stockSheets: '6', teamTab: 'workshop' });
    expect(html).toContain('At the gate, 0 pieces');
    expect(html).toContain('Nothing waiting to go out.');
  });
});

describe('the figures that move', () => {
  function atTheSaw(): GameState {
    const state = buyStartingKit(newGame());
    state.owner.station = 'machine:tableSaw';
    return state;
  }

  it('draws the owner on the tile of the machine he is standing at', () => {
    const state = atTheSaw();
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    expect(saw).toBeDefined();
    // At the front edge of the saw itself, inside the working zone the class reserves, on the
    // cell the station table gives the saw's operator (CLAUDE.md T7 3.3; T16 2.1).
    if (!saw) throw new Error('no saw in the hall');
    const stands = footprintIn(saw);
    const cell = stationCell(state, state.owner.station, { x: 0, y: 0 });
    expect(cell.y).toBe(Math.floor(stands.y + stands.depth));
    const feet = centreOf(cell.x, cell.y, 1, 1);
    const svg = renderHall(state);
    expect(svg).toContain('data-figure="owner"');
    expect(svg).toContain(
      `transform="translate(${Math.round(feet.x)},${Math.round(feet.y)})"`,
    );
    // The tooltip names the machine he is at (CLAUDE.md T2 3.3).
    expect(svg).toContain('<title>Piotr, table saw</title>');
    expect(svg).toContain('class="figure"');
  });

  it('moves him when the station changes, and leaves the rest of the hall alone', () => {
    const saw = renderHall(atTheSaw());
    const bench = atTheSaw();
    bench.owner.station = 'bench';
    const atBench = renderHall(bench);
    expect(saw).not.toBe(atBench);
    expect(atBench).toContain('<title>Piotr, the bench</title>');
    const transforms = (text: string): string[] =>
      (text.match(/data-figure="owner" transform="[^"]+"/g) ?? []).slice();
    expect(transforms(saw)).not.toEqual(transforms(atBench));
  });

  it('puts a figure at the gate, the rack, the office and the canteen door', () => {
    const state = buyStartingKit(newGame());
    const places = ['gate', 'rack', 'office', 'idle'];
    const seen = new Set<string>();
    for (const station of places) {
      state.owner.station = station;
      const match = renderHall(state).match(/data-figure="owner" transform="([^"]+)"/);
      expect(match?.[1]).toBeDefined();
      seen.add(match?.[1] ?? '');
    }
    // Four different stations, four different places to stand.
    expect(seen.size).toBe(places.length);
  });
});

describe('the office once the art side has painted the board and the book (chat fix v14, 14.09)', () => {
  it('draws the board and the book as their pictures with no drawn box, and the drawn ones without files', () => {
    const state = newGame();
    const viewport = { width: 1280, height: 720 };
    const painted = renderOffice(state, viewport, [
      'officeCompanyBoard.png',
      'catalogueFloor.png',
      'officeBackground.png',
    ]);
    expect(painted).toContain('data-sprite="officeCompanyBoard"');
    expect(painted).toContain('office-company-board is-art');
    expect(painted).not.toContain('How the company is doing');
    expect(painted).toContain('office-floor-catalogue is-art');
    expect(painted).not.toContain('<span>Equipment</span>');
    const drawn = renderOffice(state, viewport, []);
    expect(drawn).toContain('How the company is doing');
    expect(drawn).toContain('<span>Equipment</span>');
  });
});

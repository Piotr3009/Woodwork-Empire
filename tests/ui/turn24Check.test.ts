// @vitest-environment jsdom
// The cross check of CLAUDE.md T24 section 7, in one file: every line of it asserted where the
// turn's own tests assert it in pieces. Nothing here is a second implementation of a rule; it is
// the list Piotr reads down, played through the engine and the screens as they stand.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SERVICE_INTERVAL_DAYS, TEMP_STORAGE_COST } from '../../src/engine/constants';
import { migrateState } from '../../src/engine/migrate';
import {
  OWNER,
  benchPlaces,
  machineWearPerMinute,
  serviceIsDue,
  serviceMachine,
  workshopBreakdownToday,
  workshopOutputToday,
} from '../../src/engine/machines';
import { placeCellsAt, standsOn } from '../../src/engine/stations';
import { canHire, joiners } from '../../src/engine/staff';
import { contractPiece, contractPriceFor, contractResultFor, drawContract } from '../../src/engine/contracts';
import { restockSplit } from '../../src/engine/materials';
import { renderTopbar } from '../../src/ui/topbar';
import { renderCompany } from '../../src/ui/company';
import type { Contract, GameState } from '../../src/engine/index';
import {
  act,
  acceptNow,
  buyNow,
  buyStartingKit,
  clearEvents,
  fillRack,
  hireNow,
  newGame,
  placeEnquiry,
  placeEquipment,
  runClock,
  withAir,
  withExtraction,
} from '../helpers';

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

function fixture(path: string): GameState {
  const raw = JSON.parse(readFileSync(path, 'utf8')) as {
    state: Record<string, unknown> & { version: number };
  };
  const state = migrateState(raw.state, raw.state.version);
  if (state === null) throw new Error(`${path} did not open`);
  return state;
}

describe('section 7, the number', () => {
  // The brief names a day 141 fixture. The two Piotr sent are day 128 and day 149 (section 4),
  // and there is no day 141: the nearest hall to the one the mockup was drawn on is day 149,
  // whose four men are on the oak table by hand and whose owner is at a saw (REPORT-T24 0.1).
  const state = runClock(fixture('tests/fixtures/day149-v25.woodwork.json'), 1);
  const made = workshopBreakdownToday(state);

  it('gives the hall four rows and the figure the top bar carries', () => {
    expect(made.men).toHaveLength(4);
    const sheet = parse(renderCompany(state)).querySelector('[data-sheet="output"]');
    const block = sheet?.querySelector('.ledger-list[data-figure="workshopBreakdown"]');
    expect(block?.querySelectorAll('.ledger-row')).toHaveLength(5);
    // The sum under the block is the figure the top bar shows, to the pence.
    const sum = block?.querySelector('[data-sum="total"]')?.textContent;
    expect(sum).toBe(`= ${workshopOutputToday(state).toFixed(2)}`);
    expect(parse(renderTopbar(state, 'hall')).textContent).toContain(
      workshopOutputToday(state).toFixed(2),
    );
  });

  it('names the oak table and the thicknesser it was locked on in the one sentence under it', () => {
    // The timber tool set is gone from the game and the oak table wants the thicknesser alone, so
    // the sentence names the thicknesser, in the board's own words (PIOTR, 24.09; v53).
    expect(made.note).toContain('Oak dining table');
    expect(made.note).toContain('was taken by hand: no thicknesser in the hall');
    expect(made.note).not.toContain('solid wood tools');
    expect(made.note).toContain('every stage of it runs at 0.67, the saw included');
  });

  it('reads the extractor on service on the hall row', () => {
    const hall = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 200);
    const shelves = placeEnquiry(hall, { name: 'Garage shelves', price: 900, deadlineDays: 30 });
    let working = clearEvents(acceptNow(hall, shelves.id));
    const job = working.jobs[0];
    if (!job) throw new Error('the shelves are wanted');
    job.stage = 'inProduction';
    job.assignees = [OWNER];
    const fan = working.equipment.find((item) => item.specId === 'extractor');
    if (!fan) throw new Error('the fan is wanted');
    serviceMachine(working, fan.id);
    working = runClock(act(working, { type: 'SET_SPEED', speed: 1 }), 5);
    expect(workshopBreakdownToday(working).hall?.words).toContain('extractor on service');
  });
});

describe('section 7, the boss and his bench', () => {
  it('refuses the third joiner at a three place bench and takes him on once a used one is bought', () => {
    let state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
    state.cash = 1000000;
    state.enquiries = [];
    const bench = state.equipment.find((item) => item.specId === 'workbench');
    if (!bench) throw new Error('the day one kit has a bench in it');
    bench.variantId = 'industrial';
    for (let index = 0; index < 4; index += 1) {
      placeEquipment(state, 'locker', { x: 6 + index, y: 9, id: `kit-locker-${index}` });
      placeEquipment(state, 'handToolSet', { x: 12 + index, y: 9, id: `kit-tools-${index}` });
      placeEquipment(state, 'toolCabinet', { x: 10 + index, y: 9, id: `kit-cabinet-${index}` });
    }
    expect(benchPlaces(state)).toBe(3);
    state = hireNow(hireNow(state, 'joiner', 'novice'), 'joiner', 'novice');
    expect(joiners(state)).toHaveLength(2);
    expect(canHire(state, 'joiner', 'novice')).toEqual({
      ok: false,
      reason: 'No place at a bench for him: the owner needs one too',
    });
    placeEquipment(state, 'workbench', { variantId: 'used', x: 16, y: 6, id: 'kit-bench-2' });
    expect(canHire(state, 'joiner', 'novice').ok).toBe(true);
    expect(joiners(hireNow(state, 'joiner', 'novice'))).toHaveLength(3);
  });

  it('stands the two men of a standard bench on its two front cells', () => {
    const hall = newGame({ difficulty: 'veryEasy' });
    hall.equipment = [];
    const bench = placeEquipment(hall, 'workbench', { variantId: 'standard', x: 8, y: 6 });
    const box = standsOn(bench);
    expect(placeCellsAt(hall, bench, 2)).toEqual([
      { x: 8, y: 7 },
      { x: 9, y: 7 },
    ]);
    for (const cell of placeCellsAt(hall, bench, 2)) {
      expect(cell.y).toBe(box.y + box.depth);
      expect(cell.x).toBeGreaterThanOrEqual(box.x);
      expect(cell.x).toBeLessThan(box.x + box.width);
    }
  });
});

describe('section 7, the contract and the hall', () => {
  function contractHall(pieceId: string): { state: GameState; contract: Contract } {
    const state = withAir(withExtraction(fillRack(newGame({ difficulty: 'veryEasy' }), 60)));
    placeEquipment(state, 'tableSaw', { variantId: 'standard', x: 8, y: 4, id: 'kit-saw' });
    const contract = drawContract(state);
    contract.pieceId = pieceId;
    contract.pricePerPiece = contractPriceFor(contractPiece(contract));
    state.contracts.push(contract);
    return { state, contract };
  }

  it('charges a wardrobe front its cutting minutes and leaves a cut sheet pack to the pence', () => {
    const front = contractHall('wardrobeFront');
    const saw = front.state.equipment.find((item) => item.specId === 'tableSaw');
    if (!saw) throw new Error('a saw is wanted');
    const cut = contractResultFor(front.state, front.contract, null);
    // Cutting is a quarter of the work and finishing three twentieths, so the cutting is five
    // eighths of a wardrobe front: its wear is that share of its minutes at the saw's own rate.
    expect(cut.wear).toBe(Math.round(cut.minutes * 0.625 * machineWearPerMinute(saw) * 100) / 100);
    const pack = contractHall('cutSheetPack');
    const packSaw = pack.state.equipment.find((item) => item.specId === 'tableSaw');
    if (!packSaw) throw new Error('a saw is wanted');
    const all = contractResultFor(pack.state, pack.contract, null);
    expect(all.wear).toBe(Math.round(all.minutes * machineWearPerMinute(packSaw) * 100) / 100);
  });

  it('brings a dust system bought today due a service six months on and not before (v51)', () => {
    let state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 200);
    state.cash = 400000;
    state = buyNow(state, 'dustSystem');
    const system = state.equipment.find((item) => item.specId === 'dustSystem');
    if (!system) throw new Error('a dust system is wanted');
    expect(serviceIsDue(system, state.clock.day)).toBe(false);
    // Three weeks of a hall whose extraction runs the working day bring nothing due: the service
    // is on the calendar (PIOTR, 22.09), six months from the purchase.
    system.hoursUsed = 3 * 5 * 8;
    expect(serviceIsDue(system, state.clock.day + 21)).toBe(false);
    expect(serviceIsDue(system, state.clock.day + SERVICE_INTERVAL_DAYS - 1)).toBe(false);
    expect(serviceIsDue(system, state.clock.day + SERVICE_INTERVAL_DAYS)).toBe(true);
  });

  it('takes sixty sheets into a rack with room for forty and stores the twenty', () => {
    const state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 10);
    expect(restockSplit(state, 60)).toEqual({
      sheets: 60,
      onRack: 40,
      toStorage: 20,
      storageCost: TEMP_STORAGE_COST,
    });
  });
});

describe('section 7, what is gone and what did not move', () => {
  it('has no reader and no writer of the two deleted selectors left', () => {
    // The two names are built here rather than written out, so this file is not itself a hit on
    // the grep of section 7 (CLAUDE.md T24 2.9).
    const gone = new RegExp(['oldest', 'OpenJob', '|', 'week', 'Efficiency'].join(''));
    const files = [...sourceFiles('src'), ...sourceFiles('tests')];
    const hits = files.filter((path) => gone.test(readFileSync(path, 'utf8')));
    expect(hits).toEqual([]);
  });

  it('adds no token, no colour and no class to the stylesheet', () => {
    const css = readFileSync('src/ui/styles.css', 'utf8');
    for (const name of ['who-made', 'workshopBreakdown', 'canteen-door', 'bench-row']) {
      expect(css).not.toContain(name);
    }
  });
});

/** Every .ts and .css file under a directory, so the grep reads the game and its tests. */
function sourceFiles(directory: string): string[] {
  const found: string[] = [];
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) {
      found.push(...sourceFiles(path));
      continue;
    }
    if (!/\.(ts|css)$/.test(name)) continue;
    found.push(path);
  }
  return found;
}

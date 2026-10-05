/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// @vitest-environment jsdom
// Turn 29, 2.12: windows and doors as standing contracts [PIOTR, 05.10: "are we doing something
// like standing orders for windows and doors?"; TUNE: chat: everything of it]. The client sends
// the timber and the glass, a piece is worked, counted, drawn and worn as a timber job is, the
// pieces are offered only in the 800 m² unit, and a sheet piece is what it was (CLAUDE.md T29
// 2.12, section 7).

import { describe, expect, it } from 'vitest';
import {
  CONTRACT_PIECES,
  CONTRACT_REFERENCE_TIER,
  CONTRACT_TIMBER_WEAR_FAMILY,
  DRAWN_TURN_MINUTES,
  MINUTES_PER_WORKING_DAY,
  TIMBER_FAMILIES,
  TIMBER_STAGES,
  WORKER_RATES,
  WORKING_DAYS_PER_WEEK,
} from '../../src/engine/constants';
import type { ContractPieceSpec } from '../../src/engine/constants';
import {
  acceptContract,
  assignContract,
  closingReport,
  contractFamiliesOf,
  contractHallCapacity,
  contractMachineTip,
  contractPiece,
  contractPieceSpeed,
  contractPriceFor,
  contractReferenceFor,
  contractResultFor,
  contractRoundOf,
  contractStageFamilyOf,
  drawContract,
  offerCarrier,
  pieceStaged,
} from '../../src/engine/contracts';
import { drawnPlaces } from '../../src/engine/drawn';
import type { Contract, GameState, Worker } from '../../src/engine/index';
import { stagedJob } from '../../src/engine/jobs';
import { crewAtFamily, findSpec, fullCrew, placeShortages, wearPerMinuteOf } from '../../src/engine/machines';
import { planPlaces } from '../../src/engine/production';
import { pick } from '../../src/engine/rng';
import { jobPace, manPace, pacePoints, stageSpeed } from '../../src/engine/stages';
import { renderContracts, renderContractsTab } from '../../src/ui/contracts';
import {
  act,
  buyStartingKit,
  connectAll,
  newGame,
  nextDay,
  placeEquipment,
  runClock,
  testJoiner,
  withAir,
  withExtraction,
} from '../helpers';

const TIMBER_PIECES = ['casementWindow', 'sashWindow', 'frenchDoor'];

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

function pieceOf(id: string): ContractPieceSpec {
  const piece = CONTRACT_PIECES.find((entry) => entry.id === id);
  if (piece === undefined) throw new Error(`no piece ${id}`);
  return piece;
}

/** A company in the 800 m2 unit with the day one kit, air enough for a CNC, and the timber
 *  machines of Turn 28 at their standard class but what is named, with four joiners on the books
 *  on nothing. */
function bigUnit(without: string[] = []): GameState {
  let state = newGame({ difficulty: 'veryEasy' });
  state.cash = 9000000;
  state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
  state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'second' }));
  state = withAir(buyStartingKit(state), 'industrial');
  state.cash = 9000000;
  state.reputation = 40;
  state.enquiries = [];
  state.jobs = [];
  state.contracts = [];
  const kit: Array<[string, number, number]> = [
    ['crossCut', 20, 2],
    ['planer', 26, 2],
    ['spindleMoulder', 32, 2],
    ['sander', 20, 6],
    ['framePress', 26, 6],
    ['sprayBooth', 32, 6],
    ['timberShelter', 40, 1],
  ];
  for (const [id, x, y] of kit) {
    if (without.includes(id)) continue;
    placeEquipment(state, id, { variantId: 'standard', x, y, id: `kit-${id}` });
  }
  for (let n = 1; n <= 4; n += 1) state.workers.push(experienced(`staff-w${n}`, `Man ${n}`));
  return state;
}

function experienced(id: string, name: string): Worker {
  return { ...testJoiner(id, name), tier: 'experienced', rate: WORKER_RATES.experienced, monthlyWage: 2600 };
}

/** A contract for this piece on the board, at its own price, the client asking `quantity` a week. */
function offered(state: GameState, pieceId = 'sashWindow', quantity = 10): Contract {
  const contract = drawContract(state);
  contract.id = `contract-${state.clock.day}-${state.contracts.length + 1}`;
  contract.pieceId = pieceId;
  contract.name = `${pieceId} for Harbour Windows`;
  contract.pricePerPiece = contractPriceFor(contractPiece(contract));
  contract.quantityPerWeek = quantity;
  state.contracts.push(contract);
  return contract;
}

/** The same, signed, with these men on it. */
function running(state: GameState, pieceId: string, ...men: string[]): Contract {
  const contract = offered(state, pieceId);
  expect(acceptContract(state, contract.id).ok).toBe(true);
  for (const who of men) expect(assignContract(state, contract.id, who, true).ok, who).toBe(true);
  return contract;
}

describe('three pieces, the client s timber and glass (CLAUDE.md T29 2.12.1, 2.12.2)', () => {
  it('appends a casement window, a sash window and a French door after the three sheet pieces', () => {
    expect(CONTRACT_PIECES.map((piece) => piece.id)).toEqual([
      'cutSheetPack',
      'drawerBox',
      'wardrobeFront',
      ...TIMBER_PIECES,
    ]);
    const stages = TIMBER_STAGES.map((stage) => stage.id);
    expect(CONTRACT_PIECES.slice(3)).toEqual([
      { id: 'casementWindow', name: 'Casement window', stages, minutes: 150, material: 0, sheets: 0, timber: true },
      { id: 'sashWindow', name: 'Sash window', stages, minutes: 190, material: 0, sheets: 0, timber: true },
      { id: 'frenchDoor', name: 'French door', stages, minutes: 180, material: 0, sheets: 0, timber: true },
    ]);
    // The sheet pieces carry no mark and are worked as the empty sheet job they always were.
    for (const piece of CONTRACT_PIECES.slice(0, 3)) {
      expect(piece.timber).toBeUndefined();
      expect(pieceStaged(piece)).toEqual(stagedJob(0, 'sheet', false));
    }
  });

  it('pays every window with nothing off the racks or the stores, no glass ordered and no night stood', () => {
    // Extraction for the timber machines, so the bags do not stop the day.
    let state = connectAll(withExtraction(bigUnit()));
    const contract = running(state, 'sashWindow', 'staff-w1', 'staff-w2', 'staff-w3', 'staff-w4');
    const sheets = state.stock.sheets;
    const deliveries = state.deliveries.length;
    state = runClock(state, MINUTES_PER_WORKING_DAY + 60);
    const after = state.contracts.find((entry) => entry.id === contract.id);
    if (after === undefined) throw new Error('contract gone');
    expect(after.piecesMade).toBeGreaterThan(0);
    expect(after.revenue).toBeCloseTo(after.piecesMade * after.pricePerPiece, 2);
    expect(after.materialCost).toBe(0);
    expect(after.sheetsUsed).toBe(0);
    expect(state.stock.sheets).toBe(sheets);
    expect(state.deliveries).toHaveLength(deliveries);
    expect(state.jobs).toHaveLength(0);
  });
});

describe('a timber piece is made as a timber job is made (CLAUDE.md T29 2.12.3)', () => {
  it('works at the one pace of the whole timber plan, not 1 with the machines, and faster with a five axis CNC', () => {
    const state = bigUnit();
    const piece = pieceOf('sashWindow');
    const window = stagedJob(1, 'solidWood', false, 'lacquer', false, true);
    expect(pieceStaged(piece)).toEqual(window);
    const pace = contractPieceSpeed(state, piece);
    expect(pace).toBeCloseTo(jobPace(state, window), 10);
    expect(pace).not.toBeCloseTo(1, 3);
    // The empty job the sheet pieces are worked as would read 1 in every hall.
    expect(jobPace(state, stagedJob(0, 'solidWood', false, 'lacquer', false, true))).toBe(1);
    placeEquipment(state, 'cnc5', { variantId: 'standard', x: 20, y: 9, id: 'kit-cnc5' });
    placeEquipment(state, 'cuttersSash', { variantId: 'standard', x: 0, y: 0, id: 'kit-cutters' });
    expect(contractPieceSpeed(state, piece)).toBeGreaterThan(pace);
    expect(contractPieceSpeed(state, piece)).toBeCloseTo(jobPace(state, window), 10);
  });

  it('counts its men against every family of the plan, and they go round and are drawn at those families', () => {
    let state = bigUnit();
    const contract = running(state, 'casementWindow', 'staff-w1', 'staff-w2');
    const piece = contractPiece(contract);
    const families = contractFamiliesOf(state, piece);
    expect(new Set(families)).toEqual(new Set(['crossCut', 'planer', 'spindleMoulder', 'framePress', 'sander', 'sprayBooth', 'workbench']));
    // At work: two men on the window contract count at every family of its plan.
    state = runClock(state, 30);
    for (const family of ['crossCut', 'planer', 'spindleMoulder', 'framePress', 'sander', 'sprayBooth']) {
      expect(crewAtFamily(state, family), family).toBe(2);
    }
    expect(crewAtFamily(state, 'tableSaw')).toBe(0);
    // The round is the plan's families as places, the Glazing at the bench.
    expect(contractRoundOf(state, piece)).toEqual(['crossCut', 'planer', 'spindleMoulder', 'framePress', 'sander', 'sprayBooth', 'workbench']);
    // Drawn only at the families of the plan, never at a sheet machine.
    const allowed = new Set(contractRoundOf(state, piece));
    let seenTimber = false;
    for (let hour = 0; hour < 9; hour += 1) {
      state.clock.minute = hour * DRAWN_TURN_MINUTES;
      planPlaces(state);
      for (const entry of drawnPlaces(state)) {
        if (!contract.assigned.includes(entry.who)) continue;
        expect(allowed.has(entry.item.specId), `${hour} ${entry.item.specId}`).toBe(true);
        if (TIMBER_FAMILIES.includes(entry.item.specId)) seenTimber = true;
      }
    }
    expect(seenTimber).toBe(true);
  });

  it('reckons the hall line short at every family of the plan', () => {
    const state = bigUnit();
    const contract = offered(state, 'frenchDoor', 30);
    const piece = contractPiece(contract);
    const families = contractFamiliesOf(state, piece);
    // The full crew at every family of the plan: the standard timber machines are short of places
    // at more than one of them, and every shortage is a family of the plan.
    const shortages = placeShortages(state, 'day', (family) => (families.includes(family) ? fullCrew(state) : 0));
    expect(shortages.length).toBeGreaterThanOrEqual(2);
    for (const short of shortages) expect(families, short.family).toContain(short.family);
    const speed = pacePoints(contractPieceSpeed(state, piece), ...shortages.map((short) => short.factor));
    const minutes = Math.max(1, Math.round(180 / manPace(WORKER_RATES.experienced, speed)));
    const perWeek = 4 * Math.floor((MINUTES_PER_WORKING_DAY * WORKING_DAYS_PER_WEEK) / minutes);
    expect(contractHallCapacity(state, contract).perWeek).toBe(perWeek);
  });

  it('spreads its wear over the plan s machines by their shares, the card and the closing report alike', () => {
    const state = bigUnit();
    const contract = running(state, 'sashWindow', 'staff-w1');
    const worker = state.workers.find((entry) => entry.id === 'staff-w1') ?? null;
    const result = contractResultFor(state, contract, worker);
    expect(result.wear).toBeGreaterThan(0);
    expect(result.machineName).toBe('the timber machines');
    // Played for a morning, the closing report charges the minutes at the machines at the card's
    // own rate a minute, never nought.
    const played = runClock(connectAll(withExtraction(state)), 180);
    const after = played.contracts.find((entry) => entry.id === contract.id);
    if (after === undefined) throw new Error('the contract runs');
    expect(after.machineMinutes).toBeGreaterThan(0);
    const report = closingReport(played, after);
    expect(report.machineWear).toBeGreaterThan(0);
    const perMinute = result.wear / result.minutes;
    expect(Math.abs(report.machineWear - after.machineMinutes * perMinute)).toBeLessThan(
      (0.01 * after.machineMinutes) / result.minutes + 0.01,
    );
    // A hall with no timber machine at all: by hand, and no wear.
    const bare = bigUnit(['crossCut', 'planer', 'spindleMoulder', 'sander', 'framePress', 'sprayBooth']);
    const none = running(bare, 'sashWindow', 'staff-w1');
    const byHand = contractResultFor(bare, none, bare.workers.find((entry) => entry.id === 'staff-w1') ?? null);
    expect(byHand.wear).toBe(0);
    expect(byHand.machineName).toBe('');
  });

  it('is offered no machine tip', () => {
    const state = bigUnit(['framePress']);
    const contract = offered(state, 'sashWindow');
    expect(contractMachineTip(state, contract, 'staff-w1')).toBeNull();
  });

  it('leaves a sheet piece s minute, count and round where they were', () => {
    const state = bigUnit();
    const piece = pieceOf('cutSheetPack');
    // The empty sheet job at its one stage: the reading of v83.
    expect(contractPieceSpeed(state, piece)).toBe(stageSpeed(state, stagedJob(0, 'sheet', false), 'cutting').speed);
    expect(contractFamiliesOf(state, piece)).toEqual([contractStageFamilyOf(state, piece, true)]);
    expect(contractRoundOf(state, pieceOf('wardrobeFront'))).toEqual(['tableSaw', 'workbench']);
  });
});

describe('who is offered one (CLAUDE.md T29 2.12.4)', () => {
  it('never draws a window or a door below the 800 m² unit, and draws there what v83 drew', () => {
    const sheetPieces = CONTRACT_PIECES.slice(0, 3);
    for (let seed = 1; seed <= 200; seed += 1) {
      let state = newGame({ seed });
      if (seed % 2 === 0) {
        state.cash = 9000000;
        state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
      }
      state.clock.day = 1 + (seed % 20);
      const carrier = offerCarrier(state);
      const before = { ...carrier };
      const contract = drawContract(state, carrier);
      expect(TIMBER_PIECES, `${seed}`).not.toContain(contract.pieceId);
      // The list of v83 off the same stream: the same piece.
      expect(contract.pieceId, `${seed}`).toBe(pick(before, sheetPieces)?.id);
    }
  });

  it('draws windows and doors in the 800 m² unit, named in the plural written out', () => {
    const state = bigUnit();
    const drawn = new Set<string>();
    const names = new Set<string>();
    for (let day = 1; day <= 120; day += 1) {
      state.clock.day = day;
      const contract = drawContract(state, offerCarrier(state));
      drawn.add(contract.pieceId);
      names.add(contract.name.split(' for ')[0] ?? '');
    }
    expect([...drawn].sort()).toEqual(CONTRACT_PIECES.map((piece) => piece.id).sort());
    expect([...names].sort()).toEqual([
      'Casement windows',
      'Cut sheet packs',
      'Drawer boxes',
      'French doors',
      'Sash windows',
      'Wardrobe fronts',
    ]);
  });
});

describe('the price and the minutes (CLAUDE.md T29 2.12.5)', () => {
  it('prices each at the timber plan s pace at the standard class, two a day for the experienced man', () => {
    const rate = WORKER_RATES[CONTRACT_REFERENCE_TIER];
    const planer = findSpec(CONTRACT_TIMBER_WEAR_FAMILY)?.variants.find((variant) => variant.id === 'standard');
    if (planer === undefined) throw new Error('no planer');
    const lines = TIMBER_PIECES.map((id, index) => {
      const piece = pieceOf(id);
      const reference = contractReferenceFor(piece);
      expect(reference.minutes, id).toBe([179, 226, 214][index]);
      expect(reference.minutes, id).toBe(Math.round(piece.minutes / (rate * 1.05)));
      expect(reference.piecesPerDay, id).toBe(2);
      // The wear of the standard four sided planer over those minutes [TUNE].
      expect(reference.wear, id).toBeCloseTo(Math.round(reference.minutes * wearPerMinuteOf(planer.price) * 100) / 100, 2);
      const price = contractPriceFor(piece);
      expect(price).toBe(Math.round(reference.labourCost + reference.wear + 200 / 2));
      return `${piece.name}: ${reference.minutes} min, £${reference.labourCost} of wages, £${reference.wear} of wear: £${price} a piece`;
    });
    console.log(`THE PRICE OF A WINDOW OR A DOOR\n${lines.join('\n')}`);
  });

  it('is still one a day for a novice working by hand, so no card of a timber piece reads nought', () => {
    const state = bigUnit(['crossCut', 'planer', 'spindleMoulder', 'sander', 'framePress', 'sprayBooth']);
    const novice = testJoiner('staff-n', 'Novice');
    state.workers.push(novice);
    for (const id of TIMBER_PIECES) {
      const contract = offered(state, id);
      const result = contractResultFor(state, contract, novice);
      expect(result.piecesPerDay, id).toBe(1);
    }
  });
});

describe('the words of a timber piece (CLAUDE.md T29 2.12.6)', () => {
  it('reads the client s timber and glass on the offer tile, with no sheet word', () => {
    const state = bigUnit();
    offered(state, 'casementWindow');
    const tile = parse(renderContracts(state)).querySelector('.tile[data-contract]');
    const text = tile?.textContent ?? '';
    expect(text).toContain(
      '150 minutes of work a piece on the timber machines. The client sends the timber and the glass: nothing comes off your racks.',
    );
    expect(text).not.toContain('sheet');
    expect(text).not.toContain('crossCutting');
    expect(text).not.toContain('of material in it');
  });

  it('has no material row on the offer card and names the timber machines for the wear, or by hand', () => {
    const state = bigUnit();
    const contract = offered(state, 'sashWindow');
    const card = parse(renderContractsTab(state, null, 'staff-w1')).querySelector(`.contract-offer[data-contract="${contract.id}"]`);
    const text = card?.textContent ?? '';
    expect(text).not.toContain('Material a piece, from stock');
    expect(text).toContain('Machine wear a piece, the timber machines');
    const bare = bigUnit(['crossCut', 'planer', 'spindleMoulder', 'sander', 'framePress', 'sprayBooth']);
    const other = offered(bare, 'sashWindow');
    const byHand = parse(renderContractsTab(bare, null, 'staff-w1')).querySelector(`.contract-offer[data-contract="${other.id}"]`);
    expect(byHand?.textContent).toContain('Machine wear a piece, by hand');
    // A sheet piece keeps its material row.
    const sheet = bigUnit();
    const pack = offered(sheet, 'cutSheetPack');
    const packCard = parse(renderContractsTab(sheet, null, 'staff-w1')).querySelector(`.contract-offer[data-contract="${pack.id}"]`);
    expect(packCard?.textContent).toContain('Material a piece, from stock');
  });

  it('says the timber machines stay in the general queue on the running bar', () => {
    const state = bigUnit();
    running(state, 'frenchDoor', 'staff-w1');
    const text = parse(renderContracts(state)).querySelector('.contract-active')?.textContent ?? '';
    expect(text).toContain('The timber machines stay in the general queue: better ones make more pieces without a click.');
    expect(text).not.toContain('The saw stays');
  });
});

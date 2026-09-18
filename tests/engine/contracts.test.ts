// Standing contracts (CLAUDE.md T13 3.16): the offer from the second tier up, the weekly counter,
// the short week's reputation hit, the renegotiation arithmetic, the closing report figures, and
// that only people are assigned while the machines stay in the general queue.

import { describe, expect, it } from 'vitest';
import {
  CONTRACT_OFFER_DAYS,
  CONTRACT_PIECES,
  JOINER_WEEKLY_WAGE,
  CONTRACT_QUANTITY_PER_WEEK_MAX,
  CONTRACT_QUANTITY_PER_WEEK_MIN,
  CONTRACT_RENEW_FULL_WEEK,
  CONTRACT_RENEW_SHORT_WEEK,
  CONTRACT_SHORT_WEEK_REPUTATION,
  CONTRACT_TERM_MONTHS_MAX,
  CONTRACT_TERM_MONTHS_MIN,
  DAYS_PER_WEEK,
  WORKER_RATES,
  CONTRACT_QUANTITY_STEP,
  CONTRACT_QUANTITY_MINUTES,
  CONTRACT_FREE_END_DAYS,
  SHEET_VALUE,
} from '../../src/engine/constants';
import type { ContractPieceSpec } from '../../src/engine/constants';
import {
  acceptContract,
  activeContracts,
  assignContract,
  closingReport,
  contractCounterLine,
  contractMarker,
  jobBesideContract,
  contractMen,
  contractPiece,
  contractResultFor,
  contractShortfall,
  contractStationFor,
  contractWaitingForMaterial,
  endContractCheck,
  endContractNow,
  offerCarrier,
  quantityForPiece,
  reserveContractSheets,
  declineContract,
  drawContract,
  endedContracts,
  offerContract,
  offeredContract,
  renegotiatedPriceFor,
  renewContract,
  runContractDay,
  runContractMinute,
  sheetsForPieces,
  termWeeksFor,
  weekWanted,
} from '../../src/engine/contracts';
import { workerMinuteCost } from '../../src/engine/jobs';
import { freeSheets, reservedSheets } from '../../src/engine/materials';
import { hallProductivityFactor, variantFor } from '../../src/engine/machines';
import { staffOutputFactor } from '../../src/engine/owner';
import type { Contract, GameState, Worker } from '../../src/engine/index';
import {
  acceptNow,
  buyStartingKit,
  fillBags,
  fillRack,
  newGame,
  placeEnquiry,
  placeEquipment,
  runClock,
  withAir,
  withExtraction,
} from '../helpers';

/** The day 1 kit, enough fan and air, sheets on the rack, and a poor joiner at his own bench. */
function joinerHall(): GameState {
  const state = withAir(
    withExtraction(fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 60)),
  );
  placeEquipment(state, 'workbench', { variantId: 'budget', x: 6, y: 6 });
  state.enquiries = [];
  state.workers.push(joiner('staff-1', 'Ben'));
  // 09:00, a working minute, so a minute of the clock is a minute of work.
  state.clock.minute = 60;
  return state;
}

function joiner(id: string, name: string): Worker {
  return {
    id,
    name,
    role: 'joiner',
    tier: 'novice',
    rate: WORKER_RATES.novice,
    weeklyWage: JOINER_WEEKLY_WAGE.novice,
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
    anchorX: 6,
    anchorY: 6,
  };
}

/** Runs the day's open until a shop rings, and says how many days it took. */
function firstOffer(state: GameState, most = 300): { contract: Contract | null; days: number } {
  for (let day = 1; day <= most; day += 1) {
    state.clock.day = day;
    offerContract(state);
    const offer = offeredContract(state);
    if (offer) return { contract: offer, days: day };
  }
  return { contract: null, days: most };
}

/** A contract accepted on this day, with the joiner on it. */
function running(state: GameState, day = 1, quantity = 60): Contract {
  state.clock.day = day;
  const contract = drawContract(state);
  contract.quantityPerWeek = quantity;
  state.contracts.push(contract);
  expect(acceptContract(state, contract.id).ok).toBe(true);
  expect(assignContract(state, contract.id, 'staff-1', true).ok).toBe(true);
  return contract;
}

function minutes(state: GameState, count: number): number {
  let worked = 0;
  for (let at = 0; at < count; at += 1) worked += runContractMinute(state).worked;
  return worked;
}

function contractLines(state: GameState): Array<[string, number]> {
  return state.ledger
    .filter((entry) => entry.category === 'contract')
    .map((entry) => [entry.label, entry.amount]);
}

describe('the offer', () => {
  it('arrives from the second reputation tier up, in the bands, and stands five days', () => {
    const state = newGame();
    expect(state.reputation).toBe(0);
    const { contract, days } = firstOffer(state);
    expect(contract).not.toBeNull();
    if (!contract) return;
    expect(days).toBeLessThan(60);
    expect(contract.status).toBe('offered');
    // One of the three pieces the board offers now, of whatever length of work (T17 2.22).
    const piece = CONTRACT_PIECES.find((entry) => entry.id === contract.pieceId);
    expect(piece).toBeDefined();
    expect(contract.name).toContain(`${piece?.name ?? ''}s for `);
    // The client asks for a week's work: the band in cut sheet packs, converted to this piece.
    const packs = Math.round((contract.quantityPerWeek * (piece?.minutes ?? 45)) / CONTRACT_QUANTITY_MINUTES);
    expect(packs).toBeGreaterThanOrEqual(CONTRACT_QUANTITY_PER_WEEK_MIN - CONTRACT_QUANTITY_STEP);
    expect(packs).toBeLessThanOrEqual(CONTRACT_QUANTITY_PER_WEEK_MAX + CONTRACT_QUANTITY_STEP);
    expect(contract.quantityPerWeek).toBeGreaterThanOrEqual(1);
    expect(contract.termWeeks).toBeGreaterThanOrEqual(termWeeksFor(CONTRACT_TERM_MONTHS_MIN));
    expect(contract.termWeeks).toBeLessThanOrEqual(termWeeksFor(CONTRACT_TERM_MONTHS_MAX));
    expect(contract.pricePerPiece).toBe(piece?.price);
    expect(contract.expiresOnDay).toBe(contract.offeredDay + CONTRACT_OFFER_DAYS - 1);
    // One on the board at a time: fifty more days bring no second one.
    for (let day = days + 1; day <= days + 50; day += 1) {
      state.clock.day = day;
      offerContract(state);
    }
    expect(state.contracts.filter((entry) => entry.status === 'offered')).toHaveLength(1);
    // And it comes off the board the day after it expires.
    state.clock.day = contract.expiresOnDay;
    runContractDay(state);
    expect(offeredContract(state)).not.toBeNull();
    state.clock.day = contract.expiresOnDay + 1;
    runContractDay(state);
    expect(offeredContract(state)).toBeNull();
  });

  it('never arrives below the tier, and never on a weekend', () => {
    const state = newGame();
    state.reputation = -10;
    expect(firstOffer(state).contract).toBeNull();
    const weekend = newGame();
    for (let day = 6; day <= 300; day += 7) {
      weekend.clock.day = day;
      offerContract(weekend);
    }
    expect(offeredContract(weekend)).toBeNull();
  });

  it('is declined and gone, and only an offer can be declined', () => {
    const state = newGame();
    const { contract } = firstOffer(state);
    if (!contract) throw new Error('an offer is wanted');
    expect(declineContract(state, contract.id).ok).toBe(true);
    expect(state.contracts).toHaveLength(0);
    expect(declineContract(state, contract.id).ok).toBe(false);
  });
});

describe('accepting', () => {
  it('opens the term and the week in hand from the day it is accepted, pro rata for a part week', () => {
    const state = newGame();
    // Day 3 is a Wednesday: three working days of the first week are inside the term.
    state.clock.day = 3;
    const contract = drawContract(state);
    contract.quantityPerWeek = 60;
    contract.termWeeks = 13;
    state.contracts.push(contract);
    expect(acceptContract(state, contract.id).ok).toBe(true);
    expect(contract.status).toBe('active');
    expect(contract.startDay).toBe(3);
    expect(contract.endDay).toBe(3 + 13 * DAYS_PER_WEEK - 1);
    expect(contract.weekStartDay).toBe(3);
    expect(weekWanted(contract, 3)).toBe(36);
    expect(weekWanted(contract, 8)).toBe(60);
    expect(contractCounterLine(contract, 3)).toBe('0 / 36 this week');
    expect(acceptContract(state, contract.id).ok).toBe(false);
  });
});

describe('people, not machines', () => {
  it('puts a joiner on it and takes him off, and refuses anybody else', () => {
    const state = joinerHall();
    const contract = running(state);
    const ben = state.workers[0];
    expect(ben?.jobId).toBe(contractMarker(contract.id));
    expect(contract.assigned).toEqual(['staff-1']);
    expect(contractMen(state)).toEqual(['staff-1']);
    expect(assignContract(state, contract.id, 'owner', true).ok).toBe(false);
    expect(assignContract(state, contract.id, 'nobody', true)).toEqual({ ok: false, reason: 'No such person' });
    state.workers.push({ ...joiner('staff-2', 'Ann'), role: 'officeAdmin', rate: 0 });
    expect(assignContract(state, contract.id, 'staff-2', true)).toEqual({
      ok: false,
      reason: 'Only a joiner can be put on a contract',
    });
    expect(assignContract(state, contract.id, 'staff-1', false).ok).toBe(true);
    expect(ben?.jobId).toBeNull();
    expect(contract.assigned).toEqual([]);
    // The saw was never his to keep: nothing is held while he is off it.
    expect(state.equipment.every((item) => item.takenBy !== 'staff-1')).toBe(true);
  });

  it('leaves him on the job he is on: the contract takes the first of his day, not the whole of him', () => {
    // Turn 19 took him off the job when he went on a contract. From tonight he is on both, and
    // the contract has the morning (PIOTR; CLAUDE.md T20 2.1.4).
    let state = joinerHall();
    const enquiry = placeEnquiry(state, { price: 4000, deadlineDays: 30 });
    state = acceptNow(state, enquiry.id);
    const job = state.jobs[0];
    if (!job) throw new Error('a job is wanted');
    job.stage = 'ready';
    job.assignees = ['staff-1'];
    job.stage = 'inProduction';
    const ben = state.workers[0];
    if (ben) ben.jobId = job.id;
    const contract = running(state);
    expect(job.assignees).toEqual(['staff-1']);
    expect(job.stage).toBe('inProduction');
    expect(ben?.jobId).toBe(contractMarker(contract.id));
    expect(jobBesideContract(state, 'staff-1')?.id).toBe(job.id);
    // And off the contract again he is the job's, where he came from.
    expect(assignContract(state, contract.id, 'staff-1', false).ok).toBe(true);
    expect(ben?.jobId).toBe(job.id);
    expect(job.assignees).toEqual(['staff-1']);
  });

  it('is left alone by the jobs: the marker survives a minute of the clock and he is not handed a ready job', () => {
    let state = joinerHall();
    const enquiry = placeEnquiry(state, { price: 4000, deadlineDays: 30 });
    state = acceptNow(state, enquiry.id);
    const job = state.jobs[0];
    if (!job) throw new Error('a job is wanted');
    job.stage = 'ready';
    const contract = running(state);
    state.clock.minute = 60;
    const later = runClock(state, 5);
    const ben = later.workers.find((worker) => worker.id === 'staff-1');
    expect(ben?.jobId).toBe(contractMarker(contract.id));
    expect(later.jobs[0]?.assignees[0] ?? null).toBeNull();
    const running5 = activeContracts(later)[0];
    expect(running5?.assigned).toEqual(['staff-1']);
    expect(running5?.labourMinutes).toBeGreaterThan(0);
  });

  it('keeps a man the player puts on a job as well: assigned once, he stays on it', () => {
    // The v28 rule dropped him from the contract the moment a job had him. Assigned once, a man
    // stays on it until he is taken off or leaves (PIOTR; CLAUDE.md T20 2.1.2).
    let state = joinerHall();
    const enquiry = placeEnquiry(state, { price: 4000, deadlineDays: 30 });
    state = acceptNow(state, enquiry.id);
    const contract = running(state);
    const job = state.jobs[0];
    const ben = state.workers[0];
    if (!job || !ben) throw new Error('a job and a man are wanted');
    ben.jobId = job.id;
    runContractMinute(state);
    expect(contract.assigned).toEqual(['staff-1']);
    expect(ben.jobId).toBe(contractMarker(contract.id));
  });
});

describe('the piece work', () => {
  it('advances the piece at his rate and the class of the saw he got, and books each piece', () => {
    const state = joinerHall();
    const contract = running(state);
    const piece = contractPiece(contract);
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    if (!saw) throw new Error('a saw is wanted');
    const speed = variantFor(saw)?.outputFactor ?? 1;
    const worth = WORKER_RATES.novice * staffOutputFactor(state) * speed * hallProductivityFactor(state);
    const cashBefore = state.cash;
    const worked = minutes(state, 200);
    expect(worked).toBe(200);
    const pieces = Math.floor((200 * worth) / piece.minutes);
    expect(pieces).toBeGreaterThan(0);
    expect(contract.piecesThisWeek).toBe(pieces);
    expect(contract.piecesMade).toBe(pieces);
    expect(contract.labourMinutes).toBe(200);
    expect(contract.revenue).toBe(pieces * piece.price);
    expect(contract.materialCost).toBe(pieces * piece.material);
    // The cash is the pieces and nothing else: the material was on the rack (T17 2.22).
    expect(state.cash).toBeCloseTo(cashBefore + pieces * piece.price, 6);
    expect(saw.takenBy).toBe('staff-1');
    expect(saw.hoursUsed).toBeCloseTo(200 / 60, 3);
    expect(state.workers[0]?.station).toBe('machine:tableSaw');
    expect(contractStationFor(state, state.workers[0] as Worker)).toBe('machine:tableSaw');
    expect(state.dayStats.workMinutes).toBe(200);
  });

  it('books one revenue line a day, not one a piece, and buys no material at all', () => {
    // The material is off the rack now, so the contract line carries the money in and nothing
    // out (CLAUDE.md T17 2.22).
    const state = joinerHall();
    const contract = running(state);
    const sheets = state.stock.sheets;
    minutes(state, 300);
    expect(contract.piecesMade).toBeGreaterThan(1);
    const lines = contractLines(state);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toEqual([`${contract.name}: pieces`, contract.piecesMade * contract.pricePerPiece]);
    expect(contractLines(state).some(([label]) => label.includes('material'))).toBe(false);
    // And the sheets it used are off the rack, whole ones, as the pieces added up.
    expect(contract.sheetsUsed).toBe(sheetsForPieces(contractPiece(contract), contract.piecesMade));
    expect(state.stock.sheets).toBe(sheets - contract.sheetsUsed);
  });

  it('makes more pieces in the same minutes on a better saw, without a click', () => {
    const slow = joinerHall();
    running(slow);
    minutes(slow, 300);
    const fast = joinerHall();
    placeEquipment(fast, 'tableSaw', { variantId: 'pro', x: 10, y: 1, id: 'kit-saw-pro' });
    running(fast);
    minutes(fast, 300);
    expect(activeContracts(fast)[0]?.piecesMade ?? 0).toBeGreaterThan(activeContracts(slow)[0]?.piecesMade ?? 0);
    const held = fast.equipment.find((item) => item.takenBy === 'staff-1');
    expect(held?.id).toBe('kit-saw-pro');
  });

  it('waits while somebody else has the saw: the machine stays in the general queue', () => {
    const state = joinerHall();
    const contract = running(state);
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    if (!saw) throw new Error('a saw is wanted');
    saw.takenBy = 'owner';
    minutes(state, 100);
    expect(contract.pieceMinutes).toBe(0);
    expect(contract.labourMinutes).toBe(0);
    expect(state.workers[0]?.station).toBe('waiting:tableSaw');
    expect(contractStationFor(state, state.workers[0] as Worker)).toBe('waiting:tableSaw');
    saw.takenBy = null;
    minutes(state, 10);
    expect(contract.labourMinutes).toBe(10);
    expect(saw.takenBy).toBe('staff-1');
  });

  it('stops with the bags full, rests at dinner, and does nothing with nobody on it', () => {
    const state = joinerHall();
    const contract = running(state);
    fillBags(state);
    minutes(state, 20);
    expect(contract.labourMinutes).toBe(0);
    state.bagFillM3 = 0;
    state.clock.minute = 250;
    minutes(state, 20);
    expect(contract.labourMinutes).toBe(0);
    state.clock.minute = 60;
    assignContract(state, contract.id, 'staff-1', false);
    minutes(state, 20);
    expect(contract.labourMinutes).toBe(0);
  });
});

describe('the week and the term', () => {
  it('closes the week on the Monday, and a short week costs a point of reputation, remembered', () => {
    const state = joinerHall();
    const contract = running(state, 1, 60);
    const reputation = state.reputation;
    state.clock.day = 8;
    runContractDay(state);
    expect(contract.weeks).toEqual([{ week: 1, wanted: 60, made: 0 }]);
    expect(state.reputation).toBe(reputation - CONTRACT_SHORT_WEEK_REPUTATION);
    expect(state.reputationLog[state.reputationLog.length - 1]?.reason).toContain(contract.name);
    expect(contract.weekStartDay).toBe(8);
    expect(contract.piecesThisWeek).toBe(0);
    // A full week costs nothing.
    contract.piecesThisWeek = 60;
    state.clock.day = 15;
    runContractDay(state);
    expect(contract.weeks[1]).toEqual({ week: 2, wanted: 60, made: 60 });
    expect(state.reputation).toBe(reputation - CONTRACT_SHORT_WEEK_REPUTATION);
    // The same day again closes nothing.
    runContractDay(state);
    expect(contract.weeks).toHaveLength(2);
  });

  it('renegotiates from the history: a percent up for every full week, two down for every short one', () => {
    const state = newGame();
    const contract = drawContract(state);
    contract.pricePerPiece = 38;
    contract.weeks = [
      { week: 1, wanted: 60, made: 60 },
      { week: 2, wanted: 60, made: 61 },
      { week: 3, wanted: 60, made: 10 },
    ];
    expect(renegotiatedPriceFor(contract)).toBe(
      Math.round(38 * (1 + 2 * CONTRACT_RENEW_FULL_WEEK - CONTRACT_RENEW_SHORT_WEEK)),
    );
    // A price a piece is whole pounds: two full weeks on 38 are 38.76, which is 39; one full
    // week is 38.38 and stays 38; a short one is 37.24 and reads 37.
    contract.weeks = [
      { week: 1, wanted: 60, made: 60 },
      { week: 2, wanted: 60, made: 60 },
    ];
    expect(renegotiatedPriceFor(contract)).toBe(39);
    contract.weeks = [{ week: 1, wanted: 60, made: 60 }];
    expect(renegotiatedPriceFor(contract)).toBe(38);
    contract.weeks = [{ week: 1, wanted: 60, made: 0 }];
    expect(renegotiatedPriceFor(contract)).toBe(37);
    contract.weeks = Array.from({ length: 13 }, (_, index) => ({ week: index + 1, wanted: 60, made: 60 }));
    expect(renegotiatedPriceFor(contract)).toBe(43);
  });

  it('adds the closing report up', () => {
    const state = joinerHall();
    const contract = running(state);
    contract.piecesMade = 100;
    contract.revenue = 3800;
    contract.materialCost = 3000;
    contract.labourMinutes = 6000;
    const report = closingReport(state, contract);
    const labourCost =
      Math.round(6000 * workerMinuteCost(JOINER_WEEKLY_WAGE.novice) * 100) / 100;
    expect(report).toEqual({
      pieces: 100,
      revenue: 3800,
      material: 3000,
      labourMinutes: 6000,
      labourHours: 100,
      labourCost,
      margin: Math.round((3800 - 3000 - labourCost) * 100) / 100,
    });
  });

  it('ends the term with the last week closed, the men off it, the new price and the report', () => {
    const state = joinerHall();
    const contract = running(state, 1, 60);
    contract.weeks = [{ week: 1, wanted: 60, made: 60 }];
    contract.piecesThisWeek = 60;
    contract.weekStartDay = 8;
    contract.endDay = 14;
    state.clock.day = 15;
    runContractDay(state);
    expect(contract.status).toBe('ended');
    expect(contract.weeks).toHaveLength(2);
    expect(contract.renegotiatedPrice).toBe(
      Math.round(contract.pricePerPiece * (1 + 2 * CONTRACT_RENEW_FULL_WEEK)),
    );
    expect(contract.assigned).toEqual([]);
    expect(state.workers[0]?.jobId).toBeNull();
    expect(endedContracts(state)).toHaveLength(1);
    const event = state.eventQueue.find((entry) => entry.kind === 'contractEnded');
    expect(event?.data.contractId).toBe(contract.id);
    expect(event?.data.offered).toBe(contract.renegotiatedPrice);
    expect(event?.body).toContain('Renew or let it go on the Contracts tab');
  });

  it('renews at the new price as a fresh term from today, or lets it go', () => {
    const state = joinerHall();
    const contract = running(state, 1, 60);
    expect(renewContract(state, contract.id, true)).toEqual({ ok: false, reason: 'The term is not over' });
    contract.endDay = 7;
    state.clock.day = 8;
    runContractDay(state);
    const offered = contract.renegotiatedPrice ?? 0;
    expect(renewContract(state, contract.id, true).ok).toBe(true);
    expect(state.contracts.find((entry) => entry.id === contract.id)).toBeUndefined();
    const renewed = activeContracts(state)[0];
    expect(renewed).toBeDefined();
    expect(renewed?.pricePerPiece).toBe(offered);
    expect(renewed?.quantityPerWeek).toBe(60);
    expect(renewed?.startDay).toBe(8);
    expect(renewed?.weeks).toEqual([]);
    expect(renewed?.piecesMade).toBe(0);
    if (!renewed) return;
    renewed.endDay = 8;
    state.clock.day = 9;
    runContractDay(state);
    expect(renewContract(state, renewed.id, false).ok).toBe(true);
    expect(state.contracts).toHaveLength(0);
  });
});

describe('the material off the rack (CLAUDE.md T17 2.22)', () => {
  /** A contract for cut sheet packs, whatever the stream drew, so the sheets are the known ones. */
  function packs(state: GameState, quantity = 60): Contract {
    const contract = running(state, 1, quantity);
    contract.pieceId = 'cutSheetPack';
    contract.pricePerPiece = 38;
    return contract;
  }

  it('holds what the week wants on the rack, and the free stock counts it', () => {
    const state = joinerHall();
    const contract = packs(state, 20);
    const free = freeSheets(state);
    // Twenty packs at 0.15 of a sheet each: three sheets for the week.
    expect(contractShortfall(state, contract)).toBe(3);
    expect(reserveContractSheets(state, contract)).toBe(3);
    expect(contract.sheetsReserved).toBe(3);
    expect(reservedSheets(state)).toBeGreaterThanOrEqual(3);
    expect(freeSheets(state)).toBe(free - 3);
    // Nothing more is held once the week is covered.
    expect(reserveContractSheets(state, contract)).toBe(0);
  });

  it('draws whole sheets as the pieces add up, out of what was held first', () => {
    const state = joinerHall();
    const contract = packs(state);
    reserveContractSheets(state, contract);
    const held = contract.sheetsReserved;
    const rack = state.stock.sheets;
    minutes(state, 400);
    expect(contract.piecesMade).toBeGreaterThan(1);
    const piece = contractPiece(contract);
    expect(contract.sheetsUsed).toBe(sheetsForPieces(piece, contract.piecesMade));
    expect(state.stock.sheets).toBe(rack - contract.sheetsUsed);
    expect(contract.sheetsReserved).toBe(Math.max(0, held - contract.sheetsUsed));
  });

  it('stands the men at their benches while the rack cannot cover the next piece', () => {
    const state = joinerHall();
    const contract = packs(state);
    state.stock.sheets = 0;
    expect(contractWaitingForMaterial(state, contract)).toBe(true);
    const worked = minutes(state, 60);
    expect(worked).toBe(0);
    expect(contract.piecesMade).toBe(0);
    expect(state.workers[0]?.station).toBe('bench');
    // A delivery lands and the work goes on.
    state.stock.sheets = 20;
    expect(contractWaitingForMaterial(state, contract)).toBe(false);
    expect(minutes(state, 60)).toBeGreaterThan(0);
  });

  it('gives the rack its sheets back when the term ends', () => {
    const state = joinerHall();
    const contract = packs(state);
    reserveContractSheets(state, contract);
    expect(contract.sheetsReserved).toBeGreaterThan(0);
    contract.endDay = 7;
    state.clock.day = 8;
    runContractDay(state);
    expect(contract.status).toBe('ended');
    expect(contract.sheetsReserved).toBe(0);
    expect(reservedSheets(state)).toBe(0);
  });
});

describe('the result with a man on it (CLAUDE.md T17 2.22)', () => {
  it('is the price less the material and less his own time, and it is his own time', () => {
    const state = joinerHall();
    const contract = running(state, 1, 60);
    const piece = CONTRACT_PIECES.find((entry) => entry.id === 'cutSheetPack');
    if (piece === undefined) throw new Error('no cut sheet pack');
    contract.pieceId = piece.id;
    contract.pricePerPiece = piece.price;
    const green = state.workers[0] as Worker;
    const middling: Worker = {
      ...joiner('staff-2', 'Nick'),
      tier: 'experienced',
      rate: WORKER_RATES.experienced,
      weeklyWage: JOINER_WEEKLY_WAGE.experienced,
    };
    const best: Worker = {
      ...joiner('staff-3', 'Sam'),
      tier: 'senior',
      rate: WORKER_RATES.senior,
      weeklyWage: JOINER_WEEKLY_WAGE.senior,
    };
    state.workers.push(middling, best);
    const greenResult = contractResultFor(contract, green);
    const middlingResult = contractResultFor(contract, middling);
    const bestResult = contractResultFor(contract, best);
    // A joiner with no experience does 45 minutes of the owner's work in 56 of his own, a super
    // experienced one in 38 (CLAUDE.md T20 2.5).
    expect(greenResult.minutes).toBe(Math.round(45 / WORKER_RATES.novice));
    expect(bestResult.minutes).toBe(Math.round(45 / WORKER_RATES.senior));
    expect(greenResult.labourCost).toBe(
      Math.round((45 / WORKER_RATES.novice) * workerMinuteCost(green.weeklyWage) * 100) / 100,
    );
    expect(greenResult.margin).toBe(
      Math.round((piece.price - piece.material - greenResult.labourCost) * 100) / 100,
    );
    // The wage ladder is steeper than the speed ladder: 450, 600 and 800 a week against 0.8, 1.0
    // and 1.2 of the owner. So the same piece costs more in a better man's time, and the line
    // thins as the tier rises. The line is his own, which is what the tab has to show before he
    // is put on it (CLAUDE.md T20 2.1, 2.5).
    expect(middlingResult.margin).toBeLessThan(greenResult.margin);
    expect(bestResult.margin).toBeLessThan(middlingResult.margin);
    // And every one of them is above water by hand at the prices of T20 2.2, which is the whole
    // point of the new table: a contract pays a little by hand and well with machines.
    expect(bestResult.margin).toBeGreaterThan(0);
  });
});

describe('ending the contract early (CLAUDE.md T17 2.22)', () => {
  it('refuses inside the first month and says how long is left, then ends it for nothing', () => {
    const state = joinerHall();
    const contract = running(state, 1, 60);
    const refused = endContractCheck(state, contract.id);
    expect(refused.ok).toBe(false);
    expect(refused.reason).toBe(`The first month stands: ${CONTRACT_FREE_END_DAYS} days to go`);
    expect(endContractNow(state, contract.id).ok).toBe(false);
    expect(contract.status).toBe('active');
    // A month on, he walks away: nothing is charged and the men come off it.
    state.clock.day = 1 + CONTRACT_FREE_END_DAYS;
    expect(endContractCheck(state, contract.id).ok).toBe(true);
    const cash = state.cash;
    expect(endContractNow(state, contract.id).ok).toBe(true);
    expect(contract.status).toBe('ended');
    expect(contract.assigned).toEqual([]);
    expect(state.cash).toBe(cash);
    expect(state.workers[0]?.jobId).toBeNull();
  });
});

describe('the lengths of work the board offers (CLAUDE.md T17 2.22)', () => {
  it('has a short piece and a long one, each asking for a week of work', () => {
    const short = CONTRACT_PIECES.find((piece) => piece.id === 'drawerBox');
    const long = CONTRACT_PIECES.find((piece) => piece.id === 'wardrobeFront');
    expect(short?.minutes).toBe(60);
    expect(short === undefined ? 0 : short.price - short.material).toBe(26);
    // The wardrobe front is four hours of work now and no longer three days (CLAUDE.md T20 2.2).
    expect(long?.minutes).toBe(240);
    expect(long === undefined ? 0 : long.price - long.material).toBe(100);
    // Every piece carries what the workshop earns by making it.
    for (const piece of CONTRACT_PIECES) {
      expect(piece.labour).toBe(piece.price - piece.material);
    }
    // What a piece takes off the rack is unchanged by the new prices, and for the two small ones
    // it is still the money in its sheets. The wardrobe front is the one that parts company: it
    // draws 1.1 sheets and is costed at 60, because Piotr set the price table and said the sheet
    // count stays (CLAUDE.md T20 2.2).
    for (const piece of CONTRACT_PIECES.filter((entry) => entry.id !== 'wardrobeFront')) {
      expect(piece.sheets).toBeCloseTo(piece.material / SHEET_VALUE, 2);
    }
    expect(long?.sheets).toBe(1.1);
    // The quantity is a week's work whatever the piece: thirty cut sheet packs are one wardrobe
    // front and twenty two drawer boxes.
    expect(quantityForPiece(CONTRACT_PIECES[0] as ContractPieceSpec, 30)).toBe(30);
    expect(quantityForPiece(short as ContractPieceSpec, 30)).toBe(23);
    // Six wardrobe fronts are a week now, where three days a front made it one
    // (CLAUDE.md T20 2.2).
    expect(quantityForPiece(long as ContractPieceSpec, 30)).toBe(6);
  });

  it('draws all three over the days, and prices each at its own piece', () => {
    const drawn = new Set<string>();
    for (let seed = 1; seed <= 200; seed += 1) {
      const state = newGame({ seed });
      state.clock.day = 1 + (seed % 20);
      const contract = drawContract(state, offerCarrier(state));
      drawn.add(contract.pieceId);
      const piece = CONTRACT_PIECES.find((entry) => entry.id === contract.pieceId);
      expect(contract.pricePerPiece).toBe(piece?.price);
    }
    expect(drawn.size).toBe(CONTRACT_PIECES.length);
  });
});

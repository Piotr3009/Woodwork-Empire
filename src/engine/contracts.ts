// Standing contracts (CLAUDE.md T13 3.16): repeat work at a low margin, so many pieces a week for
// a term of months at a price a piece. The offer arrives like an enquiry, one on the board at a
// time; accepting it opens a standing bar on the Work Plan; only people are put on it, and the
// machines it uses stay in the general queue, so a better saw makes more pieces without a click.
// A short week costs a point of reputation and is remembered; at the end of the term the client
// renegotiates from the delivery history and the player renews or lets it go.

import {
  CONTRACT_MIN_TIER,
  CONTRACT_OFFER_DAYS,
  CONTRACT_PIECES,
  CONTRACT_QUANTITY_PER_WEEK_MAX,
  CONTRACT_QUANTITY_PER_WEEK_MIN,
  CONTRACT_RENEW_FULL_WEEK,
  CONTRACT_RENEW_SHORT_WEEK,
  CONTRACT_SHORT_WEEK_REPUTATION,
  CONTRACT_TERM_MONTHS_MAX,
  CONTRACT_TERM_MONTHS_MIN,
  DAYS_PER_MONTH,
  DAYS_PER_WEEK,
  HIRING_SPECS,
  WORKING_DAYS_PER_WEEK,
  CONTRACT_OFFER_CHANCE_PER_DAY,
  CONTRACT_QUANTITY_STEP,
  CONTRACT_CLIENTS,
  CONTRACT_FREE_END_DAYS,
} from './constants';
import type { ContractPieceSpec } from './constants';
import { isBreak, isWorkingDay, weekOfDay, weekday } from './clock';
import { plural } from './text';
import { charge, formatMoney } from './economy';
import { queueEvent } from './events';
import { findJob, releaseJob, stagedJob, workerMinuteCost } from './jobs';
import {
  accumulateMachineMinute,
  bagsFull,
  claimMachine,
  hallProductivityFactor,
  has,
  machineIsShared,
  releaseMachines,
  variantFor,
} from './machines';
import { staffOutputFactor } from './owner';
import { changeReputation, reputationTier } from './reputation';
import { chance, int, pick } from './rng';
import type { RngCarrier } from './rng';
import { crewHasGoneHome, isWorkingToday, joiners } from './staff';
import { STATION_BENCH, machineStation, waitingStation } from './stations';
import { cncOptions, familyForStage, jobOnCnc, stageSpeed } from './stages';
import type { Contract, ContractWeek, GameState, StageId, Worker } from './types';

/** What a man on a contract carries in `jobId`, so the jobs leave him alone: not available for
 *  a job, not at one, and not a job the plan could find (CLAUDE.md T13 3.16). */
export const CONTRACT_MARKER = 'contract:';

export interface ContractCheck {
  ok: boolean;
  reason: string;
}

const OK: ContractCheck = { ok: true, reason: '' };

function pence(value: number): number {
  return Math.round(value * 100) / 100;
}

export function contractMarker(contractId: string): string {
  return `${CONTRACT_MARKER}${contractId}`;
}

export function findContract(state: GameState, contractId: string): Contract | null {
  return state.contracts.find((contract) => contract.id === contractId) ?? null;
}

export function offeredContract(state: GameState): Contract | null {
  return state.contracts.find((contract) => contract.status === 'offered') ?? null;
}

export function activeContracts(state: GameState): Contract[] {
  return state.contracts.filter((contract) => contract.status === 'active');
}

/** Terms that are over and waiting for the renew answer. */
export function endedContracts(state: GameState): Contract[] {
  return state.contracts.filter((contract) => contract.status === 'ended');
}

/** The piece the contract is for, off the pieces table. */
export function contractPiece(contract: Contract): ContractPieceSpec {
  const found = CONTRACT_PIECES.find((piece) => piece.id === contract.pieceId);
  const first = CONTRACT_PIECES[0];
  if (found) return found;
  if (first) return first;
  return {
    id: contract.pieceId,
    name: contract.pieceId,
    stages: ['cutting'],
    minutes: 45,
    price: 0,
    material: 0,
    sheets: 0,
    labour: 0,
  };
}

/** The active contract this man is on, or null. */
export function contractOfWorker(state: GameState, workerId: string): Contract | null {
  return activeContracts(state).find((contract) => contract.assigned.includes(workerId)) ?? null;
}

/** Everybody on a standing contract: the men `handsAtWork` and `menAtJobs` leave at their
 *  machines (CLAUDE.md T13 3.16). */
export function contractMen(state: GameState): string[] {
  const men: string[] = [];
  for (const contract of activeContracts(state)) men.push(...contract.assigned);
  return men;
}

/** Contracts come with reputation, from the second tier up (CLAUDE.md T13 3.16). */
export function contractsAllowed(state: GameState): boolean {
  return reputationTier(state.reputation) >= CONTRACT_MIN_TIER;
}

/** A term of so many months, in whole weeks. */
export function termWeeksFor(months: number): number {
  return Math.max(1, Math.round((months * DAYS_PER_MONTH) / DAYS_PER_WEEK));
}

/** Working days of the calendar week this day is in that fall inside the term. */
function workingDaysOfWeekInTerm(contract: Contract, day: number): number {
  const monday = day - weekday(day);
  const sunday = monday + DAYS_PER_WEEK - 1;
  const from = Math.max(monday, contract.startDay ?? monday);
  const to = Math.min(sunday, contract.endDay ?? sunday);
  let count = 0;
  for (let at = from; at <= to; at += 1) if (isWorkingDay(at)) count += 1;
  return count;
}

/** What the client wants in the week this day is in: the quantity a week, pro rata for a first
 *  or a last week the term only partly covers. */
export function weekWanted(contract: Contract, day: number): number {
  const days = workingDaysOfWeekInTerm(contract, day);
  return Math.round((contract.quantityPerWeek * days) / WORKING_DAYS_PER_WEEK);
}

/** The counter on the bar: "31 / 60 this week". */
export function contractCounterLine(contract: Contract, day: number): string {
  return `${contract.piecesThisWeek} / ${weekWanted(contract, day)} this week`;
}

/** Week so many of the term, for the bar. */
export function weekOfTerm(contract: Contract, day: number): number {
  if (contract.startDay === null) return 0;
  return weekOfDay(day) - weekOfDay(contract.startDay) + 1;
}

/** The stream the offers are drawn off: seeded from the game's seed and the day, so the same
 *  game rings the same shop on the same day, and the day's other rolls (the burglary, the
 *  accident, the quits) read the same numbers whether or not a contract is on the board. A draw
 *  a day off the main stream would have moved every measured month by a step (T13 2.1). */
export function offerCarrier(state: GameState): RngCarrier {
  return { rng: (state.seed ^ Math.imul(state.clock.day + 1, 0x9e3779b1)) | 0 };
}

/** An offer off the seeded stream: the piece, a round quantity a week in the band, a term in
 *  months, and the piece's price (CLAUDE.md T13 3.16). */
export function drawContract(state: GameState, carrier: RngCarrier = state): Contract {
  const piece = pick(carrier, CONTRACT_PIECES) ?? contractPiece({ pieceId: 'cutSheetPack' } as Contract);
  const client = pick(carrier, CONTRACT_CLIENTS) ?? 'a shop';
  const quantityPerWeek =
    int(
      carrier,
      Math.ceil(CONTRACT_QUANTITY_PER_WEEK_MIN / CONTRACT_QUANTITY_STEP),
      Math.floor(CONTRACT_QUANTITY_PER_WEEK_MAX / CONTRACT_QUANTITY_STEP),
    ) * CONTRACT_QUANTITY_STEP;
  const months = int(carrier, CONTRACT_TERM_MONTHS_MIN, CONTRACT_TERM_MONTHS_MAX);
  return {
    // Named by the day it was offered, one offer a day at most: the id counter is left alone, so
    // the ids of the jobs and the events read the same with and without an offer on the board.
    id: `contract-${state.clock.day}`,
    name: `${piece.name}s for ${client}`,
    pieceId: piece.id,
    quantityPerWeek,
    termWeeks: termWeeksFor(months),
    pricePerPiece: piece.price,
    status: 'offered',
    offeredDay: state.clock.day,
    expiresOnDay: state.clock.day + CONTRACT_OFFER_DAYS - 1,
    startDay: null,
    endDay: null,
    assigned: [],
    weekStartDay: null,
    piecesThisWeek: 0,
    pieceMinutes: 0,
    weeks: [],
    sheetsReserved: 0,
    sheetsUsed: 0,
    piecesMade: 0,
    revenue: 0,
    materialCost: 0,
    labourMinutes: 0,
    renegotiatedPrice: null,
  };
}

/** The day's open: one offer on the board at a time, from the second reputation tier up, on
 *  the chance of the day (CLAUDE.md T13 3.16). */
export function offerContract(state: GameState): void {
  if (!isWorkingDay(state.clock.day)) return;
  if (!contractsAllowed(state) || offeredContract(state) !== null) return;
  const carrier = offerCarrier(state);
  if (!chance(carrier, CONTRACT_OFFER_CHANCE_PER_DAY)) return;
  state.contracts.push(drawContract(state, carrier));
}

/** Accepting opens the term from today: the week in hand starts now and the last day is the
 *  term's weeks on from it. */
export function acceptContract(state: GameState, contractId: string): ContractCheck {
  const contract = findContract(state, contractId);
  if (!contract) return { ok: false, reason: 'No such contract' };
  if (contract.status !== 'offered') return { ok: false, reason: 'Not on offer' };
  const today = state.clock.day;
  contract.status = 'active';
  contract.startDay = today;
  contract.endDay = today + contract.termWeeks * DAYS_PER_WEEK - 1;
  contract.weekStartDay = today;
  contract.piecesThisWeek = 0;
  contract.pieceMinutes = 0;
  return OK;
}

export function declineContract(state: GameState, contractId: string): ContractCheck {
  const contract = findContract(state, contractId);
  if (!contract) return { ok: false, reason: 'No such contract' };
  if (contract.status !== 'offered') return { ok: false, reason: 'Not on offer' };
  state.contracts = state.contracts.filter((entry) => entry.id !== contractId);
  return OK;
}

/** Why this man cannot go on or come off the contract, or that he can. Only people are assigned,
 *  and only the joiners: the owner has his own jobs and the office its desks. */
export function contractAssignCheck(contract: Contract, worker: Worker | null): ContractCheck {
  if (contract.status !== 'active') return { ok: false, reason: 'Not an active contract' };
  if (!worker) return { ok: false, reason: 'No such person' };
  if (worker.role !== 'joiner') return { ok: false, reason: 'Only a joiner can be put on a contract' };
  return OK;
}

function takeOff(state: GameState, contract: Contract, worker: Worker): void {
  contract.assigned = contract.assigned.filter((id) => id !== worker.id);
  if (worker.jobId === contractMarker(contract.id)) worker.jobId = null;
  releaseMachines(state, worker.id);
}

/** Puts a joiner on the contract or takes him off it. Going on takes him off whatever job he was
 *  at, which goes back to ready, and marks him so the jobs leave him alone (CLAUDE.md T13 3.16). */
export function assignContract(
  state: GameState,
  contractId: string,
  workerId: string,
  on: boolean,
): ContractCheck {
  const contract = findContract(state, contractId);
  if (!contract) return { ok: false, reason: 'No such contract' };
  const worker = state.workers.find((entry) => entry.id === workerId) ?? null;
  const check = contractAssignCheck(contract, worker);
  if (!check.ok || !worker) return check;
  if (!on) {
    takeOff(state, contract, worker);
    return OK;
  }
  if (contract.assigned.includes(worker.id)) return OK;
  const elsewhere = contractOfWorker(state, worker.id);
  if (elsewhere) takeOff(state, elsewhere, worker);
  const job = worker.jobId === null ? null : findJob(state, worker.jobId);
  if (job) releaseJob(state, job);
  releaseMachines(state, worker.id);
  worker.jobId = contractMarker(contract.id);
  contract.assigned.push(worker.id);
  return OK;
}

/** The men on this contract who can put a minute in now: on the books and in today, on the day
 *  shift, not on a job of work, and not taken by a job since (a man the player put on a job
 *  through the Work Plan has left the contract, and is dropped from it here). */
export function contractHands(state: GameState, contract: Contract): Worker[] {
  const marker = contractMarker(contract.id);
  const hands: Worker[] = [];
  for (const id of [...contract.assigned]) {
    const worker = state.workers.find((entry) => entry.id === id);
    if (!worker || worker.role !== 'joiner') {
      contract.assigned = contract.assigned.filter((entry) => entry !== id);
      continue;
    }
    if (worker.jobId !== null && worker.jobId !== marker) {
      contract.assigned = contract.assigned.filter((entry) => entry !== id);
      continue;
    }
    if (!isWorkingToday(state, worker) || worker.taskId !== null || worker.shift !== 'day') continue;
    hands.push(worker);
  }
  return hands;
}

/** The stage the piece is at and the family it is done on: the CNC when the man can have one,
 *  otherwise the piece's own first stage, through the same reading a job's stages get. */
function pieceStage(state: GameState, who: string, piece: ContractPieceSpec): { stage: StageId; family: string | null } {
  const staged = stagedJob(0, 'sheet', false);
  const first = piece.stages[0] ?? 'cutting';
  const onCnc = first === 'cutting' && jobOnCnc(state, staged, cncOptions(state, who, { sawFallback: true }));
  const stage: StageId = onCnc ? 'cnc' : first;
  return { stage, family: familyForStage(staged, stage) };
}

/** Where a man on a contract stands, for the hall: at the machine of his stage, waiting at it,
 *  or at his bench. Null for a man on no contract. */
export function contractStationFor(state: GameState, worker: Worker): string | null {
  const contract = contractOfWorker(state, worker.id);
  if (!contract) return null;
  const { family } = pieceStage(state, worker.id, contractPiece(contract));
  if (family === null || !has(state, family) || machineIsShared(state, family)) return STATION_BENCH;
  const held = state.equipment.some((item) => item.specId === family && item.takenBy === worker.id);
  return held ? machineStation(family) : waitingStation(family);
}

export interface ContractMinute {
  /** Staff minutes put in, at the owner away factor, for the efficiency tally. */
  worked: number;
  /** True the minute the hall's bag store fills on a contract's saw. */
  bagsFilled: boolean;
}

/** A piece is done: the revenue and the material go through the ledger, one line a day each, and
 *  the totals for the closing report move (CLAUDE.md T13 3.16). */
function finishPiece(state: GameState, contract: Contract, piece: ContractPieceSpec): void {
  contract.pieceMinutes = Math.round((contract.pieceMinutes - piece.minutes) * 10000) / 10000;
  contract.piecesThisWeek += 1;
  contract.piecesMade += 1;
  contract.revenue = pence(contract.revenue + contract.pricePerPiece);
  contract.materialCost = pence(contract.materialCost + piece.material);
  charge(state, 'contract', `${contract.name}: pieces`, contract.pricePerPiece, { merge: true });
  charge(state, 'contract', `${contract.name}: material`, -piece.material, {
    unavoidable: true,
    merge: true,
  });
  // What the workshop earned by making it, which is what the rate counts: the piece's own labour
  // and not its margin, so the day's labour value means one thing whatever produced it
  // (CLAUDE.md T17 2.26).
  state.dayStats.labourValue = Math.round((state.dayStats.labourValue + piece.labour) * 10000) / 10000;
}

/** One production minute of every man on a contract: the piece in hand moves on at his rate and
 *  the class of the machine he actually got, the machines it uses stay in the general queue, and
 *  a finished piece is booked (CLAUDE.md T13 3.16). The crew take their dinner, nobody works an
 *  evening the owner is not there for, and nothing that makes dust runs with the bags full. */
export function runContractMinute(state: GameState): ContractMinute {
  const result: ContractMinute = { worked: 0, bagsFilled: false };
  const active = activeContracts(state);
  if (active.length === 0) return result;
  const minute = state.clock.minute;
  if (isBreak(minute)) return result;
  // The men on a contract go home at five with everybody else (CLAUDE.md T17 2.12).
  if (crewHasGoneHome(state)) return result;
  const away = staffOutputFactor(state);
  const used = new Map<string, number>();
  let hall: number | null = null;
  for (const contract of active) {
    const piece = contractPiece(contract);
    for (const worker of contractHands(state, contract)) {
      // The jobs' own hook writes the marker off every minute it finds no job behind it; it goes
      // back on here, so the man stays on the contract between the minutes.
      worker.jobId = contractMarker(contract.id);
      const { stage, family } = pieceStage(state, worker.id, piece);
      let speed: number;
      let machineId: string | null = null;
      if (family !== null && has(state, family) && !machineIsShared(state, family)) {
        if (bagsFull(state)) {
          worker.station = waitingStation(family);
          continue;
        }
        const machine = claimMachine(state, worker.id, family);
        if (machine === null) {
          worker.station = waitingStation(family);
          continue;
        }
        // The class he actually got, the way production reads it; the CNC's stage has its own
        // factor whatever the class (CLAUDE.md T7 3.1, 3.4).
        speed =
          stage === 'cnc'
            ? stageSpeed(state, stagedJob(0, 'sheet', false), stage).speed
            : (variantFor(machine)?.outputFactor ?? 1);
        machineId = machine.id;
        worker.station = machineStation(family);
      } else {
        // No machine of the family in the hall, or a tool out of a cabinet: the by hand penalty
        // or the tool's factor, through the one reading the stages give.
        speed = stageSpeed(state, stagedJob(0, 'sheet', false), stage).speed;
        worker.station = STATION_BENCH;
      }
      hall ??= hallProductivityFactor(state);
      const worth = worker.rate * away * speed * hall;
      contract.pieceMinutes = Math.round((contract.pieceMinutes + worth) * 10000) / 10000;
      contract.labourMinutes += 1;
      worker.productionMinutes += 1;
      state.dayStats.workMinutes += 1;
      result.worked += away;
      if (machineId !== null) used.set(machineId, (used.get(machineId) ?? 0) + 1);
      while (contract.pieceMinutes >= piece.minutes) finishPiece(state, contract, piece);
    }
  }
  if (used.size > 0 && accumulateMachineMinute(state, used)) result.bagsFilled = true;
  return result;
}

/** Closes the week in hand: what was wanted and what was made go on the history, a short week
 *  costs its point of reputation, and the next week opens today (CLAUDE.md T13 3.16). */
export function closeWeek(state: GameState, contract: Contract): ContractWeek {
  const start = contract.weekStartDay ?? state.clock.day;
  const week: ContractWeek = {
    week: weekOfDay(start),
    wanted: weekWanted(contract, start),
    made: contract.piecesThisWeek,
  };
  contract.weeks.push(week);
  if (week.made < week.wanted) {
    changeReputation(
      state,
      -CONTRACT_SHORT_WEEK_REPUTATION,
      `${contract.name}: ${week.made} of ${week.wanted} this week`,
    );
  }
  contract.weekStartDay = state.clock.day;
  contract.piecesThisWeek = 0;
  return week;
}

export function fullWeeksOf(contract: Contract): number {
  return contract.weeks.filter((week) => week.made >= week.wanted).length;
}

export function shortWeeksOf(contract: Contract): number {
  return contract.weeks.length - fullWeeksOf(contract);
}

/** What the client offers for another term: a percent up for every week delivered in full, two
 *  down for every short one (CLAUDE.md T13 3.16). A price a piece is whole pounds, the way the
 *  one money formatter prints it, so the offer is rounded to the pound. */
export function renegotiatedPriceFor(contract: Contract): number {
  const factor =
    1 + fullWeeksOf(contract) * CONTRACT_RENEW_FULL_WEEK - shortWeeksOf(contract) * CONTRACT_RENEW_SHORT_WEEK;
  return Math.round(contract.pricePerPiece * Math.max(0, factor));
}

export interface ClosingReport {
  pieces: number;
  revenue: number;
  material: number;
  labourMinutes: number;
  labourHours: number;
  /** The hours at what a joiner's minute costs, the job card's own figure. */
  labourCost: number;
  margin: number;
}

/** The hourly cost the labour is written up at: the joiners on the books, or the normal joiner's
 *  wage when there are none. */
function labourMinuteCost(state: GameState): number {
  const crew = joiners(state);
  if (crew.length > 0) {
    const weekly = crew.reduce((total, worker) => total + worker.weeklyWage, 0) / crew.length;
    return workerMinuteCost(weekly);
  }
  const normal = HIRING_SPECS.find((spec) => spec.role === 'joiner' && spec.tier === 'normal');
  return workerMinuteCost(normal?.weeklyWage ?? 0);
}

/** The closing report: pieces made, revenue, material, labour hours at cost, the net margin. */
export function closingReport(state: GameState, contract: Contract): ClosingReport {
  const labourCost = pence(contract.labourMinutes * labourMinuteCost(state));
  return {
    pieces: contract.piecesMade,
    revenue: pence(contract.revenue),
    material: pence(contract.materialCost),
    labourMinutes: contract.labourMinutes,
    labourHours: Math.round((contract.labourMinutes / 60) * 10) / 10,
    labourCost,
    margin: pence(contract.revenue - contract.materialCost - labourCost),
  };
}

function closingBody(state: GameState, contract: Contract): string {
  const report = closingReport(state, contract);
  const full = fullWeeksOf(contract);
  const short = shortWeeksOf(contract);
  return (
    `${contract.name}: the term is over. ${report.pieces} pieces made, ` +
    `${formatMoney(report.revenue)} of revenue, ${formatMoney(report.material)} of material, ` +
    `${report.labourHours} hours of labour at cost ${formatMoney(report.labourCost)}, ` +
    `net margin ${formatMoney(report.margin)}. ${full} full weeks and ${short} short. ` +
    `The client offers ${formatMoney(contract.renegotiatedPrice ?? contract.pricePerPiece)} a piece ` +
    'for another term. Renew or let it go on the Contracts tab.'
  );
}

/** The end of the term: the last week is closed, the client's new price is worked out from the
 *  history, the men come off it, and the closing report goes up (CLAUDE.md T13 3.16). */
export function endContract(state: GameState, contract: Contract): void {
  if (contract.status !== 'active') return;
  // The week in hand is closed when the term has days in it; a week opened on the Monday after
  // the last day holds nothing and is not a week the client counts.
  if (contract.weekStartDay !== null && contract.weekStartDay <= (contract.endDay ?? contract.weekStartDay)) {
    closeWeek(state, contract);
  }
  contract.renegotiatedPrice = renegotiatedPriceFor(contract);
  for (const id of [...contract.assigned]) {
    const worker = state.workers.find((entry) => entry.id === id);
    if (worker) takeOff(state, contract, worker);
  }
  contract.assigned = [];
  contract.status = 'ended';
  const report = closingReport(state, contract);
  queueEvent(state, {
    kind: 'contractEnded',
    title: `${contract.name}: the term is over`,
    body: closingBody(state, contract),
    data: {
      contractId: contract.id,
      pieces: report.pieces,
      revenue: report.revenue,
      material: report.material,
      labourHours: report.labourHours,
      labourCost: report.labourCost,
      margin: report.margin,
      offered: contract.renegotiatedPrice,
    },
  });
}

/** The day's open: an offer past its day comes off the board, the week that has gone is closed
 *  on the Monday, and a term whose last day has passed ends (CLAUDE.md T13 3.16). */
export function runContractDay(state: GameState): void {
  const today = state.clock.day;
  state.contracts = state.contracts.filter(
    (contract) => !(contract.status === 'offered' && contract.expiresOnDay < today),
  );
  for (const contract of activeContracts(state)) {
    if (contract.weekStartDay !== null && weekOfDay(today) !== weekOfDay(contract.weekStartDay)) {
      closeWeek(state, contract);
    }
    if (contract.endDay !== null && today > contract.endDay) endContract(state, contract);
  }
}

/** Why the player cannot end this contract yet, or that he can. The first month is the term he
 *  committed to; after it he may walk away for nothing but the work he will not now do
 *  (PIOTR, 17.09; CLAUDE.md T17 2.22). */
export function endContractCheck(state: GameState, contractId: string): ContractCheck {
  const contract = state.contracts.find((entry) => entry.id === contractId);
  if (!contract) return { ok: false, reason: 'That contract has gone' };
  if (contract.status !== 'active') return { ok: false, reason: 'It is not running' };
  const since = state.clock.day - (contract.startDay ?? state.clock.day);
  if (since < CONTRACT_FREE_END_DAYS) {
    const left = CONTRACT_FREE_END_DAYS - since;
    return { ok: false, reason: `The first month stands: ${plural(left, 'day', 'days')} to go` };
  }
  return OK;
}

/** The player ends a running contract himself. Nothing is charged: what he loses is the work
 *  (CLAUDE.md T17 2.22). */
export function endContractNow(state: GameState, contractId: string): ContractCheck {
  const check = endContractCheck(state, contractId);
  if (!check.ok) return check;
  const contract = state.contracts.find((entry) => entry.id === contractId);
  if (!contract) return { ok: false, reason: 'That contract has gone' };
  contract.endDay = state.clock.day;
  endContract(state, contract);
  return OK;
}

/** The renew answer: yes opens a fresh term at the client's new price from today, no lets the
 *  contract go. Either way the ended one leaves the books. */
export function renewContract(state: GameState, contractId: string, accept: boolean): ContractCheck {
  const contract = findContract(state, contractId);
  if (!contract) return { ok: false, reason: 'No such contract' };
  if (contract.status !== 'ended' || contract.renegotiatedPrice === null) {
    return { ok: false, reason: 'The term is not over' };
  }
  state.contracts = state.contracts.filter((entry) => entry.id !== contractId);
  if (!accept) return OK;
  // The same piece, quantity and term at the new price, on the books as a fresh offer that is
  // accepted at once: nothing is drawn, so the seeded stream is untouched.
  const renewed: Contract = {
    ...contract,
    id: `${contract.id}-r`,
    pricePerPiece: contract.renegotiatedPrice,
    status: 'offered',
    offeredDay: state.clock.day,
    expiresOnDay: state.clock.day,
    startDay: null,
    endDay: null,
    assigned: [],
    weekStartDay: null,
    piecesThisWeek: 0,
    pieceMinutes: 0,
    weeks: [],
    piecesMade: 0,
    revenue: 0,
    materialCost: 0,
    labourMinutes: 0,
    renegotiatedPrice: null,
  };
  state.contracts.push(renewed);
  acceptContract(state, renewed.id);
  return OK;
}

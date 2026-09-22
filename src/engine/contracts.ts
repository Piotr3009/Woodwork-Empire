// Standing contracts (CLAUDE.md T13 3.16): repeat work at a low margin, so many pieces a week for
// a term of months at a price a piece. The offer arrives like an enquiry, one on the board at a
// time; accepting it opens a standing bar on the Work Plan; only people are put on it, and the
// machines it uses stay in the general queue, so a better saw makes more pieces without a click.
// A short week costs a point of reputation and is remembered; at the end of the term the client
// renegotiates from the delivery history and the player renews or lets it go.

import {
  CONTRACT_MARGIN_PER_DAY,
  CONTRACT_MIN_TIER,
  CONTRACT_OFFER_DAYS,
  CONTRACT_PIECES,
  CONTRACT_QUANTITY_BANDS,
  CONTRACT_REFERENCE_CLASS,
  CONTRACT_REFERENCE_TIER,
  CONTRACT_RENEW_FULL_WEEK,
  CONTRACT_RENEW_SHORT_WEEK,
  CONTRACT_SHORT_WEEKS_ALLOWED,
  CONTRACT_SHORT_WEEK_REPUTATION,
  CONTRACT_TERM_MONTHS_MAX,
  CONTRACT_TERM_MONTHS_MIN,
  DAYS_PER_MONTH,
  DAYS_PER_WEEK,
  HIRING_SPECS,
  MINUTES_PER_WORKING_DAY,
  WORKING_DAYS_PER_WEEK,
  CONTRACT_OFFER_CHANCE_PER_DAY,
  CONTRACT_QUANTITY_STEP,
  CONTRACT_QUANTITY_MINUTES,
  CONTRACT_CLIENTS,
  CONTRACT_FREE_END_DAYS,
  ANSWER_MAX,
  ANSWER_MIN,
  WORKER_RATES,
} from './constants';
import type { ContractPieceSpec, ContractQuantityBand } from './constants';
import { answerSkew, skewed } from './board';
import { isBreak, isWorkingDay, weekOfDay, weekday, workedMinutesOfDay } from './clock';
import { plural } from './text';
import { charge, formatMoney } from './economy';
import { queueEvent } from './events';
import { isOnJob, stagedJob, takeOffJob, workerMinuteCost } from './jobs';
import { freeSheets } from './materials';
import {
  OWNER,
  accumulateMachineMinute,
  bagsFull,
  bestMachineOf,
  bookOutputMinute,
  claimMachine,
  findSpec,
  hallProductivityFactor,
  has,
  machineIsShared,
  machineWearPerMinute,
  releaseMachines,
  variantFor,
  wearPerMinuteOf,
} from './machines';
import { ownerDrawPerDay, staffOutputFactor } from './owner';
import { changeReputation, effectiveReputation, reputationTier } from './reputation';
import { chance, float, int, pick } from './rng';
import type { RngCarrier } from './rng';
import { crewHasGoneHome, isWorkingToday, joiners } from './staff';
import { STATION_BENCH, STATION_NO_BENCH, machineStation, waitingStation } from './stations';
import { cncOptions, familyForStage, jobOnCnc, stageSpeed } from './stages';
import type { Contract, ContractWeek, Equipment, GameState, StageId, Worker } from './types';

/** What a man on a contract carries in `jobId`, so the jobs leave him alone: not available for
 *  a job, not at one, and not a job the plan could find (CLAUDE.md T13 3.16). */
export const CONTRACT_MARKER = 'contract:';

/** Re-exported from constants.ts, where it lives with the rest of the contract figures: the
 *  engine and the tests both read it off this module (CLAUDE.md T20 2.1.6). */
export { CONTRACT_SHORT_WEEKS_ALLOWED };

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
    material: 0,
    sheets: 0,
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

/** The men on a standing contract who can hold a machine this minute: the hands of every active
 *  contract that has material for its next piece, while the crew are in. The jobs' men are let
 *  off their machines the minute they stop, and so is a contract's man now: until v45 every man
 *  on a contract kept his saw whatever he was doing, so one waiting for a delivery, or gone home
 *  at five, held the one saw and every job's man stood behind it with nobody at it (PIOTR, 22.09:
 *  "everyone waits for the saw and nobody does anything"; v45). */
export function contractMenAtWork(state: GameState): string[] {
  if (crewHasGoneHome(state)) return [];
  const men: string[] = [];
  for (const contract of activeContracts(state)) {
    if (contractWaitingForMaterial(state, contract)) continue;
    men.push(...contractHands(state, contract).map((worker) => worker.id));
  }
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

/** Working days of this calendar week that fall inside the term and have been worked by the end
 *  of `day`, today included: what the week's line is read against (CLAUDE.md T20 2.1.4). */
function workingDaysOfWeekSoFar(contract: Contract, day: number): number {
  const monday = day - weekday(day);
  const from = Math.max(monday, contract.startDay ?? monday);
  const to = Math.min(day, contract.endDay ?? day);
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

/** Pieces a week of this piece for a week's work drawn in cut sheet packs: the same minutes of
 *  work whatever the piece is, and never less than one (CLAUDE.md T17 2.22). */
export function quantityForPiece(piece: ContractPieceSpec, wanted: number): number {
  if (piece.minutes <= 0) return wanted;
  return Math.max(1, Math.round((wanted * CONTRACT_QUANTITY_MINUTES) / piece.minutes));
}

// ---------------------------------------------------------------------------
// The price (PIOTR, 21.09; v40): worked out from what a day on the contract is to leave at the
// entry point, never typed. A contract is like a job: the client's price is what it is, and how
// much of it the workshop keeps depends on the man and the machine it puts on it.
// ---------------------------------------------------------------------------

/** The band the client's quantity is drawn from at this standing: the row with the highest
 *  `from` at or under the reputation (CLAUDE.md v40). */
export function contractQuantityBand(reputation: number): ContractQuantityBand {
  let band = CONTRACT_QUANTITY_BANDS[0] ?? { from: 0, min: 20, max: 40 };
  for (const row of CONTRACT_QUANTITY_BANDS) {
    if (reputation >= row.from && row.from >= band.from) band = row;
  }
  return band;
}

/** The family the piece is done on: its first stage's machine, the way `runContractMinute` works
 *  the whole piece at that stage (the other stages of a piece are parked, CLAUDE.md T23 8). */
function pieceFamily(piece: ContractPieceSpec): string | null {
  const first = piece.stages[0] ?? 'cutting';
  return familyForStage(stagedJob(0, 'sheet', false), first);
}

/** The entry point the price is set at: the man of `CONTRACT_REFERENCE_TIER` on the
 *  `CONTRACT_REFERENCE_CLASS` of the piece's own machine, with his minutes, his wages, and the
 *  service that class costs over those minutes. A piece with no machine (a stage done by hand)
 *  costs the by hand speed and no wear. */
export interface ContractReference {
  minutes: number;
  labourCost: number;
  wear: number;
  piecesPerDay: number;
}

export function contractReferenceFor(piece: ContractPieceSpec): ContractReference {
  const rate = WORKER_RATES[CONTRACT_REFERENCE_TIER];
  const middling = HIRING_SPECS.find(
    (spec) => spec.role === 'joiner' && spec.tier === CONTRACT_REFERENCE_TIER,
  );
  const family = pieceFamily(piece);
  const spec = family === null ? undefined : findSpec(family);
  const standard = spec?.variants.find((variant) => variant.id === CONTRACT_REFERENCE_CLASS);
  const speed = standard?.outputFactor ?? 1;
  const minutes = Math.max(1, Math.round(piece.minutes / (rate * (speed > 0 ? speed : 1))));
  const labourCost = pence(minutes * workerMinuteCost(middling?.monthlyWage ?? 0));
  const wear = pence(minutes * (standard === undefined ? 0 : wearPerMinuteOf(standard.price)));
  return {
    minutes,
    labourCost,
    wear,
    piecesPerDay: Math.max(1, Math.floor(MINUTES_PER_WORKING_DAY / minutes)),
  };
}

/** What the client pays a piece: the material in it, the entry man's wages over it, the wear of
 *  the entry machine over it, and the day's margin spread over the pieces that man makes in a
 *  day, to the pound (PIOTR, 21.09: about 200 a day at the entry point, more with a better man or
 *  a better machine, less with worse). One figure a piece for every offer, before the client's
 *  own answer moves it (`drawContract`). */
export function contractPriceFor(piece: ContractPieceSpec): number {
  const reference = contractReferenceFor(piece);
  return Math.round(
    piece.material + reference.labourCost + reference.wear + CONTRACT_MARGIN_PER_DAY / reference.piecesPerDay,
  );
}

/** The labour value in a piece of this contract: what the workshop earned by making it over the
 *  material in it, which is what the workshop rate counts (CLAUDE.md T17 2.26). Read off the
 *  contract's own price, so a contract the client priced high earns more an hour. */
export function contractLabourValue(contract: Contract): number {
  return pence(Math.max(0, contract.pricePerPiece - contractPiece(contract).material));
}

// ---------------------------------------------------------------------------
// The material (PIOTR, 17.09; CLAUDE.md T17 2.22): a contract's sheets come off the rack the way
// a job's do, held while the week runs and drawn as the pieces are made. Nothing is bought on the
// contract line any more.
// ---------------------------------------------------------------------------

/** Whole sheets this many pieces of this piece take off the rack, rounded up the way a job's
 *  are: the bench always holds the sheet it is cutting (CLAUDE.md T2 3.6). */
export function sheetsForPieces(piece: ContractPieceSpec, pieces: number): number {
  if (piece.sheets <= 0 || pieces <= 0) return 0;
  return Math.ceil(pieces * piece.sheets);
}

/** Sheets the week in hand still wants and the contract has not got a claim on. */
export function contractShortfall(state: GameState, contract: Contract): number {
  const left = Math.max(0, weekWanted(contract, state.clock.day) - contract.piecesThisWeek);
  const wants = sheetsForPieces(contractPiece(contract), left);
  return Math.max(0, wants - contract.sheetsReserved);
}

/** Holds what the rack can spare for the week in hand, up to what it wants. Returns what it
 *  held, like the job side's own `reserveSheetsFor`. */
export function reserveContractSheets(state: GameState, contract: Contract): number {
  if (contract.status !== 'active') return 0;
  const held = Math.min(contractShortfall(state, contract), freeSheets(state));
  if (held <= 0) return 0;
  contract.sheetsReserved += held;
  return held;
}

/** Sheets the next piece owes the rack, over what has been drawn for the pieces before it. */
function sheetsOwedByContract(contract: Contract, piece: ContractPieceSpec): number {
  return sheetsForPieces(piece, contract.piecesMade + 1) - contract.sheetsUsed;
}

/** What this contract may take off the rack: what it is holding, and the sheets nobody has a
 *  claim on. It never cuts into what a job is holding (CLAUDE.md T13 3.2). */
function sheetsOpenTo(state: GameState, contract: Contract): number {
  return contract.sheetsReserved + freeSheets(state);
}

/** True while the rack cannot give this contract the sheets its next piece needs: the men on it
 *  stand at their benches until a delivery lands, the way a job waits for material. */
export function contractWaitingForMaterial(state: GameState, contract: Contract): boolean {
  const due = sheetsOwedByContract(contract, contractPiece(contract));
  return due > 0 && sheetsOpenTo(state, contract) < due;
}

/** Takes the finished piece's sheets off the rack, out of what was held for it first. False when
 *  the rack cannot supply them, and then the piece is not booked. */
function drawContractSheets(state: GameState, contract: Contract, piece: ContractPieceSpec): boolean {
  const due = sheetsOwedByContract(contract, piece);
  if (due <= 0) return true;
  if (sheetsOpenTo(state, contract) < due) return false;
  state.stock.sheets -= due;
  contract.sheetsUsed += due;
  contract.sheetsReserved = Math.max(0, contract.sheetsReserved - due);
  return true;
}

/** What one piece, one day and one week come to with one man on it: every figure the offer card
 *  of CLAUDE.md T20 2.1.1 puts in front of the player before he takes the contract. */
export interface ContractResult {
  /** Minutes this man takes over a piece, at his rate and on the machines the hall has. */
  minutes: number;
  labourCost: number;
  /** The material in one piece, off the piece's own table. */
  material: number;
  /** The service his minutes at the machine cost, at the class he would get: a tenth of its price
   *  every `SERVICE_INTERVAL_HOURS` (v40). Nothing when the piece is made by hand. */
  wear: number;
  /** The class he would stand at, for the card's line; empty by hand. */
  machineName: string;
  margin: number;
  /** Pieces he makes in a working day, whole, the lunch break out. */
  piecesPerDay: number;
  /** Pieces a day the client's order asks for at the least: his week's quantity over the working
   *  days of the week. It is a floor and not a ceiling, because the client takes every piece that
   *  is made (PIOTR, 21.09: "he takes as many as we can make"; v42). */
  piecesNeededPerDay: number;
  /** Minutes of the day left over when his last whole piece is done. He starts the next one with
   *  them and carries it into the morning: the contract has his whole day (v42). */
  freeMinutes: number;
  /** Pieces the week comes to with him on it: five working days of his own pieces, whatever the
   *  client ordered, because the client takes every piece he makes (PIOTR, 21.09; v42). */
  piecesPerWeek: number;
  /** A day of his pieces: what they leave after his wages and the machine's wear (v40). */
  dayResult: number;
  /** The week's result: his pieces times his margin, his own wages already taken off in it. */
  weekResult: number;
  termResult: number;
}

/** The owner's own rate. The ladder of the tiers is measured against him, so he is 1 by
 *  definition (CLAUDE.md T20 2.5). */
const OWNER_RATE = 1;

/** What a minute of this man costs on a contract: a worker's monthly wage through the job card's
 *  own divisor, and the owner's daily draw over the minutes of his day, because the owner's days
 *  cost his draw (CLAUDE.md T20 2.1.1, T21 2.10). */
export function contractMinuteCost(state: GameState, worker: Worker | null): number {
  if (worker) return workerMinuteCost(worker.monthlyWage);
  return ownerDrawPerDay(state) / MINUTES_PER_WORKING_DAY;
}

/** What the hall does to this piece for this man: the machine of the piece's own stage, the CNC
 *  when he can have one, or the by hand reading when the hall has neither. It is the same reading
 *  the minute loop works at, so the card's minutes are the minutes he really takes
 *  (CLAUDE.md T20 2.1.1). */
export function contractPieceSpeed(state: GameState, who: string, piece: ContractPieceSpec): number {
  const { stage } = pieceStage(state, who, piece);
  return stageSpeed(state, stagedJob(0, 'sheet', false), stage).speed;
}

/** The men who would do it, in the order the card draws them: the owner, then every joiner on the
 *  books (CLAUDE.md T20 2.1.1). */
export function contractCandidates(state: GameState): string[] {
  return [OWNER, ...joiners(state).map((worker) => worker.id)];
}

/** The man the card is worked out for: the one the player picked, or the first joiner, or the
 *  owner when there is no joiner (CLAUDE.md T20 2.1.1). */
export function contractManOf(state: GameState, picked: string | null): string {
  const men = contractCandidates(state);
  if (picked !== null && men.includes(picked)) return picked;
  return men.find((who) => who !== OWNER) ?? OWNER;
}

/** The man behind an id, or null for the owner, who is not on the books. */
export function contractWorkerOf(state: GameState, who: string): Worker | null {
  return state.workers.find((entry) => entry.id === who) ?? null;
}

/** The whole of the result at a speed the caller names, so the card and the machine tip are one
 *  arithmetic read twice (CLAUDE.md T20 2.1.1). */
function resultAtSpeed(
  state: GameState,
  contract: Contract,
  worker: Worker | null,
  speed: number,
  /** The machine the speed belongs to when it is not one the hall has: its wear a minute and its
   *  name, for the tip that costs a machine before it is bought (v40). */
  candidate: { wearPerMinute: number; name: string } | null = null,
): ContractResult {
  const piece = contractPiece(contract);
  const rate = worker === null ? OWNER_RATE : worker.rate > 0 ? worker.rate : 1;
  // His minutes over a piece, which is what the day is counted in: never less than one.
  const minutes = Math.max(1, Math.round(piece.minutes / (rate * (speed > 0 ? speed : 1))));
  const labourCost = pence(minutes * contractMinuteCost(state, worker));
  const machine = candidate === null ? pieceMachine(state, worker === null ? OWNER : worker.id, piece) : null;
  const wearPerMinute =
    candidate !== null ? candidate.wearPerMinute : machine === null ? 0 : machineWearPerMinute(machine);
  const wear = pence(minutes * wearPerMinute);
  const margin = pence(contract.pricePerPiece - piece.material - labourCost - wear);
  const piecesPerDay = Math.floor(MINUTES_PER_WORKING_DAY / minutes);
  // Every working day of the week, and no ceiling at what the client ordered: the man on a
  // contract is the contract's all day and the client takes every piece he makes, so the week is
  // what he can make and the order is the floor under it (PIOTR, 21.09: "he takes as many as we
  // can make, week after week until the contract is used up"; v42).
  const piecesPerWeek = piecesPerDay * WORKING_DAYS_PER_WEEK;
  return {
    minutes,
    labourCost,
    material: piece.material,
    wear,
    machineName:
      candidate !== null
        ? candidate.name
        : machine === null
          ? ''
          : (variantFor(machine)?.name ?? findSpec(machine.specId)?.name ?? ''),
    margin,
    dayResult: pence(piecesPerDay * margin),
    piecesPerDay,
    piecesNeededPerDay: Math.ceil(contract.quantityPerWeek / WORKING_DAYS_PER_WEEK),
    freeMinutes: Math.max(0, MINUTES_PER_WORKING_DAY - piecesPerDay * minutes),
    piecesPerWeek,
    weekResult: pence(piecesPerWeek * margin),
    termResult: pence(piecesPerWeek * margin * contract.termWeeks),
  };
}

/** What one piece is worth with this man on it: the price less the material in it and less what
 *  his own time costs at his own rate and on the machines the hall has, so the result of putting
 *  him on it is on his own row before he is put on it (PIOTR, 17.09; CLAUDE.md T17 2.22,
 *  T20 2.1.1). A slower man takes more minutes over a piece, and what those minutes cost is his
 *  own monthly wage. The wage ladder is steeper than the speed ladder, 1,950, 2,600, 3,500 and
 *  4,330 a month against 0.6, 0.8, 1.0 and 1.2 of the owner, so a piece costs more in a better
 *  man's time and the thinner margin is the better man's (CLAUDE.md T21 2.9, 2.10). `null` is the
 *  owner, whose days cost his draw: he is costed here, and the check says whether he may be put on
 *  it. */
export function contractResultFor(
  state: GameState,
  contract: Contract,
  worker: Worker | null,
): ContractResult {
  const piece = contractPiece(contract);
  const who = worker === null ? OWNER : worker.id;
  return resultAtSpeed(state, contract, worker, contractPieceSpeed(state, who, piece));
}

/** The one machine that would shorten the piece most among those the hall has not got: what the
 *  piece would take, what the day would come to and what the week would gain by it. Null when
 *  there is nothing to buy that would help (PIOTR, the mockup of docs/mockups/t20;
 *  CLAUDE.md T20 2.1.1). */
export interface ContractMachineTip {
  specId: string;
  name: string;
  minutes: number;
  piecesPerDay: number;
  weekGain: number;
}

export function contractMachineTip(
  state: GameState,
  contract: Contract,
  who: string,
): ContractMachineTip | null {
  const piece = contractPiece(contract);
  const worker = contractWorkerOf(state, who);
  const now = contractResultFor(state, contract, worker);
  const { stage, family } = pieceStage(state, who, piece);
  const staged = stagedJob(0, 'sheet', false);
  // The machines that would do this piece's own stage: the family it is done on, and the CNC,
  // which takes the cutting off the saw altogether (CLAUDE.md T7 3.4).
  const candidates: string[] = [];
  if (family !== null && family !== 'cnc' && !has(state, family)) candidates.push(family);
  if (stage === 'cutting' && !has(state, 'cnc')) candidates.push('cnc');
  let best: ContractMachineTip | null = null;
  for (const specId of candidates) {
    const spec = findSpec(specId);
    if (!spec) continue;
    // The class the catalogue offers first is the one he would buy, and its wear comes with it,
    // so the tip does not promise a saw's minutes at a used saw's service bill (v40).
    const first = spec.variants[0];
    const speed = specId === 'cnc' ? stageSpeed(state, staged, 'cnc').speed : (first?.outputFactor ?? 1);
    const withIt = resultAtSpeed(state, contract, worker, speed, {
      wearPerMinute: first === undefined ? 0 : wearPerMinuteOf(first.price),
      name: first?.name ?? spec.name,
    });
    const weekGain = pence(withIt.weekResult - now.weekResult);
    if (weekGain <= 0) continue;
    if (best === null || weekGain > best.weekGain) {
      best = { specId, name: spec.name, minutes: withIt.minutes, piecesPerDay: withIt.piecesPerDay, weekGain };
    }
  }
  return best;
}

/** How the week in hand is going: what is made, what is wanted, and whether what is left of the
 *  week at the pace of the men on it will reach the quantity (CLAUDE.md T20 2.1.2). What is left
 *  of today is counted in minutes, so the reading changes as the day goes by. */
export interface ContractPace {
  made: number;
  wanted: number;
  onCourse: boolean;
}

export function weekPace(state: GameState, contract: Contract): ContractPace {
  const day = state.clock.day;
  const wanted = weekWanted(contract, day);
  const made = contract.piecesThisWeek;
  if (made >= wanted) return { made, wanted, onCourse: true };
  const leftToday = Math.max(
    0,
    MINUTES_PER_WORKING_DAY - workedMinutesOfDay(state.clock.minute, state.owner.breakSkipped),
  );
  const daysLeft = Math.max(
    0,
    workingDaysOfWeekInTerm(contract, day) - workingDaysOfWeekSoFar(contract, day),
  );
  let coming = 0;
  for (const worker of contractHands(state, contract)) {
    const result = contractResultFor(state, contract, worker);
    coming += Math.floor(leftToday / result.minutes) + result.piecesPerDay * daysLeft;
  }
  return { made, wanted, onCourse: made + coming >= wanted };
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
  // The client asks for a week's work, not a count: the band is drawn in cut sheet packs, the
  // piece it was written for, and turned into pieces of the one that was drawn, so a contract for
  // three day pieces wants one a week (CLAUDE.md T17 2.22). The draw itself is unchanged, so the
  // stream is the same shape it was.
  const band = contractQuantityBand(effectiveReputation(state));
  const wanted =
    int(
      carrier,
      Math.ceil(band.min / CONTRACT_QUANTITY_STEP),
      Math.floor(band.max / CONTRACT_QUANTITY_STEP),
    ) * CONTRACT_QUANTITY_STEP;
  const quantityPerWeek = quantityForPiece(piece, wanted);
  const months = int(carrier, CONTRACT_TERM_MONTHS_MIN, CONTRACT_TERM_MONTHS_MAX);
  // The client's own answer on the price, the way a job's client answers a budget: a factor in
  // the one band, bent by the standing of the shop and the team, so a poor name is offered less
  // and a good one more, and neither ever leaves the band (CLAUDE.md T13 3.24; v40). Drawn off a
  // side stream seeded from the offer's own, so the piece, the client, the quantity and the term
  // come off the carrier exactly as they always did, and a month that draws its contract off the
  // main stream is not moved by a step (T13 2.1, the reason `offerCarrier` exists).
  const side: RngCarrier = { rng: (carrier.rng ^ 0x5bd1e995) | 0 };
  const answer = ANSWER_MIN + (ANSWER_MAX - ANSWER_MIN) * skewed(float(side, 0, 1), answerSkew(state));
  const pricePerPiece = Math.max(1, Math.round(contractPriceFor(piece) * answer));
  return {
    // Named by the day it was offered, one offer a day at most: the id counter is left alone, so
    // the ids of the jobs and the events read the same with and without an offer on the board.
    id: `contract-${state.clock.day}`,
    name: `${piece.name}s for ${client}`,
    pieceId: piece.id,
    quantityPerWeek,
    termWeeks: termWeeksFor(months),
    pricePerPiece,
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
    endedBy: 'term',
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

/** Why this man cannot be put on a contract at all, or that he can. Only people are put on one
 *  and only the joiners: the office has its desks, and the owner has his own jobs and is not on
 *  the books at all, so he is told so on his own row. He is still costed on the offer card, which
 *  is what the card is for (PIOTR; CLAUDE.md T20 2.1.1). */
export function contractManCheck(state: GameState, who: string): ContractCheck {
  if (who === OWNER) {
    return { ok: false, reason: 'A contract is work for a joiner: you cannot be put on one' };
  }
  const worker = state.workers.find((entry) => entry.id === who) ?? null;
  if (!worker) return { ok: false, reason: 'No such person' };
  if (worker.role !== 'joiner') return { ok: false, reason: 'Only a joiner can be put on a contract' };
  return OK;
}

/** Why this man cannot go on or come off this contract, or that he can: the contract has to be
 *  running, and then it is the one rule about the man. */
export function contractAssignCheck(state: GameState, contract: Contract, who: string): ContractCheck {
  if (contract.status !== 'active') return { ok: false, reason: 'Not an active contract' };
  return contractManCheck(state, who);
}

function takeOff(state: GameState, contract: Contract, worker: Worker): void {
  contract.assigned = contract.assigned.filter((id) => id !== worker.id);
  // Off the contract and on nothing: he comes off it with no job under him and waits for the
  // boss like any free man, because the contract took him off the jobs when it took him (v42).
  if (worker.jobId === contractMarker(contract.id)) worker.jobId = null;
  releaseMachines(state, worker.id);
}

/** Puts a joiner on the contract or takes him off it. A man on a contract is the contract's and
 *  nothing else: he comes off every job he was on and cannot be put on one while he is on it, so
 *  the player can count the men he has left for the board (PIOTR, 21.09: "if you put a man on a
 *  contract he has to vanish from the jobs, even from the possibility of being assigned to one";
 *  v42). Turn 20's split day, where the contract had his morning and a job the rest, is gone. */
export function assignContract(
  state: GameState,
  contractId: string,
  workerId: string,
  on: boolean,
): ContractCheck {
  const contract = findContract(state, contractId);
  if (!contract) return { ok: false, reason: 'No such contract' };
  const worker = state.workers.find((entry) => entry.id === workerId) ?? null;
  const check = contractAssignCheck(state, contract, workerId);
  if (!check.ok || !worker) return check;
  if (!on) {
    takeOff(state, contract, worker);
    return OK;
  }
  if (contract.assigned.includes(worker.id)) return OK;
  const elsewhere = contractOfWorker(state, worker.id);
  if (elsewhere) takeOff(state, elsewhere, worker);
  // Off every job of work first: the contract has his whole day from here (PIOTR, 21.09; v42).
  for (const job of state.jobs) {
    if (isOnJob(job, worker.id)) takeOffJob(state, job.id, worker.id);
  }
  releaseMachines(state, worker.id);
  worker.jobId = contractMarker(contract.id);
  contract.assigned.push(worker.id);
  return OK;
}

/** The men on this contract who can put a minute in now: on the books and in today, on the day
 *  shift and not on an errand. Assigned once, a man stays on it until he is taken off or leaves
 *  (PIOTR; CLAUDE.md T20 2.1.2), so a job of work no longer drops him from it: the day's order is
 *  `contractWantsToday` and nothing else. */
export function contractHands(state: GameState, contract: Contract): Worker[] {
  const hands: Worker[] = [];
  for (const id of [...contract.assigned]) {
    const worker = state.workers.find((entry) => entry.id === id);
    if (!worker || worker.role !== 'joiner') {
      contract.assigned = contract.assigned.filter((entry) => entry !== id);
      continue;
    }
    if (!isWorkingToday(state, worker) || worker.taskId !== null || worker.shift !== 'day') continue;
    hands.push(worker);
  }
  return hands;
}

/** Does the contract want this man this minute? It wants him every minute he is on it: he is the
 *  contract's whole day and has no job of work to go to, because going on a contract took him off
 *  the jobs (PIOTR, 21.09; v42). He makes pieces past the day's share and past the week's order,
 *  and the client takes them: "he takes as many as we can make, week after week until the
 *  contract is used up". Turn 20's rule, where he made the day's share and then went to a job, is
 *  gone with the split day. This is still the one place the day's order is decided: the job's
 *  hands, the contract's minute and the Contracts tab all read it. */
export function contractWantsToday(state: GameState, workerId: string): boolean {
  return contractOfWorker(state, workerId) !== null;
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

/** The machine this man's piece would be made on: the best CNC when he can have one, else the
 *  best of the piece's own family in the hall, else nothing, by hand. The card's wear and the
 *  closing report both read it, so what a piece is said to cost the machine is one reading. */
function pieceMachine(state: GameState, who: string, piece: ContractPieceSpec): Equipment | null {
  const { stage, family } = pieceStage(state, who, piece);
  if (stage === 'cnc') return bestMachineOf(state, 'cnc');
  if (family === null || !has(state, family) || machineIsShared(state, family)) return null;
  return bestMachineOf(state, family);
}

/** Where a man on a contract stands, for the hall: at the canteen door when the contract cannot
 *  use him this minute, and otherwise at the machine of his stage, waiting at it, or at his bench.
 *  Null for a man on no contract.
 *
 *  v45 let him go of his saw the minute the contract stopped wanting him, and left him standing at
 *  the saw's waiting cell all the same, which reads as a man queueing for a machine nobody is at.
 *  From tonight he stands where a man with nothing to do stands, at the canteen door, and the mark
 *  over his head says the contract has no sheets [PIOTR, 22.09] (CLAUDE.md T24 2.3). The one
 *  question is `contractMenAtWork`, which is the same list that decides whether he may hold a
 *  machine, so where he stands and what he may do cannot disagree. */
export function contractStationFor(state: GameState, worker: Worker): string | null {
  const contract = contractOfWorker(state, worker.id);
  if (!contract) return null;
  if (!contractMenAtWork(state).includes(worker.id)) return STATION_NO_BENCH;
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

/** A piece is done: the revenue goes through the ledger, one growing line a day, the sheets in it
 *  come off the rack and the totals for the closing report move (CLAUDE.md T13 3.16, T17 2.22).
 *  False when the rack could not cover it, and then nothing is booked at all. */
function finishPiece(state: GameState, contract: Contract, piece: ContractPieceSpec): boolean {
  // The material is on the rack and is taken off it, never bought on the contract line: a piece
  // the rack cannot cover is not made (CLAUDE.md T17 2.22).
  if (!drawContractSheets(state, contract, piece)) return false;
  contract.pieceMinutes = Math.round((contract.pieceMinutes - piece.minutes) * 10000) / 10000;
  contract.piecesThisWeek += 1;
  contract.piecesMade += 1;
  contract.revenue = pence(contract.revenue + contract.pricePerPiece);
  contract.materialCost = pence(contract.materialCost + piece.material);
  charge(state, 'contract', `${contract.name}: pieces`, contract.pricePerPiece, { merge: true });
  // What the workshop earned by making it, which is what the rate counts: the piece's own labour
  // and not its margin, so the day's labour value means one thing whatever produced it
  // (CLAUDE.md T17 2.26).
  state.dayStats.labourValue =
    Math.round((state.dayStats.labourValue + contractLabourValue(contract)) * 10000) / 10000;
  return true;
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
    // The contract has the whole day of every man on it (PIOTR, 21.09; v42): its hands are its
    // own this minute, first to last, with no job of work to give them back to.
    const wanted = contractHands(state, contract);
    if (wanted.length === 0) continue;
    // Nothing on the rack for the next piece: the men on it stand at their benches, the way a job
    // waits for its material (CLAUDE.md T17 2.22). Every one of them stands, because a man on a
    // contract has nowhere else to go (v42).
    if (contractWaitingForMaterial(state, contract)) {
      for (const worker of wanted) {
        // The marker goes back on, as it does on a working minute, so the contract keeps him
        // between the minutes.
        worker.jobId = contractMarker(contract.id);
        worker.station = STATION_BENCH;
      }
      continue;
    }
    for (const worker of wanted) {
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
      bookOutputMinute(state, worker.id, worth);
      result.worked += away;
      if (machineId !== null) used.set(machineId, (used.get(machineId) ?? 0) + 1);
      while (contract.pieceMinutes >= piece.minutes) {
        if (!finishPiece(state, contract, piece)) break;
      }
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
  /** The same hours at the wear of the machine the piece is made on now, the card's own reading
   *  (v40). */
  machineWear: number;
  margin: number;
}

/** The hourly cost the labour is written up at: the joiners on the books, or the experienced
 *  joiner's wage when there are none. */
function labourMinuteCost(state: GameState): number {
  const crew = joiners(state);
  if (crew.length > 0) {
    const monthly = crew.reduce((total, worker) => total + worker.monthlyWage, 0) / crew.length;
    return workerMinuteCost(monthly);
  }
  const middling = HIRING_SPECS.find(
    (spec) => spec.role === 'joiner' && spec.tier === 'experienced',
  );
  return workerMinuteCost(middling?.monthlyWage ?? 0);
}

/** The closing report: pieces made, revenue, material, labour hours at cost, the net margin. */
export function closingReport(state: GameState, contract: Contract): ClosingReport {
  const labourCost = pence(contract.labourMinutes * labourMinuteCost(state));
  const machine = pieceMachine(state, OWNER, contractPiece(contract));
  const machineWear = pence(contract.labourMinutes * (machine === null ? 0 : machineWearPerMinute(machine)));
  return {
    pieces: contract.piecesMade,
    revenue: pence(contract.revenue),
    material: pence(contract.materialCost),
    labourMinutes: contract.labourMinutes,
    labourHours: Math.round((contract.labourMinutes / 60) * 10) / 10,
    labourCost,
    machineWear,
    margin: pence(contract.revenue - contract.materialCost - labourCost - machineWear),
  };
}

/** How the contract came to an end, in the words the report and the event both use
 *  (CLAUDE.md T20 2.1.6). */
export function endedLine(contract: Contract): string {
  if (contract.endedBy === 'client') {
    return `the client has ended it after ${plural(shortWeeksOf(contract), 'short week', 'short weeks')}`;
  }
  if (contract.endedBy === 'player') return 'you ended it';
  return 'the term is over';
}

function closingBody(state: GameState, contract: Contract): string {
  const report = closingReport(state, contract);
  const full = fullWeeksOf(contract);
  const short = shortWeeksOf(contract);
  return (
    `${contract.name}: ${endedLine(contract)}. ${report.pieces} pieces made, ` +
    `${formatMoney(report.revenue)} of revenue, ${formatMoney(report.material)} of material, ` +
    `${report.labourHours} hours of labour at cost ${formatMoney(report.labourCost)}, ` +
    `${formatMoney(report.machineWear)} of machine wear, ` +
    `net margin ${formatMoney(report.margin)}. ${full} full weeks and ${short} short. ` +
    `The client offers ${formatMoney(contract.renegotiatedPrice ?? contract.pricePerPiece)} a piece ` +
    'for another term. Renew or let it go on the Contracts tab.'
  );
}

/** The end of the term: the last week is closed, the client's new price is worked out from the
 *  history, the men come off it, and the closing report goes up (CLAUDE.md T13 3.16). Who ended
 *  it is written on the contract, for the report and for the Ended section of the tab
 *  (CLAUDE.md T20 2.1.6). */
export function endContract(
  state: GameState,
  contract: Contract,
  endedBy: Contract['endedBy'] = 'term',
): void {
  if (contract.status !== 'active') return;
  contract.endedBy = endedBy;
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
  // What it held on the rack goes back to the free stock (CLAUDE.md T17 2.22).
  contract.sheetsReserved = 0;
  const report = closingReport(state, contract);
  queueEvent(state, {
    kind: 'contractEnded',
    title: `${contract.name}: ${endedLine(contract)}`,
    body: closingBody(state, contract),
    data: {
      contractId: contract.id,
      pieces: report.pieces,
      revenue: report.revenue,
      material: report.material,
      labourHours: report.labourHours,
      labourCost: report.labourCost,
      machineWear: report.machineWear,
      margin: report.margin,
      offered: contract.renegotiatedPrice,
    },
  });
}

/** The second short week of a term and the client ends the contract himself, with the closing
 *  report marked his. There is no third (PIOTR; CLAUDE.md T20 2.1.6). The week in hand has just
 *  been closed, so there is none to close again. */
function endedByClient(state: GameState, contract: Contract): void {
  contract.endDay = state.clock.day;
  contract.weekStartDay = null;
  endContract(state, contract, 'client');
}

/** The day's open: an offer past its day comes off the board, the week that has gone is closed
 *  on the Monday, a client who has had two short weeks ends it, a term whose last day has passed
 *  ends, and the men the contract wants today take their marker before the first minute
 *  (CLAUDE.md T13 3.16, T20 2.1.4, 2.1.6). */
export function runContractDay(state: GameState): void {
  const today = state.clock.day;
  state.contracts = state.contracts.filter(
    (contract) => !(contract.status === 'offered' && contract.expiresOnDay < today),
  );
  for (const contract of activeContracts(state)) {
    if (contract.weekStartDay !== null && weekOfDay(today) !== weekOfDay(contract.weekStartDay)) {
      closeWeek(state, contract);
      if (shortWeeksOf(contract) >= CONTRACT_SHORT_WEEKS_ALLOWED) endedByClient(state, contract);
    }
    if (contract.status === 'active' && contract.endDay !== null && today > contract.endDay) {
      endContract(state, contract);
    }
    if (contract.status !== 'active') continue;
    // What the week wants off the rack is held this morning, after the jobs have had theirs
    // (CLAUDE.md T17 2.22).
    reserveContractSheets(state, contract);
    // Every man on it carries its marker from 8:00: the contract has his whole day, so the jobs
    // never have him (PIOTR, 21.09; v42).
    for (const worker of contractHands(state, contract)) worker.jobId = contractMarker(contract.id);
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
  endContract(state, contract, 'player');
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
    sheetsReserved: 0,
    sheetsUsed: 0,
    piecesMade: 0,
    revenue: 0,
    materialCost: 0,
    labourMinutes: 0,
    renegotiatedPrice: null,
    endedBy: 'term',
  };
  state.contracts.push(renewed);
  acceptContract(state, renewed.id);
  return OK;
}

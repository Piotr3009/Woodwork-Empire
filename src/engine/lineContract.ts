/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// The production line's own state and its own contract (PIOTR, 10.10 and 11.10; CLAUDE.md T30).
// The line is six modules of kit on the floor, bought whole, and everything of it that is not kit
// lives in one field of the state, `state.windowLine`: its contract, the day it may be offered
// again, the minutes into the window in hand, the windows on module 6's pallet, the full pallets at
// the gate and the upgrades. The field is written whole from the first task that needs it, every
// part with its default, so the save is lifted once (CLAUDE.md T30 section 4) [TUNE: the name of
// this module].
//
// The contract is a record of its own and never one of `state.contracts` [TUNE: chat]: it is not
// counted against the three, nobody is put on it, it has no week to meet, no term and no price off
// a band, and it draws nothing off the seeded stream, so no other offer, job or event of any save
// moves by a step (CLAUDE.md T30 2.6). Its windows are made by the line's own minute, beside the
// men's, and book nothing to any man or machine (2.7); every tenth goes to the gate on a pallet,
// which the client takes at the open of the next working day (2.8).

import {
  DAYS_PER_WEEK,
  LINE_CONTRACT_NAME,
  LINE_ENGINEERS_MAX,
  LINE_MATERIAL_SHARE,
  LINE_MODULES,
  LINE_PALLET_WINDOWS,
  LINE_UPGRADE_DAYS,
  LINE_UPGRADE_MINUTES,
  LINE_UPGRADES,
  LINE_WINDOW_MINUTES,
  LINE_WINDOW_MINUTES_MIN,
  LINE_WINDOW_PRICE,
  MINUTES_PER_WORKING_DAY,
  WORKING_DAYS_PER_WEEK,
} from './constants';
import { addWorkingDays, formatCalendarDay, isBreak, isWorkingDay, weekOfDay } from './clock';
import { canAfford, charge, formatMoney, pay } from './economy';
import { queueEvent } from './events';
import { lineLevel, lineStandsWhole } from './machines';
import { crewHasGoneHome, lineEngineers } from './staff';
import { movingMachines } from './tasks';
import { inWords, plural } from './text';
import type { GameState, LineContract, WindowLineState } from './types';

/** The line's state of a company that has never had a line: no contract, no offer yet, no window
 *  in hand, an empty pallet, nothing at the gate and no upgrade (CLAUDE.md T30 section 4). */
export function emptyWindowLine(): WindowLineState {
  return {
    contract: null,
    nextOfferDay: null,
    minutes: 0,
    onPallet: 0,
    palletsAtGate: 0,
    upgrades: [],
  };
}

/** What the timber and the glass of one window cost, written from the price and the share and
 *  never as a figure of its own: 600 (CLAUDE.md T30 2.6). */
export function lineMaterialPerWindow(): number {
  return LINE_WINDOW_PRICE * LINE_MATERIAL_SHARE;
}

/** The minutes a window takes on the line's contract: the one answer the offer card, the running
 *  block and the line's minute read. Each upgrade fitted takes its fifteen minutes off, and never
 *  below one window an hour (CLAUDE.md T30 2.7, 2.10). */
export function lineWindowMinutes(state: GameState): number {
  const fitted = state.windowLine.upgrades.filter((upgrade) => upgradeIsFitted(state, upgrade.fittedOnDay)).length;
  return Math.max(LINE_WINDOW_MINUTES_MIN, LINE_WINDOW_MINUTES - LINE_UPGRADE_MINUTES * fitted);
}

/** True from the open of the day an upgrade is fitted on. */
function upgradeIsFitted(state: GameState, fittedOnDay: number): boolean {
  return state.clock.day >= fittedOnDay;
}

/** Whether an upgrade of the line can be bought, in the order its card's locked Buy reads: the
 *  line first, then the one already on the list (on its way or fitted), then the cash. One of each
 *  (CLAUDE.md T30 2.10). */
export function lineUpgradeCheck(state: GameState, upgradeId: string): { ok: boolean; reason: string } {
  const spec = LINE_UPGRADES.find((entry) => entry.id === upgradeId);
  if (spec === undefined) return { ok: false, reason: 'Not in the catalogue' };
  if (!lineStandsWhole(state)) return { ok: false, reason: 'Needs the production line' };
  const held = state.windowLine.upgrades.find((upgrade) => upgrade.id === upgradeId);
  if (held !== undefined) {
    return upgradeIsFitted(state, held.fittedOnDay)
      ? { ok: false, reason: 'Fitted' }
      : { ok: false, reason: `Being fitted: ready on ${formatCalendarDay(held.fittedOnDay)}` };
  }
  if (!canAfford(state, spec.price)) return { ok: false, reason: 'Not enough cash' };
  return { ok: true, reason: '' };
}

/** Buys an upgrade of the line: the cash leaves at the click on one line of its own, and it is
 *  fitted ten working days on. Never called off and never sold on its own: it goes with the line
 *  (CLAUDE.md T30 2.10). */
export function buyLineUpgrade(state: GameState, upgradeId: string): { ok: boolean; reason: string } {
  const check = lineUpgradeCheck(state, upgradeId);
  if (!check.ok) return check;
  const spec = LINE_UPGRADES.find((entry) => entry.id === upgradeId);
  if (spec === undefined) return check;
  pay(state, 'equipment', `Line upgrade: ${spec.name}`, spec.price);
  state.windowLine.upgrades.push({ id: spec.id, fittedOnDay: addWorkingDays(state.clock.day, LINE_UPGRADE_DAYS) });
  return check;
}

/** The line sold: its upgrades go with it, for nothing (CLAUDE.md T30 2.3.5, 2.10). */
export function emptyLineUpgrades(state: GameState): void {
  state.windowLine.upgrades = [];
}

/** A window's minutes in the words the card and the running block print: `2 hours`, `1 h 45 min`. */
export function lineWindowEvery(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest === 0) return plural(hours, 'hour', 'hours');
  return hours === 0 ? `${rest} min` : `${hours} h ${rest} min`;
}

/** The windows of a working week at the line's pace, rounded down: 20 at 120 minutes. */
export function lineWindowsAWeek(state: GameState): number {
  return Math.floor((WORKING_DAYS_PER_WEEK * MINUTES_PER_WORKING_DAY) / lineWindowMinutes(state));
}

/** The line's contract while it runs, and null while it is only offered or there is none. */
export function runningLineContract(state: GameState): LineContract | null {
  const contract = state.windowLine.contract;
  return contract !== null && contract.status === 'active' ? contract : null;
}

/** The line engineers on the books, hired and started, whether in today or not: what the offer asks
 *  for (CLAUDE.md T30 2.6) [TUNE: on the books is started, in today or not]. */
function engineersOnTheBooks(state: GameState): number {
  return lineEngineers(state).filter((worker) => worker.startDay <= state.clock.day).length;
}

/** The offer card's words, every figure from the constants and the line's own pace (CLAUDE.md T30
 *  2.6). */
export function lineOfferBody(state: GameState): string {
  return (
    `A window company will take every window your line makes, at ${formatMoney(LINE_WINDOW_PRICE)} a ` +
    'window. The timber and the glass for each one are bought as it is made, ' +
    `${formatMoney(lineMaterialPerWindow())} a window. The line makes one every ` +
    `${lineWindowEvery(lineWindowMinutes(state))}, about ${lineWindowsAWeek(state)} a week, and the client ` +
    `collects each pallet of ${inWords(LINE_PALLET_WINDOWS)} the next working day. It runs until you end it.`
  );
}

/** The line's step at the open of a working day, the last of `startDay`, after the day's kit has
 *  landed and its cards are queued: the client's lorry takes every pallet at the gate, a new week
 *  starts the week's count, and the contract is offered when it may be (CLAUDE.md T30 2.6, 2.8). */
export function runLineDay(state: GameState): void {
  const line = state.windowLine;
  // Taken at no cost and with no line in the ledger: its windows were paid as they were made.
  line.palletsAtGate = 0;
  const contract = runningLineContract(state);
  if (contract !== null && weekOfDay(state.clock.day) !== weekOfDay(contract.weekStartDay)) {
    contract.windowsThisWeek = 0;
    contract.weekStartDay = state.clock.day;
  }
  offerLineContract(state);
}

/** Offered by a card when all six modules stand, two line engineers are on the books, no line
 *  contract is offered or running, and the day is not before the next offer day (CLAUDE.md T30
 *  2.6). */
function offerLineContract(state: GameState): void {
  const line = state.windowLine;
  const day = state.clock.day;
  if (line.contract !== null) return;
  if (line.nextOfferDay !== null && day < line.nextOfferDay) return;
  if (!lineStandsWhole(state)) return;
  if (engineersOnTheBooks(state) < LINE_ENGINEERS_MAX) return;
  line.contract = {
    status: 'offered',
    startDay: day,
    windowsThisWeek: 0,
    weekStartDay: day,
    windowsMade: 0,
    revenue: 0,
    materialCost: 0,
  };
  queueEvent(state, {
    kind: 'lineContractOffered',
    title: LINE_CONTRACT_NAME,
    body: lineOfferBody(state),
    choices: [
      { id: 'take', label: 'Take it' },
      { id: 'notNow', label: 'Not now' },
    ],
  });
}

/** The answer to the offer card: taken, it runs from that minute, while the line still stands
 *  whole; turned down, it is offered again a week on (CLAUDE.md T30 2.6). */
export function answerLineOffer(state: GameState, choiceId: string): void {
  const line = state.windowLine;
  const contract = line.contract;
  if (contract === null || contract.status !== 'offered') return;
  if (choiceId === 'take' && lineStandsWhole(state)) {
    contract.status = 'active';
    contract.startDay = state.clock.day;
    contract.weekStartDay = state.clock.day;
    return;
  }
  line.contract = null;
  line.nextOfferDay = state.clock.day + DAYS_PER_WEEK;
}

/** Ends the line's contract, by the player's `End it` or by the sale of the line: a part pallet goes
 *  to the gate as it is, the window in hand is dropped, and it is offered again a week on
 *  (CLAUDE.md T30 2.6, 2.8). An offer still waiting for its answer goes too. */
export function endLineContract(state: GameState): void {
  const line = state.windowLine;
  if (line.contract === null) return;
  if (line.onPallet > 0) {
    line.palletsAtGate += 1;
    line.onPallet = 0;
  }
  line.contract = null;
  line.minutes = 0;
  line.nextOfferDay = state.clock.day + DAYS_PER_WEEK;
}

/** True in a minute the line makes windows on its contract: a working day, not the dinner hour and
 *  not after five whatever the owner does, the line running whole (two engineers on duty), and not
 *  while it is being moved. Not on the second shift: the line's minute runs only from the day's
 *  clock, and the engineers work by day (CLAUDE.md T30 2.7) [TUNE: chat]. */
export function lineMakesWindows(state: GameState): boolean {
  if (runningLineContract(state) === null) return false;
  if (!isWorkingDay(state.clock.day)) return false;
  if (isBreak(state.clock.minute)) return false;
  if (crewHasGoneHome(state)) return false;
  if (movingMachines(state) !== null) return false;
  return lineLevel(state) >= LINE_MODULES.length;
}

/** The line's own minute, beside the men's: the window in hand moves on by one, and at its minutes
 *  it is made, the minutes over carried into the next one. The hall's crowding, its dust and its
 *  labourer do not touch it, and no minute of any man or machine is booked for it (CLAUDE.md T30
 *  2.7) [TUNE]. */
export function runLineMinute(state: GameState): void {
  if (!lineMakesWindows(state)) return;
  const line = state.windowLine;
  line.minutes += 1;
  const each = lineWindowMinutes(state);
  while (line.minutes >= each) {
    line.minutes -= each;
    makeWindow(state);
  }
}

/** One window made: its price in on the contract line and its timber and glass out on the material
 *  line, each one growing line a day, the material past the overdraft floor as every cost of work
 *  done is; nothing ordered, delivered or taken off a store. It stands on the pallet, and the
 *  tenth sends the pallet to the gate (CLAUDE.md T30 2.7, 2.8). */
function makeWindow(state: GameState): void {
  const contract = runningLineContract(state);
  if (contract === null) return;
  const material = lineMaterialPerWindow();
  charge(state, 'contract', `${LINE_CONTRACT_NAME}: windows`, LINE_WINDOW_PRICE, { merge: true });
  charge(state, 'material', `${LINE_CONTRACT_NAME}: timber and glass`, -material, { unavoidable: true, merge: true });
  contract.windowsMade += 1;
  contract.windowsThisWeek += 1;
  contract.revenue += LINE_WINDOW_PRICE;
  contract.materialCost += material;
  const line = state.windowLine;
  line.onPallet += 1;
  if (line.onPallet >= LINE_PALLET_WINDOWS) {
    line.onPallet = 0;
    line.palletsAtGate += 1;
  }
}

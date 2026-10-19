/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// @vitest-environment jsdom
// v117: the house factory's stations at work [PIOTR, 19.10: "I want the animation right away", on the
// art side's P4 pack of robotic production]. Each station has sixteen frames of its stage and an
// empty picture; the hall picks the frame by how far the line's house in hand has come, holds the
// last to the end of the cycle, and shows the empty station while no contract runs. The frames are
// the art side's files byte for byte on the game's own canvas; the waiting house is the pack's
// loaded transporter moved onto the game's canvas by a shift alone (docs/art/pack-p4-1910/EDITED.md).

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { HOUSE_MODULE_SIZE, HOUSE_WAIT_LAYOUT, HOUSE_WORK_FRAMES, lineModulesOf } from '../../src/engine/constants';
import type { GameState, Worker } from '../../src/engine/index';
import { isWorkingDay } from '../../src/engine/clock';
import { answerLineOffer, endLineContract, lineState, lineUnitFrame, lineWindowMinutes, runningLineContract } from '../../src/engine/lineContract';
import { renderHall } from '../../src/render/hall';
import { spriteFileSize, spriteFiles } from '../../src/render/sprites';
import { act, clearEvents, newGame, nextDay, placeEquipment, runClock, testJoiner } from '../helpers';

/** The hall of tests/engine/v114House.test.ts: ninety by twenty seven, a house factory at the rear
 *  wall beside the rooms with its ten engineers. */
function houseFactory(): GameState {
  let state = newGame({ difficulty: 'veryEasy' });
  state.cash = 900000000;
  state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
  state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'second' }));
  for (let stage = 0; stage < 5; stage += 1) {
    state.cash = 900000000;
    state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'long' }));
  }
  state.cash = 900000000;
  state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'wide' }));
  state.cash = 90000000;
  state.reputation = 40;
  state.enquiries = [];
  lineModulesOf('house').forEach((id, index) =>
    placeEquipment(state, id, { x: 5 + 14 * index, y: 0, id: `kit-line-1-${index + 1}` }),
  );
  for (const item of state.equipment) {
    if (item.id.startsWith('kit-line-1-')) item.line = 1;
  }
  lineState(state, 1).kind = 'house';
  for (let n = 1; n <= 10; n += 1) {
    const engineer: Worker = { ...testJoiner(`eng-${n}`, `Eng ${n}`), role: 'lineEngineer', tier: null, rate: 0, monthlyWage: 15000 };
    state.workers.push(engineer);
  }
  return state;
}

/** The next working morning with the factory's offer taken and its stores full. */
function running(): GameState {
  let state = nextDay(houseFactory());
  for (let guard = 0; guard < 5 && !isWorkingDay(state.clock.day); guard += 1) state = nextDay(state);
  state = clearEvents(state);
  state.stock.boards = 400;
  state.stock.glass = 200;
  const record = lineState(state, 1);
  if (record.contract === null) throw new Error('the house factory s contract is written');
  record.contract.status = 'offered';
  answerLineOffer(state, 1, 'take');
  if (runningLineContract(state, 1) === null) throw new Error('the contract runs');
  return state;
}

function page(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

function hashOf(name: string): string {
  return createHash('sha256').update(readFileSync(join('public/sprites', name))).digest('hex');
}

function pngSize(name: string): { width: number; height: number } {
  const head = readFileSync(join('public/sprites', name)).subarray(16, 24);
  return { width: head.readUInt32BE(0), height: head.readUInt32BE(4) };
}

/** The frame each of the six stations stands on, read off the hall. */
function framesOn(state: GameState): string[] {
  const hall = page(renderHall(state));
  return lineModulesOf('house').map((id) => {
    const station = hall.querySelector(`[data-sprite="${id}"]`);
    return `${station?.getAttribute('data-station-frame')}:${station?.querySelector('image')?.getAttribute('href')}`;
  });
}

describe('the frame of the house in hand (v117)', () => {
  it('is sixteen a station, the first at nought, the last from the last sixteenth of the cycle and past it', () => {
    expect(HOUSE_WORK_FRAMES).toBe(16);
    const state = running();
    const record = lineState(state, 1);
    const each = lineWindowMinutes(state, 1);
    expect(each).toBe(480);
    record.minutes = 0;
    expect(lineUnitFrame(state, 1, HOUSE_WORK_FRAMES)).toBe(0);
    record.minutes = 29;
    expect(lineUnitFrame(state, 1, HOUSE_WORK_FRAMES)).toBe(0);
    record.minutes = 30;
    expect(lineUnitFrame(state, 1, HOUSE_WORK_FRAMES)).toBe(1);
    record.minutes = 240;
    expect(lineUnitFrame(state, 1, HOUSE_WORK_FRAMES)).toBe(8);
    record.minutes = 449;
    expect(lineUnitFrame(state, 1, HOUSE_WORK_FRAMES)).toBe(14);
    record.minutes = 450;
    expect(lineUnitFrame(state, 1, HOUSE_WORK_FRAMES)).toBe(15);
    // A house's minutes done and the line waiting for its material: the finished house stays.
    record.minutes = 600;
    expect(lineUnitFrame(state, 1, HOUSE_WORK_FRAMES)).toBe(15);
  });

  it('is none while no contract runs', () => {
    const state = running();
    endLineContract(state, 1);
    expect(lineUnitFrame(state, 1, HOUSE_WORK_FRAMES)).toBeNull();
    expect(lineUnitFrame(houseFactory(), 1, HOUSE_WORK_FRAMES)).toBeNull();
  });

  it('moves on with the clock and starts again at nought when the house is made', () => {
    let state = running();
    lineState(state, 1).minutes = 470;
    state = runClock(state, 5);
    expect(lineUnitFrame(state, 1, HOUSE_WORK_FRAMES)).toBe(15);
    state = runClock(state, 10);
    expect(runningLineContract(state, 1)?.windowsMade).toBe(1);
    expect(lineUnitFrame(state, 1, HOUSE_WORK_FRAMES)).toBe(0);
  });
});

describe('the stations drawn by their frames (v117)', () => {
  it('draws every station from the frame of the house in hand, and the empty station without a contract', () => {
    const state = running();
    lineState(state, 1).minutes = 240;
    expect(framesOn(state)).toEqual(
      lineModulesOf('house').map((id) => `work08:/sprites/${id}.standard.work08.png`),
    );
    lineState(state, 1).minutes = 0;
    expect(framesOn(state)).toEqual(
      lineModulesOf('house').map((id) => `work00:/sprites/${id}.standard.work00.png`),
    );
    endLineContract(state, 1);
    expect(framesOn(state)).toEqual(
      lineModulesOf('house').map((id) => `empty:/sprites/${id}.standard.empty.png`),
    );
  });

  it('falls back to the station s class picture where the frame s file has not landed', () => {
    const state = running();
    lineState(state, 1).minutes = 240;
    const files = spriteFiles().filter((name) => !name.includes('.work08.'));
    const hall = page(renderHall(state, { files }));
    const station = hall.querySelector('[data-sprite="houseLine3"]');
    expect(station?.getAttribute('data-station-frame')).toBe('');
    expect(station?.querySelector('image')?.getAttribute('href')).toBe('/sprites/houseLine3.standard.png');
  });

  it('leaves every other module to its class picture', () => {
    const state = running();
    const hall = page(renderHall(state));
    expect(hall.querySelectorAll('[data-station-frame]')).toHaveLength(6);
    expect(hall.querySelector('[data-sprite="houseLine1"]')?.getAttribute('data-tier')).toBe('standard');
  });
});

describe('the files of the P4 pack (v117)', () => {
  it('are sixteen frames and an empty picture a station, the class picture the last frame, each on the station s canvas', () => {
    const owed = spriteFileSize(HOUSE_MODULE_SIZE.width, HOUSE_MODULE_SIZE.depth, HOUSE_MODULE_SIZE.height);
    expect(owed).toEqual({ width: 1168, height: 1072 });
    for (const id of lineModulesOf('house')) {
      const names = [
        `${id}.standard.png`,
        `${id}.standard.empty.png`,
        ...Array.from({ length: HOUSE_WORK_FRAMES }, (_, frame) => `${id}.standard.work${String(frame).padStart(2, '0')}.png`),
      ];
      for (const name of names) {
        expect(spriteFiles(), name).toContain(name);
        expect(pngSize(name), name).toEqual(owed);
      }
      // The class picture is the last frame, the finished stage, byte for byte.
      expect(hashOf(`${id}.standard.png`)).toBe(hashOf(`${id}.standard.work15.png`));
      // The line is never turned: no turned file is owed or on disk.
      expect(spriteFiles()).not.toContain(`${id}.standard.r.png`);
    }
  });

  it('are the art side s files byte for byte, each held to the pack s own record', () => {
    // docs/art/pack-p4-1910/checksums.sha256: the hash the pack's manifest gives each file taken,
    // the game's name for it, and the pack's own name.
    const lines = readFileSync('docs/art/pack-p4-1910/checksums.sha256', 'utf8').trim().split('\n');
    expect(lines).toHaveLength(108);
    for (const line of lines) {
      const [hash, name] = line.split(/\s+/);
      expect(hashOf(name ?? ''), name).toBe(hash);
    }
  });

  it('hold the waiting house on the transporter s canvas', () => {
    const owed = spriteFileSize(HOUSE_WAIT_LAYOUT.width, HOUSE_WAIT_LAYOUT.depth, HOUSE_WAIT_LAYOUT.height);
    expect(owed).toEqual({ width: 856, height: 700 });
    expect(spriteFiles()).toContain('houseWaiting.standard.png');
    expect(pngSize('houseWaiting.standard.png')).toEqual(owed);
  });

  it('draws the waiting house from its file', () => {
    let state = running();
    lineState(state, 1).minutes = 470;
    state = runClock(state, 15);
    const hall = page(renderHall(state));
    expect(hall.querySelector('[data-house-waiting="0"] image')?.getAttribute('href')).toBe('/sprites/houseWaiting.standard.png');
  });
});

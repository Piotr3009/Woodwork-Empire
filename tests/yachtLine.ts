/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// The halls the yacht line's tests stand it in (v123): one file, so the engine's tests and the
// pictures' tests build the same hall and the same line.

import { lineModulesOf } from '../src/engine/constants';
import type { GameState, Worker } from '../src/engine/index';
import { lineState } from '../src/engine/lineContract';
import { act, newGame, nextDay, placeEquipment, testJoiner } from './helpers';

/** A hall of 180 m by 27 m: the 800 m² unit, fourteen long extensions and a wide one, room for one
 *  yacht line at the rear wall beside the rooms. */
export function yachtHall(): GameState {
  let state = newGame({ difficulty: 'veryEasy' });
  state.cash = 2000000000;
  state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
  state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'second' }));
  for (let stage = 0; stage < 14; stage += 1) {
    state.cash = 2000000000;
    state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'long' }));
  }
  state.cash = 2000000000;
  state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'wide' }));
  state.cash = 200000000;
  state.reputation = 40;
  state.enquiries = [];
  return state;
}

/** A yacht line standing whole as line 1 where the order puts it, with its ten engineers. */
export function yachtLine(): GameState {
  const state = yachtHall();
  lineModulesOf('yacht').forEach((id, index) =>
    placeEquipment(state, id, { x: 5 + 14 * index, y: 0, id: `kit-line-1-${index + 1}` }),
  );
  for (const item of state.equipment) {
    if (item.id.startsWith('kit-line-1-')) item.line = 1;
  }
  lineState(state, 1).kind = 'yacht';
  for (let n = 1; n <= 10; n += 1) {
    const engineer: Worker = { ...testJoiner(`eng-${n}`, `Eng ${n}`), role: 'lineEngineer', tier: null, rate: 0, monthlyWage: 15000 };
    state.workers.push(engineer);
  }
  return state;
}

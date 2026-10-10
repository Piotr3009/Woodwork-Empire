/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// A big hall stuttered (PIOTR, 10.10: "with lots of things bought the game stutters"): the hall
// asked every family's crew again for every machine it drew, and every family read every man's
// plan again. From v87 the crew is counted against every family in one pass and the hall reckons
// its shortages once a picture. Nothing the player sees may move for it: these hold the new count
// to the old one, rule for rule, on a hall with men on jobs and a contract, through a played day.

import { describe, expect, it } from 'vitest';
import { CAPACITY_FAMILIES, CAPACITY_ROLES } from '../../src/engine/constants';
import { contractFamiliesOf, contractOfWorker, contractPiece } from '../../src/engine/contracts';
import { jobHeldBy } from '../../src/engine/jobs';
import {
  OWNER,
  crewAtFamily,
  crewByFamily,
  placeShortages,
  shortageLine,
} from '../../src/engine/machines';
import { stagePlanFor } from '../../src/engine/stages';
import { nightCrew } from '../../src/engine/staff';
import type { GameState } from '../../src/engine/index';
import { day53Hall, runClock } from '../helpers';

/** The count as v86 made it, one family at a time and every plan read again for each. */
function v86Count(state: GameState, family: string, shift: 'day' | 'night'): number {
  const men: Array<{ id: string; working: boolean }> =
    shift === 'night'
      ? nightCrew(state).map((worker) => ({ id: worker.id, working: true }))
      : [
          { id: OWNER, working: state.owner.working },
          ...state.workers.filter((worker) => CAPACITY_ROLES.includes(worker.role)),
        ];
  let count = 0;
  for (const man of men) {
    if (!man.working) continue;
    const job = jobHeldBy(state, man.id);
    if (job !== null) {
      if (!job.byHand && stagePlanFor(state, job).some((stage) => stage.family === family)) count += 1;
      continue;
    }
    const contract = man.id === OWNER ? null : contractOfWorker(state, man.id);
    if (contract === null) continue;
    if (contractFamiliesOf(state, contractPiece(contract)).includes(family)) count += 1;
  }
  return count;
}

/** The day 53 hall, looked at every half hour of a working day. */
function hallsThroughTheDay(): GameState[] {
  const halls: GameState[] = [];
  let state = day53Hall();
  for (let step = 0; step < 18; step += 1) {
    halls.push(state);
    state = runClock(state, 30);
  }
  return halls;
}

describe('the crew counted against every family at once', () => {
  it('is the v86 count for every family, by day and by night, all day long', () => {
    let menCounted = 0;
    for (const state of hallsThroughTheDay()) {
      for (const shift of ['day', 'night'] as const) {
        const crew = crewByFamily(state, shift);
        for (const family of CAPACITY_FAMILIES) {
          const old = v86Count(state, family, shift);
          expect(crew.get(family) ?? 0, `${family} ${shift} day ${state.clock.day} ${state.clock.minute}`).toBe(old);
          expect(crewAtFamily(state, family, shift)).toBe(old);
          menCounted += old;
        }
      }
    }
    // The hall has men at its machines through the day, so the test is not comparing noughts.
    expect(menCounted).toBeGreaterThan(0);
  });

  it('gives the shortages and their lines that the count one family at a time gives', () => {
    let lines = 0;
    for (const state of hallsThroughTheDay()) {
      const reckoned = placeShortages(state);
      expect(reckoned).toEqual(placeShortages(state, 'day', (family) => v86Count(state, family, 'day')));
      for (const family of CAPACITY_FAMILIES) {
        const line = shortageLine(state, family, reckoned);
        expect(line).toBe(shortageLine(state, family));
        if (line !== '') lines += 1;
      }
    }
    // The day 53 hall runs short at its machines at some hours, so real lines are compared.
    expect(lines).toBeGreaterThan(0);
  });
});

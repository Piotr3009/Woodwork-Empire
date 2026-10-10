/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// A big hall at 100x still stuttered after v87 (PIOTR, 10.10). v88 asks the catalogue by id, keeps
// where each class stands once it is known, reads each family's machines once for the whole crew,
// and hands the men at their places to every machine the hall draws. None of it may change an
// answer: these hold each one to the way v87 worked it out.

import { describe, expect, it } from 'vitest';
import { EQUIPMENT_SPECS } from '../../src/engine/constants';
import {
  OWNER,
  findSpec,
  machineForPlace,
  menAtMachine,
  menAtPlaces,
  placesLine,
  specOf,
  standsInTheHall,
  zoneOf,
} from '../../src/engine/machines';
import type { Equipment, GameState } from '../../src/engine/index';
import { day53Hall, runClock } from '../helpers';

/** The men at their places as v87 worked them out: every man asked the hall for his family's
 *  machines again. */
function v87MenAtPlaces(state: GameState): Array<{ who: string; item: Equipment; place: number }> {
  const found: Array<{ who: string; item: Equipment; place: number }> = [];
  const given = new Map<string, number>();
  const men: Array<{ who: string; man: { working: boolean; station: string } }> = [
    { who: OWNER, man: state.owner },
    ...state.workers.map((worker) => ({ who: worker.id, man: worker })),
  ];
  for (const { who, man } of men) {
    if (!man.working || !man.station.startsWith('machine:')) continue;
    const family = man.station.slice('machine:'.length);
    const index = given.get(family) ?? 0;
    given.set(family, index + 1);
    const at = machineForPlace(state, family, index);
    if (at !== null) found.push({ who, item: at.item, place: at.place });
  }
  return found;
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

describe('the catalogue asked by id', () => {
  it('answers every family as the list walk did, and nothing for a family it does not have', () => {
    for (const entry of EQUIPMENT_SPECS) {
      expect(findSpec(entry.id)).toBe(EQUIPMENT_SPECS.find((spec) => spec.id === entry.id));
      expect(specOf(entry.id)).toBe(entry);
    }
    expect(findSpec('noSuchMachine')).toBeNull();
    expect(() => specOf('noSuchMachine')).toThrow('unknown equipment: noSuchMachine');
  });

  it('keeps where every class stands, the zone rule s answer, asked twice', () => {
    for (const entry of EQUIPMENT_SPECS) {
      for (const variantId of [undefined, ...entry.variants.map((variant) => variant.id)]) {
        const zone = zoneOf(entry.id, variantId);
        const rule = zone.width > 0 && zone.depth > 0;
        expect(standsInTheHall(entry.id, variantId), `${entry.id} ${variantId ?? '-'}`).toBe(rule);
        expect(standsInTheHall(entry.id, variantId)).toBe(rule);
      }
    }
  });
});

describe('the men at their places', () => {
  it('are the v87 answer through a played day, and each machine reads the same men off them', () => {
    let seated = 0;
    for (const state of hallsThroughTheDay()) {
      const atPlaces = menAtPlaces(state);
      expect(atPlaces).toEqual(v87MenAtPlaces(state));
      seated += atPlaces.length;
      for (const item of state.equipment) {
        expect(menAtMachine(state, item, atPlaces)).toEqual(menAtMachine(state, item));
        expect(placesLine(state, item, 'card', atPlaces)).toBe(placesLine(state, item, 'card'));
        expect(placesLine(state, item, 'tile', atPlaces)).toBe(placesLine(state, item, 'tile'));
      }
    }
    // The hall has men at its machines through the day, so real answers are compared.
    expect(seated).toBeGreaterThan(0);
  });
});

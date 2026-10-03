// v66 (PIOTR, 03.10): "everybody stands in one place again, and there are so many free machines";
// "the change of men at the machines was to be visual only". The men at work are DRAWN each at a
// machine or a bench of his own, and every hour each is drawn at the next one along. The day plan,
// which says where a man works and what his minute is worth, is not touched: the hours, the dust,
// the air and a machine's card are the work, and src/engine/drawn.ts is where the figures stand.

import { describe, expect, it } from 'vitest';
import { DRAWN_TURN_MINUTES } from '../../src/engine/constants';
import { drawnInUse, drawnItemOf, drawnPlaces, workSpots } from '../../src/engine/drawn';
import { machineInUse } from '../../src/engine/game';
import { menAtPlaces } from '../../src/engine/machines';
import { planPlaces } from '../../src/engine/production';
import type { GameState } from '../../src/engine/index';
import { day53Hall } from '../helpers';

/** The day 53 hall with its plan written on the men: six joiners and Nathan at work. */
function hall(minute = 300): GameState {
  const state = day53Hall();
  state.clock.minute = minute;
  planPlaces(state);
  return state;
}

describe('where the men at work are drawn', () => {
  it('draws every working man, and nobody else, at a machine or a bench of his own', () => {
    const state = hall();
    const working = menAtPlaces(state).map((entry) => entry.who);
    expect(working.length).toBeGreaterThanOrEqual(6);
    const drawn = drawnPlaces(state);
    expect(drawn.map((entry) => entry.who)).toEqual(working);
    // The hall has more machines and benches than men, so no two are drawn at one.
    expect(workSpots(state).length).toBeGreaterThanOrEqual(working.length);
    expect(new Set(drawn.map((entry) => entry.item.id)).size).toBe(working.length);
    // And they are not in a heap at the one machine their work goes through: the saw, the
    // edgebanders, the moulder and the booth have men at them.
    const families = new Set(drawn.map((entry) => entry.item.specId));
    expect(families.size).toBeGreaterThanOrEqual(4);
  });

  it('moves every man to another machine on the hour, and nobody inside it', () => {
    const state = hall(300);
    const at = (): Map<string, string> => new Map(drawnPlaces(state).map((entry) => [entry.who, entry.item.id]));
    const first = at();
    // The same picture for the whole of the hour.
    state.clock.minute = 300 + DRAWN_TURN_MINUTES - 1;
    planPlaces(state);
    const still = at();
    for (const [who, item] of first) {
      if (still.has(who)) expect(still.get(who), who).toBe(item);
    }
    // And another one the next hour: every man who is at work in both is at another machine.
    state.clock.minute = 300 + DRAWN_TURN_MINUTES;
    planPlaces(state);
    const next = at();
    let moved = 0;
    for (const [who, item] of first) {
      if (!next.has(who)) continue;
      expect(next.get(who), who).not.toBe(item);
      moved += 1;
    }
    expect(moved).toBeGreaterThanOrEqual(5);
  });

  it('visits every machine of the hall over the hours of a day', () => {
    const state = hall();
    const visited = new Set<string>();
    for (let hour = 0; hour < 9; hour += 1) {
      state.clock.minute = hour * DRAWN_TURN_MINUTES;
      planPlaces(state);
      for (const entry of drawnPlaces(state)) visited.add(entry.item.id);
    }
    for (const spot of workSpots(state)) expect(visited.has(spot.id), spot.specId).toBe(true);
  });

  it('leaves the work where the day plan has it: the picture moves no man s place', () => {
    const state = hall();
    const before = JSON.stringify(menAtPlaces(state).map((entry) => [entry.who, entry.item.id, entry.place]));
    const stations = JSON.stringify([state.owner, ...state.workers].map((man) => [man.station, man.working]));
    drawnPlaces(state);
    drawnInUse(state);
    expect(JSON.stringify(menAtPlaces(state).map((entry) => [entry.who, entry.item.id, entry.place]))).toBe(before);
    expect(JSON.stringify([state.owner, ...state.workers].map((man) => [man.station, man.working]))).toBe(stations);
  });

  it('spins the blade of the saw a man is drawn at, and of no saw nobody is drawn at', () => {
    const state = hall();
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    if (!saw) throw new Error('a saw is wanted');
    let withAMan = 0;
    let without = 0;
    for (let hour = 0; hour < 9; hour += 1) {
      state.clock.minute = hour * DRAWN_TURN_MINUTES;
      planPlaces(state);
      const drawnThere = drawnPlaces(state).some((entry) => entry.item.id === saw.id);
      expect(machineInUse(state, saw)).toBe(drawnThere);
      if (drawnThere) withAMan += 1;
      else without += 1;
    }
    expect(withAMan).toBeGreaterThan(0);
    expect(without).toBeGreaterThan(0);
  });

  it('draws nobody the plan has at no place', () => {
    const state = hall();
    for (const man of [state.owner, ...state.workers]) man.working = false;
    expect(drawnPlaces(state)).toEqual([]);
    expect(drawnItemOf(state, 'staff-1')).toBeNull();
    expect(drawnInUse(state).size).toBe(0);
  });
});

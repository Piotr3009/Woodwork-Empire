// What the hall sounds like this minute (CLAUDE.md T19 2.10). The engine of the sound is in
// src/ui/sound.ts and is tested with a fake audio context; what is tested here is the hall's own
// reading of itself, which is what the frame hands that engine: the loops that are running and the
// one shots that want a knock, off the state and nothing else.

import { describe, expect, it } from 'vitest';
import { hallLoops, hallOneShots } from '../../src/render/hall';
import { OWNER } from '../../src/engine/machines';
import type { GameState } from '../../src/engine/index';
import {
  acceptNow,
  atAPlace,
  buyNow,
  buyStartingKit,
  fillRack,
  firstJob,
  newGame,
  offHisPlace,
  placeEnquiry,
  withExtraction,
} from '../helpers';

/** The day 1 kit with sheets on the rack and nobody at anything. */
function quiet(): GameState {
  return fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' }), { sawVariant: 'budget' }), 40);
}

/** A job in production with the owner on it, at the stage and the finish asked for. */
function inProduction(state: GameState, finish: string): GameState {
  state.enquiries = [];
  const enquiry = placeEnquiry(state, { price: 40000, deadlineDays: 90 });
  const next = acceptNow(state, enquiry.id, false);
  const job = firstJob(next);
  job.stage = 'inProduction';
  job.assignees = [OWNER];
  job.finish = finish as typeof job.finish;
  return next;
}

describe('the loops the hall is running', () => {
  it('is silent while nobody is at anything', () => {
    const state = quiet();
    expect(Array.from(hallLoops(state))).toEqual([]);
    expect(Array.from(hallOneShots(state))).toEqual([]);
  });

  it('runs the saw only while somebody is at one of its places', () => {
    const state = quiet();
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    if (!saw) throw new Error('no saw');
    expect(hallLoops(state).has('tableSaw')).toBe(false);
    atAPlace(state, OWNER, 'tableSaw');
    expect(hallLoops(state).has('tableSaw')).toBe(true);
    // A saw that has stopped makes no noise, and has no places for anybody (CLAUDE.md T25 2.1).
    saw.broken = true;
    expect(hallLoops(state).has('tableSaw')).toBe(false);
    saw.broken = false;
    offHisPlace(state, OWNER);
    expect(hallLoops(state).has('tableSaw')).toBe(false);
  });

  it('pulls the extraction only while a machine on it is running', () => {
    const state = withExtraction(quiet());
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    const fans = state.equipment.filter((item) => item.specId === 'extractor');
    if (!saw || fans.length === 0) throw new Error('no kit');
    // An extraction standing idle in a hall where nothing is cut is silent.
    expect(hallLoops(state).has('extractor')).toBe(false);
    atAPlace(state, OWNER, 'tableSaw');
    expect(hallLoops(state).has('extractor')).toBe(true);
    // And a broken fan pulls nothing, which is what the hall already draws.
    for (const fan of fans) fan.broken = true;
    expect(hallLoops(state).has('extractor')).toBe(false);
  });

  it('hisses the booth only while somebody is at a place of one', () => {
    let state = buyNow(quiet(), 'sprayBooth', 'standard');
    state = inProduction(state, 'lacquer');
    const booth = state.equipment.find((item) => item.specId === 'sprayBooth');
    if (!booth) throw new Error('no booth');
    // A lacquered job at its finishing stage is not a man spraying: a workshop with no booth
    // cannot spray at all, and must not be heard to.
    expect(hallLoops(state).has('sprayBooth')).toBe(false);
    atAPlace(state, OWNER, 'sprayBooth');
    expect(hallLoops(state).has('sprayBooth')).toBe(true);
  });

  it('sands a bench that is finishing something that is not lacquered', () => {
    const state = inProduction(quiet(), 'laminate');
    const job = firstJob(state);
    job.labourRemaining = job.labourValue * 0.02;
    const loops = hallLoops(state);
    expect(loops.has('sander')).toBe(true);
    expect(loops.has('sprayBooth')).toBe(false);
    // And nothing at all when the job has nobody on it.
    job.assignees = [];
    expect(hallLoops(state).has('sander')).toBe(false);
  });

  it('knocks and drives screws at a bench that is assembling, and nowhere else', () => {
    const state = inProduction(quiet(), 'laminate');
    const job = firstJob(state);
    // Half way through the labour is the assembly stage on this job's plan.
    job.labourRemaining = job.labourValue * 0.5;
    const shots = hallOneShots(state);
    expect(shots.has('hammer')).toBe(true);
    expect(shots.has('drill')).toBe(true);
    // Nothing is a loop about it: a hammer is a knock and the engine thins it.
    expect(hallLoops(state).has('sander')).toBe(false);
    // A man who is off sick makes no noise, whatever the job says he is on.
    job.assignees = ['staff-away'];
    expect(Array.from(hallOneShots(state))).toEqual([]);
  });
});

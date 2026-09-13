// The two things the company board is built out of: every point of reputation the company has
// gained or lost with the reason for it, and what the hall is turning out and why
// (PIOTR, 13.09; CLAUDE.md T9 3.10).

import { describe, expect, it } from 'vitest';
import {
  BREAK_SKIP_FACTOR,
  EXTRACTOR_BROKEN_OUTPUT_FACTOR,
  GATE_CROWD_FACTOR,
  RATING_ON_TIME,
} from '../../src/engine/constants';
import { hallProductivityFactor, outputBreakdown } from '../../src/engine/machines';
import { applyRating, changeReputation } from '../../src/engine/reputation';
import type { GameState } from '../../src/engine/index';
import {
  act,
  buyStartingKit,
  clearEvents,
  fillRack,
  newGame,
  placeEnquiry,
} from '../helpers';

function hall(): GameState {
  return fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 60);
}

describe('the reputation log', () => {
  it('writes down the day, the reason and the points of every change', () => {
    const state = hall();
    expect(state.reputationLog).toEqual([]);
    const before = state.reputation;
    changeReputation(state, 3, 'Bookcase: on time');
    expect(state.reputation).toBe(before + 3);
    expect(state.reputationLog).toEqual([
      { day: state.clock.day, reason: 'Bookcase: on time', points: 3 },
    ]);
  });

  it('writes down what the company actually moved, not what was asked for', () => {
    const state = hall();
    state.reputation = 99;
    changeReputation(state, 5, 'Wardrobe: express, on time');
    // The scale stops at 100, so the line says what the company really gained.
    expect(state.reputation).toBe(100);
    expect(state.reputationLog[0]?.points).toBe(1);
  });

  it('records a job delivered on time, and the calls nobody answered beside it', () => {
    let state = hall();
    state.enquiries = [];
    const enquiry = placeEnquiry(state, { price: 1200, deadlineDays: 40 });
    state = clearEvents(act(state, { type: 'ACCEPT_ENQUIRY', enquiryId: enquiry.id, byHand: false }));
    const job = state.jobs[0];
    if (job === undefined) throw new Error('no job');
    job.daysLate = 0;
    job.callsMissed = 0;
    job.emailsUnanswered = 0;
    const before = state.reputation;
    applyRating(state, job);
    expect(state.reputation).toBe(before + RATING_ON_TIME);
    const line = state.reputationLog[state.reputationLog.length - 1];
    expect(line?.reason).toBe(`${job.name}: on time`);
    expect(line?.points).toBe(RATING_ON_TIME);
    expect(line?.day).toBe(state.clock.day);
  });

  it('records a late job as late, with the days on the line', () => {
    let state = hall();
    state.enquiries = [];
    const enquiry = placeEnquiry(state, { price: 1200, deadlineDays: 40 });
    state = clearEvents(act(state, { type: 'ACCEPT_ENQUIRY', enquiryId: enquiry.id, byHand: false }));
    const job = state.jobs[0];
    if (job === undefined) throw new Error('no job');
    job.daysLate = 3;
    applyRating(state, job);
    const line = state.reputationLog[state.reputationLog.length - 1];
    expect(line?.reason).toBe(`${job.name}: 3 days late`);
    expect(line?.points).toBeLessThan(0);
  });
});

describe('the company output breakdown', () => {
  it('adds up to what every minute of production is multiplied by', () => {
    const state = hall();
    const breakdown = outputBreakdown(state);
    expect(breakdown.base).toBe(1);
    const sum = breakdown.base + breakdown.plus + breakdown.minus;
    expect(Number(sum.toFixed(2))).toBe(Number(breakdown.total.toFixed(2)));
    expect(breakdown.total).toBe(hallProductivityFactor(state));
  });

  it('says what is wrong with a dirty hall with its extraction down', () => {
    const state = hall();
    state.dust = 80;
    const extractor = state.equipment.find((item) => item.specId === 'extractor');
    if (extractor === undefined) throw new Error('no extractor');
    extractor.broken = true;
    const breakdown = outputBreakdown(state);
    const labels = breakdown.lines.filter((line) => line.hall).map((line) => line.label);
    expect(labels).toContain('Extraction down');
    expect(labels.some((label) => label.startsWith('Hall '))).toBe(true);
    // Every hall line is worth what it takes off the running total, so they add up exactly.
    const sum = breakdown.base + breakdown.plus + breakdown.minus;
    expect(Number(sum.toFixed(4))).toBe(Number(breakdown.total.toFixed(4)));
    expect(breakdown.total).toBeLessThan(EXTRACTOR_BROKEN_OUTPUT_FACTOR + 0.001);
    expect(hallProductivityFactor(state)).toBe(breakdown.total);
  });

  it('shows the owner, the crew and the machines beside it, and does not count them twice', () => {
    const state = hall();
    state.owner.overtimeDebt = 0.1;
    state.owner.breakSkipped = true;
    const clean = outputBreakdown(state);
    // None of these three is the hall's own factor: they act on the man or the machine.
    const owner = clean.lines.filter((line) => line.where === 'your own minutes');
    expect(owner.map((line) => line.label)).toEqual([
      'Overtime, carried into today',
      'Dinner worked through',
    ]);
    expect(owner[0]?.points).toBe(-0.1);
    expect(owner[1]?.points).toBe(Number((BREAK_SKIP_FACTOR - 1).toFixed(4)));
    for (const line of owner) expect(line.hall).toBe(false);
    // The used saw of the day 1 kit is below a standard one, and it says so.
    const saw = clean.lines.find((line) => line.label.startsWith('Table saw'));
    expect(saw?.hall).toBe(false);
    expect(saw?.where).toBe('the stage it does');
    expect(saw?.points).toBeLessThan(0);
    // And the number itself is untouched by any of them.
    expect(clean.total).toBe(hallProductivityFactor(state));
  });

  it('counts the crowded gate the hall counts', () => {
    const state = hall();
    const before = outputBreakdown(state).total;
    for (let index = 0; index < 5; index += 1) {
      const enquiry = placeEnquiry(state, { price: 900, deadlineDays: 40 });
      const next = act(state, { type: 'ACCEPT_ENQUIRY', enquiryId: enquiry.id, byHand: false });
      Object.assign(state, next);
    }
    for (const job of state.jobs) job.stage = 'awaitingTransport';
    const crowded = outputBreakdown(state);
    expect(crowded.lines.some((line) => line.label === 'No room at the gate')).toBe(true);
    expect(crowded.total).toBeLessThan(before);
    expect(crowded.total).toBe(Number((before * GATE_CROWD_FACTOR).toFixed(10)));
  });
});

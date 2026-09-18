// The contracts of Turn 13's phase A: every action the union declares is routed, and a save of
// the build before this one opens with every new field at its section 4 default (CLAUDE.md T13
// section 4, T13-A2).

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { decodeSaveFile } from '../../src/cloud/file';
import {
  OWNER_DRAW_TIERS,
  SOUND_VOLUME_DEFAULT,
  STATE_VERSION,
  WEBSITE_START_LEVEL,
} from '../../src/engine/constants';
import { applyAction, ownerDrawPerDay } from '../../src/engine/index';
import type { GameAction, GameState } from '../../src/engine/index';
import { newGame } from '../helpers';

/** Every `type: '...'` literal of the action union, read off the source, because a union of
 *  string literals cannot be walked at run time. */
function declaredActionTypes(): string[] {
  const source = readFileSync('src/engine/types.ts', 'utf8');
  const start = source.indexOf('export type GameAction');
  const union = source.slice(start, source.indexOf('\n\n', start));
  return Array.from(union.matchAll(/type: '([A-Z_]+)'/g), (match) => match[1] ?? '').filter(
    (type) => type !== '',
  );
}

/** Every `case '...'` inside `applyAction`, the one switch that routes actions. */
function routedActionTypes(): string[] {
  const source = readFileSync('src/engine/game.ts', 'utf8');
  const start = source.indexOf('export function applyAction');
  const body = source.slice(start);
  return Array.from(body.matchAll(/case '([A-Z_]+)':/g), (match) => match[1] ?? '').filter(
    (type) => type !== '',
  );
}

describe('every action has a handler', () => {
  it('routes each type the union declares, and declares each type the switch routes', () => {
    const declared = declaredActionTypes();
    const routed = routedActionTypes();
    expect(declared.length).toBeGreaterThan(40);
    expect(new Set(routed)).toEqual(new Set(declared));
  });

  it('accepts each new action of Turn 13 without throwing, on a fresh game', () => {
    const state = newGame();
    const jobId = 'nothing';
    const actions: GameAction[] = [
      { type: 'ORDER_FOR_JOB', jobId },
      { type: 'RESTOCK' },
      { type: 'TAKE_LOAN', amount: 1000 },
      { type: 'REPAY_LOAN', amount: null },
      { type: 'SET_INSURANCE', cover: 'property', on: true },
      { type: 'ACCEPT_CONTRACT', contractId: 'nothing' },
      { type: 'DECLINE_CONTRACT', contractId: 'nothing' },
      { type: 'ASSIGN_CONTRACT', contractId: 'nothing', workerId: 'nobody', on: true },
      { type: 'RENEW_CONTRACT', contractId: 'nothing', accept: false },
      { type: 'SET_SECOND_SHIFT', on: true },
      { type: 'ASSIGN_SHIFT', workerId: 'nobody', shift: 'night' },
      { type: 'TAKE_HOLIDAY', days: 3 },
      { type: 'SET_OWNER_DRAW', tier: 1 },
      { type: 'BUY_JOINERY_CORE' },
      { type: 'BUY_JOINERY_CORE_EXTENSION' },
      { type: 'SET_WEBSITE_LEVEL', level: 2 },
      { type: 'CONNECT_EXTRACTION', equipmentId: 'nothing' },
      { type: 'BUY_GATE', equipmentId: 'nothing' },
      { type: 'SET_SECURITY_LEVEL', level: 1 },
      { type: 'SET_TIPS', on: false },
      { type: 'DISMISS_TIP', key: 'board' },
    ];
    let next = state;
    for (const action of actions) {
      expect(() => {
        next = applyAction(next, action);
      }, action.type).not.toThrow();
    }
    // The two that need nothing else in place took: the tips are off and the bubble is seen.
    expect(next.settings.tips).toBe(false);
    expect(next.tips.seen).toContain('board');
  });
});

describe('a v19 save opens with the section 4 defaults', () => {
  const text = readFileSync('tests/fixtures/save-v19.woodwork.json', 'utf8');
  const raw = JSON.parse(text) as { stateVersion: number; state: Record<string, unknown> };
  const opened = decodeSaveFile(text);
  const state = opened.state as GameState;

  it('is what it claims: a Turn 12 save on day 2 with a job on the books', () => {
    expect(raw.stateVersion).toBe(13);
    expect(raw.state).not.toHaveProperty('pipes');
    expect(raw.state).not.toHaveProperty('insurance');
    expect((raw.state.jobs as unknown[]).length).toBe(1);
  });

  it('loads at this build’s version', () => {
    expect(opened.state).not.toBeNull();
    expect(state.version).toBe(STATE_VERSION);
    expect(state.clock.day).toBe(2);
  });

  it('has every new field at its default', () => {
    expect(state.finance.loan).toBeNull();
    expect(state.finance.overdraftInterestAccrued).toBe(0);
    expect(state.insurance).toEqual({ property: false, liability: false, insuredValue: 0, payouts: [] });
    expect(state.security).toEqual({ level: 0, lastBurglaryDay: null });
    expect(state.website).toEqual({ level: WEBSITE_START_LEVEL, lastUpkeepDay: null });
    expect(state.contracts).toEqual([]);
    expect(state.ownerDraw).toEqual({ tier: 0 });
    expect(ownerDrawPerDay(state)).toBe(OWNER_DRAW_TIERS[0]);
    expect(ownerDrawPerDay(state)).toBe(200);
    expect(state.pipes).toEqual([]);
    expect(state.gates).toEqual([]);
    expect(state.settings).toEqual({
      tips: true,
      sound: { volume: SOUND_VOLUME_DEFAULT, muted: false },
    });
    expect(state.tips).toEqual({ seen: [] });
    expect(state.shift).toEqual({ second: false });
    expect(state.software.joineryCore).toBe(false);
    expect(state.software.joineryCoreExtensions).toBe(0);
    expect(state.owner.holidayDaysRemaining).toBe(0);
  });

  it('gives the job and the enquiries their new fields, and renames what moved', () => {
    for (const job of state.jobs) {
      expect(job).not.toHaveProperty('materialMode');
      expect(job.kind).toBe('residential');
      expect(job.budget).toBe(job.price);
      expect(job.sheetsReserved).toBe(0);
      expect(job.nightMinutes).toBe(0);
      expect(job.needsSpindle).toBe(false);
    }
    for (const enquiry of state.enquiries) {
      expect(enquiry.kind).toBe('residential');
      expect(enquiry.budget).toBe(enquiry.price);
      expect(enquiry.offer).toBeNull();
    }
    for (const worker of state.workers) {
      expect(worker.shift).toBe('day');
      expect(worker.dayLog).toEqual([]);
    }
    expect(state.tasks.some((task) => (task.kind as string) === 'materialOrder')).toBe(false);
    expect(state.ledger.some((entry) => (entry.category as string) === 'living')).toBe(false);
    expect(state.ledger.some((entry) => (entry.category as string) === 'ducting')).toBe(false);
  });

  it('runs on from where it was', () => {
    expect(() => applyAction(state, { type: 'SET_SPEED', speed: 1 })).not.toThrow();
  });
});

// @vitest-environment jsdom
// The card of a machine says who is at it [PIOTR, 21.09] (CLAUDE.md T25 2.5): its places and who
// is in them this minute, `Places: 2 of 2 in use, Pete and Eddie` on its card and its hover line,
// `2 of 2 in use` on the Owned tab's tile, and `Free` while nobody is at it. Read off the same day
// plan as the figures on the floor, so the two can never disagree.

import { describe, expect, it } from 'vitest';
import { findSpec } from '../../src/engine/index';
import type { Equipment, GameState } from '../../src/engine/index';
import { menAtMachine, placesLine } from '../../src/engine/machines';
import { planPlaces } from '../../src/engine/production';
import { machineStation } from '../../src/engine/stations';
import { renderHall } from '../../src/render/hall';
import { ownedTile } from '../../src/ui/catalogue';
import { renderMachineCard } from '../../src/ui/machineCard';
import { sixJoinersOnSheetWork, withOnlyCuttingLeft } from '../helpers';

/** Two men on jobs at their cutting and one standard saw of two places, the men named the way the
 *  brief names them. */
function twoAtAStandardSaw(): { state: GameState; saw: Equipment } {
  const state = sixJoinersOnSheetWork({ saws: 1, sawVariant: 'standard' });
  for (const worker of state.workers.slice(2)) {
    const job = state.jobs.find((entry) => entry.id === worker.jobId);
    if (job) job.assignees = job.assignees.filter((who) => who !== worker.id);
    worker.jobId = null;
  }
  state.jobs = state.jobs.filter((job) => job.assignees.length > 0);
  for (const job of state.jobs) {
    job.stageLabour = {};
    job.labourRemaining = job.labourValue;
    job.sheetsUsed = 0;
  }
  const [pete, eddie] = state.workers;
  if (pete === undefined || eddie === undefined) throw new Error('two men are wanted');
  pete.name = 'Pete';
  eddie.name = 'Eddie';
  withOnlyCuttingLeft(state);
  planPlaces(state);
  // Their turns at the saw fall in different half hours (v55), so both are stood at it by hand,
  // the way the plan stands them when the turns fall together: the card reads the stations.
  for (const man of [pete, eddie]) {
    man.working = true;
    man.station = machineStation('tableSaw');
  }
  const saw = state.equipment.find((item) => item.specId === 'tableSaw');
  if (saw === undefined) throw new Error('a saw is wanted');
  return { state, saw };
}

function text(html: string): string {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder.textContent ?? '';
}

describe('the places on a machine s card, its tile and its hover line (CLAUDE.md T25 2.5)', () => {
  it('names the two men at a two place saw on the card, and counts them on the tile', () => {
    const { state, saw } = twoAtAStandardSaw();
    expect(menAtMachine(state, saw)).toEqual(['staff-1', 'staff-2']);
    expect(text(renderMachineCard(state, saw.id, null))).toContain('Places: 2 of 2 in use, Pete and Eddie');
    const spec = findSpec(saw.specId);
    if (!spec) throw new Error('the saw s spec is wanted');
    const tile = text(ownedTile(state, saw, spec, null));
    expect(tile).toContain('2 of 2 in use');
    expect(tile).not.toContain('Places:');
    expect(renderHall(state)).toContain('Places: 2 of 2 in use, Pete and Eddie.');
  });

  it('says one of two with one man at it, and Free with none', () => {
    const { state, saw } = twoAtAStandardSaw();
    const pete = state.workers[0];
    const job = state.jobs.find((entry) => entry.assignees.includes('staff-1'));
    if (!pete || !job) throw new Error('Pete s job is wanted');
    job.assignees = [];
    pete.jobId = null;
    planPlaces(state);
    expect(placesLine(state, saw, 'card')).toBe('Places: 1 of 2 in use, Eddie');
    expect(placesLine(state, saw, 'tile')).toBe('1 of 2 in use');
    state.jobs = [];
    for (const worker of state.workers) worker.jobId = null;
    planPlaces(state);
    expect(placesLine(state, saw, 'card')).toBe('Free');
    expect(placesLine(state, saw, 'tile')).toBe('Free');
  });

  it('says nothing of places on a broken saw, whose card says it is broken', () => {
    const { state, saw } = twoAtAStandardSaw();
    saw.broken = true;
    planPlaces(state);
    expect(placesLine(state, saw, 'card')).toBe('');
    const card = text(renderMachineCard(state, saw.id, null));
    expect(card).toContain('stopped: broken');
    expect(card).not.toContain('Places:');
  });

  it('carries no places line on a thing nobody works at', () => {
    const { state } = twoAtAStandardSaw();
    const fan = state.equipment.find((item) => item.specId === 'extractor');
    if (!fan) throw new Error('a fan is wanted');
    expect(placesLine(state, fan, 'card')).toBe('');
  });
});

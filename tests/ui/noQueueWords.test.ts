// @vitest-environment jsdom
// No screen says "waiting for" a machine or "no bench" anywhere (CLAUDE.md T25 2.2, T25-B5): the
// queue's words went with the queue, and v52's words for a man the hall had no place for, which
// named the machine, went with the waiting for a machine (PIOTR, 24.09; v53). Every screen the
// hall's places are read on is drawn over a hall of six men and one used saw, where every man
// works and the saw says it is too few for the crew, and a hall where the saw and the one bench
// are every place there is, where the men past them stand with no free machines. None of them may
// carry the old words.

import { describe, expect, it } from 'vitest';
import type { GameState } from '../../src/engine/index';
import { planPlaces } from '../../src/engine/production';
import { tick } from '../../src/engine/index';
import { renderHall } from '../../src/render/hall';
import { renderCatalogue } from '../../src/ui/catalogue';
import { renderCompany } from '../../src/ui/company';
import { renderDayEnd } from '../../src/ui/dayEnd';
import { jobRow } from '../../src/ui/jobCard';
import { renderMachineCard } from '../../src/ui/machineCard';
import { renderMachinesPage } from '../../src/ui/machinesPage';
import { renderOurTeam, renderPerson } from '../../src/ui/personCard';
import { renderTopbar } from '../../src/ui/topbar';
import { renderWorkPlan } from '../../src/ui/workPlan';
import { sixJoinersOnSheetWork, withOnlyCuttingLeft } from '../helpers';

const OLD_WORDS = [
  /waiting for (the|a) (saw|table saw|cnc|booth|spray booth|edgebander|spindle|thicknesser|bench|workbench|machine|place)/i,
  /no bench/i,
  /waiting for a place/i,
  // v52's `no place at the saw`: from v53 a man stands only when every place he could take is
  // taken, and the words name no machine (PIOTR, 24.09; v53).
  /no place at the/i,
];

/** Six men, every one at the start of his job's cutting, one used saw of one place and a bench
 *  each. Nobody waits for the saw: one man cuts and the others work at their benches, and the
 *  crew of seven, the owner with them, is six more than the saw has places for (PIOTR, 24.09;
 *  v53). */
function crowdedSaw(): GameState {
  const state = sixJoinersOnSheetWork({ saws: 1, sawVariant: 'used' });
  for (const job of state.jobs) {
    job.stageLabour = {};
    job.labourRemaining = job.labourValue;
    job.sheetsUsed = 0;
  }
  withOnlyCuttingLeft(state);
  planPlaces(state);
  return tick(state, 30);
}

/** Six men at the assembly with the day one kit's one bench and the one used saw: two places for
 *  six men, so four of them stand with every place taken (PIOTR, 24.09; v53). */
function crowdedBench(): GameState {
  const state = sixJoinersOnSheetWork({ saws: 1, sawVariant: 'used' });
  state.equipment = state.equipment.filter(
    (item) => item.specId !== 'workbench' || item.id === state.equipment.find((kit) => kit.specId === 'workbench')?.id,
  );
  for (const job of state.jobs) {
    job.stageLabour = {};
    job.labourRemaining = job.labourValue * 0.4;
  }
  planPlaces(state);
  return tick(state, 30);
}

function everyScreen(state: GameState): string[] {
  const screens = [
    renderHall(state),
    renderWorkPlan(state, 'jobs'),
    renderWorkPlan(state, 'contracts'),
    renderTopbar(state, 'hall'),
    renderCompany(state),
    renderCatalogue(state, '', 'owned'),
    renderMachinesPage(state),
    renderOurTeam(state),
    renderDayEnd(state),
    ...state.jobs.map((job) => jobRow(state, job)),
    ...state.equipment.map((item) => renderMachineCard(state, item.id, null)),
    renderPerson(state, 'owner', 'card'),
    ...state.workers.map((worker) => renderPerson(state, worker.id, 'card')),
  ];
  return screens.map((html) => {
    const holder = document.createElement('div');
    holder.innerHTML = html;
    // The words a player reads: the text, and every hover line.
    const titles = Array.from(holder.querySelectorAll('title, [title]')).map(
      (node) => node.getAttribute('title') ?? node.textContent ?? '',
    );
    return [holder.textContent ?? '', ...titles].join('\n');
  });
}

/** None of the old words on any screen of this hall. */
function noOldWords(texts: string[]): void {
  for (const text of texts) {
    for (const words of OLD_WORDS) expect(text).not.toMatch(words);
  }
}

describe('the queue s words are gone from every screen (CLAUDE.md T25 2.2)', () => {
  it('says none of them over a crowded saw, where every man works and the saw says it is too few for the crew', () => {
    const state = crowdedSaw();
    // Nobody waits for the saw and nobody stands: every man has a place of his own, one at the
    // saw and the rest at the benches (PIOTR, 24.09; v53). Until v53 five of them had no place.
    for (const worker of state.workers) {
      expect(worker.working, worker.id).toBe(true);
      expect(worker.noPlaceFor, worker.id).toBe('');
    }
    const texts = everyScreen(state);
    noOldWords(texts);
    // What the player reads instead is the saw's own line, on its hover and its card.
    expect(texts.join('\n')).toContain('Too few saws for the crew: 7 men, 1 place, 6 work at 67%');
    expect(texts.join('\n')).not.toContain('with no free machines');
  });

  it('says none of them over a crowded bench, and says no free machines instead', () => {
    const state = crowdedBench();
    // The saw and the bench are taken, and the men past them stand. The family a man could have
    // used first is his job's own, the bench of its assembly.
    expect(state.workers.filter((worker) => worker.working)).toHaveLength(2);
    expect(state.workers.filter((worker) => worker.noPlaceFor === 'workbench')).toHaveLength(4);
    const texts = everyScreen(state);
    noOldWords(texts);
    // The Work Plan's line counts them, and the mark over each of the four says the same words.
    expect(texts.join('\n')).toContain('2 men working \u00b7 4 with no free machines');
    const svg = renderHall(state);
    expect(svg.match(/data-bubble="noPlace"/g)).toHaveLength(4);
    expect(svg.match(/<div class="bubble">no free machines<\/div>/g)).toHaveLength(4);
  });
});

// @vitest-environment jsdom
// No screen says "waiting for" a machine or "no bench" anywhere (CLAUDE.md T25 2.2, T25-B5): the
// queue's words went with the queue. Every screen the hall's places are read on is drawn over a
// hall of four men and one used saw, where three of them have no place, and a hall where the bench
// is the thing short, and none of them may carry the old words.

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
];

/** Six men, every one at the start of his job's cutting, and one used saw of one place. */
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

/** Six men at the assembly with the day one kit's one bench: the bench is the thing short. */
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

describe('the queue s words are gone from every screen (CLAUDE.md T25 2.2)', () => {
  for (const [name, hall] of [
    ['a crowded saw', crowdedSaw],
    ['a crowded bench', crowdedBench],
  ] as const) {
    it(`says none of them over ${name}, and says no place instead`, () => {
      const state = hall();
      // The hall is short of what its name says: somebody has no place at it.
      const short = name === 'a crowded saw' ? 'tableSaw' : 'workbench';
      expect(state.workers.some((worker) => worker.noPlaceFor === short)).toBe(true);
      const texts = everyScreen(state);
      for (const text of texts) {
        for (const words of OLD_WORDS) expect(text).not.toMatch(words);
      }
      expect(texts.join('\n')).toContain('no place at the');
    });
  }
});

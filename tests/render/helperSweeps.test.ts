// "He sweeps with a broom" (PIOTR, 18.09; CLAUDE.md T20 2.8.2). The cleaning is its own station,
// the helper plays the broom sheet the v28 patch delivered at it, and a role with no broom sheet
// falls to the bench and not to standing about.

import { describe, expect, it } from 'vitest';
import { CLEANING_MINUTES } from '../../src/engine/constants';
import { STATION_BENCH, STATION_CLEANING, stationForTask } from '../../src/engine/stations';
import { createTask } from '../../src/engine/tasks';
import {
  ANIMATIONS,
  animationForStation,
  characterArt,
  playableAnimation,
} from '../../src/render/characters';
import { renderHall } from '../../src/render/hall';
import type { GameState } from '../../src/engine/index';
import { buyStartingKit, fillRack, hireNow, newGame } from '../helpers';

function hallWithHelper(): GameState {
  const state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 10);
  state.enquiries = [];
  const next = hireNow(state, 'helper', null);
  const helper = next.workers.find((worker) => worker.role === 'helper');
  if (helper === undefined) throw new Error('no helper on the books');
  helper.startDay = next.clock.day;
  return next;
}

describe('the helper sweeps with a broom (CLAUDE.md T20 2.8)', () => {
  it('makes the cleaning a station of its own and plays the broom at it', () => {
    expect(animationForStation(STATION_CLEANING)).toBe('sweep');
    expect(ANIMATIONS).toContain(animationForStation(STATION_CLEANING));
    // And the bench is still the bench: only the sweeping moved.
    expect(animationForStation(STATION_BENCH)).toBe('bench');
  });

  it('sends a man on a cleaning task to it, and nowhere else', () => {
    const state = hallWithHelper();
    const task = createTask(state, {
      kind: 'cleaning',
      label: 'Sweep the hall',
      minutes: CLEANING_MINUTES,
    });
    expect(stationForTask(state, task)).toBe(STATION_CLEANING);
  });

  it('draws the helper from his own broom sheet, and falls a joiner and the owner to the bench', () => {
    expect(playableAnimation('helper', 'sweep')).toEqual({ animation: 'sweep', frozen: false });
    expect(characterArt('helper', 'sweep', 'sw')).toContain('character.helper.sweep');
    expect(characterArt('helper', 'sweep', 'sw')).toContain('data-anim="sweep"');
    for (const role of ['joiner', 'owner']) {
      expect(playableAnimation(role, 'sweep'), role).toEqual({ animation: 'bench', frozen: false });
      expect(characterArt(role, 'sweep', 'sw'), role).toContain('data-anim="bench"');
    }
  });

  it('paints him sweeping on the floor of the hall while he has the broom', () => {
    const state = hallWithHelper();
    const helper = state.workers.find((worker) => worker.role === 'helper');
    if (helper === undefined) throw new Error('no helper on the books');
    helper.station = STATION_CLEANING;
    const svg = renderHall(state, { files: ['character.helper.sweep.sheet.png'] });
    expect(svg).toContain(`data-station="${STATION_CLEANING}"`);
    expect(svg).toContain('data-rest="sweep"');
    expect(svg).toContain('character.helper.sweep.sheet.png');
    // And the line under his name says what he is doing. The cleaning is a station of its own
    // since 2.8.2, and a station the hall has no word for reads "waiting", which a man with a
    // broom in his hands is not.
    expect(svg).toContain(`${helper.name}, sweeping the floor`);
    // At his bench he is at his bench, as he always was.
    helper.station = STATION_BENCH;
    expect(renderHall(state, { files: ['character.helper.sweep.sheet.png'] })).not.toContain(
      'data-rest="sweep"',
    );
  });
});

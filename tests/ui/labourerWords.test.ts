// @vitest-environment jsdom
// The labourer's name (PIOTR, 02.10: "change the name from helper to labourer"; CLAUDE.md T26 2.7).
// Every word the player reads says labourer: the role words, the hire card, the Pace sheet's line,
// the refusal of a job of work that is his, and the hall. The role's id stays `helper`, because a
// save carries it and the art side's sheets are named after it.

import { describe, expect, it } from 'vitest';
import { HIRING_SPECS } from '../../src/engine/constants';
import { outputBreakdown } from '../../src/engine/machines';
import { ROLE_WORDS_MANY } from '../../src/engine/staff';
import { WAITING_FOR_LABOURER } from '../../src/engine/tasks';
import { renderHall } from '../../src/render/hall';
import { ROLE_WORDS, renderTeam } from '../../src/ui/team';
import { buyStartingKit, newGame, testJoiner } from '../helpers';

describe('the labourer (CLAUDE.md T26 2.7)', () => {
  it('is called a labourer in the role words and on the hire card, and keeps the id helper', () => {
    expect(ROLE_WORDS.helper).toBe('labourer');
    expect(ROLE_WORDS_MANY.helper).toBe('labourers');
    const spec = HIRING_SPECS.find((entry) => entry.role === 'helper');
    expect(spec?.label).toBe('Labourer');
    const page = document.createElement('div');
    page.innerHTML = renderTeam(newGame(), 'workshop');
    expect(page.textContent).toContain('Labourer');
    expect(page.textContent).not.toMatch(/helper/i);
  });

  it('says labourer on the Pace sheet s line and on the refusal of his own job of work', () => {
    const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    for (let man = 0; man < 5; man += 1) state.workers.push(testJoiner(`staff-${man + 1}`, `Joiner ${man + 1}`));
    const labels = outputBreakdown(state).lines.map((line) => line.label);
    expect(labels).toContain('Five joiners and no labourer');
    expect(WAITING_FOR_LABOURER).toBe('Waiting for the labourer');
  });

  it('draws him on the hall with no word of the old name anywhere a player reads it', () => {
    const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    const man = testJoiner('staff-1', 'Frank');
    man.role = 'helper';
    man.tier = null;
    state.workers.push(man);
    // What a player reads on the hall is its text and its hover titles; the sheet's file name and
    // the figure's data attribute carry the id, which he never reads.
    const page = document.createElement('div');
    page.innerHTML = renderHall(state);
    expect(page.textContent).toContain('Frank');
    expect(page.textContent).not.toMatch(/helper/i);
  });
});

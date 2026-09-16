// The Projects chip on the top bar (CLAUDE.md T16 2.4): the count of live jobs, shown from day one
// at zero, opening the Work Plan, which is the same modal the board on the office wall opens.

import { describe, expect, it } from 'vitest';
import { openJobs } from '../../src/engine/jobs';
import { OFFICE_REGION_MODALS } from '../../src/ui/app';
import { renderTopbar } from '../../src/ui/topbar';
import { OFFICE_REGIONS } from '../../src/render/office';
import { buyStartingKit, fillRack, newGame, twoMenOnSheetWork } from '../helpers';

describe('the Projects chip', () => {
  it('counts the live jobs, sits between the day meter and Orders, and is there at zero from day one', () => {
    const fresh = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
    expect(openJobs(fresh)).toHaveLength(0);
    const html = renderTopbar(fresh, 'hall');
    expect(html).toContain('Projects: 0');
    const chip = html.indexOf('Projects: 0');
    expect(chip).toBeGreaterThan(html.indexOf('day-meter'));
    expect(chip).toBeLessThan(html.indexOf('Orders: '));
    const busy = twoMenOnSheetWork({ saws: 1 });
    expect(renderTopbar(busy, 'hall')).toContain(`Projects: ${openJobs(busy).length}`);
    expect(openJobs(busy).length).toBeGreaterThan(0);
  });

  it('opens the Work Plan, the same modal as the board on the office wall', () => {
    const html = renderTopbar(fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' }))), 'hall');
    const button = /<button[^>]*data-do="openModal"[^>]*>Projects: 0<\/button>/.exec(html)?.[0] ?? '';
    expect(button).toContain('data-modal="workPlan"');
    // The office board's region opens the same id.
    const region = OFFICE_REGIONS.find((entry) => entry.id === 'workPlan');
    expect(region?.opens).toBe(true);
    expect(OFFICE_REGION_MODALS.workPlan).toBe('workPlan');
  });
});

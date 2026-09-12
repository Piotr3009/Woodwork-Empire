// The Work Plan board on the office wall: every job on the books with its five step row and its
// Start production. The list the laptop used to call "Jobs on the books" (CLAUDE.md T4 3.1).

import { openJobs } from '../engine/index';
import type { GameState } from '../engine/index';
import { jobRow } from './jobCard';
import { emptyLine } from './modal';

export function renderWorkPlan(state: GameState): string {
  const jobs = openJobs(state);
  if (jobs.length === 0) return emptyLine('No jobs yet. Open the board.');
  return jobs.map((job) => jobRow(state, job)).join('');
}

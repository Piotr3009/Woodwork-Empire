// The warning strip (CLAUDE.md T13 3.22): one engine function returns the list of problems the
// game sees, the most urgent first, and the strip shows one at a time. Phase A: the shape and the
// first two; phase B5 completes the list and its order.

import type { GameState } from './types';

export interface Warning {
  key: string;
  text: string;
}

export function warnings(state: GameState): Warning[] {
  const found: Warning[] = [];
  const started = state.jobs.find((job) => job.stage === 'inProduction' && job.assignedTo === null);
  if (started) found.push({ key: 'nobodyAssigned', text: `${started.name} is started and nobody is on it` });
  return found;
}

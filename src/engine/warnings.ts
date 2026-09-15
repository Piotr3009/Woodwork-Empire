// The warning strip (CLAUDE.md T13 3.22): one engine function returns the list of problems the
// game sees, the most urgent first, and the strip under the top bar shows the first of them, one
// line, one problem at a time.
//
// The order is by how soon the problem costs the player something, and how much of the hall it
// stops. Bags full stops every machine in the hall this minute. A started job nobody is on has its
// clock running with no work going in. A deadline at risk is a reputation hit that is still
// avoidable. A commercial enquiry the company cannot take for want of insurance is money not
// earned, not money lost. The crew at the floor limit is a wall the player will meet at the next
// hire, and nothing until then.

import { NO_INSURANCE_REASON } from './constants';
import { bagStore } from './machines';
import { workPlan } from './plan';
import { crewFull, crewLine } from './staff';
import type { GameState } from './types';

export type WarningKey =
  | 'bagsFull'
  | 'nobodyAssigned'
  | 'deadlineAtRisk'
  | 'noInsurance'
  | 'crewFull';

export interface Warning {
  key: WarningKey;
  text: string;
}

/** The order of urgency: the strip shows the first key in this list that has a problem behind it. */
export const WARNING_ORDER: readonly WarningKey[] = [
  'bagsFull',
  'nobodyAssigned',
  'deadlineAtRisk',
  'noInsurance',
  'crewFull',
];

function bagsFullWarning(state: GameState): Warning | null {
  if (!bagStore(state).full) return null;
  return {
    key: 'bagsFull',
    text: 'The bags are full: nothing that makes dust runs until they are emptied',
  };
}

function nobodyAssignedWarning(state: GameState): Warning | null {
  const started = state.jobs.find(
    (job) => job.stage === 'inProduction' && job.assignedTo === null,
  );
  if (started === undefined) return null;
  return { key: 'nobodyAssigned', text: `${started.name} is started and nobody is on it` };
}

/** A deadline at risk, off the work plan: a job whose projected end has walked past its deadline,
 *  or one not yet started whose last day to start has gone (CLAUDE.md T9 3.6, T11 3.3). A piece
 *  already made is the gate's business, not this line's. */
function deadlineWarning(state: GameState): Warning | null {
  const unfinished = new Set(
    state.jobs.filter((job) => job.finishedDay === null).map((job) => job.id),
  );
  const row = workPlan(state).rows.find(
    (entry) => unfinished.has(entry.jobId) && (entry.overdue || entry.late),
  );
  if (row === undefined) return null;
  return {
    key: 'deadlineAtRisk',
    text: row.overdue
      ? `${row.name} will miss its deadline at this rate`
      : `${row.name} has to start now to make its deadline`,
  };
}

function noInsuranceWarning(state: GameState): Warning | null {
  const commercial = state.enquiries.find(
    (enquiry) => enquiry.kind === 'commercial' && enquiry.blockReason === NO_INSURANCE_REASON,
  );
  if (commercial === undefined) return null;
  return {
    key: 'noInsurance',
    text: `${commercial.name} is commercial work and the company has no insurance for it`,
  };
}

function crewFullWarning(state: GameState): Warning | null {
  if (!crewFull(state, 'joiner')) return null;
  return { key: 'crewFull', text: `${crewLine(state)}: no floor for another person` };
}

const CHECKS: Record<WarningKey, (state: GameState) => Warning | null> = {
  bagsFull: bagsFullWarning,
  nobodyAssigned: nobodyAssignedWarning,
  deadlineAtRisk: deadlineWarning,
  noInsurance: noInsuranceWarning,
  crewFull: crewFullWarning,
};

/** Every problem the game sees right now, the most urgent first. Empty when nothing is wrong. */
export function warnings(state: GameState): Warning[] {
  const found: Warning[] = [];
  for (const key of WARNING_ORDER) {
    const warning = CHECKS[key](state);
    if (warning !== null) found.push(warning);
  }
  return found;
}

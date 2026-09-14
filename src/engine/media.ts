// Air and dust that have to add up (PIOTR's tables of 13.09; CLAUDE.md T10 3.1, 3.2, 3.3).
//
// Every machine has a demand and every fan and every compressor has a capacity, and the sums
// decide whether the hall runs clean. Nothing is pre-booked: the check is per minute, over the
// machines a man is actually standing at this minute, and it is asked here and nowhere else.
// One selector for the extraction and one for the air, so the hall, the company board, the job
// card and the bench cannot disagree about the state of the workshop.

import { EXTRACTION_CAPACITY, EXTRACTION_DEMAND, EXTRACTION_MARGIN } from './constants';
import { isSold, itemStandsInTheHall } from './machines';
import type { Equipment, GameState } from './types';

/** A whole number with the thousands marked, the way the hall writes a figure of m3/h or l/min. */
export function mediaFigure(value: number): string {
  return Math.round(value).toLocaleString('en-GB');
}

// ---------------------------------------------------------------------------
// Extraction (CLAUDE.md T10 3.1)
// ---------------------------------------------------------------------------

/** What this machine pulls out of the air while somebody is standing at it, in cubic metres an
 *  hour. Zero for anything that is not on Piotr's table: a bench, a rack, a hand tool, and the
 *  spray booth, which has extraction of its own and is not counted here. */
export function extractionDemandOf(item: { specId: string; variantId: string }): number {
  return EXTRACTION_DEMAND[item.specId]?.[item.variantId] ?? 0;
}

/** What this piece of extraction pulls, in cubic metres an hour. Zero for everything that is not
 *  extraction. */
export function extractionCapacityOf(item: { specId: string; variantId: string }): number {
  return EXTRACTION_CAPACITY[item.specId]?.[item.variantId] ?? 0;
}

/** The machines drawing on the extraction this minute: the ones a man has taken (CLAUDE.md T7
 *  3.1). A machine on order is a drawing on the floor and is not here at all (T10 3.10). */
export function extractingMachines(state: GameState): Equipment[] {
  return state.equipment.filter(
    (item) => item.takenBy !== null && !isSold(item) && extractionDemandOf(item) > 0,
  );
}

/** Everything in the hall that pulls: several extractors add up, because the hall is one duct run
 *  however many fans are on it (CLAUDE.md T10 3.1). A machine that has been sold stops working
 *  the minute the sale is made (T8 3.5); a broken extractor keeps its capacity here, because the
 *  hall is already paying for the breakdown through its own line of the output breakdown and it
 *  is not charged twice for one fault (Turn 2 3.9). */
export function extractionKit(state: GameState): Equipment[] {
  return state.equipment.filter(
    (item) => !isSold(item) && itemStandsInTheHall(item) && extractionCapacityOf(item) > 0,
  );
}

export interface ExtractionCheck {
  /** What the machines at work are asking for, m3/h. */
  demand: number;
  /** What the hall has, m3/h. */
  capacity: number;
  /** What it may be worked to: the capacity less Piotr's 20% margin. */
  allowed: number;
  /** True while the hall is under extracted this minute. */
  short: boolean;
  /** "Extraction short: 2,500 of 1,660", or empty while the sums are fine. */
  line: string;
}

/** The one place the extraction sum is done (CLAUDE.md T10 3.1). */
export function extractionCheck(state: GameState): ExtractionCheck {
  let demand = 0;
  for (const item of extractingMachines(state)) demand += extractionDemandOf(item);
  let capacity = 0;
  for (const item of extractionKit(state)) capacity += extractionCapacityOf(item);
  const allowed = Math.round(capacity * EXTRACTION_MARGIN);
  const short = demand > allowed;
  return {
    demand,
    capacity,
    allowed,
    short,
    line: short ? `Extraction short: ${mediaFigure(demand)} of ${mediaFigure(allowed)}` : '',
  };
}

/** True while the hall is under extracted: the one predicate the dust, the output and the job's
 *  own count of dusty minutes all read. */
export function underExtracted(state: GameState): boolean {
  return extractionCheck(state).short;
}

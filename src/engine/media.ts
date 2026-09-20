// Air and dust that have to add up (PIOTR's tables of 13.09; CLAUDE.md T10 3.1, 3.2, 3.3).
//
// Every machine has a demand and every fan and every compressor has a capacity, and the sums
// decide whether the hall runs clean. Nothing is pre-booked: the check is per minute, over the
// machines a man is actually standing at this minute, and it is asked here and nowhere else.
// One selector for the extraction and one for the air, so the hall, the company board, the job
// card and the bench cannot disagree about the state of the workshop.

import {
  AIR_BENCH_DEMAND,
  LOW_AIR_FACTOR,
  NO_AIR_LINE,
  AIR_DEMAND,
  AIR_DIVERSITY,
  AIR_DRYER,
  AIR_HEADROOM,
  AIR_SANDING_DEMAND,
  COMPRESSOR,
  COMPRESSOR_AIR,
  COMPRESSOR_WITH_DRYER,
  EXTRACTION_CAPACITY,
  EXTRACTION_DEMAND,
  EXTRACTION_MARGIN,
} from './constants';
import {
  BENCH,
  floorMachines,
  hasCentralExtraction,
  hasGate,
  isSold,
  itemStandsInTheHall,
} from './machines';
import { cncOptions, currentStage } from './stages';
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

/** Connected to the extraction: a run of pipe to a unit, or a hall on a central system whose
 *  ducts reach everything. A machine that wants no extraction is never unconnected. Asked here
 *  and not in pipes.ts, which imports this module (CLAUDE.md T13 3.19). */
export function isConnectedToExtraction(state: GameState, item: Equipment): boolean {
  if (extractionDemandOf(item) <= 0) return true;
  if (hasCentralExtraction(state)) return true;
  return state.pipes.some((run) => run.equipmentId === item.id);
}

/** True while the fan is pulling at all: some machine with a demand has a man at it. */
export function extractionRunning(state: GameState): boolean {
  return extractingMachines(state).length > 0;
}

/** The branches the fan is pulling through this minute, which is what the extraction demand is
 *  the sum of (CLAUDE.md T13 3.11). While the fan runs at all, the duct is open through every
 *  connected machine that has no gate, whether or not a man is at it, so every ungated machine
 *  counts whenever it is connected; a machine with an automatic gate on its drop counts only
 *  while somebody is actually standing at it. Nothing runs, nothing is pulled. */
export function extractionLoad(state: GameState): Equipment[] {
  if (!extractionRunning(state)) return [];
  return state.equipment.filter(
    (item) =>
      !isSold(item) &&
      itemStandsInTheHall(item) &&
      extractionDemandOf(item) > 0 &&
      isConnectedToExtraction(state, item) &&
      (item.takenBy !== null || !hasGate(state, item)),
  );
}

/** The machines at work this minute that have no pipe to the extraction: they are not served, and
 *  the hall is short for that minute (CLAUDE.md T13 3.19, 10.1). */
export function unservedMachines(state: GameState): Equipment[] {
  return extractingMachines(state).filter((item) => !isConnectedToExtraction(state, item));
}

export interface ExtractionCheck {
  /** What the open branches are asking for, m3/h: every ungated connected machine while the fan
   *  runs, and every gated one a man is at (CLAUDE.md T13 3.11). */
  demand: number;
  /** What the hall has, m3/h. */
  capacity: number;
  /** What it may be worked to: the capacity less Piotr's 20% margin. */
  allowed: number;
  /** True while the hall is under extracted this minute. */
  short: boolean;
  /** "Extraction short: 2,500 of 1,660 usable", or empty while the sums are fine. The figure is
   *  the fans less Piotr's margin, and says so, because a bare 830 beside a fan sold as 1,000 read
   *  as a wrong spec (PIOTR, 20.09). */
  line: string;
}

/** The one place the extraction sum is done (CLAUDE.md T10 3.1). */
export function extractionCheck(state: GameState): ExtractionCheck {
  let demand = 0;
  for (const item of extractionLoad(state)) demand += extractionDemandOf(item);
  let capacity = 0;
  for (const item of extractionKit(state)) capacity += extractionCapacityOf(item);
  const allowed = Math.round(capacity * EXTRACTION_MARGIN);
  // A machine running with no pipe to a unit is not served at all, whatever the fans could
  // pull: the hall is short for that minute (CLAUDE.md T13 3.19).
  const unserved = unservedMachines(state);
  const short = demand > allowed || unserved.length > 0;
  const line =
    unserved.length > 0
      ? `Extraction: ${unserved.length === 1 ? 'a machine is' : `${unserved.length} machines are`} not connected`
      : short
        ? `Extraction short: ${mediaFigure(demand)} of ${mediaFigure(allowed)} usable`
        : '';
  return { demand, capacity, allowed, short, line };
}

/** The standing picture of the extraction, for a card to say whether the hall is set up right:
 *  every connected machine's demand added as if all of them ran at once, against the fans less
 *  Piotr's margin. The minute by minute rule stays `extractionCheck` and nothing reads this for
 *  the dust or the output; it is the same demand table and the same margin, summed over what
 *  stands connected rather than over who is at it, so a card can say "too many saws for this
 *  extractor" before the minute it happens (PIOTR, 20.09). */
export function extractionStanding(state: GameState): {
  demand: number;
  capacity: number;
  allowed: number;
  machines: number;
} {
  let demand = 0;
  let machines = 0;
  for (const item of state.equipment) {
    if (isSold(item) || !itemStandsInTheHall(item) || extractionDemandOf(item) <= 0) continue;
    if (!isConnectedToExtraction(state, item)) continue;
    demand += extractionDemandOf(item);
    machines += 1;
  }
  let capacity = 0;
  for (const item of extractionKit(state)) capacity += extractionCapacityOf(item);
  return { demand, capacity, allowed: Math.round(capacity * EXTRACTION_MARGIN), machines };
}

/** True while the hall is under extracted: the one predicate the dust, the output and the job's
 *  own count of dusty minutes all read. */
export function underExtracted(state: GameState): boolean {
  return extractionCheck(state).short;
}

// ---------------------------------------------------------------------------
// Compressed air (CLAUDE.md T10 3.2 and 3.3)
// ---------------------------------------------------------------------------

/** What a machine wants of the air while it runs: the pressure it will not start under and the
 *  free air it draws, a minute. Null for a machine that wants none. */
export function airDemandOf(item: { specId: string; variantId: string }): {
  bar: number;
  litres: number;
} | null {
  return AIR_DEMAND[item.specId]?.[item.variantId] ?? null;
}

/** What a compressor gives (PIOTR's bands). */
export function compressorAirOf(item: { variantId: string }): { bar: number; litres: number } {
  return COMPRESSOR_AIR[item.variantId] ?? { bar: 0, litres: 0 };
}

/** The compressors in the hall, in the order they were bought, which is the order the modal and
 *  the Owned tab number them in: "Air: compressor 2" is the second of these. */
export function compressors(state: GameState): Equipment[] {
  return state.equipment.filter((item) => item.specId === COMPRESSOR && !isSold(item));
}

/** What the player calls this one: "compressor 2". */
export function compressorLabel(state: GameState, item: Equipment): string {
  const index = compressors(state).findIndex((entry) => entry.id === item.id);
  return index < 0 ? 'compressor' : `compressor ${index + 1}`;
}

/** The compressor this machine draws from. Everything is on the first one unless the player has
 *  assigned it somewhere else, which is what "default: all" means (CLAUDE.md T10 3.2). A machine
 *  whose compressor has been sold or scrapped falls back to the first one, so no consumer is ever
 *  left pointing at nothing. */
export function compressorFor(state: GameState, item: Equipment): Equipment | null {
  const list = compressors(state);
  if (list.length === 0) return null;
  const named = item.compressorId === null
    ? null
    : list.find((entry) => entry.id === item.compressorId) ?? null;
  return named ?? list[0] ?? null;
}

/** The dryers fitted to this compressor: the ones assigned to it, and the one an industrial
 *  compressor has built into its cabinet (PIOTR, CLAUDE.md T10 3.3). */
export function compressorHasDryer(state: GameState, item: Equipment): boolean {
  if (item.variantId === COMPRESSOR_WITH_DRYER) return true;
  return state.equipment.some(
    (entry) =>
      entry.specId === AIR_DRYER &&
      !isSold(entry) &&
      (compressorFor(state, entry)?.id ?? null) === item.id,
  );
}

/** The machines drawing air from this compressor this minute: the ones a man has taken. */
export function airConsumers(state: GameState, compressor: Equipment): Equipment[] {
  return state.equipment.filter((item) => {
    if (item.takenBy === null || isSold(item)) return false;
    if (airDemandOf(item) === null) return false;
    return (compressorFor(state, item)?.id ?? null) === compressor.id;
  });
}

/** How many men are at a bench this minute, and how many of them are at the Finishing stage: the
 *  two per person draws of Piotr's table (CLAUDE.md T10 3.2). The caller counts them, because the
 *  people side of the hall belongs to production and not to this module. */
export interface AirHands {
  bench: number;
  sanding: number;
}

export interface CompressorLine {
  id: string;
  label: string;
  /** What it gives. */
  bar: number;
  litres: number;
  /** What is drawn on it this minute, before the trade's diversity factor. */
  drawn: number;
  /** The same, with the diversity factor: what the pipe actually sees. */
  demand: number;
  /** What it may be worked to: its litres less the headroom. */
  allowed: number;
  /** True while more is being drawn than the pipe will carry: every pneumatic consumer on it
   *  runs at 0.7 for the minute. */
  low: boolean;
  /** A dryer of its own, or one built into the cabinet. */
  dryer: boolean;
}

export interface AirCheck {
  /** One line per compressor in the hall, in the order the player numbers them. */
  compressors: CompressorLine[];
  /** The ids of the machines that cannot run at all, because they want more bar than the
   *  compressor they are on gives, or because they want dry air and there is no dryer. */
  stopped: string[];
  /** The ids of the compressors that are short of litres this minute. */
  lowAir: string[];
  /** What the hall says under it, one line per compressor with something to say. */
  lines: string[];
}

/** Why this machine will not run on the air it is given, in the words the hall says it in, or
 *  empty when it will. The one place the bar and the dry air rules are asked (CLAUDE.md T10 3.2
 *  rule 1, 3.3). */
export function airBlockFor(state: GameState, item: Equipment): string {
  const wants = airDemandOf(item);
  if (wants === null) return '';
  const compressor = compressorFor(state, item);
  if (compressor === null) return `needs ${wants.bar} bar, no compressor in the hall`;
  const gives = compressorAirOf(compressor);
  if (wants.bar > gives.bar) {
    return `needs ${wants.bar} bar, compressor gives ${gives.bar}`;
  }
  if (needsDryAir(item.specId) && !compressorHasDryer(state, compressor)) return 'needs dry air';
  return '';
}

/** The families that will not run on wet air at all (PIOTR, CLAUDE.md T10 3.3). The spray booth
 *  runs on it and pays for it in minutes and in rating instead. */
export function needsDryAir(specId: string): boolean {
  return specId === 'cnc';
}

/** The whole air side of the hall this minute (CLAUDE.md T10 3.2, 3.3). */
export function airCheck(state: GameState, hands: AirHands = { bench: 0, sanding: 0 }): AirCheck {
  const list = compressors(state);
  const first = list[0] ?? null;
  const lines: CompressorLine[] = [];
  const stopped: string[] = [];
  for (const compressor of list) {
    const gives = compressorAirOf(compressor);
    let drawn = 0;
    for (const item of airConsumers(state, compressor)) {
      // A machine that cannot run on this air draws none of it (CLAUDE.md T10 3.2 rule 1).
      if (airBlockFor(state, item) !== '') {
        stopped.push(item.id);
        continue;
      }
      drawn += airDemandOf(item)?.litres ?? 0;
    }
    // The men at the benches are on the first compressor: a hose reel is where the pipe is, and
    // the player assigns machines and not hands (CLAUDE.md T10 3.2).
    if (first !== null && first.id === compressor.id) {
      drawn += hands.bench * AIR_BENCH_DEMAND.litres;
      drawn += hands.sanding * AIR_SANDING_DEMAND.litres;
    }
    const demand = Math.round(drawn * AIR_DIVERSITY * 100) / 100;
    const allowed = Math.round(gives.litres * AIR_HEADROOM * 100) / 100;
    lines.push({
      id: compressor.id,
      label: compressorLabel(state, compressor),
      bar: gives.bar,
      litres: gives.litres,
      drawn,
      demand,
      allowed,
      low: drawn > 0 && demand > allowed,
      dryer: compressorHasDryer(state, compressor),
    });
  }
  const lowAir = lines.filter((line) => line.low).map((line) => line.id);
  const said = lines
    .filter((line) => line.low)
    .map(
      (line) =>
        `Low air on ${line.label}: ${mediaFigure(line.demand)} of ` +
        `${mediaFigure(line.allowed)} l/min`,
    );
  // Nobody to draw on at all, and men at the benches: the hall says so (CLAUDE.md T11 3.8).
  if (list.length === 0 && hands.bench + hands.sanding > 0) said.push(NO_AIR_LINE);
  return { compressors: lines, stopped, lowAir, lines: said };
}

/** True while this compressor is short of litres, which is what makes the lamp on its sprite and
 *  what runs every pneumatic consumer on it at 0.7 for the minute. */
export function compressorIsLow(check: AirCheck, compressorId: string): boolean {
  return check.lowAir.includes(compressorId);
}

/** True while this spray booth is running on wet air: it still sprays, and the Finishing takes
 *  half as long again and the job loses a point of rating for the defects in it (PIOTR,
 *  CLAUDE.md T10 3.3). */
export function sprayingOnWetAir(state: GameState, item: Equipment): boolean {
  if (item.specId !== 'sprayBooth') return false;
  const compressor = compressorFor(state, item);
  return compressor === null || !compressorHasDryer(state, compressor);
}

/** The hall's air as one line for the hall note and the company board, or empty while every
 *  compressor in it is holding up. */
export function airLine(check: AirCheck): string {
  return check.lines.join(' \u00b7 ');
}

/** Why no machine of this family in the hall will run on the air it is given, or empty when one
 *  of them will. A family with a machine that runs is not stopped: the man takes that one
 *  (CLAUDE.md T10 3.2 rule 1, 3.3). */
export function familyAirBlock(state: GameState, specId: string): string {
  const machines = floorMachines(state, specId);
  if (machines.length === 0) return '';
  let first = '';
  for (const item of machines) {
    const block = airBlockFor(state, item);
    if (block === '') return '';
    if (first === '') first = block;
  }
  return first;
}

/** The compressor this minute of work is drawing on: the machine's own for a machine that wants
 *  air, and the first one in the hall for a man at a bench with a nailer or a sander. Null when
 *  nothing he is doing draws air. */
export function drawingOn(
  state: GameState,
  machine: Equipment | null,
  atTheBench: boolean,
): Equipment | null {
  if (machine !== null && airDemandOf(machine) !== null) return compressorFor(state, machine);
  return atTheBench ? compressors(state)[0] ?? null : null;
}

/** What the air does to one man's minute: 0.7 while the compressor he is drawing on is short of
 *  litres (PIOTR, CLAUDE.md T10 3.2 rule 2). A machine that wants no air is never touched by it.
 *
 *  A man at a bench is no longer on this ladder at all. Turn 11 let him screw a carcass together
 *  by hand at 0.67 in a hall with no compressor; from Turn 23 there is no bench work without air,
 *  and `standsForAir` below stands him still before ever a minute is worked
 *  [PIOTR, 20.09] (CLAUDE.md T23 2.7). */
export function airFactorFor(
  state: GameState,
  check: AirCheck,
  machine: Equipment | null,
  atTheBench: boolean,
): number {
  const compressor = drawingOn(state, machine, atTheBench);
  if (compressor === null) return 1;
  return compressorIsLow(check, compressor.id) ? LOW_AIR_FACTOR : 1;
}

/** True while a stage is worked at a bench with air in the hose: the nailer and the driver of
 *  every assembly, and the pneumatic sanding of a Finishing that is not done in a booth
 *  (CLAUDE.md T10 3.2). */
export function benchDrawsAir(stage: { id: string; family: string | null }): 'bench' | 'sanding' | null {
  if (stage.id === 'finishing' && stage.family === null) return 'sanding';
  return stage.family === BENCH ? 'bench' : null;
}

/** True while there is air at the benches at all: a compressor in the hall giving at least the six
 *  bar a bench wants of it. The hoses are on the first compressor, which is where `drawingOn`
 *  sends a man at a bench (CLAUDE.md T10 3.2, T23 2.7).
 *
 *  This is the whole of the question, and a compressor short of litres is not part of it. A short
 *  compressor runs every pneumatic consumer on it at 0.7 for the minute, the bench included, and
 *  that is rule 2 of T10 3.2, which Turn 23 does not touch. The brief's own acceptance test says
 *  "a used compressor bought: work resumes the next minute", and a used one gives 150 l/min, of
 *  which 127.5 may be drawn: one man sanding at 200 and one at a bench at 30 come to 138 through
 *  the trade's diversity, so a used compressor is short the moment two men work. Read the other
 *  way, the day one hall would finish nothing at all and buying the used compressor the brief
 *  names would not start it again. The note is in docs/notes-t23-b2.md. */
export function benchHasAir(state: GameState): boolean {
  const compressor = compressors(state)[0] ?? null;
  if (compressor === null) return false;
  return compressorAirOf(compressor).bar >= AIR_BENCH_DEMAND.bar;
}

/** True while this minute of work is bench work with nothing in the hose, which from Turn 23 is a
 *  man standing at his bench and not a man screwing it together by hand: the mark over his head
 *  says "no compressor", his minute is one of the hall's lost ones, and nothing goes into the job
 *  [PIOTR, 20.09] (CLAUDE.md T23 2.7). The one place the rule is asked: the minute of production,
 *  the owner's day meter and the mark over a man's head all read this and none of them re-derives
 *  it. */
export function standsForAir(
  state: GameState,
  stage: { id: string; family: string | null } | null,
): boolean {
  if (stage === null || benchDrawsAir(stage) === null) return false;
  return !benchHasAir(state);
}

/** The men drawing air at a bench this minute: one for every joiner at an assembly with a nailer
 *  and a driver in his hands, and one for every joiner doing pneumatic sanding at a Finishing
 *  that is not done in a booth (PIOTR, CLAUDE.md T10 3.2). Read off the jobs in production, so
 *  the hall, the company board and the bench count the same men. */
export function airHands(state: GameState): AirHands {
  const hands: AirHands = { bench: 0, sanding: 0 };
  for (const job of state.jobs) {
    const lead = job.assignees[0] ?? null;
    if (job.stage !== 'inProduction' || lead === null) continue;
    const stage = currentStage(state, job, cncOptions(state, lead, job));
    if (stage === null) continue;
    const draw = benchDrawsAir(stage);
    if (draw === 'bench') hands.bench += 1;
    if (draw === 'sanding') hands.sanding += 1;
  }
  return hands;
}

/** The hall's air as the hall and the board read it, with nobody having to count the men. */
export function hallAirCheck(state: GameState): AirCheck {
  return airCheck(state, airHands(state));
}

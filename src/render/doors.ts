// The doors, as Airline Tycoon does them (PIOTR, 18.09; CLAUDE.md T20 2.12).
//
// The swing of Turn 19 is gone, and the two open frames with it: a door is drawn closed, always.
// What a door does now is take a man through it. When a figure's leg ends on a doorway cell he is
// off the hall's drawing until he comes out again, so nobody is ever seen standing in a doorway;
// the hall asks this file which of its figures have gone through before it draws them.
//
// This file is the door's own bookkeeping and nothing else: who is through one this frame, and how
// many men have gone in or come out since the ui layer last asked. The knock itself belongs to the
// ui layer: `hallOneShots` reports the going and `src/ui/app.ts` plays it, so `src/render` no
// longer reaches into `src/ui/sound.ts` (CLAUDE.md T20 2.13, REPORT-T19's own note).
//
// Nothing here is game state. The three hooks the app calls, `resetDoors`, `syncDoors` and
// `stepDoors`, are where they always were: the first when a view is built from nothing, the second
// after the page has been written again, the third on the frame beat.

import { isDoorwayCell } from '../engine/stations';
import { walkerIsThroughADoor, walkerKeys, walkerOf } from './walkers';

export interface Cell {
  x: number;
  y: number;
}

/** Who is behind a door this frame, by figure key. */
const through = new Set<string>();

/** Men who have gone in or come out since the ui layer last asked. */
let goings = 0;

/** Forgets every door: the view is being built from nothing. */
export function resetDoors(): void {
  through.clear();
  goings = 0;
}

/** True while this figure has gone through a door: the engine has him behind one, and his legs
 *  have got him there. Both halves matter. The cell is what the engine says this minute, so the
 *  moment it sends him somewhere else he is drawn again and walks out of the door; the walker is
 *  what says his leg is over, so the walk to the door is seen and only the doorway itself is never
 *  stood in. A figure the walker has never heard of is where the page says he is, which is what a
 *  page built from nothing, and every render test, reads. */
export function figureIsThroughADoor(key: string, cell: Cell): boolean {
  if (!isDoorwayCell(cell)) return false;
  const walker = walkerOf(key);
  if (walker === undefined) return true;
  return walkerIsThroughADoor(walker);
}

/** Who is through a door this moment, for the tests and for the count. */
export function figuresThroughDoors(): string[] {
  return Array.from(through).sort();
}

/** One pass over the walkers: who is through a door, and one knock for every man who has just
 *  gone in or come out. */
function readDoors(): void {
  const now = new Set<string>();
  for (const key of walkerKeys()) {
    const walker = walkerOf(key);
    if (walker === undefined) continue;
    if (walkerIsThroughADoor(walker)) now.add(key);
  }
  for (const key of now) if (!through.has(key)) goings += 1;
  for (const key of through) if (!now.has(key)) goings += 1;
  through.clear();
  for (const key of now) through.add(key);
}

/** After the page has been written again. */
export function syncDoors(root: ParentNode, nowMs: number): void {
  void root;
  void nowMs;
  readDoors();
}

/** On the frame beat, after the walkers have moved. */
export function stepDoors(root: ParentNode, nowMs: number): void {
  void root;
  void nowMs;
  readDoors();
}

/** How many men have gone through a door since this was last asked; the asking clears the count.
 *  The hall reports it as a one shot and the ui layer plays the door's sound when Piotr's
 *  recording is there to play (CLAUDE.md T20 2.13). */
export function takeDoorGoings(): number {
  const count = goings;
  goings = 0;
  return count;
}

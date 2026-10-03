// Where the men at work are DRAWN (v66; PIOTR, 03.10).
//
// The day plan says where a man works: the machine of his job's or his piece's turn, which is what
// books the hours, makes the dust and draws the air (production.ts). A hall played on standing
// contracts cut on a CNC has every man's work at the CNC and the benches, so the saw, the
// edgebanders, the moulder and the booth stood empty and the men stood in a heap, which is what
// Piotr saw three builds running: "everybody stands in one place again, and there are so many
// free machines". He asked for the drawing and nothing else to change: "the change of men at the
// machines was to be visual only".
//
// So the picture has its own reading from v66. Every man the plan has working at a place is drawn
// at a machine or a bench of his own, one man to each while there are empty ones, and every hour
// everybody is drawn at the next one along. Nothing here is read by the day plan, the minute, the
// machine hours, the dust, the air or a machine's card: those are the work, and this is where the
// figures stand. The hall's figures, the blade it spins and the sound it plays read this, so what
// is seen and what is heard agree with each other.

import { DRAWN_TURN_MINUTES, PACED_FAMILIES } from './constants';
import { OWNER, menAtPlaces, placedMachines, placesOf } from './machines';
import type { Equipment, GameState } from './types';

/** A man and the machine or bench he is drawn at, with which of the cells at it is his. */
export interface DrawnPlace {
  who: string;
  item: Equipment;
  place: number;
}

/** Every machine and bench a man can be drawn working at this minute, in the order they were
 *  bought: the ones standing on the floor that have places and run (not broken, not away for a
 *  service, not stopped by full bags). */
export function workSpots(state: GameState): Equipment[] {
  const ids = new Set<string>();
  for (const family of PACED_FAMILIES) {
    for (const item of placedMachines(state, family)) {
      if (placesOf(item) > 0) ids.add(item.id);
    }
  }
  return state.equipment.filter((item) => ids.has(item.id));
}

/** The hour of the day this minute falls in: the block a man is drawn at one machine for. */
function drawnTurn(state: GameState): number {
  return Math.floor(state.clock.minute / DRAWN_TURN_MINUTES);
}

/** A man's place in the hiring order, the owner first: what starts every man one machine further
 *  on than the man taken on before him, whoever else is at work this minute. */
function hiringOrder(state: GameState, who: string): number {
  if (who === OWNER) return 0;
  const at = state.workers.findIndex((worker) => worker.id === who);
  return at < 0 ? 0 : at + 1;
}

/** Where every man at work is drawn this minute. The men are the ones the day plan has at a place
 *  (`menAtPlaces`), and nobody else: a man with no place, on an errand, at his dinner or gone home
 *  is drawn where he always was. Each is drawn at the machine or bench his turn gives him this
 *  hour, the hour of the day and his place in the hiring order, or at the next one along that
 *  nobody is drawn at; with more men than machines the rest are drawn where they work. */
export function drawnPlaces(state: GameState): DrawnPlace[] {
  const working = menAtPlaces(state);
  if (working.length === 0) return [];
  const spots = workSpots(state);
  if (spots.length === 0) return working;
  const turn = drawnTurn(state);
  const menAt = new Map<string, number>();
  const put = (who: string, item: Equipment): DrawnPlace => {
    const place = menAt.get(item.id) ?? 0;
    menAt.set(item.id, place + 1);
    return { who, item, place };
  };
  return working.map((entry) => {
    const start = (turn + hiringOrder(state, entry.who)) % spots.length;
    for (let step = 0; step < spots.length; step += 1) {
      const item = spots[(start + step) % spots.length] as Equipment;
      if (!menAt.has(item.id)) return put(entry.who, item);
    }
    // Every machine and bench has a man drawn at it: he is drawn where he works.
    return put(entry.who, entry.item);
  });
}

/** The machine or bench this man is drawn at this minute, or null for a man the plan has at no
 *  place. */
export function drawnItemOf(state: GameState, who: string): Equipment | null {
  return drawnPlaces(state).find((entry) => entry.who === who)?.item ?? null;
}

/** The ids of every machine and bench a man is drawn at this minute: what the hall spins a blade
 *  and plays a sound for. */
export function drawnInUse(state: GameState): Set<string> {
  return new Set(drawnPlaces(state).map((entry) => entry.item.id));
}

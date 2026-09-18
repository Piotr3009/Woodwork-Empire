// The doors swing (PIOTR, 17.09: "the doors should open"; CLAUDE.md T19 2.3).
//
// The same shape as the walker in walkers.ts, and for the same reason. The hall says what each
// door wants, closed or open, off the state it has just been built from: a door with a man
// standing in it wants to be open, and any other wants to be closed. This file says when: on every
// frame it moves each door on by the real time since the last one, closed to half to open over
// `DOOR_SWING_MS` and back again after `DOOR_CLOSE_MS` of nobody in it, and writes the phase on
// the door that is already on the page. Nothing here is game state: a rebuilt page finds the doors
// still here and puts each one back to the phase it had got to, which it has to, because the patch
// writes every attribute back from fresh markup on every render.
//
// Each swing is one knock of the door sound (2.10). The sound engine is a singleton that does
// nothing at all until the player's first click has unlocked it, so a door that swings before then
// is silent by itself and this file needs no guard of its own.

import { DOOR_CLOSE_MS, DOOR_SWING_MS } from '../engine/constants';
import { play } from '../ui/sound';
import { DOOR_PHASES, type DoorPhase } from './hall';

interface Door {
  phase: DoorPhase;
  /** What the hall last said it wants: true while somebody is standing in it. */
  want: boolean;
  /** The moment the phase was last written, in real milliseconds. */
  since: number;
  /** The moment the want last went false, or null while it is true. */
  leftAt: number | null;
}

const doors = new Map<string, Door>();

/** Forgets every door: the view is being built from nothing. */
export function resetDoors(): void {
  doors.clear();
}

/** The phase of a door, for the tests and nobody else. */
export function doorOf(key: string): DoorPhase | undefined {
  return doors.get(key)?.phase;
}

/** How long one step of the swing takes: closed to half and half to open are half the swing each,
 *  so a door is open `DOOR_SWING_MS` after a man reaches it (CLAUDE.md T19 2.3). */
const STEP_MS = DOOR_SWING_MS / 2;

function keyOf(node: Element): string | null {
  return node.getAttribute('data-door-room');
}

function nextPhase(phase: DoorPhase, towards: DoorPhase): DoorPhase {
  const at = DOOR_PHASES.indexOf(phase);
  const to = DOOR_PHASES.indexOf(towards);
  if (at === to) return phase;
  return DOOR_PHASES[at + (to > at ? 1 : -1)] as DoorPhase;
}

/** Reads the doors the page has just been built with and puts each one back to the phase it had
 *  got to. A door the page has not shown before starts at what the hall says it is, so a view
 *  built from nothing opens on a door that is already open rather than swinging it in front of the
 *  player. */
export function syncDoors(root: ParentNode, nowMs: number): void {
  const seen = new Set<string>();
  for (const node of Array.from(root.querySelectorAll('[data-door-room]'))) {
    const key = keyOf(node);
    if (key === null) continue;
    seen.add(key);
    const want = node.getAttribute('data-door-want') === 'open';
    let door = doors.get(key);
    if (door === undefined) {
      door = { phase: want ? 'open' : 'closed', want, since: nowMs, leftAt: null };
      doors.set(key, door);
    } else if (want !== door.want) {
      door.want = want;
      door.since = nowMs;
      door.leftAt = want ? null : nowMs;
    }
    // The patch has just written the hall's own state over the phase: put the real one back.
    node.setAttribute('data-door-state', door.phase);
  }
  for (const key of Array.from(doors.keys())) {
    if (!seen.has(key)) doors.delete(key);
  }
}

/** Moves every door on by the real time since the last frame: one step of the swing every half of
 *  `DOOR_SWING_MS`, and a door nobody is standing in waits `DOOR_CLOSE_MS` before it starts back,
 *  so it is open `DOOR_SWING_MS` after a man reaches it and shut a step after `DOOR_CLOSE_MS`.
 *  A door somebody is standing in never leaves open. */
export function stepDoors(root: ParentNode, nowMs: number): void {
  for (const node of Array.from(root.querySelectorAll('[data-door-room]'))) {
    const key = keyOf(node);
    if (key === null) continue;
    const door = doors.get(key);
    if (door === undefined) continue;
    const towards: DoorPhase = door.want ? 'open' : 'closed';
    if (door.phase === towards) continue;
    if (!door.want && door.leftAt !== null && nowMs - door.leftAt < DOOR_CLOSE_MS) continue;
    if (nowMs - door.since < STEP_MS) continue;
    door.phase = nextPhase(door.phase, towards);
    door.since = nowMs;
    node.setAttribute('data-door-state', door.phase);
    // One knock a step, which the engine thins to one a second however many doors are moving.
    play('door', nowMs);
  }
}

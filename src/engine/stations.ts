// Where a figure is standing. The engine decides, the renderer only draws it (CLAUDE.md T2 3.3).
//
// A station is a string so the state stays plain JSON: 'bench', 'machine:<specId>', 'rack',
// 'gate', 'office' or 'idle'.

import { has } from './machines';
import type { GameState, TaskInstance } from './types';

export const STATION_BENCH = 'bench';
export const STATION_RACK = 'rack';
export const STATION_GATE = 'gate';
export const STATION_OFFICE = 'office';
export const STATION_IDLE = 'idle';
/** Standing at the canteen door because there is no bench to work at (CLAUDE.md T4 3.4). */
export const STATION_NO_BENCH = 'noBench';

export function machineStation(specId: string): string {
  return `machine:${specId}`;
}

/** The machine a station names, or null when it is not a machine station. */
export function stationMachine(station: string): string | null {
  return station.startsWith('machine:') ? station.slice('machine:'.length) : null;
}

/** [TUNE cycle] 15 minutes at the bench, 5 at the saw, 15 at the bench, 5 at the edgebander,
 *  round and round while the job is being made. */
export const PRODUCTION_CYCLE: Array<{ station: string; minutes: number }> = [
  { station: STATION_BENCH, minutes: 15 },
  { station: machineStation('tableSaw'), minutes: 5 },
  { station: STATION_BENCH, minutes: 15 },
  { station: machineStation('edgebander'), minutes: 5 },
];

export const PRODUCTION_CYCLE_MINUTES = PRODUCTION_CYCLE.reduce(
  (total, step) => total + step.minutes,
  0,
);

/** Where the cycle puts a figure on the given minute of it. */
export function cycleStation(minuteIndex: number): string {
  const into = ((minuteIndex % PRODUCTION_CYCLE_MINUTES) + PRODUCTION_CYCLE_MINUTES) %
    PRODUCTION_CYCLE_MINUTES;
  let passed = 0;
  for (const step of PRODUCTION_CYCLE) {
    passed += step.minutes;
    if (into < passed) return step.station;
  }
  return STATION_BENCH;
}

/** The station after this many minutes of production. A machine the workshop has not bought
 *  leaves the figure at the bench. */
export function stationForProduction(state: GameState, minutesProduced: number): string {
  if (minutesProduced <= 0) return STATION_BENCH;
  const station = cycleStation(minutesProduced - 1);
  const specId = stationMachine(station);
  if (specId !== null && !has(state, specId)) return STATION_BENCH;
  return station;
}

/** Where a job of work puts the figure doing it. */
export function stationForTask(state: GameState, task: TaskInstance): string {
  switch (task.kind) {
    case 'unload':
    case 'deliver':
      return STATION_GATE;
    case 'fetchStorage':
      return STATION_RACK;
    case 'bagChange':
    case 'service':
    case 'repair': {
      const machine = task.equipmentId
        ? state.equipment.find((item) => item.id === task.equipmentId)
        : null;
      return machine ? machineStation(machine.specId) : STATION_BENCH;
    }
    case 'cleaning':
      return STATION_BENCH;
    default:
      // Emails, bookkeeping, ordering, calls, drawings and site measures are all desk work.
      return STATION_OFFICE;
  }
}

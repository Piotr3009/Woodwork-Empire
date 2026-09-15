// Where a figure is standing. The engine decides, the renderer only draws it (CLAUDE.md T2 3.3).
//
// A station is a string so the state stays plain JSON: 'bench', 'machine:<specId>', 'rack',
// 'gate', 'office' or 'idle'.

import { itemStandsInTheHall } from './machines';
import type { GameState, TaskInstance } from './types';

export const STATION_BENCH = 'bench';
export const STATION_RACK = 'rack';
export const STATION_GATE = 'gate';
export const STATION_OFFICE = 'office';
/** At the desk with the phone in his hand. The same cell as the office: what it says is which
 *  sheet the figure plays (PIOTR, 15.09; CLAUDE.md T11 3.11). */
export const STATION_PHONE = 'phone';
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

/** Standing at a machine somebody else has, waiting for him to finish with it. The Turn 2 cycle
 *  of fifteen minutes at the bench and five at the saw is gone: a man is at the station of the
 *  stage he is working, for as long as that stage takes (CLAUDE.md T7 3.1). */
export function waitingStation(specId: string): string {
  return `waiting:${specId}`;
}

/** The machine a man is waiting for, or null when he is not waiting for one. */
export function stationWaitingFor(station: string): string | null {
  return station.startsWith('waiting:') ? station.slice('waiting:'.length) : null;
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
      if (!machine || !itemStandsInTheHall(machine)) return STATION_BENCH;
      return machineStation(machine.specId);
    }
    case 'cleaning':
      return STATION_BENCH;
    case 'clientCall':
      return STATION_PHONE;
    default:
      // Emails, bookkeeping, ordering, drawings and site measures are all desk work.
      return STATION_OFFICE;
  }
}

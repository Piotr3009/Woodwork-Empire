// Where a figure is standing. The engine decides, the renderer only draws it (CLAUDE.md T2 3.3).
//
// A station is a string so the state stays plain JSON: 'bench', 'machine:<specId>', 'rack',
// 'gate', 'office' or 'idle'.

import { SHEETS_PER_TRIP } from './constants';
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

/** How many trips a load of sheets is between the pallet at the gate and the rack, so many
 *  sheets a trip, and never fewer than one (CLAUDE.md T13 3.21). */
export function unloadTrips(sheets: number): number {
  return Math.max(1, Math.ceil(sheets / SHEETS_PER_TRIP));
}

/** Which leg of the walk the unloading man is on at this point of the task: a trip is a leg to
 *  the rack with the sheets and a leg back to the pallet, and the task's minutes are shared out
 *  over every leg, so the minutes still total the handling table's figure however many sheets
 *  are on the pallet (CLAUDE.md T13 3.21). Even legs are at the gate, odd ones at the rack. */
export function unloadLegAt(task: { minutesTotal: number; minutesRemaining: number }, sheets: number): number {
  const legs = unloadTrips(sheets) * 2;
  const elapsed = Math.max(0, task.minutesTotal - task.minutesRemaining);
  if (task.minutesTotal <= 0) return 0;
  return Math.min(legs - 1, Math.floor((elapsed / task.minutesTotal) * legs));
}

/** Where the man unloading a load of sheets stands at this point of it: the pallet at the gate
 *  on an even leg, the rack on an odd one. The "walking in the corner" of Turn 8 is gone: he
 *  walks the path the character system already uses, back and forth (CLAUDE.md T13 3.21). */
export function unloadStation(task: TaskInstance, sheets: number): string {
  return unloadLegAt(task, sheets) % 2 === 0 ? STATION_GATE : STATION_RACK;
}

/** Where a job of work puts the figure doing it. */
export function stationForTask(state: GameState, task: TaskInstance): string {
  switch (task.kind) {
    case 'unload': {
      // A load of sheets is a walk between the pallet and the rack; a machine off the lorry is
      // got off at the gate and stands where the floor was held for it (CLAUDE.md T13 3.21).
      const delivery = task.deliveryId
        ? state.deliveries.find((entry) => entry.id === task.deliveryId)
        : null;
      return delivery ? unloadStation(task, delivery.sheets) : STATION_GATE;
    }
    case 'deliver':
      return STATION_GATE;
    case 'fetchStorage':
      return STATION_RACK;
    case 'emptyBags': {
      // The bags are on the extractor: he stands at the first fan in the hall (T12 2.3).
      const fan = state.equipment.find(
        (item) => item.specId === 'extractor' && itemStandsInTheHall(item),
      );
      return fan ? machineStation(fan.specId) : STATION_BENCH;
    }
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

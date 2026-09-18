// @vitest-environment jsdom
// The doors swing (PIOTR, 17.09; CLAUDE.md T19 2.3): a fake clock steps real time, the office
// door goes closed, half, open over DOOR_SWING_MS as the owner arrives, stays open while he is
// standing in it, and comes back after DOOR_CLOSE_MS when he leaves. A page written again in the
// middle of a swing does not reset it.

import { beforeEach, describe, expect, it } from 'vitest';
import { DOOR_CLOSE_MS, DOOR_SWING_MS } from '../../src/engine/constants';
import { STATION_BENCH, STATION_OFFICE } from '../../src/engine/stations';
import { renderHall } from '../../src/render/hall';
import { doorOf, resetDoors, stepDoors, syncDoors } from '../../src/render/doors';
import type { GameState } from '../../src/engine/index';
import { buyStartingKit, newGame } from '../helpers';

function page(state: GameState): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = `<svg>${renderHall(state)}</svg>`;
  return holder;
}

function stateOf(root: ParentNode, room: string): string {
  return root.querySelector(`[data-door-room="${room}"]`)?.getAttribute('data-door-state') ?? '';
}

describe('the door of a room', () => {
  beforeEach(() => resetDoors());

  it('opens over the swing as the man arrives and stays open while he is in it', () => {
    const state = buyStartingKit(newGame());
    state.owner.station = STATION_BENCH;
    let root = page(state);
    syncDoors(root, 0);
    expect(stateOf(root, 'office')).toBe('closed');
    expect(stateOf(root, 'canteen')).toBe('closed');
    // He walks to the office: the hall says the door wants to be open and the driver swings it.
    state.owner.station = STATION_OFFICE;
    root = page(state);
    syncDoors(root, 1000);
    expect(stateOf(root, 'office')).toBe('closed');
    stepDoors(root, 1000 + DOOR_SWING_MS / 2);
    expect(stateOf(root, 'office')).toBe('half');
    expect(doorOf('office')).toBe('half');
    stepDoors(root, 1000 + DOOR_SWING_MS);
    expect(stateOf(root, 'office')).toBe('open');
    // And it stays open for as long as he is standing in it, however long the game runs.
    stepDoors(root, 1000 + DOOR_SWING_MS + 60000);
    expect(stateOf(root, 'office')).toBe('open');
    // The canteen door never moved: only the door with somebody in it opens.
    expect(stateOf(root, 'canteen')).toBe('closed');
  });

  it('waits DOOR_CLOSE_MS after he leaves and then swings back', () => {
    const state = buyStartingKit(newGame());
    state.owner.station = STATION_OFFICE;
    let root = page(state);
    syncDoors(root, 0);
    // Born open: a view built from nothing does not swing the door in front of the player.
    expect(stateOf(root, 'office')).toBe('open');
    state.owner.station = STATION_BENCH;
    root = page(state);
    const left = 5000;
    syncDoors(root, left);
    stepDoors(root, left + DOOR_CLOSE_MS - 1);
    expect(stateOf(root, 'office')).toBe('open');
    stepDoors(root, left + DOOR_CLOSE_MS);
    expect(stateOf(root, 'office')).toBe('half');
    stepDoors(root, left + DOOR_CLOSE_MS + DOOR_SWING_MS / 2);
    expect(stateOf(root, 'office')).toBe('closed');
  });

  it('goes back out when he comes back mid close', () => {
    const state = buyStartingKit(newGame());
    state.owner.station = STATION_OFFICE;
    let root = page(state);
    syncDoors(root, 0);
    state.owner.station = STATION_BENCH;
    root = page(state);
    syncDoors(root, 1000);
    stepDoors(root, 1000 + DOOR_CLOSE_MS);
    expect(stateOf(root, 'office')).toBe('half');
    state.owner.station = STATION_OFFICE;
    root = page(state);
    syncDoors(root, 2000);
    expect(stateOf(root, 'office')).toBe('half');
    stepDoors(root, 2000 + DOOR_SWING_MS / 2);
    expect(stateOf(root, 'office')).toBe('open');
  });

  it('is not reset by a page written in the middle of a swing', () => {
    // The patch writes every attribute back from the hall's fresh markup, so the driver has to put
    // its own phase back after every render, exactly as the walker puts the transform back.
    const state = buyStartingKit(newGame());
    state.owner.station = STATION_OFFICE;
    let root = page(state);
    syncDoors(root, 0);
    state.owner.station = STATION_BENCH;
    root = page(state);
    syncDoors(root, 1000);
    stepDoors(root, 1000 + DOOR_CLOSE_MS);
    expect(stateOf(root, 'office')).toBe('half');
    // A whole game minute runs and the page is written again at the same moment.
    const fresh = page(state);
    syncDoors(fresh, 1000 + DOOR_CLOSE_MS);
    expect(stateOf(fresh, 'office')).toBe('half');
    expect(doorOf('office')).toBe('half');
  });

  it('forgets every door when the view is built from nothing', () => {
    const state = buyStartingKit(newGame());
    state.owner.station = STATION_OFFICE;
    const root = page(state);
    syncDoors(root, 0);
    expect(doorOf('office')).toBe('open');
    resetDoors();
    expect(doorOf('office')).toBeUndefined();
  });
});

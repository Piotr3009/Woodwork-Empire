// The laptop boots once a day: the first lid lift costs five minutes, every later one is free
// (PIOTR, 13.09).
import { describe, expect, it } from 'vitest';
import { LAPTOP_BOOT_MINUTES } from '../../src/engine/constants';
import { bootLaptop } from '../../src/engine/game';
import { act, buyStartingKit, newGame, runClock, softwareNow } from '../helpers';

describe('the laptop', () => {
  it('boots once a day and then stays up', () => {
    let s = softwareNow(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 'oneOff');
    s = act(s, { type: 'SET_SPEED', speed: 1 });
    expect(bootLaptop(s).ok).toBe(true);
    expect(s.tasks.some((task) => task.kind === 'booting' && !task.done)).toBe(true);
    s = runClock(s, LAPTOP_BOOT_MINUTES);
    expect(s.laptopBootedOnDay).toBe(s.clock.day);
    // Opened again the same day: no task, nothing to wait for.
    expect(bootLaptop(s).ok).toBe(true);
    expect(s.tasks.some((task) => task.kind === 'booting' && !task.done)).toBe(false);
  });

  it('starts the clock when the lid is lifted on a stopped one', () => {
    let s = softwareNow(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 'oneOff');
    s = act(s, { type: 'SET_SPEED', speed: 0 });
    expect(s.speed).toBe(0);
    bootLaptop(s);
    expect(s.speed).toBe(1);
  });
});

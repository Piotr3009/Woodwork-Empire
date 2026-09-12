import { describe, expect, it } from 'vitest';
import { chance, float, int, makeId, next, pick, pickWeighted } from '../../src/engine/rng';

describe('rng', () => {
  it('gives the same stream for the same seed', () => {
    const a = { rng: 42 };
    const b = { rng: 42 };
    const left = Array.from({ length: 20 }, () => next(a));
    const right = Array.from({ length: 20 }, () => next(b));
    expect(left).toEqual(right);
  });

  it('gives a different stream for a different seed', () => {
    const a = { rng: 1 };
    const b = { rng: 2 };
    expect(Array.from({ length: 5 }, () => next(a))).not.toEqual(
      Array.from({ length: 5 }, () => next(b)),
    );
  });

  it('stays inside the unit interval', () => {
    const carrier = { rng: 7 };
    for (let i = 0; i < 5000; i += 1) {
      const value = next(carrier);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('advances the cursor it is given', () => {
    const carrier = { rng: 99 };
    next(carrier);
    expect(carrier.rng).not.toBe(99);
  });

  it('draws integers inside the closed range and reaches both ends', () => {
    const carrier = { rng: 5 };
    const seen = new Set<number>();
    for (let i = 0; i < 3000; i += 1) {
      const value = int(carrier, 3, 7);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(3);
      expect(value).toBeLessThanOrEqual(7);
      seen.add(value);
    }
    expect(seen.size).toBe(5);
  });

  it('collapses an empty integer range', () => {
    const carrier = { rng: 5 };
    expect(int(carrier, 4, 4)).toBe(4);
    expect(int(carrier, 9, 2)).toBe(9);
  });

  it('draws floats inside the range', () => {
    const carrier = { rng: 11 };
    for (let i = 0; i < 1000; i += 1) {
      const value = float(carrier, 0.8, 1.6);
      expect(value).toBeGreaterThanOrEqual(0.8);
      expect(value).toBeLessThan(1.6);
    }
  });

  it('treats chance 0 and 1 as certainties without spending the cursor', () => {
    const carrier = { rng: 3 };
    expect(chance(carrier, 0)).toBe(false);
    expect(chance(carrier, 1)).toBe(true);
    expect(carrier.rng).toBe(3);
  });

  it('lands near the requested probability', () => {
    const carrier = { rng: 123 };
    let hits = 0;
    for (let i = 0; i < 10000; i += 1) {
      if (chance(carrier, 0.25)) hits += 1;
    }
    expect(hits / 10000).toBeCloseTo(0.25, 1);
  });

  it('picks from a list and returns null for an empty one', () => {
    const carrier = { rng: 17 };
    expect(pick(carrier, [])).toBeNull();
    expect(['a', 'b', 'c']).toContain(pick(carrier, ['a', 'b', 'c']));
  });

  it('never draws a zero weight entry', () => {
    const carrier = { rng: 21 };
    const items = [
      { id: 'never', weight: 0 },
      { id: 'always', weight: 5 },
    ];
    for (let i = 0; i < 500; i += 1) {
      expect(pickWeighted(carrier, items, (item) => item.weight)?.id).toBe('always');
    }
    expect(pickWeighted(carrier, items, () => 0)).toBeNull();
  });

  it('respects the weights', () => {
    const carrier = { rng: 33 };
    const items = [
      { id: 'heavy', weight: 9 },
      { id: 'light', weight: 1 },
    ];
    let heavy = 0;
    for (let i = 0; i < 10000; i += 1) {
      if (pickWeighted(carrier, items, (item) => item.weight)?.id === 'heavy') heavy += 1;
    }
    expect(heavy / 10000).toBeCloseTo(0.9, 1);
  });

  it('counts ids up without repeating', () => {
    const carrier = { nextId: 1 };
    expect(makeId(carrier, 'job')).toBe('job-1');
    expect(makeId(carrier, 'job')).toBe('job-2');
    expect(makeId(carrier, 'event')).toBe('event-3');
    expect(carrier.nextId).toBe(4);
  });
});

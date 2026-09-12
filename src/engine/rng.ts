// The only source of randomness in the engine. The cursor lives in the state, so a game with the
// same seed and the same actions replays exactly (CLAUDE.md 4).

export interface RngCarrier {
  rng: number;
}

export interface IdCarrier {
  nextId: number;
}

/** mulberry32. Advances the cursor and returns a float in [0, 1). */
export function next(carrier: RngCarrier): number {
  let a = carrier.rng | 0;
  a = (a + 0x6d2b79f5) | 0;
  carrier.rng = a;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Integer in [min, max], both ends included. */
export function int(carrier: RngCarrier, min: number, max: number): number {
  if (max <= min) return min;
  return min + Math.floor(next(carrier) * (max - min + 1));
}

/** Float in [min, max). */
export function float(carrier: RngCarrier, min: number, max: number): number {
  return min + next(carrier) * (max - min);
}

export function chance(carrier: RngCarrier, probability: number): boolean {
  if (probability <= 0) return false;
  if (probability >= 1) return true;
  return next(carrier) < probability;
}

export function pick<T>(carrier: RngCarrier, items: readonly T[]): T | null {
  if (items.length === 0) return null;
  const index = int(carrier, 0, items.length - 1);
  return items[index] ?? null;
}

/** Weighted draw. Entries with a weight of zero or less never come out. */
export function pickWeighted<T>(
  carrier: RngCarrier,
  items: readonly T[],
  weight: (item: T) => number,
): T | null {
  let total = 0;
  for (const item of items) {
    const value = weight(item);
    if (value > 0) total += value;
  }
  if (total <= 0) return null;
  let roll = next(carrier) * total;
  for (const item of items) {
    const value = weight(item);
    if (value <= 0) continue;
    roll -= value;
    if (roll < 0) return item;
  }
  return items[items.length - 1] ?? null;
}

/** Deterministic id counter. Not random, but it is the same kind of state carried sequence. */
export function makeId(carrier: IdCarrier, prefix: string): string {
  const id = carrier.nextId;
  carrier.nextId = id + 1;
  return `${prefix}-${id}`;
}

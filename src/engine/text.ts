// Plain text helpers the whole game shares. The engine owns them because event copy needs them
// too, and there is one of each (CLAUDE.md T2 3.11).

/** "1 enquiry", "3 enquiries", "1 day", "2 days", "1 sheet", "2 sheets". */
export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** More than one of a thing the game names itself: "drawer boxes", "cut sheet packs", "wardrobe
 *  fronts". Not a dictionary and not meant to be [TUNE]: a name that ends in a hiss takes "es" and
 *  everything else takes "s", which is right for every name in the game and is checked in
 *  `tests/engine/bubbles.test.ts`. It exists because the bubble over a man's head counts the pieces
 *  he is making and the pieces table holds one name each (CLAUDE.md T21 2.6). */
export function pluralOf(name: string): string {
  return /(s|x|z|ch|sh)$/i.test(name) ? `${name}es` : `${name}s`;
}

/** A figure to at most this many decimal places, the trailing zeros trimmed: 0.25, 0.06, 0.015,
 *  and 10 rather than 10.0 (CLAUDE.md T12 3.1). */
export function trimmed(value: number, places: number): string {
  return String(Number(value.toFixed(places)));
}

/** Cubic metres, the one unit dust is written in anywhere in the game: "4.6 m\u00b3"
 *  (CLAUDE.md T12 1). */
export function cubicMetres(value: number, places = 1): string {
  return `${trimmed(value, places)} m\u00b3`;
}

/** Metres of floor, both figures with their unit: "3 m by 1 m". The one formatter for a
 *  footprint or a zone anywhere in the game, because nobody knows what 4 by 3 is (PIOTR, 15.09;
 *  CLAUDE.md T12 3.1). */
export function metresBy(size: { width: number; depth: number }): string {
  return `${size.width} m by ${size.depth} m`;
}

/** Names in a sentence: `Pete`, `Pete and Eddie`, `Pete, Eddie and Ben`. */
export function andList(names: readonly string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

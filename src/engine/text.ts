// Plain text functions the whole game shares. The engine owns them because event copy needs them
// too, and there is one of each (CLAUDE.md T2 3.11).

/** "1 enquiry", "3 enquiries", "1 day", "2 days", "1 sheet", "2 sheets". */
export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** More than one of a thing the game names itself: "drawer boxes", "cut sheet packs", "wardrobe
 *  fronts", "sash windows". Not a dictionary and not meant to be [TUNE]: a name that ends in a hiss
 *  takes "es" and everything else takes "s", which is right for every name in the game. A standing
 *  contract is named with it (CLAUDE.md T29 2.12.6), which `tests/engine/t29Contracts.test.ts`
 *  checks; `name + 's'` had made "Drawer boxs" in Piotr's own save. */
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

/** A small count in words, the way a sentence of the game says it: "four joiners", "three
 *  modules", "one engineer". Past twelve it is the figure [TUNE] (CLAUDE.md T29 2.3, 2.9.4). */
export function inWords(count: number): string {
  return SMALL_NUMBERS[count] ?? String(count);
}

const SMALL_NUMBERS: readonly string[] = [
  'nought', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
];

/** A catalogue name inside a sentence: `the extractor`, `the spray booth`, and `the CNC` as it is
 *  written, because a name that opens with capitals is one. Moved here from the premises in v84,
 *  so the canteen's refusal and the line's write a name one way (CLAUDE.md T29 2.9.2). */
export function inASentence(name: string): string {
  return /^[A-Z]{2}/.test(name) ? name : name.charAt(0).toLowerCase() + name.slice(1);
}

/** Names in a sentence: `Pete`, `Pete and Eddie`, `Pete, Eddie and Ben`. */
export function andList(names: readonly string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

// Plain text helpers the whole game shares. The engine owns them because event copy needs them
// too, and there is one of each (CLAUDE.md T2 3.11).

/** "1 enquiry", "3 enquiries", "1 day", "2 days", "1 sheet", "2 sheets". */
export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
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

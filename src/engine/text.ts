// Plain text helpers the whole game shares. The engine owns them because event copy needs them
// too, and there is one of each (CLAUDE.md T2 3.11).

/** "1 enquiry", "3 enquiries", "1 day", "2 days", "1 sheet", "2 sheets". */
export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

// The one placeholder helper (CLAUDE.md T13 1). Sprites and pictures are the art side's job on
// art/sprites; where a new picture is needed before it lands, the code draws a flat shape in the
// game's palette from here and nowhere else: the house cards, the pipe tiles, the gate collar,
// the pallet and the pallet truck, the two new characters and the stock thumbnails. Every request
// is listed in docs/art/REQUESTS-T13.md.

export interface PlaceholderSize {
  width: number;
  height: number;
}

/** The colour a kind is painted in, by the first word of the kind: `house.3` is a house, `pipe.ne`
 *  a pipe. Every colour is one of the game's own (styles.css) [TUNE]. */
const COLOUR_BY_PREFIX: Record<string, { fill: string; edge: string }> = {
  house: { fill: '#a08a6b', edge: '#7d6b52' },
  pipe: { fill: '#1f5a3a', edge: '#3f8a5f' },
  gate: { fill: '#8a8f96', edge: '#b8bcc2' },
  pallet: { fill: '#c9a23b', edge: '#9c7d2d' },
  palletTruck: { fill: '#6b7f9c', edge: '#526278' },
  character: { fill: '#5a7fa8', edge: '#3d5a7a' },
  thumb: { fill: '#f3ecdc', edge: '#d9d1bd' },
  spindleMoulder: { fill: '#7a6a9c', edge: '#5d5178' },
};

const FALLBACK = { fill: '#75787e', edge: '#5b5e63' };

function colourFor(kind: string): { fill: string; edge: string } {
  const prefix = kind.split('.')[0] ?? '';
  return COLOUR_BY_PREFIX[prefix] ?? FALLBACK;
}

function escape(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

/** A flat placeholder for a picture the art side has not delivered: a filled box with a lighter
 *  top edge, in the palette colour of its kind, and the kind written small on it so the player and
 *  the report can tell what is missing. SVG inner markup, sized to fit `size`, anchored at (0, 0).
 *  `dimetric` draws the box as a 2:1 diamond with a lighter top face, for anything that stands in
 *  the hall; the default is a flat card for the day end and the stock page. */
export function placeholder(
  kind: string,
  size: PlaceholderSize,
  options: { dimetric?: boolean; label?: string } = {},
): string {
  const { fill, edge } = colourFor(kind);
  const label = escape(options.label ?? kind);
  const w = Math.max(1, Math.round(size.width * 100) / 100);
  const h = Math.max(1, Math.round(size.height * 100) / 100);
  if (options.dimetric === true) {
    // A diamond as wide as the size and half as tall, standing on a short block: the 2:1 floor
    // of docs/art/SPRITES.md 1, never straight on.
    const top = Math.round((h / 3) * 100) / 100;
    const mid = w / 2;
    return (
      `<g class="placeholder" data-placeholder="${escape(kind)}">` +
      `<polygon points="${mid},${top} ${w},${top + top / 2} ${mid},${top * 2} 0,${top + top / 2}" ` +
      `fill="${edge}" />` +
      `<polygon points="0,${top + top / 2} ${mid},${top * 2} ${mid},${h} 0,${h - top / 2}" ` +
      `fill="${fill}" />` +
      `<polygon points="${mid},${top * 2} ${w},${top + top / 2} ${w},${h - top / 2} ${mid},${h}" ` +
      `fill="${fill}" opacity="0.8" />` +
      `<text x="${mid}" y="${top + top / 2 + 4}" text-anchor="middle" font-size="9" ` +
      `fill="#e8e6e1">${label}</text></g>`
    );
  }
  return (
    `<g class="placeholder" data-placeholder="${escape(kind)}">` +
    `<rect x="0" y="0" width="${w}" height="${h}" fill="${fill}" />` +
    `<rect x="0" y="0" width="${w}" height="${Math.max(2, Math.round(h * 0.08))}" fill="${edge}" />` +
    `<text x="${w / 2}" y="${h / 2 + 4}" text-anchor="middle" font-size="12" fill="#e8e6e1">` +
    `${label}</text></g>`
  );
}

/** The same placeholder as a whole SVG element, for HTML that wants a picture where a picture
 *  would go: the house card, the stock thumbnail. */
export function placeholderSvg(
  kind: string,
  size: PlaceholderSize,
  options: { dimetric?: boolean; label?: string; className?: string } = {},
): string {
  const className = options.className === undefined ? '' : ` class="${escape(options.className)}"`;
  return (
    `<svg${className} viewBox="0 0 ${size.width} ${size.height}" width="${size.width}" ` +
    `height="${size.height}" role="img" aria-label="${escape(options.label ?? kind)}">` +
    placeholder(kind, size, options) +
    '</svg>'
  );
}

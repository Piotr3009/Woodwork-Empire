// One type scale (PIOTR, 16.09: "the descriptions are too small"; CLAUDE.md T15 1, 2.5): every
// font-size in the stylesheet reads a token from :root, no pixel size is typed twice, and nothing
// in the game is below the smallest token.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const CSS = readFileSync('src/ui/styles.css', 'utf8');
const BARE = CSS.replace(/\/\*[\s\S]*?\*\//g, '');

/** Every rule as [selector list, body]. */
function rules(): Array<[string, string]> {
  return Array.from(BARE.matchAll(/([^{}]+)\{([^{}]*)\}/g)).map((found) => [
    (found[1] ?? '').trim(),
    found[2] ?? '',
  ]);
}

/** The tokens of the scale, as :root declares them, in pixels. */
function tokens(): Map<string, number> {
  const found = new Map<string, number>();
  for (const [selectors, body] of rules()) {
    if (selectors !== ':root') continue;
    for (const token of body.matchAll(/(--fs-[\w-]+):\s*([\d.]+)px;/g)) {
      found.set(token[1] ?? '', Number(token[2]));
    }
  }
  return found;
}

/** Every font-size value in the stylesheet, with the selector it is on. */
function fontSizes(): Array<[string, string]> {
  const found: Array<[string, string]> = [];
  for (const [selectors, body] of rules()) {
    for (const size of body.matchAll(/font-size:\s*([^;]+);/g)) {
      found.push([selectors, (size[1] ?? '').trim()]);
    }
  }
  return found;
}

describe('the type scale', () => {
  it('is six tokens on :root at the sizes of the brief, and three for the title hand', () => {
    const scale = tokens();
    expect(scale.get('--fs-tiny')).toBe(12);
    expect(scale.get('--fs-small')).toBe(13);
    expect(scale.get('--fs-body')).toBe(15);
    expect(scale.get('--fs-lead')).toBe(18);
    expect(scale.get('--fs-title')).toBe(26);
    expect(scale.get('--fs-display')).toBe(34);
    const hand = Array.from(scale.keys()).filter((name) => name.startsWith('--fs-hand'));
    expect(hand.length).toBeGreaterThanOrEqual(2);
    expect(hand.length).toBeLessThanOrEqual(3);
  });

  it('has every token at or above the smallest, which is 12 px', () => {
    const scale = tokens();
    expect(scale.size).toBeGreaterThan(0);
    for (const [name, size] of scale) expect(size, name).toBeGreaterThanOrEqual(12);
  });

  it('reads a token on every font-size in the stylesheet, and types no pixel size', () => {
    const sizes = fontSizes();
    expect(sizes.length).toBeGreaterThan(60);
    const scale = tokens();
    for (const [selectors, value] of sizes) {
      expect(value, selectors).toMatch(/^var\(--fs-[\w-]+\)$/);
      const name = value.slice('var('.length, -1);
      expect(scale.has(name), `${selectors}: ${value}`).toBe(true);
    }
    // No pixel size hides in a font shorthand either.
    for (const [selectors, body] of rules()) {
      for (const shorthand of body.matchAll(/(?:^|;)\s*font:\s*([^;]+);/g)) {
        expect(shorthand[1], selectors).not.toMatch(/\d+px/);
      }
    }
  });

  it('keeps no token that nothing reads', () => {
    const read = new Set(fontSizes().map(([, value]) => value.slice('var('.length, -1)));
    for (const name of tokens().keys()) expect(read.has(name), name).toBe(true);
  });
});

// @vitest-environment jsdom
// A badge is a warning the player has to read: the game's red with white bold text at the body
// size, on the folder paper and everywhere else. Express is a rush and not a warning, so it takes
// the accent orange; the badges that are not warnings keep their own class and the look they had
// (PIOTR, 16.09: "do not put it in a black box, nothing can be read"; CLAUDE.md T15 2.2).

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderBoard } from '../../src/ui/board';
import { renderInsurance } from '../../src/ui/insurance';
import { buyStartingKit, fillRack, newGame, placeEnquiry } from '../helpers';

const CSS = readFileSync('src/ui/styles.css', 'utf8');

/** The value of a custom property as :root declares it. */
function rootValue(name: string): string {
  const found = new RegExp(`${name}:\\s*([^;]+);`).exec(CSS);
  return (found?.[1] ?? '').trim();
}

/** A rule's body by its exact selector list. */
function ruleBody(selector: string): string {
  const at = CSS.indexOf(`${selector} {`);
  if (at < 0) return '';
  const rest = CSS.slice(at);
  return rest.slice(0, rest.indexOf('}'));
}

/** The order board on the folder paper, with the stylesheet on the page. */
function onThePaper(body: string): HTMLElement {
  document.body.innerHTML =
    `<style>${CSS}</style><div class="modal modal-full modal-folder" data-modal="board">` +
    `<div class="modal-body">${body}</div></div>`;
  const node = document.querySelector('.modal-body');
  if (!(node instanceof HTMLElement)) throw new Error('no board');
  return node;
}

/** A colour as jsdom hands it back: the var() written out where it can be. */
function colourOf(value: string): string {
  return value.replace(/var\((--[\w-]+)\)/g, (_, name: string) => rootValue(name));
}

function withFlags() {
  const state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 40);
  state.enquiries = [];
  const flagged = placeEnquiry(state, {
    name: 'Garage shelves',
    price: 900,
    deadlineDays: 30,
    bespokeMaterial: true,
    needsMeasure: true,
    express: true,
  });
  const plain = placeEnquiry(state, { name: 'Bookcase', price: 700, deadlineDays: 30 });
  return { state, flagged, plain };
}

describe('the badges on an enquiry card', () => {
  it('are red with white bold text at the body size, computed off the stylesheet', () => {
    const { state, flagged } = withFlags();
    const page = onThePaper(renderBoard(state, ''));
    const card = page.querySelector(`[data-enquiry="${flagged.id}"]`);
    expect(card).not.toBeNull();
    const badges = Array.from(card?.querySelectorAll('.badges .badge') ?? []);
    expect(badges.map((badge) => badge.textContent)).toEqual(['Bespoke material', 'Site measure']);
    for (const badge of badges) {
      const style = getComputedStyle(badge);
      expect(colourOf(style.backgroundColor), badge.textContent ?? '').toBe(rootValue('--bad'));
      expect(style.color, badge.textContent ?? '').toBe('rgb(255, 255, 255)');
      expect(style.fontWeight, badge.textContent ?? '').toBe('700');
      expect(style.fontSize, badge.textContent ?? '').toBe('var(--fs-body)');
      // No border and no black box: the red is the whole of it.
      expect(style.borderTopWidth).toMatch(/^(0px|0|)$/);
    }
    // The metrics of the brief, on the one rule.
    const rule = ruleBody('.badge');
    expect(rule).toContain('background-color: var(--bad);');
    expect(rule).toContain('color: #fff;');
    expect(rule).toContain('font-weight: 700;');
    expect(rule).toContain('font-size: var(--fs-body);');
    expect(rule).toContain('padding: 4px 10px;');
    expect(rule).toContain('border-radius: 4px;');
    expect(rule).toContain('letter-spacing: 0.2px;');
  });

  it('gives Express the accent orange at the top right, and no red', () => {
    const { state, flagged, plain } = withFlags();
    const page = onThePaper(renderBoard(state, ''));
    const express = page.querySelector(`[data-enquiry="${flagged.id}"] .badge-express`);
    expect(express?.textContent).toBe('Express');
    expect(express?.classList.contains('tile-flag')).toBe(true);
    if (express !== null && express !== undefined) {
      expect(colourOf(getComputedStyle(express).backgroundColor)).toBe(rootValue('--accent'));
      expect(getComputedStyle(express).color).toBe('rgb(255, 255, 255)');
    }
    expect(page.querySelector(`[data-enquiry="${plain.id}"] .badge-express`)).toBeNull();
    expect(page.querySelectorAll(`[data-enquiry="${plain.id}"] .badges .badge`)).toHaveLength(0);
  });

  it('keeps the kind of a job on its own class, as it was, and never on the red', () => {
    const state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 40);
    state.enquiries = [];
    const commercial = placeEnquiry(state, { kind: 'commercial', price: 3000, deadlineDays: 40 });
    const page = onThePaper(renderBoard(state, ''));
    const kind = page.querySelector(`[data-enquiry="${commercial.id}"] .badge-kind`);
    expect(kind?.textContent).toBe('Commercial');
    if (kind !== null && kind !== undefined) {
      expect(colourOf(getComputedStyle(kind).backgroundColor)).toBe(rootValue('--panel'));
      expect(getComputedStyle(kind).fontSize).toBe('var(--fs-tiny)');
    }
  });
});

describe('the other badges of the game', () => {
  it('are warnings in the red, or keep their own class and look', () => {
    // Every class="badge ..." the views write, with what it is.
    const files = readdirSync('src/ui').filter((name) => name.endsWith('.ts'));
    const worn = new Set<string>();
    for (const file of files) {
      const text = readFileSync(join('src/ui', file), 'utf8');
      for (const found of text.matchAll(/class="badge(?=[ "])([^"]*)"/g)) worn.add((found[1] ?? '').trim());
    }
    // The warnings wear the red alone; the rest wear their own class, and the accent one is
    // Express. Nothing wears the old badge-warn any more.
    expect(Array.from(worn).sort()).toEqual([
      '',
      'badge-class class-${escapeHtml(variantId)}',
      'badge-express tile-flag',
      'badge-held',
      'badge-kind',
      'badge-low',
      'badge-ordered',
      'badge-owned',
    ]);
    expect(CSS).not.toContain('.badge-warn');
    // Not held is a warning; Held is the green plate every held rung wears.
    const bare = newGame();
    const covers = renderInsurance(bare);
    expect(covers).toContain('<span class="badge">Not held</span>');
    expect(covers).not.toContain('badge good');
    bare.insurance.property = true;
    expect(renderInsurance(bare)).toContain('<span class="badge badge-held">Held</span>');
    // The ones that are not warnings keep the small plate they had.
    const kept = ruleBody('.badge-owned,\n.badge-ordered,\n.badge-class,\n.badge-held,\n.badge-kind');
    expect(kept).toContain('font-size: var(--fs-tiny);');
    expect(kept).toContain('padding: 1px 5px;');
    expect(kept).toContain('font-weight: 400;');
  });
});

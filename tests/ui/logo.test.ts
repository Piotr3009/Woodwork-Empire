/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// @vitest-environment jsdom
// The logo everywhere (PIOTR, 04.10 and 08.10): on the start screen in place of the title's words,
// with no sketch of the unit under it, small at the top of the menu, and as the browser tab's icon
// and title. The files are the art side's pack, scaled down for the web and nothing
// else (docs/art/SPRITES.md 14).

import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NO_STORED_SAVE } from '../../src/cloud/store';
import { renderStart } from '../../src/ui/start';
import type { StartChoice } from '../../src/ui/start';
import { renderMenu } from '../../src/ui/topbar';
import { newGame } from '../helpers';

const CHOICE: StartChoice = {
  difficulty: 'easy',
  playerName: 'Piotr',
  companyName: 'Woodwork Empire',
  showWhy: true,
  cloud: { available: false, email: '', signedIn: null, hasSave: false, note: '' },
  saved: NO_STORED_SAVE,
  startOverAsked: false,
};

describe('the logo', () => {
  it('stands in place of the title on the start screen, its words its alt, the sketch gone', () => {
    const html = renderStart(CHOICE);
    expect(html).toContain('<h1 class="start-logo"><img src="/brand/logo.webp" alt="Woodwork Empire Tycoon"');
    expect(html).not.toContain('<h1>Woodwork Empire</h1>');
    expect(html).not.toContain('unit-sketch');
    expect(html).not.toContain('<svg');
  });

  it('puts the tick for the real-life notes beside its words, at the box\'s own size', () => {
    const html = renderStart(CHOICE);
    expect(html).toContain('<label class="field-row check-row"><input type="checkbox" data-field="showWhy" checked />');
    const css = readFileSync('src/ui/styles.css', 'utf8');
    const rule = css.slice(css.indexOf('.check-row input {'));
    expect(rule.slice(0, rule.indexOf('}'))).toContain('width: auto;');
  });

  it('is the first thing under the cross in the menu', () => {
    const html = renderMenu(newGame(), { available: false, signedIn: null });
    const logo = html.indexOf('class="menu-logo"');
    expect(logo).toBeGreaterThan(html.indexOf('data-do="closeMenu"'));
    expect(logo).toBeLessThan(html.indexOf('data-do="endDay"'));
  });

  it('names the tab and gives it its icon and a picture for a pasted link', () => {
    const page = readFileSync('index.html', 'utf8');
    expect(page).toContain('<title>Woodwork Empire Tycoon</title>');
    expect(page).toContain('href="/brand/icon-32.png"');
    expect(page).toContain('content="https://woodwork-empire.vercel.app/brand/og.png"');
    const brand = readdirSync('public/brand');
    for (const file of ['logo.webp', 'icon-32.png', 'icon-128.png', 'og.png']) {
      expect(brand, file).toContain(file);
    }
  });
});

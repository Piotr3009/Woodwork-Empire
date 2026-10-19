/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// @vitest-environment jsdom
// Turn 31, 2.7 on the page: the Premises page's card for the hall that grows, in the extension
// cards' shape, and the longer hall painted of the 800 m² picture, a piece of ten metres for each
// long extension and the end past the last, on the ground that picture is painted on, the frame
// the hall's own length (CLAUDE.md T31 2.7, section 7).

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { GameState } from '../../src/engine/index';
import { canteenLockers } from '../../src/engine/layout';
import { canteenPages } from '../../src/render/canteen';
import {
  HALL_CANVAS_END,
  HALL_CANVAS_LONG,
  HALL_GROUND_TILE,
  HALL_WIDE_LAYERS,
  hallFrameCanvas,
  hallLayerBox,
  hallLayersOf,
  longPiecesOf,
  renderHall,
} from '../../src/render/hall';
import { SPRITE_SCALE, spriteFiles } from '../../src/render/sprites';
import { renderPremises } from '../../src/ui/premises';
import { currentState, mount, render } from '../../src/ui/app';
import { act, buyStartingKit, newGame, nextDay } from '../helpers';

function dom(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

/** A company in the 800 m² unit with the money for long extensions. */
function deep(): GameState {
  let state = newGame({ difficulty: 'veryEasy' });
  state.cash = 9000000;
  state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
  state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'second' }));
  state.cash = 5000000;
  return state;
}

function longer(state: GameState, times = 1): GameState {
  let next = state;
  for (let n = 0; n < times; n += 1) next = nextDay(act(next, { type: 'EXTEND_UNIT', stage: 'long' }));
  return next;
}

function linesOf(card: Element | null): Array<string | null> {
  return Array.from(card?.querySelectorAll('.figures') ?? []).map((line) => line.textContent);
}

describe('the Premises page s card (CLAUDE.md T31 2.7)', () => {
  it('is offered under the second once that is open, in the extension cards shape, with what goes up', () => {
    let state = newGame({ difficulty: 'veryEasy' });
    state.cash = 9000000;
    state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
    expect(dom(renderPremises(state)).querySelector('[data-premises="extendLong"]')).toBeNull();
    const covered = deep();
    covered.insurance.liability = true;
    covered.security.level = 3;
    const card = dom(renderPremises(covered)).querySelector('[data-premises="extendLong"]');
    expect(card?.className).toBe('card agency-card');
    expect(card?.querySelector('h3')?.textContent).toBe('Extend the hall: 200 m² more');
    expect(linesOf(card)).toEqual([
      '£600,000 · and £2,400 more deposit. Needs £602,400 in the account.',
      'Adds 200 m² along the rear wall: 50 × 20 m, ready the next morning. Room for 40 joiners and ' +
        '30 benches, and 40 lockers in the enlarged canteen. Rent £9,600 → £12,000 a month, rates ' +
        '£1,800 → £2,250, standing power £16 → £20 a day. Security £300 → £375 a month.',
    ]);
    expect(card?.querySelector('[data-do="extendUnit"]')?.getAttribute('data-stage')).toBe('long');
  });

  it('reads as the other two while the builders are in, and offers the next at its own price after', () => {
    const paid = act(deep(), { type: 'EXTEND_UNIT', stage: 'long' });
    const building = dom(renderPremises(paid)).querySelector('[data-premises="extendLong"]');
    expect(linesOf(building)).toEqual([
      'Being built · paid for. It opens the next working morning.',
      '1,000 m², 50 × 20 m, room for 40 joiners and 30 benches.',
    ]);
    expect(building?.querySelector('.badge')?.textContent).toBe('Paid');
    expect(building?.querySelector('[data-do="extendUnit"]')).toBeNull();
    const open = nextDay(paid);
    const page = dom(renderPremises(open));
    expect(linesOf(page.querySelector('[data-premises="extendLong"]'))[0]).toBe(
      // 720,000 until v116: the growth is 1.15 (PIOTR, 19.10).
      '£690,000 · and £2,400 more deposit. Needs £692,400 in the account.',
    );
    // The second is still named by the 800 m² it made, and says the unit as it stands now.
    const second = page.querySelector('[data-premises="extendSecond"]');
    expect(second?.querySelector('h3')?.textContent).toBe('Extend the unit to 800 m²');
    expect(linesOf(second)).toEqual(['Extended', '1,000 m², room for 40 joiners and 30 benches.']);
    expect(page.querySelector('.hint')?.textContent).toContain('The unit you rent: 1,000 m², 50 × 20 m.');
  });

  it('greys its button with the reason when the money is short', () => {
    const short = deep();
    short.cash = 600000;
    const card = dom(renderPremises(short)).querySelector('[data-premises="extendLong"]');
    expect(card?.querySelector('[data-do="extendUnit"]')).toBeNull();
    expect(card?.querySelector('.reason')?.textContent).toBe('Not enough in the account');
  });
});

describe('the longer hall painted (CLAUDE.md T31 2.7; docs/art/SPRITES.md 9.9)', () => {
  it('has its three pieces in public/sprites, each the size of the canvas the hall lays it on', () => {
    for (const name of ['hallBackgroundLong.png', 'hallBackgroundEnd.png', 'hallBackgroundGround.png']) {
      expect(spriteFiles()).toContain(name);
    }
    const size = (name: string): number[] => {
      const file = readFileSync(`public/sprites/${name}`);
      return [file.readUInt32BE(16), file.readUInt32BE(20)];
    };
    expect(size('hallBackgroundLong.png')).toEqual([HALL_CANVAS_LONG.width * SPRITE_SCALE, HALL_CANVAS_LONG.height * SPRITE_SCALE]);
    expect(size('hallBackgroundEnd.png')).toEqual([HALL_CANVAS_END.width * SPRITE_SCALE, HALL_CANVAS_END.height * SPRITE_SCALE]);
    expect(size('hallBackgroundGround.png')).toEqual([HALL_GROUND_TILE.width * SPRITE_SCALE, HALL_GROUND_TILE.height * SPRITE_SCALE]);
    expect(HALL_WIDE_LAYERS.map((layer) => layer.key)).toEqual(
      expect.arrayContaining(['hallBackgroundLong', 'hallBackgroundEnd', 'hallBackgroundGround']),
    );
  });

  it('lays a piece of ten metres for each long extension, each further along, and the end past the last', () => {
    const sixty = longer(deep(), 2);
    expect(sixty.unit.widthCells).toBe(60);
    expect(longPiecesOf(sixty.unit)).toBe(2);
    const layers = hallLayersOf(sixty.unit);
    expect(layers.map((layer) => layer.key)).toEqual([
      'hallBackgroundDeep',
      'hallBackgroundLong',
      'hallBackgroundLong',
      'hallBackgroundEnd',
      'hallOffice',
      'hallCanteen',
    ]);
    // Ten metres along the hall is 240 by 120 of the scene.
    expect(layers.slice(1, 4).map((layer) => hallLayerBox(layer.canvas))).toEqual([
      { ...hallLayerBox(HALL_CANVAS_LONG), x: hallLayerBox(HALL_CANVAS_LONG).x + 240, y: hallLayerBox(HALL_CANVAS_LONG).y + 120 },
      { ...hallLayerBox(HALL_CANVAS_LONG), x: hallLayerBox(HALL_CANVAS_LONG).x + 480, y: hallLayerBox(HALL_CANVAS_LONG).y + 240 },
      { ...hallLayerBox(HALL_CANVAS_END), x: hallLayerBox(HALL_CANVAS_END).x + 480, y: hallLayerBox(HALL_CANVAS_END).y + 240 },
    ]);
    // The 800 m² hall is as it was: no piece, no end.
    expect(longPiecesOf(deep().unit)).toBe(0);
    expect(hallLayersOf(deep().unit).map((layer) => layer.key)).toEqual(['hallBackgroundDeep', 'hallOffice', 'hallCanteen']);
  });

  it('frames the scene by the hall s own length, and lays the picture s ground under all of it', () => {
    const sixty = dom(renderHall(longer(deep(), 2)));
    expect(sixty.querySelector('svg')?.getAttribute('viewBox')).toBe('-540 -144 2040 1164');
    const ground = sixty.querySelector('rect[data-layer="hallBackgroundGround"]');
    expect([ground?.getAttribute('x'), ground?.getAttribute('y'), ground?.getAttribute('width'), ground?.getAttribute('height')]).toEqual([
      '-540',
      '-144',
      '2040',
      '1164',
    ]);
    expect(ground?.getAttribute('fill')).toBe('url(#hall-ground)');
    // Under every piece of the painting.
    const order = Array.from(sixty.querySelectorAll('[data-layer]')).map((node) => node.getAttribute('data-layer'));
    expect(order.slice(0, 5)).toEqual([
      'hallBackgroundGround',
      'hallBackgroundDeep',
      'hallBackgroundLong',
      'hallBackgroundLong',
      'hallBackgroundEnd',
    ]);
    const rich = deep();
    rich.cash = 1e8;
    const hundred = longer(rich, 6);
    expect(hundred.unit.widthCells).toBe(100);
    expect(dom(renderHall(hundred)).querySelector('svg')?.getAttribute('viewBox')).toBe('-540 -144 3000 1644');
    expect(hallLayerBox(hallFrameCanvas(hundred.unit))).toEqual({ x: -540, y: -144, width: 3000, height: 1644 });
    // The 800 m² hall has none of it.
    const eight = dom(renderHall(deep()));
    expect(eight.querySelector('svg')?.getAttribute('viewBox')).toBe('-540 -144 1560 924');
    expect(eight.querySelector('[data-layer="hallBackgroundGround"]')).toBeNull();
  });

  it('shows the enlarged canteen s 56 lockers of a 1,400 m² hall on as many pages as it takes', () => {
    const state = act(longer(deep(), 3), { type: 'ENLARGE_CANTEEN' });
    expect(canteenLockers(state)).toBe(56);
    expect(canteenPages(state)).toBe(4);
  });
});

describe('the long extension, clicked (CLAUDE.md T31 2.7)', () => {
  it('pays for it on the card s Extend, and the card says the builders are in', () => {
    document.body.innerHTML = '<div id="app"></div>';
    const root = document.querySelector('#app') as HTMLElement;
    mount(root);
    const click = (selector: string): void => {
      const element = root.querySelector(selector);
      if (element === null) throw new Error(`nothing to click: ${selector}`);
      element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    };
    click('[data-do="startGame"]');
    let guard = 0;
    while (root.querySelector('[data-do="closeHouseCard"], [data-do="resolveEvent"]') !== null && guard < 50) {
      click('[data-do="closeHouseCard"], [data-do="resolveEvent"]');
      guard += 1;
    }
    const game = currentState();
    if (game === null) throw new Error('no game');
    // The day 1 kit in the hall, the laptop among it.
    Object.assign(game, buyStartingKit(deep()));
    render();
    if (root.querySelector('[data-do="setView"][data-view="office"]') !== null) click('[data-do="setView"][data-view="office"]');
    click('[data-office="laptop"]');
    click('[data-modal="laptop"] [data-tile="premises"]');
    const cash = currentState()?.cash ?? 0;
    click('[data-premises="extendLong"] [data-do="extendUnit"]');
    expect(currentState()?.unit.longExtension).toBe('building');
    expect(currentState()?.cash).toBe(cash - 602400);
    expect(root.querySelector('[data-premises="extendLong"]')?.textContent).toContain('Being built');
  });
});

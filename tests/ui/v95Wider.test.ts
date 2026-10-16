/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// @vitest-environment jsdom
// v95 on the page: the Premises page's card for the hall made wider, in the extension cards'
// shape beside the long one's, and the wider hall painted of the 800 m² picture, a row of pieces
// for every seven metres and the front at the last of them, the frame the hall's own depth
// [PIOTR, 12.10: "and where is the width?"; "3 ok"].

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { GameState } from '../../src/engine/index';
import { canteenLockers } from '../../src/engine/layout';
import { canteenCounterLine, canteenPages } from '../../src/render/canteen';
import {
  HALL_CANVAS_END_WIDER,
  HALL_CANVAS_END_WIDER_FRONT,
  HALL_CANVAS_LONG_WIDER,
  HALL_CANVAS_LONG_WIDER_FRONT,
  HALL_CANVAS_WIDER,
  HALL_CANVAS_WIDER_FRONT,
  HALL_WIDE_LAYERS,
  hallFrameCanvas,
  hallLayerBox,
  hallLayersOf,
  renderHall,
  widePiecesOf,
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

/** A company in the 800 m² unit with the money for the hall made wider. */
function deep(): GameState {
  let state = newGame({ difficulty: 'veryEasy' });
  state.cash = 9000000;
  state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
  state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'second' }));
  state.cash = 5000000;
  return state;
}

function grown(state: GameState, stage: 'long' | 'wide', times = 1): GameState {
  let next = state;
  next.cash = 1e9;
  for (let n = 0; n < times; n += 1) next = nextDay(act(next, { type: 'EXTEND_UNIT', stage }));
  return next;
}

function linesOf(card: Element | null): Array<string | null> {
  return Array.from(card?.querySelectorAll('.figures') ?? []).map((line) => line.textContent);
}

describe('the Premises page s card for the hall made wider (v95)', () => {
  it('is offered under the long one once the second is open, in the extension cards shape, with what goes up', () => {
    let state = newGame({ difficulty: 'veryEasy' });
    state.cash = 9000000;
    state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
    expect(dom(renderPremises(state)).querySelector('[data-premises="extendWide"]')).toBeNull();
    const covered = deep();
    covered.insurance.liability = true;
    covered.security.level = 3;
    const page = dom(renderPremises(covered));
    const ids = Array.from(page.querySelectorAll('[data-premises]')).map((node) => node.getAttribute('data-premises'));
    expect(ids.indexOf('extendWide')).toBe(ids.indexOf('extendLong') + 1);
    const card = page.querySelector('[data-premises="extendWide"]');
    expect(card?.className).toBe('card agency-card');
    expect(card?.querySelector('h3')?.textContent).toBe('Extend the hall wider: 280 m² more');
    expect(linesOf(card)).toEqual([
      '£840,000 · and £3,360 more deposit. Needs £843,360 in the account.',
      'Adds 280 m² along the front of the hall: 40 × 27 m, ready the next morning. Room for 43 joiners and ' +
        '32 benches, and 43 lockers in the enlarged canteen. Rent £9,600 → £12,960 a month, rates ' +
        '£1,800 → £2,430, standing power £16 → £22 a day. Insurance £50 → £68 a month. Security £300 → £405 a month.',
    ]);
    expect(card?.querySelector('[data-do="extendUnit"]')?.getAttribute('data-stage')).toBe('wide');
  });

  it('reads as the others while the builders are in, the long one waiting, and offers the next at its own price after', () => {
    const paid = act(deep(), { type: 'EXTEND_UNIT', stage: 'wide' });
    const page = dom(renderPremises(paid));
    const building = page.querySelector('[data-premises="extendWide"]');
    expect(linesOf(building)).toEqual([
      'Being built · paid for. It opens the next working morning.',
      '1,080 m², 40 × 27 m, room for 43 joiners and 32 benches.',
    ]);
    expect(building?.querySelector('.badge')?.textContent).toBe('Paid');
    expect(building?.querySelector('[data-do="extendUnit"]')).toBeNull();
    const long = page.querySelector('[data-premises="extendLong"]');
    expect(long?.querySelector('[data-do="extendUnit"]')).toBeNull();
    expect(long?.querySelector('.reason')?.textContent).toBe('The builders are in');
    const open = dom(renderPremises(nextDay(paid)));
    expect(linesOf(open.querySelector('[data-premises="extendWide"]'))[0]).toBe(
      '£1,008,000 · and £3,360 more deposit. Needs £1,011,360 in the account.',
    );
    // The long one is ten metres of a hall twenty seven deep now.
    expect(open.querySelector('[data-premises="extendLong"] h3')?.textContent).toBe('Extend the hall: 270 m² more');
    // The second is still named by the 800 m² it made, and says the unit as it stands now.
    const second = open.querySelector('[data-premises="extendSecond"]');
    expect(second?.querySelector('h3')?.textContent).toBe('Extend the unit to 800 m²');
    expect(linesOf(second)).toEqual(['Extended', '1,080 m², room for 43 joiners and 32 benches.']);
    expect(open.querySelector('.hint')?.textContent).toContain('The unit you rent: 1,080 m², 40 × 27 m.');
  });

  it('greys its button with the reason when the money is short', () => {
    const short = deep();
    short.cash = 840000;
    const card = dom(renderPremises(short)).querySelector('[data-premises="extendWide"]');
    expect(card?.querySelector('[data-do="extendUnit"]')).toBeNull();
    expect(card?.querySelector('.reason')?.textContent).toBe('Not enough in the account');
  });

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
    click('[data-premises="extendWide"] [data-do="extendUnit"]');
    expect(currentState()?.unit.wideExtension).toBe('building');
    expect(currentState()?.cash).toBe(cash - 843360);
    expect(root.querySelector('[data-premises="extendWide"]')?.textContent).toContain('Being built');
  });
});

describe('the wider hall painted (v95; docs/art/SPRITES.md 9.10)', () => {
  it('has its six pieces in public/sprites, each the size of the canvas the hall lays it on', () => {
    const size = (name: string): number[] => {
      const file = readFileSync(`public/sprites/${name}.png`);
      return [file.readUInt32BE(16), file.readUInt32BE(20)];
    };
    const pieces = {
      hallBackgroundWider: HALL_CANVAS_WIDER,
      hallBackgroundWiderFront: HALL_CANVAS_WIDER_FRONT,
      hallBackgroundLongWider: HALL_CANVAS_LONG_WIDER,
      hallBackgroundLongWiderFront: HALL_CANVAS_LONG_WIDER_FRONT,
      hallBackgroundEndWider: HALL_CANVAS_END_WIDER,
      hallBackgroundEndWiderFront: HALL_CANVAS_END_WIDER_FRONT,
    };
    for (const [name, canvas] of Object.entries(pieces)) {
      expect(spriteFiles()).toContain(`${name}.png`);
      expect(size(name), name).toEqual([canvas.width * SPRITE_SCALE, canvas.height * SPRITE_SCALE]);
      expect(HALL_WIDE_LAYERS.find((layer) => layer.key === name)?.canvas, name).toEqual(canvas);
    }
    expect(readFileSync('scripts/hall-wider.py', 'utf8')).toContain("hallBackgroundDeep.png");
  });

  it('lays a row for every seven metres, each nearer the camera, the end at the end of the hall, and the front at the last row', () => {
    const one = grown(deep(), 'wide');
    expect(widePiecesOf(one.unit)).toBe(1);
    const layers = hallLayersOf(one.unit);
    expect(layers.map((layer) => layer.key)).toEqual([
      'hallBackgroundDeep',
      'hallBackgroundWider',
      'hallBackgroundEndWider',
      'hallBackgroundWiderFront',
      'hallBackgroundEndWiderFront',
      'hallOffice',
      'hallCanteen',
    ]);
    // Seven metres towards the camera is 168 to the left and 84 down of the scene.
    expect(layers.slice(1, 5).map((layer) => hallLayerBox(layer.canvas))).toEqual([
      { ...hallLayerBox(HALL_CANVAS_WIDER), x: hallLayerBox(HALL_CANVAS_WIDER).x - 168, y: hallLayerBox(HALL_CANVAS_WIDER).y + 84 },
      { ...hallLayerBox(HALL_CANVAS_END_WIDER), x: hallLayerBox(HALL_CANVAS_END_WIDER).x - 168, y: hallLayerBox(HALL_CANVAS_END_WIDER).y + 84 },
      { ...hallLayerBox(HALL_CANVAS_WIDER_FRONT), x: hallLayerBox(HALL_CANVAS_WIDER_FRONT).x - 168, y: hallLayerBox(HALL_CANVAS_WIDER_FRONT).y + 84 },
      {
        ...hallLayerBox(HALL_CANVAS_END_WIDER_FRONT),
        x: hallLayerBox(HALL_CANVAS_END_WIDER_FRONT).x - 168,
        y: hallLayerBox(HALL_CANVAS_END_WIDER_FRONT).y + 84,
      },
    ]);
    // Longer and wider: the hall twenty deep with its long pieces and its end, a row of the hall's
    // own, every long piece's and the end's for each seven metres, and the fronts at the last.
    const both = grown(grown(deep(), 'long', 2), 'wide', 2);
    expect(both.unit).toMatchObject({ widthCells: 60, depthCells: 34 });
    const row = ['hallBackgroundWider', 'hallBackgroundLongWider', 'hallBackgroundLongWider', 'hallBackgroundEndWider'];
    expect(hallLayersOf(both.unit).map((layer) => layer.key)).toEqual([
      'hallBackgroundDeep',
      'hallBackgroundLong',
      'hallBackgroundLong',
      'hallBackgroundEnd',
      ...row,
      ...row,
      'hallBackgroundWiderFront',
      'hallBackgroundLongWiderFront',
      'hallBackgroundLongWiderFront',
      'hallBackgroundEndWiderFront',
      'hallOffice',
      'hallCanteen',
    ]);
    const end = hallLayersOf(both.unit)[11];
    // The end of the second row: twenty metres along and fourteen towards the camera.
    expect(hallLayerBox(end?.canvas)).toEqual({
      ...hallLayerBox(HALL_CANVAS_END_WIDER),
      x: hallLayerBox(HALL_CANVAS_END_WIDER).x + 480 - 336,
      y: hallLayerBox(HALL_CANVAS_END_WIDER).y + 240 + 168,
    });
    // The 800 m² hall is as it was.
    expect(widePiecesOf(deep().unit)).toBe(0);
    expect(hallLayersOf(deep().unit).map((layer) => layer.key)).toEqual(['hallBackgroundDeep', 'hallOffice', 'hallCanteen']);
  });

  it('frames the scene by the hall s own depth, and lays the picture s ground under all of it', () => {
    const one = dom(renderHall(grown(deep(), 'wide')));
    expect(one.querySelector('svg')?.getAttribute('viewBox')).toBe('-708 -144 1728 1008');
    const ground = one.querySelector('rect[data-layer="hallBackgroundGround"]');
    expect([ground?.getAttribute('x'), ground?.getAttribute('y'), ground?.getAttribute('width'), ground?.getAttribute('height')]).toEqual([
      '-708',
      '-144',
      '1728',
      '1008',
    ]);
    const order = Array.from(one.querySelectorAll('[data-layer]')).map((node) => node.getAttribute('data-layer'));
    expect(order.slice(0, 3)).toEqual(['hallBackgroundGround', 'hallBackgroundDeep', 'hallBackgroundWider']);
    expect(dom(renderHall(grown(deep(), 'wide', 2))).querySelector('svg')?.getAttribute('viewBox')).toBe('-876 -144 1896 1092');
    const both = grown(grown(deep(), 'long', 2), 'wide');
    expect(dom(renderHall(both)).querySelector('svg')?.getAttribute('viewBox')).toBe('-708 -144 2208 1248');
    expect(hallLayerBox(hallFrameCanvas(both.unit))).toEqual({ x: -708, y: -144, width: 2208, height: 1248 });
  });

  it('shows the enlarged canteen s 43 lockers of a 1,080 m² hall on as many pages as it takes', () => {
    const state = act(grown(deep(), 'wide'), { type: 'ENLARGE_CANTEEN' });
    expect(canteenLockers(state)).toBe(43);
    expect(canteenPages(state)).toBe(3);
    expect(canteenCounterLine(state, 2)).toBe('Lockers 33 to 43 · 0 of 43 in use ›');
  });
});

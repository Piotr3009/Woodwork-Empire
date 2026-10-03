// @vitest-environment jsdom
// v67 (PIOTR, 03.10): what the player sees of the extension. The Premises page of the laptop in
// the words of the mockup he said yes to (makieta-premises-przed.png, makieta-premises-po.png),
// the hall of forty metres painted with the extended background, the canteen block at four by
// four with its door where it was, and the canteen room showing sixteen lockers: eight at a time
// until v80, and all sixteen at once on its own picture since (delivered 03.10).

import { describe, expect, it } from 'vitest';
import { roomsOf } from '../../src/engine/constants';
import type { GameState } from '../../src/engine/index';
import {
  canteenCounterLine,
  canteenLayersOf,
  canteenPlateNames,
  canteenRegionsOf,
  renderCanteen,
} from '../../src/render/canteen';
import {
  HALL_CANVAS,
  HALL_CANVAS_WIDE,
  HALL_NAME_WALL,
  hallLayerBox,
  hallLayersOf,
  hallNameWall,
  renderHall,
  roomAtScenePoint,
} from '../../src/render/hall';
import { tileToScreen } from '../../src/render/iso';
import { spriteFiles } from '../../src/render/sprites';
import { OFFICE_GROUP, laptopPageFrom, renderLaptop } from '../../src/ui/laptop';
import { renderPremises } from '../../src/ui/premises';
import { act, buyNow, newGame, nextDay, placeEquipment, testJoiner } from '../helpers';

function shop(): GameState {
  const state = newGame({ difficulty: 'veryEasy' });
  state.cash = 300000;
  state.reputation = 90;
  return state;
}

function extended(state: GameState = shop()): GameState {
  return nextDay(act(state, { type: 'EXTEND_UNIT' }));
}

function dom(html: string): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host;
}

/** A card of the page, by the name the page gives it. */
function cardOf(host: HTMLElement, id: string): HTMLElement {
  const card = host.querySelector<HTMLElement>(`[data-premises="${id}"]`);
  if (card === null) throw new Error(`no ${id} card on the page`);
  return card;
}

describe('the Premises tile', () => {
  it('is in the Office group, between Security and Joinery Core, and opens its page', () => {
    const ids = OFFICE_GROUP.map((tile) => tile.id);
    expect(ids.indexOf('premises')).toBe(ids.indexOf('security') + 1);
    expect(laptopPageFrom('premises')).toBe('premises');
    const page = dom(
      renderLaptop(shop(), { page: 'premises', stockSheets: '', teamTab: 'workshop', tickedTasks: [] }),
    );
    expect(page.querySelector('.screen-page-title')?.textContent).toBe('Premises');
    expect(page.querySelector('[data-premises="extend"]')).not.toBeNull();
    expect(page.querySelector('[data-premises="canteen"]')).not.toBeNull();
  });
});

describe('the Premises page before anything is bought', () => {
  it('says what is rented, what the extension costs and what it changes, in the mockup s words', () => {
    const page = dom(renderPremises(shop()));
    expect(page.querySelector('.hint')?.textContent).toBe(
      'The unit you rent: 200 m², 20 × 10 m. Rent £2,400 a month, rates £450 a month.',
    );
    const card = cardOf(page, 'extend');
    expect(card.querySelector('h3')?.textContent).toBe('Extend the unit');
    const lines = Array.from(card.querySelectorAll('.figures')).map((line) => line.textContent);
    expect(lines[0]).toBe('£120,000 · and £2,400 more deposit. Needs £122,400 in the account.');
    expect(lines[1]).toBe(
      'Adds 200 m² to the right of the hall: 40 × 10 m, ready the next morning. Room for 16 ' +
        'joiners and 12 benches. Rent £2,400 → £4,800 a month, rates £450 → £900, ' +
        'standing power £4 → £8 a day.',
    );
    const extend = card.querySelector('[data-do="extendUnit"]');
    expect(extend?.textContent).toBe('Extend');
    expect(extend?.hasAttribute('disabled')).toBe(false);
  });

  it('greys the canteen s button and says why beside it', () => {
    const card = cardOf(dom(renderPremises(shop())), 'canteen');
    const lines = Array.from(card.querySelectorAll('.figures')).map((line) => line.textContent);
    expect(lines[0]).toBe('No charge · comes with the extension');
    expect(lines[1]).toBe(
      '8 m² and 8 lockers today. Enlarged, it is 16 m² and holds 16 lockers. It grows 2 m along ' +
        'the rear wall, so the 2 × 4 m beside it has to be clear first.',
    );
    expect(card.querySelector('[data-do="enlargeCanteen"]')).toBeNull();
    expect(card.querySelector('button')?.hasAttribute('disabled')).toBe(true);
    expect(card.querySelector('.reason')?.textContent).toBe('Extend the unit first');
  });

  it('greys Extend in a shop without the money, and adds a security firm s month where there is one', () => {
    const poor = shop();
    poor.cash = 50000;
    const card = cardOf(dom(renderPremises(poor)), 'extend');
    expect(card.querySelector('[data-do="extendUnit"]')).toBeNull();
    expect(card.querySelector('.reason')?.textContent).toBe('Not enough in the account');
    expect(card.textContent).not.toContain('security firm');
    const guarded = shop();
    guarded.security.level = 5;
    expect(cardOf(dom(renderPremises(guarded)), 'extend').textContent).toContain(
      'The security firm charges by the area:',
    );
  });
});

describe('the Premises page after the click', () => {
  it('says the builders are in until the morning', () => {
    const paid = act(shop(), { type: 'EXTEND_UNIT' });
    const page = dom(renderPremises(paid));
    const card = cardOf(page, 'extend');
    expect(card.querySelector('[data-do="extendUnit"]')).toBeNull();
    expect(card.textContent).toContain('Being built');
    expect(card.textContent).toContain('It opens the next working morning.');
    expect(card.querySelector('.badge')?.textContent).toBe('Paid');
    expect(cardOf(page, 'canteen').querySelector('.reason')?.textContent).toBe(
      'The extension opens in the morning',
    );
  });

  it('says Extended and Done once it is open, and offers the canteen', () => {
    const page = dom(renderPremises(extended()));
    expect(page.querySelector('.hint')?.textContent).toBe(
      'The unit you rent: 400 m², 40 × 10 m. Rent £4,800 a month, rates £900 a month.',
    );
    const card = cardOf(page, 'extend');
    const lines = Array.from(card.querySelectorAll('.figures')).map((line) => line.textContent);
    expect(lines).toEqual(['Extended', '400 m², room for 16 joiners and 12 benches.']);
    expect(card.querySelector('.badge-held')?.textContent).toBe('Done');
    expect(cardOf(page, 'canteen').querySelector('[data-do="enlargeCanteen"]')?.textContent).toBe('Enlarge');
  });

  it('names what has to be moved, and is Done once the canteen is enlarged', () => {
    const state = shop();
    placeEquipment(state, 'cnc', { variantId: 'pro', x: 5, y: 1 });
    placeEquipment(state, 'extractor', { variantId: 'industrial', x: 5, y: 0 });
    const blocked = cardOf(dom(renderPremises(extended(state))), 'canteen');
    expect(blocked.querySelector('.reason')?.textContent).toBe(
      'Move the CNC and the extractor off the 2 × 4 m beside it',
    );
    const wide = act(extended(), { type: 'ENLARGE_CANTEEN' });
    const done = cardOf(dom(renderPremises(wide)), 'canteen');
    const lines = Array.from(done.querySelectorAll('.figures')).map((line) => line.textContent);
    expect(lines).toEqual(['Enlarged', '16 m², 16 lockers.']);
    expect(done.querySelector('.badge-held')?.textContent).toBe('Done');
  });
});

describe('the hall of an extended unit', () => {
  it('is painted with the extended background on its longer canvas, and the blocks where they were', () => {
    const before = shop();
    const open = extended();
    expect(hallLayersOf(before.unit).map((layer) => layer.key)).toEqual([
      'hallBackground',
      'hallOffice',
      'hallCanteen',
    ]);
    expect(hallLayersOf(open.unit).map((layer) => layer.key)).toEqual([
      'hallBackgroundWide',
      'hallOffice',
      'hallCanteen',
    ]);
    // Both pictures are delivered with the build.
    expect(spriteFiles()).toContain('hallBackgroundWide.png');
    expect(spriteFiles()).toContain('hallCanteenWide.png');
    // The same origin, twenty metres more to the right and down.
    expect(HALL_CANVAS_WIDE.originX).toBe(HALL_CANVAS.originX);
    expect(HALL_CANVAS_WIDE.originY).toBe(HALL_CANVAS.originY);
    expect(hallLayerBox(HALL_CANVAS_WIDE)).toEqual({ x: -300, y: -144, width: 1320, height: 804 });
    const hall = dom(renderHall(open));
    expect(hall.querySelector('svg')?.getAttribute('viewBox')).toBe('-300 -144 1320 804');
    const background = hall.querySelector('[data-layer="hallBackgroundWide"]');
    expect(background?.getAttribute('width')).toBe('1320');
    expect(background?.getAttribute('height')).toBe('804');
    // The office block is the picture it was, on the canvas it was painted on.
    const office = hall.querySelector('[data-layer="hallOffice"]');
    expect(office?.getAttribute('width')).toBe(String(HALL_CANVAS.width));
    expect(office?.getAttribute('x')).toBe(String(-HALL_CANVAS.originX));
    // And the hall as it was built is drawn as it always was.
    expect(dom(renderHall(before)).querySelector('svg')?.getAttribute('viewBox')).toBe('-300 -144 840 564');
  });

  it('draws the enlarged canteen block, takes the click over its new half, and keeps its door', () => {
    const open = extended();
    const wide = act(open, { type: 'ENLARGE_CANTEEN' });
    expect(hallLayersOf(wide.unit).map((layer) => layer.key)).toEqual([
      'hallBackgroundWide',
      'hallOffice',
      'hallCanteenWide',
    ]);
    const hall = dom(renderHall(wide));
    expect(hall.querySelector('[data-layer="hallCanteenWide"]')).not.toBeNull();
    expect(hall.querySelector('[data-layer="hallCanteen"]')).toBeNull();
    // A point on the end wall of the new half, a metre up: the canteen now, open hall before.
    const endWall = tileToScreen(7, 2, 1);
    expect(roomAtScenePoint(endWall, roomsOf(open.unit))).toBeNull();
    expect(roomAtScenePoint(endWall, roomsOf(wide.unit))).toBe('canteen');
    // One door, in the face it was painted in: the same polygon as before the block grew.
    const doorOf = (html: HTMLElement): string | null | undefined =>
      html.querySelector('[data-door-room="canteen"] .door-leaf')?.getAttribute('points');
    expect(doorOf(hall)).toBe(doorOf(dom(renderHall(open))));
    expect(hall.querySelectorAll('[data-door-room="canteen"]')).toHaveLength(1);
  });

  it('letters the company name over the roof line of an enlarged canteen, where it was along the wall', () => {
    expect(hallNameWall({ canteenWide: false })).toEqual(HALL_NAME_WALL);
    const raised = hallNameWall({ canteenWide: true });
    expect(raised.x).toBe(HALL_NAME_WALL.x);
    // The block is 2.7 m high.
    expect(raised.z).toBeGreaterThan(2.7);
  });
});

describe('the canteen room of an enlarged canteen', () => {
  /** An enlarged canteen with that many lockers and that many joiners. */
  function canteen(lockers: number, men: number): GameState {
    let state = act(extended(), { type: 'ENLARGE_CANTEEN' });
    for (let index = 0; index < lockers; index += 1) state = buyNow(state, 'locker');
    for (let index = 0; index < men; index += 1) {
      state.workers.push(testJoiner(`joiner-${index + 1}`, `Man${index + 1}`));
    }
    return state;
  }

  it('is eight plates as it was built, with the line it always had', () => {
    const state = extended();
    expect(canteenPlateNames(state)).toHaveLength(8);
    expect(canteenRegionsOf(state).map((region) => region.id)).toEqual(['door', 'lockers', 'kitchen', 'table']);
    expect(canteenLayersOf(state).map((layer) => layer.key)).toContain('canteenLockers');
    expect(canteenCounterLine(state)).toBe('0 of 8 lockers in use');
  });

  it('shows all sixteen lockers at once on its own picture, with nothing to turn', () => {
    // Eight at a time and a line that turned the page until v80: the enlarged room now has a
    // picture of its own with sixteen doors on it (PIOTR, 03.10).
    const state = canteen(11, 10);
    expect(canteenPlateNames(state)).toEqual([
      'Man1', 'Man2', 'Man3', 'Man4', 'Man5', 'Man6', 'Man7', 'Man8',
      'Man9', 'Man10', '', '', '', '', '', '',
    ]);
    expect(canteenCounterLine(state)).toBe('10 of 16 lockers in use');
    expect(canteenRegionsOf(state).map((region) => region.id)).toEqual(['door', 'lockers', 'kitchen', 'table']);
    expect(canteenLayersOf(state).map((layer) => layer.key)).toEqual([
      'canteenBackgroundWide',
      'canteenKitchenWide',
      'canteenLockersWide',
      'canteenTableWide',
    ]);
    const room = dom(renderCanteen(state, { width: 1672, height: 941 }, spriteFiles()));
    expect(room.querySelectorAll('[data-canteen-plate]')).toHaveLength(16);
    expect(room.querySelector('[data-canteen-text="counter"]')?.textContent).toBe('10 of 16 lockers in use');
    expect(room.querySelector('[data-canteen-plate="8"]')?.textContent).toBe('Man9');
    expect(room.innerHTML).toContain('/sprites/canteenLockersWide.png');
  });
});

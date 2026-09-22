// @vitest-environment jsdom
// The canteen is a room the player walks into, built on the office's own machinery: the same
// 1672 by 941 canvas, the same scaling, the same regions, the same placeholder rule while a layer
// is missing (CLAUDE.md T23 2.9). What is its own is the four layers, the lit locker bank, the
// four regions and the two live texts: a name on each of the eight door plates and the counter
// over the banks.

import { describe, expect, it } from 'vitest';
import {
  CANTEEN_LAYERS,
  CANTEEN_LIT_LAYERS,
  CANTEEN_ROOM_REGIONS,
  canteenPlateNames,
  canteenScene,
  renderCanteen,
} from '../../src/render/canteen';
import { OFFICE_CANVAS, officeScale } from '../../src/render/office';
import {
  CANTEEN_COUNTER,
  CANTEEN_COUNTER_TEXT,
  CANTEEN_LOCKERS,
  CANTEEN_PLATES,
  CANTEEN_PLATE_TEXT,
  CANTEEN_REGIONS,
} from '../../src/engine/constants';
import type { GameState } from '../../src/engine/index';
import { buyNow, hireNow, newGame } from '../helpers';

/** Every layer the art side delivered, which is what the room draws from tonight. */
const DELIVERED = [
  'canteenBackground.png',
  'canteenKitchen.png',
  'canteenLockers.png',
  'canteenTable.png',
  'canteenLockersLit.png',
];

function room(
  state: GameState = newGame({ difficulty: 'veryEasy' }),
  files: readonly string[] = DELIVERED,
  viewport = { width: 1280, height: 800 },
): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = renderCanteen(state, viewport, files);
  return holder;
}

/** A shop with men on the books and a locker bought for each of them, which is the state the
 *  plates are lettered from. A man needs a bench, a free slot in a cabinet and a set of tools
 *  before he can be taken on, and the owner keeps a set of his own in a slot too, so the kit is
 *  bought first: an industrial cabinet holds eight sets, which is every man this canteen can
 *  hold, and the sets and the lockers are one a man with one over for the owner's tools. */
function crewOf(size: number): GameState {
  let state = newGame({ difficulty: 'veryEasy' });
  state.cash = 400000;
  state = buyNow(state, 'toolCabinet', 'industrial');
  state = buyNow(state, 'handToolSet');
  // The owner's own place at a bench, which the gate counts from Turn 24: a bench of three
  // places, so the eight this canteen holds fit inside the unit's six bench slots
  // (CLAUDE.md T24 2.2).
  state = buyNow(state, 'workbench', 'industrial');
  for (let index = 0; index < size; index += 1) {
    state = buyNow(state, 'workbench', 'industrial');
    state = buyNow(state, 'handToolSet');
    state = buyNow(state, 'locker');
    state = hireNow(state, 'joiner', 'novice');
  }
  if (state.workers.length !== size) {
    throw new Error(`wanted ${size} on the books, took on ${state.workers.length}`);
  }
  return state;
}

describe('the canteen on the office s canvas', () => {
  it('is the one canvas of the game, scaled and letterboxed the way the office is', () => {
    const stack = room().querySelector('.office-stack');
    expect(stack?.getAttribute('style')).toContain(`width:${OFFICE_CANVAS.width}px`);
    expect(stack?.getAttribute('style')).toContain(`height:${OFFICE_CANVAS.height}px`);
    const scale = Math.round(officeScale({ width: 1280, height: 800 }) * 10000) / 10000;
    expect(stack?.getAttribute('data-scale')).toBe(String(scale));
    expect(stack?.getAttribute('style')).toContain(`scale(${scale})`);
  });

  it('says which room the player is standing in, so the page can tell them apart', () => {
    expect(room().querySelector('[data-room-view="canteen"]')).not.toBeNull();
    expect(room().querySelector('[data-room-view="office"]')).toBeNull();
  });
});

describe('the five layers', () => {
  it('stacks them back to front, with the lit bank over the bank and under the table', () => {
    const layers = Array.from(room().querySelectorAll('.office-layer'));
    expect(layers.map((layer) => layer.getAttribute('data-layer'))).toEqual([
      'canteenBackground',
      'canteenKitchen',
      'canteenLockers',
      'canteenLockersLit',
      'canteenTable',
    ]);
    // The lit copy is an overlay and not one of the four the room is made of.
    expect(CANTEEN_LAYERS.map((layer) => layer.key)).toEqual([
      'canteenBackground',
      'canteenKitchen',
      'canteenLockers',
      'canteenTable',
    ]);
    expect(CANTEEN_LIT_LAYERS).toEqual([
      {
        key: 'canteenLockersLit',
        name: 'Canteen lockers, lit',
        region: 'lockers',
        over: 'canteenLockers',
      },
    ]);
  });

  it('draws a flat placeholder for a layer whose file is taken out of the list', () => {
    // The office's rule, kept for the canteen: a missing layer is a flat rectangle with its name
    // on it and the room still works (CLAUDE.md T7 3.8, T23 2.9).
    const short = DELIVERED.filter((file) => file !== 'canteenLockers.png');
    const drawn = room(newGame({ difficulty: 'veryEasy' }), short);
    const lockers = drawn.querySelector('[data-layer="canteenLockers"]');
    expect(lockers?.className).toContain('office-placeholder');
    expect(lockers?.textContent).toBe('Canteen lockers');
    expect(drawn.querySelector('[data-layer="canteenBackground"]')?.tagName).toBe('IMG');
  });

  it('draws nothing but placeholders before any of the art has landed', () => {
    const bare = room(newGame({ difficulty: 'veryEasy' }), []);
    const layers = Array.from(bare.querySelectorAll('.office-layer'));
    expect(layers).toHaveLength(CANTEEN_LAYERS.length);
    for (const layer of layers) expect(layer.className).toContain('office-placeholder');
    // No lit overlay at all while its file is missing: the stylesheet gives the region a soft
    // light spot instead (CLAUDE.md T14 2.2).
    expect(bare.querySelector('.office-lit')).toBeNull();
    expect(bare.querySelector('.office-stack')?.getAttribute('data-lit')).toBeNull();
  });
});

describe('the four regions', () => {
  it('opens the door back to the hall and the lockers onto the team, and no more', () => {
    const drawn = room();
    const door = drawn.querySelector('[data-office="door"]');
    const lockers = drawn.querySelector('[data-office="lockers"]');
    expect(door?.tagName).toBe('BUTTON');
    expect(door?.getAttribute('data-do')).toBe('officeRegion');
    expect(lockers?.tagName).toBe('BUTTON');
    expect(lockers?.getAttribute('data-do')).toBe('officeRegion');
    // The kitchenette and the table do nothing yet, so they are quiet rectangles like the
    // office's clock and take no click at all.
    for (const id of ['kitchen', 'table']) {
      const quiet = drawn.querySelector(`[data-office="${id}"]`);
      expect(quiet?.tagName).toBe('DIV');
      expect(quiet?.className).toContain('is-quiet');
    }
  });

  it('places every region on the art side s own measurement, in canvas pixels', () => {
    const drawn = room();
    for (const region of CANTEEN_ROOM_REGIONS) {
      const measured = CANTEEN_REGIONS[region.id as keyof typeof CANTEEN_REGIONS];
      expect(drawn.querySelector(`[data-office="${region.id}"]`)?.getAttribute('style')).toBe(
        `left:${measured.x}px;top:${measured.y}px;width:${measured.w}px;height:${measured.h}px`,
      );
    }
  });

  it('names each region for the pill the pointer brings up, and never with a drawn box', () => {
    const drawn = room();
    expect(drawn.querySelector('[data-office="door"] .office-label')?.textContent).toBe(
      'To the hall',
    );
    expect(drawn.querySelector('[data-office="lockers"] .office-label')?.textContent).toBe(
      'The lockers',
    );
    // A region is transparent: the room carries no drawn buttons (CLAUDE.md T14 2.2).
    expect(drawn.innerHTML).not.toContain('office-company-board');
    expect(drawn.innerHTML).not.toContain('office-floor-catalogue');
  });

  it('marks the locker bank as the one region with a lit overlay behind it', () => {
    expect(room().querySelector('.office-stack')?.getAttribute('data-lit')).toBe('lockers');
    expect(room().querySelector('.office-lit')?.getAttribute('data-lit')).toBe('lockers');
  });
});

describe('the eight door plates', () => {
  it('draws all eight at the rectangles the art side measured, blank in a new shop', () => {
    const drawn = room();
    const plates = Array.from(drawn.querySelectorAll('[data-canteen-plate]'));
    expect(plates).toHaveLength(CANTEEN_LOCKERS);
    expect(CANTEEN_LOCKERS).toBe(8);
    plates.forEach((plate, index) => {
      const measured = CANTEEN_PLATES[index];
      expect(plate.getAttribute('style')).toBe(
        `left:${measured?.x}px;top:${measured?.y}px;width:${measured?.w}px;` +
          `height:${measured?.h}px;font-size:${CANTEEN_PLATE_TEXT.fontSize}px`,
      );
      // A new shop has nobody on the books and no lockers bought, so every plate is blank.
      expect(plate.textContent).toBe('');
    });
  });

  it('letters the men on the books in the order their lockers were bought', () => {
    const state = crewOf(3);
    const names = state.workers.map((worker) => worker.name);
    expect(names).toHaveLength(3);
    expect(canteenPlateNames(state)).toEqual([...names, '', '', '', '', '']);
    const plates = Array.from(room(state).querySelectorAll('[data-canteen-plate]'));
    expect(plates.map((plate) => plate.textContent)).toEqual([...names, '', '', '', '', '']);
  });

  it('leaves a locker nobody is in blank, and a man with no locker off the wall', () => {
    // Two men and three lockers: the third compartment is bought and empty.
    let state = crewOf(2);
    state = buyNow(state, 'locker');
    expect(canteenPlateNames(state).filter((name) => name !== '')).toHaveLength(2);
    // And a man taken on before his locker landed has no plate until it does, because a plate is
    // a compartment and not a promise.
    const withoutLockers = crewOf(2);
    withoutLockers.equipment = withoutLockers.equipment.filter(
      (item) => item.specId !== 'locker',
    );
    expect(canteenPlateNames(withoutLockers).every((name) => name === '')).toBe(true);
  });

  it('cuts a name that is longer than the plate the picture painted', () => {
    const state = crewOf(1);
    const man = state.workers[0];
    if (man === undefined) throw new Error('nobody on the books');
    man.name = 'Bartholomew';
    const plate = room(state).querySelector('[data-canteen-plate="0"]');
    expect(plate?.textContent).toBe('Bartholo');
    expect(plate?.textContent).toHaveLength(CANTEEN_PLATE_TEXT.maxCharacters);
  });
});

describe('the counter over the banks', () => {
  it('says how many of the eight are in use, at the measured box and hand', () => {
    const counter = room().querySelector('[data-canteen-text="counter"]');
    expect(counter?.textContent).toBe(`0 of ${CANTEEN_LOCKERS} lockers in use`);
    expect(counter?.getAttribute('style')).toBe(
      `left:${CANTEEN_COUNTER.x}px;top:${CANTEEN_COUNTER.y}px;width:${CANTEEN_COUNTER.w}px;` +
        `height:${CANTEEN_COUNTER.h}px;font-size:${CANTEEN_COUNTER_TEXT.fontSize}px`,
    );
  });

  it('counts the same compartments the plates letter, and moves with the crew', () => {
    const state = crewOf(5);
    const drawn = room(state);
    expect(drawn.querySelector('[data-canteen-text="counter"]')?.textContent).toBe(
      '5 of 8 lockers in use',
    );
    const lettered = Array.from(drawn.querySelectorAll('[data-canteen-plate]')).filter(
      (plate) => plate.textContent !== '',
    );
    expect(lettered).toHaveLength(5);
  });
});

describe('the scene the page keeps', () => {
  it('builds the shell again only when what is in the room changes', () => {
    const state = crewOf(1);
    const first = canteenScene(state, { width: 1280, height: 800 }, DELIVERED);
    const again = canteenScene(state, { width: 1280, height: 800 }, DELIVERED);
    expect(again.key).toBe(first.key);
    // The men are live text, so taking one on writes the plates again and leaves the pictures
    // where they are (CLAUDE.md T23 2.9).
    const bigger = crewOf(2);
    const grown = canteenScene(bigger, { width: 1280, height: 800 }, DELIVERED);
    expect(grown.key).toBe(first.key);
    expect(grown.live).not.toBe(first.live);
    // A layer that has not landed is a different room and does rebuild it.
    const short = canteenScene(
      state,
      { width: 1280, height: 800 },
      DELIVERED.filter((file) => file !== 'canteenTable.png'),
    );
    expect(short.key).not.toBe(first.key);
  });
});

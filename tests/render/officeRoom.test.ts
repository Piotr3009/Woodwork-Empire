// @vitest-environment jsdom
// The office is a room now: three layers on one canvas, scaled to the page and centred, with
// transparent click regions and two live texts over them (docs/art/SPRITES.md 8, CLAUDE.md T4 3.1).

import { describe, expect, it } from 'vitest';
import {
  COMPANY_BOARD_BOX,
  FLOOR_CATALOGUE,
  FLOOR_CATALOGUE_SPRITE,
  OFFICE_CANVAS,
  OFFICE_LAYERS,
  OFFICE_NAME_SIZE_MIN,
  OFFICE_OWNER_BOX,
  OFFICE_REGIONS,
  OFFICE_TEXTS,
  officeRegionsOf,
  officeScale,
  renderOffice,
} from '../../src/render/office';
import {
  STATION_BENCH,
  STATION_OFFICE,
  STATION_PHONE,
} from '../../src/engine/stations';
import { fitName } from '../../src/render/hall';
import { formatTime } from '../../src/engine/clock';
import { tick } from '../../src/engine/index';
import { WORKER_RATES } from '../../src/engine/constants';
import type { GameState, Worker } from '../../src/engine/index';
import { buyNow, newGame } from '../helpers';

/** A game with the desk, the chair and the laptop bought: the room as it is once the office has
 *  been furnished. A new game starts with none of them (CLAUDE.md T7 3.8). */
function furnished(): GameState {
  let state = newGame({ difficulty: 'veryEasy' });
  for (const specId of ['desk', 'chair', 'laptop']) {
    state = buyNow(state, specId);
  }
  return state;
}

/** A man of the office staff, at his desk. Only his role, his id and his station are read by the
 *  office view, so the rest is what `hire` would have written for a man with no experience. */
function deskMan(role: string, id: string): Worker {
  return {
    id,
    name: `Desk ${id}`,
    role: role as Worker['role'],
    tier: 'novice',
    rate: WORKER_RATES.novice,
    monthlyWage: 1950,
    leavesOnDay: null,
    startDay: 1,
    jobId: null,
    taskId: null,
    minutesWorked: 0,
    ordersToday: 0,
    overtimeMinutes: 0,
    overtimeMinutesWeek: 0,
    overtimeDays: 0,
    tiredOfOvertime: false,
    station: STATION_OFFICE,
    productionMinutes: 0,
    absentDaysRemaining: 0,
    shift: 'day',
    dayLog: [],
    monthMinutes: 0,
    monthDaysOff: 0,
    idleMinutes: 0,
    idleByReason: { waitingForBoss: 0, noMachine: 0, noMaterial: 0 },
    accidents: 0,
    anchorX: 4,
    anchorY: 6,
  };
}

function room(
  viewport = { width: 1280, height: 800 },
  files: string[] = [],
  state: GameState = furnished(),
): HTMLElement {
  // No files unless a test says so: these tests describe the room before the art lands, whatever
  // the folder holds on the day they run (the board and the book are pictures since 14.09).
  const holder = document.createElement('div');
  holder.innerHTML = renderOffice(state, viewport, files);
  return holder;
}

describe('the canvas and the scale', () => {
  it('is the 1672 by 941 of the contract, and keeps its ratio', () => {
    expect(OFFICE_CANVAS).toEqual({ width: 1672, height: 941 });
    const stack = room().querySelector('.office-stack');
    expect(stack?.getAttribute('style')).toContain('width:1672px');
    expect(stack?.getAttribute('style')).toContain('height:941px');
  });

  it('scales to a 1280 by 800 viewport by the width, which is the tighter of the two', () => {
    expect(officeScale({ width: 1280, height: 800 })).toBeCloseTo(1280 / 1672, 10);
    expect(room().querySelector('.office-stack')?.getAttribute('data-scale')).toBe(
      String(Math.round((1280 / 1672) * 10000) / 10000),
    );
  });

  it('scales by the height when that is the tighter one, and never crops', () => {
    const viewport = { width: 2400, height: 800 };
    expect(officeScale(viewport)).toBeCloseTo(800 / 941, 10);
    for (const size of [
      { width: 1280, height: 800 },
      { width: 2400, height: 800 },
      { width: 900, height: 1400 },
    ]) {
      const scale = officeScale(size);
      expect(OFFICE_CANVAS.width * scale).toBeLessThanOrEqual(size.width + 1e-9);
      expect(OFFICE_CANVAS.height * scale).toBeLessThanOrEqual(size.height + 1e-9);
    }
  });

  it('carries one scale value, so the regions and the text cannot drift off the artwork', () => {
    const stack = room().querySelector('.office-stack');
    const style = stack?.getAttribute('style') ?? '';
    expect(style).toContain(`scale(${stack?.getAttribute('data-scale')})`);
    // The regions are in canvas pixels: the stack's own transform is what scales them.
    const workPlan = room().querySelector('[data-office="workPlan"]');
    expect(workPlan?.getAttribute('style')).toBe(
      'left:20px;top:10px;width:365px;height:515px',
    );
  });
});

describe('the layers', () => {
  it('stacks the three files of the contract, back to front', () => {
    const layers = Array.from(room().querySelectorAll('.office-layer'));
    expect(layers.map((layer) => layer.getAttribute('data-layer'))).toEqual(
      OFFICE_LAYERS.map((layer) => layer.key),
    );
  });

  it('shows a flat rectangle with the layer name while the art is not there', () => {
    const bare = room({ width: 1280, height: 800 }, []);
    const layers = Array.from(bare.querySelectorAll('.office-layer'));
    expect(layers).toHaveLength(3);
    for (const layer of layers) expect(layer.className).toContain('office-placeholder');
    expect(bare.innerHTML).toContain('Office background');
    expect(bare.innerHTML).toContain('Office desk');
    expect(bare.innerHTML).toContain('Office laptop');
    expect(bare.querySelector('img')).toBeNull();
    // The room still works: every region and both texts are there without any art at all.
    expect(bare.querySelectorAll('.office-region')).toHaveLength(OFFICE_REGIONS.length);
    expect(bare.querySelector('[data-office-text="clock"]')).not.toBeNull();
    expect(bare.querySelector('[data-office-text="company"]')).not.toBeNull();
  });
});

describe('the click regions', () => {
  it('is the rectangles of the contract, at the contract coordinates', () => {
    expect(OFFICE_REGIONS.map((region) => region.id)).toEqual([
      'workPlan',
      'orders',
      'door',
      'clock',
      'laptop',
      'catalogue',
      'binder',
      // The free wall right of the door (PIOTR, 13.09; CLAUDE.md T9 3.10).
      'company',
    ]);
    const boxes = OFFICE_REGIONS.map((region) => [
      region.id,
      region.x,
      region.y,
      region.width,
      region.height,
    ]);
    expect(boxes).toEqual([
      ['workPlan', 20, 10, 365, 515],
      ['orders', 1290, 20, 372, 500],
      ['door', 640, 15, 305, 585],
      ['clock', 1040, 88, 122, 58],
      ['laptop', 558, 449, 557, 443],
      ['catalogue', 60, 680, 445, 210],
      ['binder', 1170, 620, 435, 280],
      ['company', COMPANY_BOARD_BOX.x, COMPANY_BOARD_BOX.y, COMPANY_BOARD_BOX.width, COMPANY_BOARD_BOX.height],
    ]);
  });

  it('gives every region that opens something a hook and a label, and no visible frame', () => {
    const node = room();
    for (const region of OFFICE_REGIONS) {
      const element = node.querySelector(`[data-office="${region.id}"]`);
      expect(element, region.id).not.toBeNull();
      if (region.opens) {
        expect(element?.getAttribute('data-do'), region.id).toBe('officeRegion');
      } else {
        // The clock is the live clock and opens nothing (docs/art/SPRITES.md 8.2).
        expect(element?.getAttribute('data-do'), region.id).toBeNull();
      }
      // The name is the label the pointer brings up, off the table, and not a tooltip
      // (CLAUDE.md T14 2.2).
      expect(element?.getAttribute('title'), region.id).toBeNull();
      expect(element?.querySelector('.office-label')?.textContent, region.id).toBe(region.name);
      // Nothing else is drawn over the artwork, with two exceptions the art side has nothing on
      // yet: the catalogue on the floor before there is a desk, and the company board on the free
      // wall (CLAUDE.md T8 3.7, T9 3.10).
      if (region.id !== 'company') {
        expect(element?.querySelectorAll(':scope > :not(.office-label)'), region.id).toHaveLength(0);
      }
    }
  });
});

describe('the floor catalogue picture', () => {
  it('is a picture once the art side has delivered one, and the drawn object until then', () => {
    const drawn = room({ width: 1280, height: 800 }, [], newGame());
    const before = drawn.querySelector('[data-office="catalogue"]');
    expect(before?.querySelector(':scope > span:not(.office-label)')?.textContent).toBe('Equipment');
    expect(before?.querySelector('.office-label')?.textContent).toBe('Catalogue, on the floor');
    expect(before?.querySelector('img')).toBeNull();
    // The same region, through the loader, the moment the file is in the manifest.
    const delivered = room(
      { width: 1280, height: 800 },
      [`${FLOOR_CATALOGUE_SPRITE}.png`],
      newGame(),
    );
    const after = delivered.querySelector('[data-office="catalogue"]');
    const picture = after?.querySelector('img');
    expect(picture).not.toBeNull();
    expect(picture?.getAttribute('src')).toBe(`/sprites/${FLOOR_CATALOGUE_SPRITE}.png`);
    expect(picture?.getAttribute('data-sprite')).toBe(FLOOR_CATALOGUE_SPRITE);
    // And it is still the one click into the catalogue, on the same box.
    expect(after?.getAttribute('data-do')).toBe('officeRegion');
    expect(after?.getAttribute('style')).toContain(`top:${FLOOR_CATALOGUE.y}px`);
    // Once the desk is bought the same book lies on it, smaller (PIOTR, 14.09).
    const onTheDesk = room({ width: 1280, height: 800 }, [`${FLOOR_CATALOGUE_SPRITE}.png`]);
    const deskBook = onTheDesk.querySelector('[data-office="catalogue"]');
    expect(deskBook?.querySelector('img')).not.toBeNull();
    expect(deskBook?.className).toContain('on-desk');
  });
});

describe('the office a new game starts in', () => {
  it('has no desk and no laptop in it at all', () => {
    const bare = room({ width: 1280, height: 800 }, [], newGame());
    const layers = Array.from(bare.querySelectorAll('.office-layer'));
    expect(layers.map((layer) => layer.getAttribute('data-layer'))).toEqual(['officeBackground']);
    expect(bare.querySelector('[data-office="laptop"]')).toBeNull();
    expect(bare.querySelector('[data-office="binder"]')).toBeNull();
    expect(bare.querySelector('[data-office="orders"]')).toBeNull();
  });

  it('lies the catalogue on the floor by the door, with Equipment on its cover', () => {
    const bare = room({ width: 1280, height: 800 }, [], newGame());
    const catalogue = bare.querySelector('[data-office="catalogue"]');
    expect(catalogue).not.toBeNull();
    expect(catalogue?.getAttribute('data-do')).toBe('officeRegion');
    expect(catalogue?.querySelector(':scope > span:not(.office-label)')?.textContent).toBe('Equipment');
    // The same box as on the desk, pushed down to the floor (CLAUDE.md T7 3.8).
    expect(catalogue?.getAttribute('style')).toBe(
      `left:${FLOOR_CATALOGUE.x}px;top:${FLOOR_CATALOGUE.y}px;` +
        `width:${FLOOR_CATALOGUE.width}px;height:${FLOOR_CATALOGUE.height}px`,
    );
    // The region the brief gives it on the office canvas: x 60 to 500, y 700 to 900
    // (CLAUDE.md T8 3.7).
    expect(FLOOR_CATALOGUE.x).toBe(60);
    expect(FLOOR_CATALOGUE.x + FLOOR_CATALOGUE.width).toBe(500);
    expect(FLOOR_CATALOGUE.y).toBe(700);
    expect(FLOOR_CATALOGUE.y + FLOOR_CATALOGUE.height).toBe(900);
    expect(FLOOR_CATALOGUE.y + FLOOR_CATALOGUE.height).toBeLessThan(OFFICE_CANVAS.height);
    // The door and the whiteboard are the room itself and work from the first morning.
    expect(bare.querySelector('[data-office="door"]')).not.toBeNull();
    expect(bare.querySelector('[data-office="workPlan"]')).not.toBeNull();
  });

  it('puts the desk layer in the room the moment the desk is bought', () => {
    const withDesk = buyNow(newGame({ difficulty: 'veryEasy' }), 'desk');
    const node = room({ width: 1280, height: 800 }, undefined, withDesk);
    const layers = Array.from(node.querySelectorAll('.office-layer'));
    expect(layers.map((layer) => layer.getAttribute('data-layer'))).toEqual([
      'officeBackground',
      'officeDesk',
    ]);
    // The catalogue is on the desk now, where the contract puts it, and the binder is with it.
    const catalogue = node.querySelector('[data-office="catalogue"]');
    expect(catalogue?.querySelectorAll(':scope > :not(.office-label)')).toHaveLength(0);
    expect(catalogue?.querySelector('.office-label')?.textContent).toBe('Catalogue');
    expect(catalogue?.getAttribute('style')).toContain('top:680px');
    expect(node.querySelector('[data-office="binder"]')).not.toBeNull();
    // And still no laptop, so still no order board.
    expect(node.querySelector('[data-office="laptop"]')).toBeNull();
    expect(node.querySelector('[data-office="orders"]')).toBeNull();
  });

  it('opens the order board and the laptop the moment the laptop is bought', () => {
    const node = room({ width: 1280, height: 800 }, undefined, furnished());
    expect(node.querySelector('[data-office="laptop"]')).not.toBeNull();
    expect(node.querySelector('[data-office="orders"]')).not.toBeNull();
  });
});

describe('the live text', () => {
  it('puts the clock and the company name in the blank areas the artwork leaves', () => {
    const state = tick(newGame(), 95);
    const holder = document.createElement('div');
    holder.innerHTML = renderOffice(state, { width: 1280, height: 800 });
    const clock = holder.querySelector('[data-office-text="clock"]');
    expect(clock?.textContent).toBe(formatTime(state.clock.minute));
    expect(clock?.textContent).toBe('09:35');
    expect(clock?.getAttribute('style')).toBe(
      `left:${OFFICE_TEXTS.clock.x}px;top:${OFFICE_TEXTS.clock.y}px;` +
        `width:${OFFICE_TEXTS.clock.width}px;height:${OFFICE_TEXTS.clock.height}px;font-size:28px`,
    );
    const company = holder.querySelector('[data-office-text="company"]');
    expect(company?.textContent).toBe(state.companyName);
    // The board is lettered at whatever holds the name, up to the 22 px of the contract.
    const fitted = fitName(state.companyName, OFFICE_TEXTS.company.width, {
      max: OFFICE_TEXTS.company.fontSize,
      min: OFFICE_NAME_SIZE_MIN,
    });
    expect(fitted.fontSize).toBeLessThanOrEqual(OFFICE_TEXTS.company.fontSize);
    expect(company?.getAttribute('style')).toContain(`font-size:${fitted.fontSize}px`);
  });

  it('shrinks the company name to fit the board, and only then cuts it', () => {
    const long = 'A very long joinery company name indeed';
    const holder = document.createElement('div');
    holder.innerHTML = renderOffice(newGame({ companyName: long }), {
      width: 1280,
      height: 800,
    });
    const company = holder.querySelector('[data-office-text="company"]');
    // The name is on a block inside the box, which is what keeps it to one line.
    const line = company?.firstElementChild;
    expect(line?.tagName.toLowerCase()).toBe('span');
    // It went down to the smallest the board allows before anything was cut, and what is cut is
    // cut by the same helper the hall wall uses (CLAUDE.md T6 3.10).
    const fitted = fitName(long, OFFICE_TEXTS.company.width, {
      max: OFFICE_TEXTS.company.fontSize,
      min: OFFICE_NAME_SIZE_MIN,
    });
    expect(fitted.fontSize).toBe(OFFICE_NAME_SIZE_MIN);
    expect(fitted.text.endsWith('...')).toBe(true);
    expect(line?.textContent).toBe(fitted.text);
    expect(company?.getAttribute('style')).toContain(`font-size:${OFFICE_NAME_SIZE_MIN}px`);
    // A name that fits is not touched at all.
    const short = document.createElement('div');
    short.innerHTML = renderOffice(newGame({ companyName: 'WE' }), { width: 1280, height: 800 });
    expect(short.querySelector('[data-office-text="company"]')?.textContent).toBe('WE');
  });

  it('prints the company the player named, whatever it is', () => {
    const holder = document.createElement('div');
    holder.innerHTML = renderOffice(
      newGame({ companyName: 'Joinery Core & Sons' }),
      { width: 1280, height: 800 },
    );
    expect(holder.querySelector('[data-office-text="company"]')?.textContent).toBe(
      'Joinery Core & Sons',
    );
  });
});

describe('the owner at his desk (PIOTR, 17.09; CLAUDE.md T19 2.2)', () => {
  const SHEETS = ['character.owner.idle.sheet.png', 'character.owner.phone.sheet.png'];

  it('draws him in the room while his station is the office or the phone', () => {
    for (const station of [STATION_OFFICE, STATION_PHONE]) {
      const state = furnished();
      state.owner.station = station;
      const holder = room({ width: 1280, height: 800 }, SHEETS, state);
      const figure = holder.querySelector('[data-office-figure="owner"]');
      expect(figure, station).not.toBeNull();
      // In the live part, where the clock is, so sitting down never rebuilds the room.
      expect(figure?.closest('.office-live'), station).not.toBeNull();
      expect(figure?.getAttribute('style')).toContain(`left:${OFFICE_OWNER_BOX.x}px`);
      expect(figure?.getAttribute('style')).toContain(`top:${OFFICE_OWNER_BOX.y}px`);
      expect(figure?.getAttribute('style')).toContain(`width:${OFFICE_OWNER_BOX.width}px`);
      expect(figure?.getAttribute('style')).toContain(`height:${OFFICE_OWNER_BOX.height}px`);
      // It is his own sheet and not a region: it opens nothing and answers no click.
      expect(figure?.querySelector('image')?.getAttribute('href')).toContain('character.owner');
      expect(figure?.classList.contains('office-region')).toBe(false);
      expect(figure?.closest('.office-region')).toBeNull();
      expect(figure?.getAttribute('data-do')).toBeNull();
    }
  });

  it('draws nobody when he is not in the office, and takes no region away when he is', () => {
    const out = furnished();
    out.owner.station = STATION_BENCH;
    expect(
      room({ width: 1280, height: 800 }, SHEETS, out).querySelector('[data-office-figure]'),
    ).toBeNull();
    // Gone home: the office is empty whatever his station says.
    const home = furnished();
    home.owner.station = STATION_OFFICE;
    home.owner.wentHome = true;
    expect(
      room({ width: 1280, height: 800 }, SHEETS, home).querySelector('[data-office-figure]'),
    ).toBeNull();
    const there = furnished();
    there.owner.station = STATION_OFFICE;
    const holder = room({ width: 1280, height: 800 }, SHEETS, there);
    expect(holder.querySelectorAll('.office-region')).toHaveLength(
      officeRegionsOf(there).length,
    );
  });

  it('draws him and nobody else, whoever else of the crew is at a desk (CLAUDE.md T21 2.11)', () => {
    // Turn 21 sends the office staff through the office door, so an estimator at a take off, an admin
    // at the emails, a clerk at his orders and a draftsman at his drawings are all off the hall. The
    // office view is not where they turn up: it is one box, measured for the owner (CLAUDE.md T19 2.2),
    // and the crew's own places in it are a drawing nobody has made (PIOTR, 18.09: nothing visual
    // without a mockup). What says where they are is the bubble at the door (CLAUDE.md T21 2.6).
    const state = furnished();
    state.owner.station = STATION_OFFICE;
    state.workers.push(...['estimator', 'officeAdmin', 'draftsman'].map((role, index) => ({
      ...deskMan(role, `staff-${index + 1}`),
    })));
    const holder = room({ width: 1280, height: 800 }, SHEETS, state);
    expect(holder.querySelectorAll('[data-office-figure]')).toHaveLength(1);
    expect(holder.querySelector('[data-office-figure="owner"]')).not.toBeNull();
    // And with the owner out of the office the room is empty, however many of them are at a desk.
    state.owner.station = STATION_BENCH;
    expect(
      room({ width: 1280, height: 800 }, SHEETS, state).querySelectorAll('[data-office-figure]'),
    ).toHaveLength(0);
  });

  it('stands him clear of everything the player clicks', () => {
    // The box is measured off the picture, so this is the assertion that keeps it honest: he is
    // in the strip of wall between the Work Plan board and the door opening, and on nothing else.
    const box = OFFICE_OWNER_BOX;
    for (const region of OFFICE_REGIONS) {
      const clear =
        box.x + box.width <= region.x ||
        region.x + region.width <= box.x ||
        box.y + box.height <= region.y ||
        region.y + region.height <= box.y;
      expect(clear, region.id).toBe(true);
    }
    expect(box.x + box.width).toBeLessThanOrEqual(OFFICE_CANVAS.width);
    expect(box.y + box.height).toBeLessThanOrEqual(OFFICE_CANVAS.height);
    // And he keeps the sheet cell's own shape, so nothing is stretched.
    expect(box.width / box.height).toBeCloseTo(112 / 151, 2);
  });
});

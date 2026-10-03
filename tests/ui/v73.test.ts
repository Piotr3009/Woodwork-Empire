// @vitest-environment jsdom
// v73 (PIOTR, 03.10), three things.
//
// The extraction plant stands outside behind the rear wall and not on the apron at the end of the
// hall, where it stood in front of the benches and hid them. Only its top is seen, over the wall.
// A second one stands beside the first, and a save with the plant on the apron has it moved.
//
// Drying racks are the spray booth's add on: stood in a booth, no floor of their own, one set a
// booth, and the booth keeps six times the men busy that its class does, twenty four in an
// industrial one.
//
// A drawing the draftsman has says so in his own words, and the owner's button on it says what
// the click does: take it over.

import { describe, expect, it } from 'vitest';
import { DRYING_RACKS, DRYING_RACKS_PLACES_FACTOR, EQUIPMENT_SPECS, STATE_VERSION } from '../../src/engine/constants';
import { canBuy } from '../../src/engine/game';
import type { GameState, Worker } from '../../src/engine/index';
import { apronPlaceFor, hallItems, outsidePlaceFor, standsBehindTheWall } from '../../src/engine/layout';
import {
  boothsWithDryingRacks,
  hallPlaces,
  isServiced,
  machineForPlace,
  placesAt,
  placesLine,
  placesOf,
  poweredMachines,
} from '../../src/engine/machines';
import { migrateState } from '../../src/engine/migrate';
import { jobTasks } from '../../src/engine/tasks';
import { isFree, standsOutsideTheHall } from '../../src/engine/walk';
import { REAR_WALL_CLIP, renderHall } from '../../src/render/hall';
import { renderDrawings } from '../../src/ui/drawings';
import { floorLine, pictureKeyOf } from '../../src/ui/machine';
import {
  acceptNow,
  buyStartingKit,
  fillRack,
  newGame,
  placeEnquiry,
  placeEquipment,
  softwareNow,
  testJoiner,
  withAir,
  withExtraction,
} from '../helpers';

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

describe('the extraction plant behind the rear wall', () => {
  it('gives the plant a place behind the wall, each beside the last, and the van the apron', () => {
    const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    state.cash = 1000000;
    state.reputation = 100;
    expect(standsBehindTheWall('flexiSystem')).toBe(true);
    expect(standsBehindTheWall('dustSystem')).toBe(true);
    expect(standsBehindTheWall('van')).toBe(false);
    // Three by two, a metre back from the hall's first row and clear of the far end of the wall.
    const width = state.unit.widthCells;
    expect(outsidePlaceFor(state, 'flexiSystem')).toEqual({ x: width - 6, y: -3 });
    placeEquipment(state, 'flexiSystem', { x: width - 6, y: -3, id: 'kit-flexi-1' });
    // The next is a metre nearer the gate, and not on the first.
    expect(outsidePlaceFor(state, 'flexiSystem')).toEqual({ x: width - 10, y: -3 });
    expect(canBuy(state, 'flexiSystem').ok).toBe(true);
    // The van is where it was, on the apron past the end of the hall.
    expect(outsidePlaceFor(state, 'van')).toEqual(apronPlaceFor(state, 'van'));
    expect(outsidePlaceFor(state, 'van')?.x).toBe(width);
    // Four of them along a twenty metre wall, and then there is no room for a fifth.
    let count = 1;
    for (let at = outsidePlaceFor(state, 'flexiSystem'); at !== null; at = outsidePlaceFor(state, 'flexiSystem')) {
      count += 1;
      placeEquipment(state, 'flexiSystem', { x: at.x, y: at.y, id: `kit-flexi-${count}` });
    }
    expect(count).toBe(4);
    expect(canBuy(state, 'flexiSystem')).toEqual({ ok: false, reason: 'No room behind the hall' });
  });

  it('takes none of the hall floor, and is drawn through the clip of the wall', () => {
    const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    const plant = placeEquipment(state, 'flexiSystem', { x: 14, y: -3, id: 'kit-flexi' });
    expect(standsOutsideTheHall(state, plant)).toBe(true);
    expect(hallItems(state).some((item) => item.id === plant.id)).toBe(false);
    // The floor in front of the wall is floor as it was.
    expect(isFree(state, { x: 15, y: 0 })).toBe(isFree(buyStartingKit(newGame({ difficulty: 'veryEasy' })), { x: 15, y: 0 }));
    const hall = parse(`<svg>${renderHall(state)}</svg>`);
    const drawn = hall.querySelector(`[data-kit="${plant.id}"]`);
    expect(drawn).not.toBeNull();
    // The painted hall cuts it at the wall's top; the flat floor a test without art draws has no wall.
    const painted = hall.querySelector('.hall-layer') !== null;
    expect(hall.querySelector(`#${REAR_WALL_CLIP}`) !== null).toBe(painted);
    expect(drawn?.getAttribute('clip-path')).toBe(painted ? `url(#${REAR_WALL_CLIP})` : null);
    // A saw in the hall is never cut.
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    expect(hall.querySelector(`[data-kit="${saw?.id}"]`)?.getAttribute('clip-path')).toBeNull();
  });

  it('moves the plant of an older save off the apron, in the order it was bought', () => {
    const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    const kerb = state.unit.widthCells;
    placeEquipment(state, 'flexiSystem', { x: kerb, y: 4, id: 'kit-flexi-1' });
    placeEquipment(state, 'flexiSystem', { x: kerb, y: 6, id: 'kit-flexi-2' });
    placeEquipment(state, 'van', { x: kerb, y: 7, id: 'kit-van' });
    const raw = JSON.parse(JSON.stringify(state)) as { version: number };
    raw.version = 37;
    const lifted = migrateState(raw, 37);
    if (lifted === null) throw new Error('the save is wanted');
    expect(lifted.version).toBe(STATE_VERSION);
    const at = (id: string) => {
      const item = lifted.equipment.find((entry) => entry.id === id);
      return { x: item?.anchorX, y: item?.anchorY };
    };
    expect(at('kit-flexi-1')).toEqual({ x: kerb - 6, y: -3 });
    expect(at('kit-flexi-2')).toEqual({ x: kerb - 10, y: -3 });
    // The van is not plant: it stays where it stood.
    expect(at('kit-van')).toEqual({ x: kerb, y: 7 });
  });
});

describe('drying racks in a spray booth', () => {
  function hall(): GameState {
    const state = withAir(withExtraction(buyStartingKit(newGame({ difficulty: 'veryEasy' }))));
    state.cash = 1000000;
    state.reputation = 100;
    return state;
  }

  it('are a line of the catalogue that holds no floor and shows the booth it stands in', () => {
    const spec = EQUIPMENT_SPECS.find((entry) => entry.id === DRYING_RACKS);
    if (spec === undefined) throw new Error('the racks are wanted in the catalogue');
    expect(spec).toMatchObject({ name: 'Drying racks', price: 40000, deliveryDays: 15, tab: 'spraying', folder: 'Drying racks' });
    expect(floorLine(DRYING_RACKS, 'standard')).toBe('Stood in a spray booth, take no floor');
    expect(pictureKeyOf(spec)).toBe('sprayBooth');
    // Shelving and not a machine: no service comes due on them and they draw no power.
    expect(spec.category).toBe('storage');
    expect(isServiced(DRYING_RACKS)).toBe(false);
    const state = hall();
    placeEquipment(state, 'sprayBooth', { variantId: 'industrial', x: 7, y: 5, id: 'kit-booth-1' });
    placeEquipment(state, DRYING_RACKS, { id: 'kit-racks-1' });
    expect(poweredMachines(state).some((item) => item.specId === DRYING_RACKS)).toBe(false);
    expect(hallItems(state).some((item) => item.specId === DRYING_RACKS)).toBe(false);
  });

  it('make an industrial booth keep twenty four men busy, and leave a booth without them at four', () => {
    const state = hall();
    const first = placeEquipment(state, 'sprayBooth', { variantId: 'industrial', x: 7, y: 5, id: 'kit-booth-1' });
    expect(DRYING_RACKS_PLACES_FACTOR).toBe(6);
    expect(placesAt(state, first)).toBe(4);
    expect(hallPlaces(state, 'sprayBooth')).toBe(4);
    // One set a booth, and none without a booth to stand in.
    expect(canBuy(state, DRYING_RACKS).ok).toBe(true);
    placeEquipment(state, DRYING_RACKS, { id: 'kit-racks-1' });
    expect(canBuy(state, DRYING_RACKS)).toEqual({ ok: false, reason: 'Every spray booth has its drying racks' });
    expect(Array.from(boothsWithDryingRacks(state))).toEqual([first.id]);
    expect(placesAt(state, first)).toBe(24);
    // The class itself is what it was: the catalogue's own figure.
    expect(placesOf(first)).toBe(4);
    expect(hallPlaces(state, 'sprayBooth')).toBe(24);
    // The twenty fourth man is at this booth; the twenty fifth has no place in the hall.
    expect(machineForPlace(state, 'sprayBooth', 23)?.item.id).toBe(first.id);
    expect(machineForPlace(state, 'sprayBooth', 24)).toBeNull();
    // A second booth, a standard one, has its own two until it has racks of its own.
    const second = placeEquipment(state, 'sprayBooth', { variantId: 'standard', x: 14, y: 5, id: 'kit-booth-2' });
    expect(placesAt(state, second)).toBe(2);
    expect(hallPlaces(state, 'sprayBooth')).toBe(26);
    expect(canBuy(state, DRYING_RACKS).ok).toBe(true);
    placeEquipment(state, DRYING_RACKS, { id: 'kit-racks-2' });
    expect(placesAt(state, second)).toBe(12);
    // And the card of a booth nobody is at says nothing new.
    expect(placesLine(state, first, 'card')).toBe('Free');
  });
});

describe('a drawing the draftsman has', () => {
  it('says he is drawing it, and offers the owner Take over and not Start', () => {
    let state = softwareNow(fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 40), 'subscription');
    state.enquiries = [];
    const enquiry = placeEnquiry(state, { price: 3000, deadlineDays: 40, needsMeasure: false });
    state = acceptNow(state, enquiry.id);
    const job = state.jobs[state.jobs.length - 1];
    if (!job) throw new Error('a job is wanted');
    const design = jobTasks(state, job.id).find((task) => task.kind === 'design');
    if (design === undefined) throw new Error('a drawing is wanted');
    // Nobody has it: it is the owner's to start, as it always was.
    const waiting = parse(renderDrawings(state));
    expect(waiting.querySelector('[data-do="startTask"]')?.textContent).toBe('Start');
    // The draftsman takes it.
    const draftsman: Worker = { ...testJoiner('staff-9', 'Harry'), role: 'draftsman', tier: 'senior' };
    state.workers.push(draftsman);
    draftsman.taskId = design.id;
    design.doneBy = draftsman.id;
    const his = parse(renderDrawings(state));
    expect(his.textContent).toContain('Harry is drawing it');
    const button = his.querySelector('[data-do="startTask"]');
    expect(button?.textContent).toBe('Take over');
    expect(button?.getAttribute('data-id')).toBe(design.id);
  });
});

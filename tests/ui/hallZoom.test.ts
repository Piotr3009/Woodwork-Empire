// @vitest-environment jsdom
// Zoom and pan over the hall (CLAUDE.md T6 3.3). One transform on one group, and everything that
// asks where a click landed reads the same transform.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { currentState, mount, render } from '../../src/ui/app';
import {
  HALL_ZOOM_MAX,
  HALL_ZOOM_MIN,
  HALL_ZOOM_START,
  HALL_ZOOM_STEP,
  cameraTransform,
  hallLayerBox,
  hallStartCamera,
} from '../../src/render/hall';
import { ROOM_DOOR, roomById } from '../../src/engine/constants';
import { centreOf, tileToScreen } from '../../src/render/iso';
import { buyStartingKit } from '../helpers';

function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error('Missing test fixture');
  return value;
}

/** The browser CTM carries the uniform scale and the centred margins of the letterboxed scene. */
const CTM = { a: 0.5, d: 0.5, e: -150, f: -60 };

function stubCtm(): void {
  Object.defineProperty(SVGSVGElement.prototype, 'getScreenCTM', {
    configurable: true,
    value: () => ({ inverse: () => CTM }),
  });
  Object.defineProperty(SVGSVGElement.prototype, 'createSVGPoint', {
    configurable: true,
    value: () => ({
      x: 0,
      y: 0,
      matrixTransform(matrix: { a: number; d: number; e: number; f: number }) {
        return { x: this.x * matrix.a + matrix.e, y: this.y * matrix.d + matrix.f };
      },
    }),
  });
}

/** A point of the frame, as the mouse would report it. */
function client(at: { x: number; y: number }): { clientX: number; clientY: number } {
  return { clientX: (at.x - CTM.e) / CTM.a, clientY: (at.y - CTM.f) / CTM.d };
}

function app(): HTMLElement {
  return required(document.querySelector<HTMLElement>('#app'));
}

function group(): Element {
  return required(app().querySelector('.hall-scene'));
}

/** The camera on the page now, read back off the group the way the browser sees it. */
function camera(): { scale: number; x: number; y: number } {
  const transform = group().getAttribute('transform') ?? '';
  const hit = /translate\(([-\d.]+),([-\d.]+)\) scale\(([\d.]+)\)/.exec(transform);
  const found = required(hit);
  return { x: Number(found[1]), y: Number(found[2]), scale: Number(found[3]) };
}

function wheel(at: { x: number; y: number }, deltaY: number): void {
  required(app().querySelector('.hall-view')).dispatchEvent(
    new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY, ...client(at) }),
  );
}

/** A real press: the pointer goes down on the button before the click, as it does in a browser. */
function press(selector: string): void {
  const button = required(app().querySelector<HTMLButtonElement>(selector));
  button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  button.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  button.click();
}

beforeAll(() => {
  document.body.innerHTML = '<div id="app"></div>';
  mount(app());
  required(app().querySelector<HTMLButtonElement>('[data-do="startGame"]')).click();
  // The hall cannot be set out on a stopped clock (CLAUDE.md T7 3.10).
  required(
    app().querySelector<HTMLButtonElement>('[data-do="setSpeed"][data-speed="1"]'),
  ).click();
  const state = required(currentState());
  Object.assign(state, buyStartingKit(state));
  render();
  stubCtm();
});

afterAll(() => {
  delete (SVGSVGElement.prototype as unknown as Record<string, unknown>).getScreenCTM;
  delete (SVGSVGElement.prototype as unknown as Record<string, unknown>).createSVGPoint;
});

beforeEach(() => {
  press('[data-do="zoomFit"]');
});

describe('the camera', () => {
  it('comes back to the fit on the Fit button, with the whole hall on the screen', () => {
    expect(camera()).toEqual({ scale: 1, x: 0, y: 0 });
    expect(group().getAttribute('transform')).toBe(
      cameraTransform({ scale: 1, x: 0, y: 0 }),
    );
  });

  it('zooms on the wheel, a step of 1.2 at a time, and no further than four times the fit', () => {
    const at = { x: 40, y: 20 };
    wheel(at, -1);
    expect(camera().scale).toBeCloseTo(HALL_ZOOM_STEP, 6);
    // Whatever was under the pointer is still under it.
    const first = camera();
    expect(at.x - first.x).toBeCloseTo(HALL_ZOOM_STEP * (at.x - 0), 6);
    for (let step = 0; step < 20; step += 1) wheel(at, -1);
    expect(camera().scale).toBe(HALL_ZOOM_MAX);
    for (let step = 0; step < 40; step += 1) wheel(at, 1);
    expect(camera().scale).toBe(HALL_ZOOM_MIN);
  });

  it('keeps the scene on the frame however far it is pushed', () => {
    wheel({ x: 0, y: 0 }, -1);
    wheel({ x: 0, y: 0 }, -1);
    const frame = hallLayerBox();
    const at = camera();
    const slack = 1 - at.scale;
    expect(at.x).toBeLessThanOrEqual(frame.x * slack + 0.001);
    expect(at.x).toBeGreaterThanOrEqual((frame.x + frame.width) * slack - 0.001);
    expect(at.y).toBeLessThanOrEqual(frame.y * slack + 0.001);
    expect(at.y).toBeGreaterThanOrEqual((frame.y + frame.height) * slack - 0.001);
  });

  it('comes back to the fit on the Fit button, and steps on the two others', () => {
    press('[data-do="zoomIn"]');
    expect(camera().scale).toBeCloseTo(HALL_ZOOM_STEP, 6);
    press('[data-do="zoomOut"]');
    expect(camera().scale).toBeCloseTo(1, 6);
    press('[data-do="zoomIn"]');
    press('[data-do="zoomIn"]');
    expect(camera().scale).toBeGreaterThan(1);
    press('[data-do="zoomFit"]');
    expect(camera()).toEqual({ scale: 1, x: 0, y: 0 });
  });

  it('is pushed about by dragging the empty floor, and only inside the frame', () => {
    press('[data-do="zoomIn"]');
    press('[data-do="zoomIn"]');
    const before = camera();
    const view = required(app().querySelector('.hall-view'));
    // A cell of open floor: no kit, no room block, nothing to pick up.
    const floor = tileToScreen(14, 8);
    const from = { x: before.scale * floor.x + before.x, y: before.scale * floor.y + before.y };
    view.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, ...client(from) }));
    window.dispatchEvent(
      new MouseEvent('mousemove', {
        bubbles: true,
        ...client({ x: from.x + 30, y: from.y + 18 }),
      }),
    );
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    const after = camera();
    expect(after.scale).toBe(before.scale);
    expect(after.x).toBeCloseTo(before.x + 30, 6);
    expect(after.y).toBeCloseTo(before.y + 18, 6);
  });

  it('does not move at the fit, because there is nowhere to push it', () => {
    const view = required(app().querySelector('.hall-view'));
    const floor = tileToScreen(14, 8);
    view.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, ...client(floor) }));
    window.dispatchEvent(
      new MouseEvent('mousemove', {
        bubbles: true,
        ...client({ x: floor.x + 60, y: floor.y + 30 }),
      }),
    );
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    expect(camera()).toEqual({ scale: 1, x: 0, y: 0 });
  });

  it('rebuilds nothing when it moves: the painting stays on the page', () => {
    const before = required(app().querySelector('[data-layer="hallBackground"]'));
    wheel({ x: 0, y: 0 }, -1);
    press('[data-do="zoomIn"]');
    expect(app().querySelector('[data-layer="hallBackground"]')).toBe(before);
  });
});

describe('what the player clicks at a zoom', () => {
  /** The middle of the face a room's door is in, in scene coordinates. */
  function frontFace(id: 'office' | 'canteen'): { x: number; y: number } {
    const room = roomById(id);
    return tileToScreen(room.x + room.width / 2, room.y + room.depth, ROOM_DOOR.height);
  }

  function clickAt(at: { x: number; y: number }): void {
    const on = camera();
    required(app().querySelector('.hall-view')).dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        ...client({ x: on.scale * at.x + on.x, y: on.scale * at.y + on.y }),
      }),
    );
  }

  function notes(): string {
    return Array.from(app().querySelectorAll('.view-note'))
      .map((element) => element.textContent ?? '')
      .join(' ');
  }

  it('resolves to the same room at 2x as at the fit', () => {
    clickAt(frontFace('canteen'));
    expect(notes()).toContain(roomById('canteen').tooltip);
    press('[data-do="zoomIn"]');
    press('[data-do="zoomIn"]');
    press('[data-do="zoomIn"]');
    press('[data-do="zoomIn"]');
    expect(camera().scale).toBeGreaterThan(2);
    clickAt(frontFace('canteen'));
    expect(notes()).toContain(roomById('canteen').tooltip);
    // And the office is still the office, from the same place on the screen.
    clickAt(frontFace('office'));
    expect(app().querySelector('.hall-view')).toBeNull();
    press('[data-do="setView"][data-view="hall"]');
    // Leaving the hall and coming back opens it where it always opens: a fifth past the fit,
    // with the middle of it in the middle of the frame (PIOTR; CLAUDE.md T10 3.9).
    expect(camera().scale).toBeCloseTo(HALL_ZOOM_START, 6);
    const opens = hallStartCamera(hallLayerBox());
    expect(camera().x).toBeCloseTo(opens.x, 1);
    expect(camera().y).toBeCloseTo(opens.y, 1);
  });
});

describe('setting the hall out at a zoom', () => {
  it('drops a machine on the cell under the pointer, whatever the camera is doing', () => {
    press('[data-do="startSetup"]');
    press('[data-do="zoomIn"]');
    press('[data-do="zoomIn"]');
    const state = required(currentState());
    const bench = required(state.equipment.find((item) => item.specId === 'workbench'));
    // A free corner of the hall: a bench reserves a 2 by 2 zone now (CLAUDE.md T7 3.3).
    const target = { x: 14, y: 4 };
    const on = camera();
    const mouse = (type: string, cell: { x: number; y: number }): MouseEvent => {
      const point = tileToScreen(cell.x + 0.25, cell.y + 0.25);
      return new MouseEvent(type, {
        bubbles: true,
        ...client({ x: on.scale * point.x + on.x, y: on.scale * point.y + on.y }),
      });
    };
    required(app().querySelector(`[data-kit="${bench.id}"]`)).dispatchEvent(
      mouse('mousedown', { x: bench.anchorX, y: bench.anchorY }),
    );
    window.dispatchEvent(mouse('mousemove', target));
    window.dispatchEvent(mouse('mouseup', target));
    const moved = required(
      required(currentState()).equipment.find((item) => item.id === bench.id),
    );
    expect({ x: moved.anchorX, y: moved.anchorY }).toEqual(target);
    press('[data-do="endSetup"]');
  });
});

describe('a double click', () => {
  it('brings the thing it landed on up to twice the fit, in the middle of the frame', () => {
    const state = required(currentState());
    const saw = required(state.equipment.find((item) => item.specId === 'tableSaw'));
    required(app().querySelector(`[data-kit="${saw.id}"]`)).dispatchEvent(
      new MouseEvent('dblclick', { bubbles: true, ...client({ x: 0, y: 0 }) }),
    );
    const on = camera();
    expect(on.scale).toBe(2);
    const frame = hallLayerBox();
    const centre = centreOf(saw.anchorX, saw.anchorY, 2, 1, 1);
    expect(on.scale * centre.x + on.x).toBeCloseTo(frame.x + frame.width / 2, 6);
    expect(on.scale * centre.y + on.y).toBeCloseTo(frame.y + frame.height / 2, 6);
  });
});

describe('what the camera does not do', () => {
  it('does not start a pan on a button that is not the left one', () => {
    press('[data-do="zoomIn"]');
    press('[data-do="zoomIn"]');
    const before = camera();
    const view = required(app().querySelector('.hall-view'));
    const floor = tileToScreen(14, 8);
    const from = { x: before.scale * floor.x + before.x, y: before.scale * floor.y + before.y };
    view.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, button: 2, ...client(from) }),
    );
    window.dispatchEvent(
      new MouseEvent('mousemove', { bubbles: true, ...client({ x: from.x + 40, y: from.y }) }),
    );
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    expect(camera()).toEqual(before);
    press('[data-do="zoomFit"]');
  });

  it('writes the transform and nothing else while the hall is pushed about', () => {
    press('[data-do="zoomIn"]');
    press('[data-do="zoomIn"]');
    const bar = required(app().querySelector('.topbar'));
    const view = required(app().querySelector('.hall-view'));
    const floor = tileToScreen(14, 8);
    const on = camera();
    const from = { x: on.scale * floor.x + on.x, y: on.scale * floor.y + on.y };
    view.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, ...client(from) }));
    window.dispatchEvent(
      new MouseEvent('mousemove', { bubbles: true, ...client({ x: from.x + 20, y: from.y }) }),
    );
    // The page under the pointer is not rebuilt: the same top bar element is still there, and so
    // is the same painting (CLAUDE.md T5 3.1).
    expect(app().querySelector('.topbar')).toBe(bar);
    expect(app().querySelector('.hall-view')).toBe(view);
    expect(camera().x).toBeCloseTo(on.x + 20, 6);
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    press('[data-do="zoomFit"]');
  });
});

describe('where the hall opens (CLAUDE.md T10 3.9)', () => {
  it('is a fifth past the fit, in the middle of the frame, on the way in', () => {
    // The Fit button is pressed before every test in this file, so the camera has to be sent back
    // in the way the player sends it: out of the hall and in again.
    press('[data-do="setView"][data-view="office"]');
    press('[data-do="setView"][data-view="hall"]');
    expect(camera().scale).toBeCloseTo(HALL_ZOOM_START, 6);
    expect(HALL_ZOOM_START).toBe(1.2);
    const frame = hallLayerBox();
    const opens = hallStartCamera(frame);
    expect(camera().x).toBeCloseTo(opens.x, 1);
    expect(camera().y).toBeCloseTo(opens.y, 1);
    // The middle of the hall is in the middle of the frame.
    const middle = { x: frame.x + frame.width / 2, y: frame.y + frame.height / 2 };
    const at = camera();
    expect(at.x + at.scale * middle.x).toBeCloseTo(middle.x, 1);
    expect(at.y + at.scale * middle.y).toBeCloseTo(middle.y, 1);
    // And it is still inside the two ends the wheel works between.
    expect(HALL_ZOOM_START).toBeGreaterThan(HALL_ZOOM_MIN);
    expect(HALL_ZOOM_START).toBeLessThan(HALL_ZOOM_MAX);
  });

  it('goes back to the fit on the Fit button and stays there', () => {
    press('[data-do="setView"][data-view="office"]');
    press('[data-do="setView"][data-view="hall"]');
    press('[data-do="zoomFit"]');
    expect(camera()).toEqual({ scale: 1, x: 0, y: 0 });
    render();
    expect(camera()).toEqual({ scale: 1, x: 0, y: 0 });
  });
});

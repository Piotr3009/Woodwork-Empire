// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { currentState, mount, render } from '../../src/ui/app';
import { canPlace } from '../../src/engine/layout';
import { tileToScreen } from '../../src/render/iso';
import { buyStartingKit } from '../helpers';

function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error('Missing test fixture');
  return value;
}

it('keeps equipment dragging on its tile when the scene is scaled and centred', () => {
  document.body.innerHTML = '<div id="app"></div>';
  const root = required(document.querySelector<HTMLElement>('#app'));
  mount(root);
  required(root.querySelector<HTMLButtonElement>('[data-do="startGame"]')).click();
  const state = required(currentState());
  Object.assign(state, buyStartingKit(state));
  render();
  const bench = required(state.equipment.find((item) => item.specId === 'workbench'));
  let target: { x: number; y: number } | null = null;
  for (let y = 0; y < state.unit.depthCells && target === null; y += 1) {
    for (let x = 0; x < state.unit.widthCells; x += 1) {
      if (x !== bench.anchorX && canPlace(state, bench.id, x, y).ok) {
        target = { x, y };
        break;
      }
    }
  }
  expect(target).not.toBeNull();
  // Browser CTM includes both uniform scale and the margins around the SVG artwork.
  Object.defineProperty(SVGSVGElement.prototype, 'getScreenCTM', {
    configurable: true,
    value: () => ({ inverse: () => ({ a: 0.5, d: 0.5, e: -150, f: -60 }) }),
  });
  Object.defineProperty(SVGSVGElement.prototype, 'createSVGPoint', {
    configurable: true,
    value: () => ({
      x: 0, y: 0,
      matrixTransform(matrix: { a: number; d: number; e: number; f: number }) {
        return { x: this.x * matrix.a + matrix.e, y: this.y * matrix.d + matrix.f };
      },
    }),
  });
  const mouse = (type: string, x: number, y: number): MouseEvent => {
    const point = tileToScreen(x + 0.25, y + 0.25);
    return new MouseEvent(type, {
      bubbles: true, clientX: point.x * 2 + 300, clientY: point.y * 2 + 120,
    });
  };
  required(root.querySelector<HTMLButtonElement>('[data-do="startSetup"]')).click();
  required(root.querySelector(`[data-kit="${bench.id}"]`))
    .dispatchEvent(mouse('mousedown', bench.anchorX, bench.anchorY));
  window.dispatchEvent(mouse('mousemove', required(target).x, required(target).y));
  window.dispatchEvent(mouse('mouseup', required(target).x, required(target).y));
  const moved = required(required(currentState()).equipment.find((item) => item.id === bench.id));
  expect({ x: moved.anchorX, y: moved.anchorY }).toEqual(target);
  delete (SVGSVGElement.prototype as unknown as Record<string, unknown>).getScreenCTM;
  delete (SVGSVGElement.prototype as unknown as Record<string, unknown>).createSVGPoint;
});

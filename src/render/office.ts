// The office desk, drawn from the state. Every object on it is a way into one modal, and nothing
// else is on the screen (CLAUDE.md 10.1).

import { has } from '../engine/machines';
import type { GameState } from '../engine/types';
import { box, escapeText, label, polygon } from './hall';
import { boxPolygons, centreOf, depthKey, footprintPolygon, gridBounds } from './iso';

interface DeskObject {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  depth: number;
  height: number;
  fill: string;
  shade: string;
  /** Shown but not usable yet, with the reason. */
  lockReason: string;
}

const ROOM_TILES = 12;

function deskObjects(state: GameState): DeskObject[] {
  const laptopLock = has(state, 'laptop') ? '' : 'Buy a laptop';
  const deskLock = has(state, 'desk') ? '' : 'Buy a desk';
  return [
    {
      id: 'desk',
      name: 'Desk',
      x: 3,
      y: 4,
      width: 5,
      depth: 3,
      height: 1,
      fill: 'var(--kit-furniture)',
      shade: 'var(--kit-furniture-dark)',
      lockReason: deskLock,
    },
    {
      id: 'laptop',
      name: 'Laptop',
      x: 4,
      y: 5,
      width: 2,
      depth: 1,
      height: 1,
      fill: 'var(--kit-tools)',
      shade: 'var(--kit-tools-dark)',
      lockReason: laptopLock,
    },
    {
      id: 'accounting',
      name: 'Accounting',
      x: 6,
      y: 5,
      width: 1,
      depth: 1,
      height: 1,
      fill: 'var(--kit-stock)',
      shade: 'var(--kit-stock-dark)',
      lockReason: laptopLock,
    },
    {
      id: 'materials',
      name: 'Materials',
      x: 1,
      y: 5,
      width: 1,
      depth: 2,
      height: 1,
      fill: 'var(--kit-bench)',
      shade: 'var(--kit-bench-dark)',
      lockReason: '',
    },
    {
      id: 'catalogue',
      name: 'Catalogue',
      x: 1,
      y: 2,
      width: 2,
      depth: 1,
      height: 1,
      fill: 'var(--kit-vehicle)',
      shade: 'var(--kit-vehicle-dark)',
      lockReason: '',
    },
    {
      id: 'hiring',
      name: 'Team board',
      x: 8,
      y: 0,
      width: 3,
      depth: 1,
      height: 3,
      fill: 'var(--room)',
      shade: 'var(--room-dark)',
      lockReason: '',
    },
    {
      id: 'phone',
      name: 'Phone',
      x: 7,
      y: 7,
      width: 1,
      depth: 1,
      height: 1,
      fill: 'var(--kit-welfare)',
      shade: 'var(--kit-welfare-dark)',
      lockReason: '',
    },
  ];
}

export function renderOffice(state: GameState): string {
  const bounds = gridBounds(ROOM_TILES, ROOM_TILES, 4);
  const pad = 24;
  const parts: string[] = [
    polygon(footprintPolygon(0, 0, ROOM_TILES, ROOM_TILES), 'var(--room-floor)'),
  ];
  const drawables = deskObjects(state)
    .map((object) => {
      const faces = boxPolygons(object.x, object.y, object.width, object.depth, object.height);
      const locked = object.lockReason !== '';
      const attrs =
        `data-office="${object.id}" class="clickable${locked ? ' locked' : ''}"` +
        (locked ? ` data-lock="${escapeText(object.lockReason)}"` : '');
      const text = locked ? `${object.name}: ${object.lockReason}` : object.name;
      return {
        depth: depthKey(object.x, object.y),
        svg:
          box(faces, locked ? 'var(--locked)' : object.fill, locked ? 'var(--locked-dark)' : object.shade, attrs) +
          label(
            centreOf(object.x, object.y, object.width, object.depth, object.height),
            text,
            attrs,
          ),
      };
    })
    .sort((left, right) => left.depth - right.depth);
  parts.push(drawables.map((drawable) => drawable.svg).join(''));
  const viewBox = [
    Math.round(bounds.minX - pad),
    Math.round(bounds.minY - pad),
    Math.round(bounds.width + pad * 2),
    Math.round(bounds.height + pad * 2),
  ].join(' ');
  return (
    `<svg class="office-view" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" ` +
    `role="img" aria-label="Office desk">${parts.join('')}</svg>` +
    `<p class="view-note">The desk. Everything on it opens something.</p>`
  );
}

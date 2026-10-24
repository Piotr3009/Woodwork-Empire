/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// @vitest-environment jsdom
// v121 [PIOTR, 19.10: "the houses disappear and blink like mad"]: when a figure has passed a machine
// since the last page and the order of the two has to change, the patcher moves the figure and
// never the machine. A machine taken out of the document and put back fetches and decodes its
// picture again; on a station of the house factory that is a blink the eye sees.

import { afterEach, describe, expect, it } from 'vitest';
import { patchInto } from '../../src/ui/patch';

const SVG = 'http://www.w3.org/2000/svg';

function layer(html: string): SVGGElement {
  const svg = document.createElementNS(SVG, 'svg');
  const group = document.createElementNS(SVG, 'g');
  svg.appendChild(group);
  document.body.appendChild(svg);
  patchInto(group, html);
  return group;
}

function kit(id: string): string {
  return `<g data-kit="${id}"><image href="${id}.png" x="0" y="0"></image></g>`;
}

function engineer(id: string): string {
  return `<g data-engineer="${id}" transform="translate(1,1)"></g>`;
}

function figure(id: string): string {
  return `<g class="figure" data-figure="${id}"></g>`;
}

function forklift(line: string): string {
  return `<g data-forklift="wait" data-forklift-line="${line}"></g>`;
}

/** Which nodes the patch took out of the document and put back. */
function moved(target: Node, work: () => void): string[] {
  const observer = new MutationObserver(() => undefined);
  observer.observe(target, { childList: true });
  work();
  const records = observer.takeRecords();
  observer.disconnect();
  const names: string[] = [];
  for (const record of records) {
    for (const node of Array.from(record.addedNodes)) {
      const element = node as Element;
      names.push(element.getAttribute('data-kit') ?? element.getAttribute('data-engineer') ?? element.getAttribute('data-figure') ?? element.getAttribute('data-forklift-line') ?? '?');
    }
  }
  return names;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('a figure past a machine (v121)', () => {
  it('moves the engineer and never the station when the two change places', () => {
    const group = layer(kit('station5') + engineer('1:4') + kit('station6'));
    const [station5, man, station6] = Array.from(group.children);
    // The engineer has walked past station 6: he is drawn after it now.
    const names = moved(group, () => patchInto(group, kit('station5') + kit('station6') + engineer('1:4')));
    expect(Array.from(group.children)).toEqual([station5, station6, man]);
    expect(names).toEqual(['1:4']);
    // And back again the other way.
    const back = moved(group, () => patchInto(group, engineer('1:4') + kit('station5') + kit('station6')));
    expect(Array.from(group.children)).toEqual([man, station5, station6]);
    expect(back).toEqual(['1:4']);
  });

  it('moves every kind of figure, a man and a forklift as an engineer, around the kit that stays', () => {
    const group = layer(kit('a') + figure('joe') + kit('b') + forklift('2') + kit('c') + engineer('2:1'));
    const kitNodes = Array.from(group.querySelectorAll('[data-kit]'));
    const names = moved(group, () => patchInto(group, engineer('2:1') + kit('a') + forklift('2') + kit('b') + kit('c') + figure('joe')));
    expect(Array.from(group.children).map((node) => node.getAttribute('data-kit') ?? node.getAttribute('data-figure') ?? node.getAttribute('data-forklift-line') ?? node.getAttribute('data-engineer'))).toEqual(
      ['2:1', 'a', '2', 'b', 'c', 'joe'],
    );
    expect(names.sort()).toEqual(['2', '2:1', 'joe']);
    expect(Array.from(group.querySelectorAll('[data-kit]'))).toEqual(kitNodes);
  });

  it('still moves a machine when the machines themselves change order, the figures put round them', () => {
    const group = layer(kit('a') + engineer('1:1') + kit('b') + kit('c'));
    const names = moved(group, () => patchInto(group, kit('c') + kit('a') + engineer('1:1') + kit('b')));
    expect(Array.from(group.children).map((node) => node.getAttribute('data-kit') ?? node.getAttribute('data-engineer'))).toEqual(['c', 'a', '1:1', 'b']);
    // One machine moved (c to the front), and nothing else: the engineer already stood where he
    // belongs, and from v126 a figure in his place is not taken out and put back.
    expect(names.sort()).toEqual(['c']);
  });
});

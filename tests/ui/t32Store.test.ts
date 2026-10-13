/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// @vitest-environment jsdom
// Turn 32, 2.5 and 2.7 on the page: the Materials page's three blocks, the job card's boards and
// glass with the one button, the line's running block with what its contract holds and no buttons,
// and the board's tile of a window (CLAUDE.md T32 2.7; docs/mockups/t32/).

import { describe, expect, it } from 'vitest';
import { LINE_MODULES } from '../../src/engine/constants';
import { lineState } from '../../src/engine/lineContract';
import { buyStock } from '../../src/engine/materials';
import type { GameState, Job } from '../../src/engine/index';
import { renderBoard } from '../../src/ui/board';
import { renderContracts } from '../../src/ui/contracts';
import { materialLine } from '../../src/ui/jobCard';
import { renderMaterials } from '../../src/ui/materials';
import { acceptNow, act, buyStartingKit, newGame, nextDay, placeEnquiry, placeEquipment, placeGlassRack, testJoiner, withAir } from '../helpers';

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

function text(node: Element | null | undefined): string {
  return (node?.textContent ?? '').trim();
}

/** The 200 m2 unit with the day one kit and a timber rack of 40 boards. */
function hall(): GameState {
  const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
  state.cash = 200000;
  state.reputation = 40;
  state.enquiries = [];
  placeEquipment(state, 'timberRack', { x: 14, y: 2, id: 'kit-timber' });
  return state;
}

function casement(state: GameState): { state: GameState; job: Job } {
  const enquiry = placeEnquiry(state, {
    templateId: 'casementWindows',
    name: 'Oak Lane',
    price: 9000,
    basePrice: 9000,
    finish: 'laminate',
    materialKind: 'solidWood',
    deadlineDays: 60,
  });
  const taken = acceptNow(state, enquiry.id);
  const job = taken.jobs.find((entry) => entry.name === 'Oak Lane');
  if (job === undefined) throw new Error('the window is taken');
  taken.tasks = taken.tasks.filter((task) => task.jobId !== job.id);
  return { state: taken, job };
}

describe('the Materials page s three blocks (CLAUDE.md T32 2.7)', () => {
  it('draws the sheets, the boards and the glass in the head row s markup, each with its own field and line', () => {
    const state = hall();
    placeGlassRack(state);
    const page = parse(renderMaterials(state, '', '60', ''));
    const heads = Array.from(page.querySelectorAll('.row.stock-head'));
    expect(heads.map((head) => head.getAttribute('data-stock-head'))).toEqual(['sheets', 'boards', 'glass']);
    expect(heads.map((head) => text(head.querySelector('.row-main')))).toEqual(['Sheets', 'Timber boards', 'Glass']);
    expect(Array.from(page.querySelectorAll('[data-field]')).map((field) => field.getAttribute('data-field'))).toEqual([
      'stockSheets',
      'stockBoards',
      'stockGlass',
    ]);
    const boards = page.querySelector('[data-stock-head="boards"]');
    // Sixty boards typed against the stores' forty: the ladder's line, the paid store's, the button.
    expect(text(boards?.querySelector('[data-ladder]'))).toBe('60 boards at £170 = £10,200');
    expect(text(boards?.querySelector('[data-storage]'))).toBe('60 boards: 40 on the stores, 20 to storage at £150');
    expect(boards?.querySelector('[data-do="restock"]')?.getAttribute('data-kind')).toBe('boards');
    expect(text(boards?.querySelector('[data-do="restock"]'))).toBe('Restock: 60 boards, £10,200');
    const glass = page.querySelector('[data-stock-head="glass"]');
    expect(glass?.querySelector('[data-field="stockGlass"]')?.getAttribute('placeholder')).toBe('40');
    expect(text(glass?.querySelector('[data-ladder]'))).toBe('40 glass units at £200 = £8,000');
    const lines = Array.from(page.querySelectorAll('.stock-line'));
    expect(lines.map((line) => line.getAttribute('data-stock'))).toEqual(['sheets', 'boards', 'glass']);
    expect(lines.map((line) => text(line.querySelector('.stock-name')))).toEqual(['MFC 18 mm, white', 'Timber boards', 'Sealed glass units']);
    expect(text(lines[1]?.querySelector('.stock-number'))).toMatch(/^TMB-63-RED-\d{3}$/);
    expect(text(lines[2]?.querySelector('.stock-number'))).toMatch(/^IGU-4-16-4-\d{3}$/);
    expect(lines[1]?.querySelector('[data-placeholder="thumb.solidWood"]')).not.toBeNull();
    expect(lines[2]?.querySelector('[data-placeholder="thumb.glass"]')).not.toBeNull();
    expect(text(lines[2]?.querySelector('.stock-total'))).toBe('Total 0 of 40');
  });

  it('shows the glass only once it has a rack or glass of its own, and refuses its Restock with no rack', () => {
    const state = hall();
    expect(parse(renderMaterials(state, '')).querySelector('[data-stock-head="glass"]')).toBeNull();
    expect(buyStock(state, 'glass', 7)).toBe(true);
    const page = parse(renderMaterials(state, ''));
    const locked = page.querySelector('[data-stock-head="glass"] button[disabled]');
    expect(text(locked)).toBe('Restock');
    expect(locked?.getAttribute('title')).toBe('No glass rack');
    expect(text(page.querySelector('[data-stock="glass"] .stock-total'))).toBe('Total 0 of 0');
    expect(page.textContent).toContain('7 glass units');
  });

  it('names every kind in the paid store in its one hint', () => {
    const state = hall();
    state.stock.tempStorageSheets = 12;
    state.stock.tempStorageBoards = 30;
    state.stock.tempStorageGlass = 5;
    expect(parse(renderMaterials(state, '')).querySelector('.hint')?.textContent).toBe(
      '12 sheets, 30 boards and 5 glass units are in paid storage.',
    );
  });
});

describe('the job card s material line of a window (CLAUDE.md T32 2.7)', () => {
  it('says both in hand in the boards classes, with no button', () => {
    const start = hall();
    placeGlassRack(start);
    start.stock.boards = 12;
    start.stock.glass = 7;
    const { state, job } = casement(start);
    const line = parse(materialLine(state, job));
    expect(text(line.querySelector('.sheets-reserved:not([data-glass])'))).toBe('12 of 12 boards of timber in hand');
    expect(text(line.querySelector('[data-glass="1"].good.sheets-reserved'))).toBe('7 of 7 glass units in hand');
    expect(line.querySelector('button')).toBeNull();
    expect(line.textContent).not.toContain('the racks hold sheets');
  });

  it('says both short in red, with the one Order for this job and the sum of the two', () => {
    const start = hall();
    placeGlassRack(start);
    start.stock.boards = 7;
    start.stock.glass = 4;
    const { state, job } = casement(start);
    const line = parse(materialLine(state, job));
    expect(text(line.querySelector('.shortfall:not([data-glass])'))).toBe('5 of 12 boards of timber short');
    expect(text(line.querySelector('[data-glass="1"].bad.shortfall'))).toBe('3 of 7 glass units short');
    const buttons = Array.from(line.querySelectorAll('button'));
    expect(buttons.map((button) => text(button))).toEqual(['Order for this job, £1,600']);
  });
});

describe('the line s running block and the board s tile (CLAUDE.md T32 2.5, 2.7)', () => {
  it('says what the contract holds of the stores, and has no buttons and no reasons under them', () => {
    let state = newGame({ difficulty: 'veryEasy' });
    state.cash = 9000000;
    state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
    state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'second' }));
    state = withAir(buyStartingKit(state), 'industrial');
    LINE_MODULES.forEach((id, index) => placeEquipment(state, id, { x: 2 + 6 * index, y: 14, id: `kit-line-${index + 1}` }));
    for (const id of ['eng-1', 'eng-2']) {
      state.workers.push({ ...testJoiner(id, id), role: 'lineEngineer', tier: null, rate: 0, monthlyWage: 15000 });
    }
    lineState(state, 1).contract = {
      status: 'active',
      startDay: state.clock.day,
      windowsThisWeek: 8,
      weekStartDay: state.clock.day,
      windowsMade: 8,
      revenue: 12000,
      materialCost: 4800,
      boardsReserved: 24,
      glassReserved: 8,
    };
    state.stock.boards = 24;
    state.stock.glass = 8;
    const block = parse(renderContracts(state)).querySelector('[data-line-contract="1"]');
    expect(block?.querySelector('.figures')?.textContent).toContain('the timber and the glass £600 a window, from the stores');
    const rows = Array.from(block?.querySelectorAll('.row') ?? []).map((row) => [text(row.querySelector('.row-main')), text(row.querySelector('.row-figure'))]);
    expect(rows).toEqual(expect.arrayContaining([['Timber held', '24 boards, for 12 windows'], ['Glass held', 'for 8 windows']]));
    expect(block?.querySelector('[data-do="orderLineTimber"], [data-do="orderLineGlass"], p.lock')).toBeNull();
    expect(Array.from(block?.querySelectorAll('button') ?? []).map((button) => text(button))).toEqual(['End it']);
  });

  it('gives a window s tile its boards and glass units, and no red line of the stores', () => {
    const state = hall();
    placeEnquiry(state, {
      templateId: 'casementWindows',
      name: 'Oak Lane',
      price: 9000,
      basePrice: 9000,
      finish: 'laminate',
      materialKind: 'solidWood',
      deadlineDays: 60,
    });
    const tile = parse(renderBoard(state, '')).querySelector('[data-enquiry]');
    expect(tile?.textContent).toContain('12 boards and 7 glass units of material');
    expect(tile?.querySelector('[data-stores]')).toBeNull();
  });
});

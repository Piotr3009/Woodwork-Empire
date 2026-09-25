// The mark over a man's head, drawn (PIOTR, 19.09; docs/mockups/t22/bubbles-v2.png, the red column
// and the hover column; CLAUDE.md T22 2.5). The words are `tests/engine/bubbles.test.ts`; what is
// asserted here is the drawing: a 14 px disc with an exclamation in it over the four men something
// is wrong with, nothing at all over the men nothing is wrong with, two marks over one cell side by
// side, the words that come up on the hover, and all of it at x10 and x30 as well as at x1. From
// v53 one mark is drawn over a machine and not a man: the first saw with places, while the crew is
// more men than the saws have places for (PIOTR, 24.09; v53).

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { bubbleFor } from '../../src/engine/bubbles';
import { WAITING_FOR_MATERIAL, planPlaces } from '../../src/engine/production';
import { STATION_OFFICE } from '../../src/engine/stations';
import { placeShortages, shortageLine } from '../../src/engine/machines';
import { drawContract } from '../../src/engine/contracts';
import { roomDoorCell } from '../../src/engine/constants';
import { CAPSULE_HEAD_TOP, markArt, renderHall } from '../../src/render/hall';
import type { GameState } from '../../src/engine/index';
import {
  act,
  buyStartingKit,
  newGame,
  runClock,
  sixJoinersOnSheetWork, withOnlyCuttingLeft } from '../helpers';

const CSS = readFileSync('src/ui/styles.css', 'utf8');

/** The body of one rule of the stylesheet, by its selector: the reading `tests/ui/skinPaint.test.ts`
 *  takes of the same file, because a hover cannot be dispatched and the rule is the contract. */
function ruleBody(selector: string): string {
  const at = CSS.indexOf(`${selector} {`);
  if (at < 0) throw new Error(`no rule for ${selector}`);
  const open = CSS.indexOf('{', at);
  return CSS.slice(open + 1, CSS.indexOf('}', open));
}

/** The whole group of one figure, out of the hall's markup: the opening tag to its own matching
 *  close, so what is asserted is that man and nothing that stands near him. */
function groupOf(svg: string, figure: string): string {
  const at = svg.indexOf(`data-figure="${figure}"`);
  if (at < 0) throw new Error(`${figure} is not on the hall`);
  const from = svg.lastIndexOf('<g ', at);
  let depth = 0;
  for (let index = from; index < svg.length; index += 1) {
    if (svg.startsWith('<g ', index) || svg.startsWith('<g>', index)) depth += 1;
    else if (svg.startsWith('</g>', index)) {
      depth -= 1;
      if (depth === 0) return svg.slice(from, index + 4);
    }
  }
  throw new Error(`${figure} has no end`);
}

/** Three men on one job at its cutting stage, a budget saw of one place and the day one kit's one
 *  bench, the five other benches taken out: the saw and that bench are every place the hall has.
 *  Nobody waits for the saw, so one man cuts, the second takes the bench, and the third and the
 *  three men on the other jobs stand with every place taken (CLAUDE.md T25 2.3; PIOTR, 24.09;
 *  v53). Until v53 the one saw alone stood the second man. */
function everyPlaceTaken(): GameState {
  let state = sixJoinersOnSheetWork({ saws: 1, sawVariant: 'budget' });
  const first = state.jobs[0];
  if (!first) throw new Error('a job is wanted');
  state = act(state, { type: 'ADD_TO_JOB', jobId: first.id, workerId: 'staff-2' });
  state = act(state, { type: 'ADD_TO_JOB', jobId: first.id, workerId: 'staff-3' });
  const kit = state.equipment.find((item) => item.specId === 'workbench');
  state.equipment = state.equipment.filter((item) => item.specId !== 'workbench' || item === kit);
  const job = state.jobs.find((entry) => entry.id === first.id);
  if (!job) throw new Error('the job went missing');
  job.labourRemaining = job.labourValue * 0.95;
  job.stageLabour = {};
  withOnlyCuttingLeft(state);
  planPlaces(state);
  return state;
}

/** So many men taken off their jobs and put on one standing contract whose rack has no sheets
 *  for it: every one of them stands at the canteen door with the contract's mark, which is one
 *  cell and one point over the hall for all of them [PIOTR, 22.09] (CLAUDE.md T24 2.3). Until v52
 *  the men with no place at a machine shared its waiting cell, or the home cell of one bench; from
 *  v52 each has his own place at his bench (CLAUDE.md T25 2.6), and the door is where marks still
 *  meet. */
function atTheDoor(men: string[]): GameState {
  let state = sixJoinersOnSheetWork({ saws: 1, sawVariant: 'budget' });
  const contract = drawContract(state);
  contract.pieceId = 'cutSheetPack';
  contract.status = 'offered';
  state.contracts = [contract];
  state = act(state, { type: 'ACCEPT_CONTRACT', contractId: contract.id });
  for (const who of men) {
    state = act(state, { type: 'ASSIGN_CONTRACT', contractId: contract.id, workerId: who, on: true });
  }
  state.stock.sheets = 0;
  return runClock(state, 2);
}

/** Two men at the door: two marks over one cell. */
function twoJobsAtOneSaw(): GameState {
  return atTheDoor(['staff-2', 'staff-3']);
}

/** Three men at the door: three marks over one point of the hall, the case CLAUDE.md T22 2.5
 *  names in its own words ("two marks over two men at one machine"). */
function threeJobsAtOneSaw(): GameState {
  return atTheDoor(['staff-2', 'staff-3', 'staff-4']);
}

/** The mark drawn over one man, or '' when the hall drew him none. */
function markOver(svg: string, figure: string): string {
  const group = groupOf(svg, figure);
  const at = group.indexOf('<g class="mark"');
  return at < 0 ? '' : group.slice(at);
}

describe('a mark only where something is wrong (CLAUDE.md T22 2.5)', () => {
  it('draws the disc with its exclamation over each of the five things the player can put right', () => {
    const waiting = everyPlaceTaken();
    const svg = renderHall(waiting);
    // Every man with every place he could take taken says so, and names no machine
    // (CLAUDE.md T25 2.3; PIOTR, 24.09; v53).
    for (const [who, key, words] of [
      ['worker-staff-3', 'noPlace', 'no free machines'],
      ['worker-staff-4', 'noPlace', 'no free machines'],
    ] as const) {
      const mark = markOver(svg, who);
      expect(mark, who).toContain(`data-bubble="${key}"`);
      expect(mark, who).toContain('class="mark-disc"');
      expect(mark, who).toContain('>!</text>');
      expect(mark, who).toContain(`<div class="bubble">${words}</div>`);
    }
    // The rack has nothing for the job: every man on it says so, the man at the saw included.
    const job = waiting.jobs[0];
    if (!job) throw new Error('a job is wanted');
    job.blockedBy = WAITING_FOR_MATERIAL;
    const dry = markOver(renderHall(waiting), 'worker-staff-1');
    expect(dry).toContain('data-bubble="noMaterial"');
    expect(dry).toContain(`<div class="bubble">no sheets for ${job.name}</div>`);
    // And a man on no job at all. With no production manager on duty nobody takes one by himself,
    // so he is waiting for the boss's click and the mark says so (CLAUDE.md T23 2.1).
    const loose = twoJobsAtOneSaw();
    const five = loose.jobs.find((entry) => entry.assignees.includes('staff-5'));
    if (five) five.assignees = five.assignees.filter((who) => who !== 'staff-5');
    const man = loose.workers.find((worker) => worker.id === 'staff-5');
    if (man) man.jobId = null;
    const idle = markOver(renderHall(loose), 'worker-staff-5');
    expect(idle).toContain('data-bubble="waitingForBoss"');
    expect(idle).toContain('<div class="bubble">waiting for the boss</div>');
  });

  it('draws nothing at all over a man who is working', () => {
    const state = everyPlaceTaken();
    expect(bubbleFor(state, 'staff-1')).toBeNull();
    expect(markOver(renderHall(state), 'worker-staff-1')).toBe('');
    // Nor over the second man on the job, who works it at the bench and waits for no saw
    // (PIOTR, 24.09; v53).
    expect(bubbleFor(state, 'staff-2')).toBeNull();
    expect(markOver(renderHall(state), 'worker-staff-2')).toBe('');
  });

  it('draws nothing at all over a helper sweeping the floor', () => {
    const state = everyPlaceTaken();
    const worker = state.workers.find((entry) => entry.id === 'staff-4');
    if (!worker) throw new Error('a man is wanted');
    worker.jobId = null;
    for (const job of state.jobs) {
      job.assignees = job.assignees.filter((man) => man !== worker.id);
    }
    state.tasks.push({
      id: 'task-sweep',
      kind: 'cleaning',
      category: 'workshop',
      label: 'Sweep the floor',
      minutesTotal: 30,
      minutesRemaining: 30,
      jobId: null,
      equipmentId: null,
      deliveryId: null,
      orderIds: [],
      day: state.clock.day,
      done: false,
      doneDay: null,
      doneBy: worker.id,
      orders: [],
    });
    worker.taskId = 'task-sweep';
    expect(bubbleFor(state, worker.id)).toBeNull();
    expect(markOver(renderHall(state), `worker-${worker.id}`)).toBe('');
  });

  it('draws nothing anywhere while the hall is at its dinner', () => {
    const state = runClock(sixJoinersOnSheetWork({ saws: 1 }), 250);
    const svg = renderHall(state);
    // They are behind the canteen door and nothing is drawn after them: no mark at the door, and
    // no group of words standing on an empty cell either (CLAUDE.md T21 2.12, T22 2.5). Nothing is
    // marked while the hall is at its dinner, a machine no more than a man (PIOTR, 24.09; v53),
    // and from v54 the saw is not even short: the crew it is counted against is the men at work,
    // and at dinner that is nobody (PIOTR, 24.09).
    expect(placeShortages(state)).toHaveLength(0);
    expect(svg).not.toContain('data-machine-mark');
    expect(svg).not.toContain('class="mark"');
    expect(svg).not.toContain('data-away-door');
    for (const worker of state.workers) expect(bubbleFor(state, worker.id), worker.id).toBeNull();
  });

  it('draws nothing at the office door for a man in the office', () => {
    const state = buyStartingKit(newGame());
    state.owner.station = STATION_OFFICE;
    const svg = renderHall(state);
    expect(bubbleFor(state, 'owner')).toBeNull();
    expect(svg).not.toContain('data-figure="owner"');
    expect(svg).not.toContain('class="mark"');
    expect(svg).not.toContain('data-away-door');
  });
});

describe('two marks over one cell (CLAUDE.md T22 2.5)', () => {
  it('stands two men at the canteen door on cells of their own, and no mark steps aside', () => {
    const state = twoJobsAtOneSaw();
    const svg = renderHall(state);
    // Two men on a contract with no sheets, at the canteen door. Until v54 they stood on the one
    // cell and the second mark stepped aside, and their names were drawn over each other; they
    // stand side by side now, the first on the door's own cell [PIOTR, 24.09] (v54).
    const first = groupOf(svg, 'worker-staff-2');
    const second = groupOf(svg, 'worker-staff-3');
    const cellOf = (group: string): string => group.match(/data-cell="([^"]*)"/)?.[1] ?? '';
    expect(cellOf(first)).not.toBe('');
    expect(cellOf(second)).not.toBe('');
    expect(cellOf(second)).not.toBe(cellOf(first));
    // Both in front of the door, within two cells of it.
    const door = roomDoorCell('canteen');
    for (const cell of [cellOf(first), cellOf(second)]) {
      const [x, y] = cell.split(',').map(Number);
      expect(Math.abs((x ?? 99) - door.x), cell).toBeLessThanOrEqual(2);
      expect(Math.abs((y ?? 99) - door.y), cell).toBeLessThanOrEqual(2);
    }
    expect(markOver(svg, 'worker-staff-2')).toContain('data-bubble-for="staff-2">');
    expect(markOver(svg, 'worker-staff-3')).toContain('data-bubble-for="staff-3">');
    expect(markOver(svg, 'worker-staff-3')).not.toContain('transform="translate(7,0)"');
  });

  it('stands three men at the door on three cells, so no two discs are ever drawn together', () => {
    // Three men on a contract with no sheets, at the canteen door: three cells in front of it, one
    // each, and every mark over its own man's head (v54). Until v54 it was one cell and the marks
    // stepped aside by `step` and by twice it.
    const svg = renderHall(threeJobsAtOneSaw());
    const cells: string[] = [];
    for (const piece of svg.split('data-figure="').slice(1)) {
      const who = piece.slice(0, piece.indexOf('"')).replace(/^worker-/, '');
      const cell = piece.match(/data-cell="([^"]*)"/)?.[1] ?? '';
      const own = new RegExp(`<g class="mark" data-bubble="[^"]*" data-bubble-for="${who}"`).exec(piece);
      if (cell === '' || own === null || !['staff-2', 'staff-3', 'staff-4'].includes(who)) continue;
      cells.push(cell);
      expect(piece.slice(own.index, own.index + 200), who).not.toMatch(/transform="translate\(\d+,0\)"/);
    }
    expect(cells).toHaveLength(3);
    expect(new Set(cells).size).toBe(3);
  });

  it('hangs every disc over the head of whichever man was drawn', () => {
    const svg = renderHall(everyPlaceTaken());
    const mark = markOver(svg, 'worker-staff-3');
    // The capsule's own crown, six pixels of gap, the tail and then the disc: the tail's point is
    // over his head and the disc is over the tail.
    const centre = Number(/<circle class="mark-disc" cx="0" cy="(-?[\d.]+)"/.exec(mark)?.[1] ?? '0');
    expect(centre).toBeLessThan(CAPSULE_HEAD_TOP);
    // The words hang above the disc, which is above the head.
    const line = Number(/<foreignObject class="mark-line" x="-?\d+" y="(-?\d+)"/.exec(mark)?.[1] ?? '0');
    expect(line).toBeLessThan(centre);
  });
});

describe('the words on the hover (CLAUDE.md T22 2.5)', () => {
  it('keeps the paper in the DOM beside the disc and lets the stylesheet bring it up', () => {
    const mark = markOver(renderHall(everyPlaceTaken()), 'worker-staff-3');
    expect(mark).toContain('class="mark-line"');
    expect(mark).toContain('<div class="bubble">no free machines</div>');
    // Hidden until the pointer is on the figure, and the figure group is where the rule hangs, so
    // pointing at the disc and pointing at the man are the one hover. No JavaScript at all.
    expect(ruleBody('.mark-line')).toContain('visibility: hidden');
    expect(ruleBody('.figure:hover .mark-line')).toContain('visibility: visible');
  });

  it('lets the disc be pointed at and the paper eat nothing', () => {
    const mark = markOver(renderHall(everyPlaceTaken()), 'worker-staff-3');
    // The disc takes the mouse; the paper takes none, so it cannot eat a click meant for the hall.
    expect(ruleBody('.mark')).toContain('pointer-events: auto');
    expect(mark).toContain('pointer-events="none"');
    expect(mark).toContain('overflow="visible"');
    // The hover line of Turn 11 is still the group's own title and is not the mark's.
    const group = groupOf(renderHall(everyPlaceTaken()), 'worker-staff-3');
    expect(group).toContain('<title>');
    expect(mark).not.toContain('data-character');
  });

  it('draws the discs and the words at x10 and x30, where the old paper bubbles came down', () => {
    for (const speed of [1, 4, 10, 30] as const) {
      const fast = act(everyPlaceTaken(), { type: 'SET_SPEED', speed });
      const mark = markOver(renderHall(fast), 'worker-staff-3');
      expect(mark, String(speed)).toContain('class="mark-disc"');
      expect(mark, String(speed)).toContain('<div class="bubble">no free machines</div>');
    }
  });
});

describe('the mark over a machine (PIOTR, 24.09; v53)', () => {
  it('draws the mark over the saw while the crew is more than its places, with its line on the hover, and none at dinner', () => {
    // Six joiners at work, one budget saw, which keeps two men busy (v55): six men for two [PIOTR,
    // 24.09: "an exclamation at the saw"]. Nobody waits for it, and the mark is drawn over the
    // machine that is short, not over a man. The owner is on nothing, so from v54 he is not
    // counted: the crew is the men whose work goes through the saw (PIOTR, 24.09).
    const state = sixJoinersOnSheetWork({ saws: 1, sawVariant: 'budget' });
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    if (saw === undefined) throw new Error('the saw is wanted');
    const words = shortageLine(state, 'tableSaw');
    expect(words).toBe('Too few saws for the crew: 6 men, capacity 2, 4 work at 67%');
    const svg = renderHall(state);
    expect(svg.match(/data-machine-mark="/g)).toHaveLength(1);
    // Inside the saw's own group: the last machine group opened before the mark is the saw's.
    const at = svg.indexOf(`<g data-machine-mark="${saw.id}"`);
    expect(at).toBeGreaterThan(-1);
    const kitAt = svg.slice(0, at).lastIndexOf('data-kit="');
    expect(svg.slice(kitAt, kitAt + `data-kit="${saw.id}"`.length)).toBe(`data-kit="${saw.id}"`);
    // The same mark a man wears, the disc and its words, with the saw's line on the paper.
    const mark = svg.slice(at, svg.indexOf('</foreignObject>', at));
    expect(mark).toContain(`<g class="mark" data-bubble="tooFewPlaces" data-bubble-for="${saw.id}">`);
    expect(mark).toContain('class="mark-disc"');
    expect(mark).toContain('>!</text>');
    expect(mark).toContain(`<div class="bubble">${words}</div>`);
    // The saw's hover line carries the same words, after its places: the second man's, whose
    // turn the saw is in the first half hour (v55).
    const title = svg.slice(svg.indexOf('<title>', kitAt), svg.indexOf('</title>', kitAt));
    expect(title).toContain(`Places: 1 of 1 in use, Joiner 2. ${words}.`);
    // No man's mark is touched by it: the marks over men are the men's own, and here that is the
    // owner, who is on nothing.
    const men = (svg.match(/data-bubble-for="[^"]*"/g) ?? []).filter(
      (hit) => hit !== `data-bubble-for="${saw.id}"`,
    );
    expect(men).toEqual(['data-bubble-for="owner"']);
    // At the dinner hour nobody is at work, so the saw is short of nobody and nothing is marked
    // (CLAUDE.md T22 2.5; v54).
    const dinner = runClock(state, 250);
    expect(shortageLine(dinner, 'tableSaw')).toBe('');
    expect(renderHall(dinner)).not.toContain('data-machine-mark');
  });

  it('wears it on the first saw with places, and moves it to the next while the first is down', () => {
    // Two budget saws, a place each and two men's capacity each, for six men at work: the one
    // bought first is the one filled first and the one marked. Broken, it has no places and no
    // capacity, and the mark goes to the other (v55).
    const state = sixJoinersOnSheetWork({ saws: 2, sawVariant: 'budget' });
    const [first, second] = state.equipment.filter((item) => item.specId === 'tableSaw');
    if (first === undefined || second === undefined) throw new Error('two saws are wanted');
    expect(renderHall(state).match(/data-machine-mark="[^"]*"/g)).toEqual([
      `data-machine-mark="${first.id}"`,
    ]);
    expect(shortageLine(state, 'tableSaw')).toBe('Too few saws for the crew: 6 men, capacity 4, 2 work at 67%');
    first.broken = true;
    expect(renderHall(state).match(/data-machine-mark="[^"]*"/g)).toEqual([
      `data-machine-mark="${second.id}"`,
    ]);
    expect(shortageLine(state, 'tableSaw')).toBe('Too few saws for the crew: 6 men, capacity 2, 4 work at 67%');
  });
});

describe('the mark itself', () => {
  it('escapes what it is handed and carries the man it belongs to', () => {
    const drawn = markArt(
      { who: 'worker-staff-1', key: 'noMaterial', text: 'no sheets for <Bob & Sons>' },
      CAPSULE_HEAD_TOP,
    );
    expect(drawn).toContain('data-bubble-for="worker-staff-1"');
    expect(drawn).toContain('&lt;Bob &amp; Sons&gt;');
    expect(drawn).not.toContain('<Bob');
  });
});

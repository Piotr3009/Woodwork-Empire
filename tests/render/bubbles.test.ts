// The mark over a man's head, drawn (PIOTR, 19.09; docs/mockups/t22/bubbles-v2.png, the red column
// and the hover column; CLAUDE.md T22 2.5). The words are `tests/engine/bubbles.test.ts`; what is
// asserted here is the drawing: a 14 px disc with an exclamation in it over the four men something
// is wrong with, nothing at all over the men nothing is wrong with, two marks over one cell side by
// side, the words that come up on the hover, and all of it at x10 and x30 as well as at x1.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { bubbleFor } from '../../src/engine/bubbles';
import { WAITING_FOR_MATERIAL } from '../../src/engine/production';
import { STATION_OFFICE } from '../../src/engine/stations';
import { CAPSULE_HEAD_TOP, markArt, renderHall } from '../../src/render/hall';
import type { GameState } from '../../src/engine/index';
import {
  act,
  buyStartingKit,
  newGame,
  runClock,
  sixJoinersOnSheetWork,
} from '../helpers';

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

/** Three men on one job at its cutting stage with one saw, the first of them standing at it, so one
 *  man is cutting, one is waiting for the saw and one has no cut parts yet. */
function queueAtTheSaw(): GameState {
  let state = sixJoinersOnSheetWork({ saws: 1 });
  const first = state.jobs[0];
  if (!first) throw new Error('a job is wanted');
  state = act(state, { type: 'ADD_TO_JOB', jobId: first.id, workerId: 'staff-2' });
  state = act(state, { type: 'ADD_TO_JOB', jobId: first.id, workerId: 'staff-3' });
  const job = state.jobs.find((entry) => entry.id === first.id);
  if (!job) throw new Error('the job went missing');
  job.labourRemaining = job.labourValue * 0.95;
  const saw = state.equipment.find((item) => item.specId === 'tableSaw');
  if (!saw) throw new Error('one saw is wanted');
  saw.takenBy = 'staff-1';
  return state;
}

/** Two jobs at their cutting stage with one saw between them, played two minutes so the engine has
 *  put every man at his own station: the two men who cannot have the saw stand at its one waiting
 *  cell, which is where two marks would be drawn on top of each other. */
function twoJobsAtOneSaw(): GameState {
  let state = sixJoinersOnSheetWork({ saws: 1 });
  const [first, second] = state.jobs;
  if (!first || !second) throw new Error('two jobs are wanted');
  state = act(state, { type: 'ADD_TO_JOB', jobId: first.id, workerId: 'staff-3' });
  state = act(state, { type: 'ADD_TO_JOB', jobId: second.id, workerId: 'staff-4' });
  const keep = [first.id, second.id];
  state.jobs = state.jobs.filter((job) => keep.includes(job.id));
  for (const worker of state.workers) {
    if (worker.jobId !== null && !keep.includes(worker.jobId)) worker.jobId = null;
  }
  for (const job of state.jobs) job.labourRemaining = job.labourValue * 0.95;
  return runClock(state, 2);
}

/** The mark drawn over one man, or '' when the hall drew him none. */
function markOver(svg: string, figure: string): string {
  const group = groupOf(svg, figure);
  const at = group.indexOf('<g class="mark"');
  return at < 0 ? '' : group.slice(at);
}

describe('a mark only where something is wrong (CLAUDE.md T22 2.5)', () => {
  it('draws the disc with its exclamation over each of the five things the player can put right', () => {
    const waiting = queueAtTheSaw();
    const svg = renderHall(waiting);
    // The first man of the queue is waiting for the machine; the man behind him is short of the
    // parts it has not cut yet.
    for (const [who, key, words] of [
      ['worker-staff-2', 'waitingForMachine', 'waiting for the saw'],
      ['worker-staff-3', 'noCutParts', 'no cut parts yet'],
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
    const idle = markOver(renderHall(twoJobsAtOneSaw()), 'worker-staff-5');
    expect(idle).toContain('data-bubble="waitingForBoss"');
    expect(idle).toContain('<div class="bubble">waiting for the boss</div>');
  });

  it('draws nothing at all over a man who is working', () => {
    const state = queueAtTheSaw();
    expect(bubbleFor(state, 'staff-1')).toBeNull();
    expect(markOver(renderHall(state), 'worker-staff-1')).toBe('');
  });

  it('draws nothing at all over a helper sweeping the floor', () => {
    const state = queueAtTheSaw();
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
    // no group of words standing on an empty cell either (CLAUDE.md T21 2.12, T22 2.5).
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
  it('stands them side by side and never one on top of the other', () => {
    const state = twoJobsAtOneSaw();
    const svg = renderHall(state);
    // Two men off two jobs at the one saw's waiting cell: the same cell, so the same point over the
    // hall, and the second mark steps aside.
    const first = groupOf(svg, 'worker-staff-2');
    const second = groupOf(svg, 'worker-staff-3');
    expect(first).toContain('data-cell="5,2"');
    expect(second).toContain('data-cell="5,2"');
    expect(markOver(svg, 'worker-staff-2')).toContain('data-bubble-for="staff-2">');
    expect(markOver(svg, 'worker-staff-3')).toContain('transform="translate(7,0)"');
    // And the third mark over one cell steps twice as far: three idle men at the canteen door.
    expect(markOver(svg, 'worker-staff-5')).toContain('data-bubble-for="staff-5">');
    expect(markOver(svg, 'worker-staff-6')).toContain('transform="translate(7,0)"');
    expect(markOver(svg, 'owner')).toContain('transform="translate(14,0)"');
  });

  it('hangs every disc over the head of whichever man was drawn', () => {
    const svg = renderHall(queueAtTheSaw());
    const mark = markOver(svg, 'worker-staff-2');
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
    const mark = markOver(renderHall(queueAtTheSaw()), 'worker-staff-2');
    expect(mark).toContain('class="mark-line"');
    expect(mark).toContain('<div class="bubble">waiting for the saw</div>');
    // Hidden until the pointer is on the figure, and the figure group is where the rule hangs, so
    // pointing at the disc and pointing at the man are the one hover. No JavaScript at all.
    expect(ruleBody('.mark-line')).toContain('visibility: hidden');
    expect(ruleBody('.figure:hover .mark-line')).toContain('visibility: visible');
  });

  it('lets the disc be pointed at and the paper eat nothing', () => {
    const mark = markOver(renderHall(queueAtTheSaw()), 'worker-staff-2');
    // The disc takes the mouse; the paper takes none, so it cannot eat a click meant for the hall.
    expect(ruleBody('.mark')).toContain('pointer-events: auto');
    expect(mark).toContain('pointer-events="none"');
    expect(mark).toContain('overflow="visible"');
    // The hover line of Turn 11 is still the group's own title and is not the mark's.
    const group = groupOf(renderHall(queueAtTheSaw()), 'worker-staff-2');
    expect(group).toContain('<title>');
    expect(mark).not.toContain('data-character');
  });

  it('draws the discs and the words at x10 and x30, where the old paper bubbles came down', () => {
    for (const speed of [1, 4, 10, 30] as const) {
      const fast = act(queueAtTheSaw(), { type: 'SET_SPEED', speed });
      const mark = markOver(renderHall(fast), 'worker-staff-2');
      expect(mark, String(speed)).toContain('class="mark-disc"');
      expect(mark, String(speed)).toContain('<div class="bubble">waiting for the saw</div>');
    }
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

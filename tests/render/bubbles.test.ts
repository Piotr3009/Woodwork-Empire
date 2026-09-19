// The bubble over a man's head, drawn (PIOTR, 19.09; docs/mockups/t21/bubbles.html;
// CLAUDE.md T21 2.6). The words are `tests/engine/bubbles.test.ts`; what is asserted here is the
// paper: the four colours of the drawing, where the box hangs, that it is a child of the figure's own
// group so the walker carries it, that a paper bubble comes down after three real seconds, and that
// at x10 and x30 no paper bubble is drawn at all.

import { describe, expect, it } from 'vitest';
import { BUBBLE_WORK_SECONDS, roomDoorCell } from '../../src/engine/constants';
import { bubbleFor } from '../../src/engine/bubbles';
import { STATION_IDLE, STATION_OFFICE } from '../../src/engine/stations';
import { CAPSULE_HEAD_TOP, bubbleArt, renderHall } from '../../src/render/hall';
import { resetBubbles } from '../../src/render/bubbles';
import type { GameState } from '../../src/engine/index';
import {
  act,
  buyStartingKit,
  newGame,
  runClock,
  sixJoinersOnSheetWork,
} from '../helpers';

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

/** The drawing's own scene: three men on one job at its cutting stage with one saw, the first of them
 *  standing at it, so one man is cutting, one is waiting for the saw and one has no cut parts yet. */
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
  resetBubbles();
  return state;
}

describe('the four colours of the drawing (CLAUDE.md T21 2.6)', () => {
  it('draws the red of a man waiting and the paper of a man who has just started', () => {
    const state = queueAtTheSaw();
    const svg = renderHall(state, { nowMs: 0 });
    const waiting = groupOf(svg, 'worker-staff-2');
    expect(waiting).toContain('data-bubble="waitingForMachine"');
    expect(waiting).toContain('class="bubble bubble-wait"');
    expect(waiting).toContain('waiting for the saw');
    const behind = groupOf(svg, 'worker-staff-3');
    expect(behind).toContain('data-bubble="noCutParts"');
    expect(behind).toContain('class="bubble bubble-wait"');
    // The plain paper takes no second class: the tone says so and the stylesheet dresses the rest.
    const cutting = groupOf(svg, 'worker-staff-1');
    expect(cutting).toContain('data-bubble="working"');
    expect(cutting).toContain('data-tone="work"');
    expect(cutting).toContain('class="bubble">');
    expect(cutting).not.toContain('bubble-wait');
  });

  it('draws the green of a helper about his chore', () => {
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
    const group = groupOf(renderHall(state, { nowMs: 0 }), `worker-${worker.id}`);
    expect(group).toContain('data-bubble="sweeping"');
    expect(group).toContain('class="bubble bubble-chore"');
    expect(group).toContain('sweeping');
  });

  it('draws the dashed grey at the door the man went through, and not at his station', () => {
    const state = buyStartingKit(newGame());
    state.owner.station = STATION_OFFICE;
    const svg = renderHall(state, { nowMs: 0 });
    // He is off the hall: the office view draws him at his desk (CLAUDE.md T20 2.12).
    expect(svg).not.toContain('data-figure="owner"');
    // And his words are at the office door, in their own group, because there is no figure group of
    // his to hang them on.
    expect(svg).toContain('data-away-door="office"');
    expect(svg).toContain('data-bubble="inTheOffice"');
    expect(svg).toContain('class="bubble bubble-away"');
    const door = roomDoorCell('office');
    const at = svg.slice(svg.indexOf('data-away-door="office"'));
    expect(at).toContain('transform="translate(');
    // The same cell the figure would have stood on, which is the door itself.
    const standing = renderHall({ ...state, owner: { ...state.owner, station: STATION_IDLE } }, { nowMs: 0 });
    expect(standing).toContain('data-figure="owner"');
    expect(door.x).toBeGreaterThan(0);
  });

  it('hangs the box over the head of whichever man was drawn, and lets the mouse through it', () => {
    const state = queueAtTheSaw();
    const group = groupOf(renderHall(state, { nowMs: 0 }), 'worker-staff-2');
    expect(group).toContain('pointer-events="none"');
    expect(group).toContain('overflow="visible"');
    // The capsule's own crown, six pixels of gap and the box above that: the tail's point is over
    // his head and the box is over the tail.
    const y = Number(/data-tone="wait"[^>]*y="(-?\d+)"/.exec(group)?.[1] ?? '0');
    expect(y).toBeLessThan(CAPSULE_HEAD_TOP);
    // The hover line of Turn 11 is still the group's own title and is not the bubble's.
    expect(group).toContain('<title>');
    expect(group).not.toContain('data-character="bubble"');
  });
});

describe('the three seconds of a paper bubble (CLAUDE.md T21 2.6)', () => {
  it('draws the stage a man has just begun and takes it down three seconds later', () => {
    const state = queueAtTheSaw();
    expect(groupOf(renderHall(state, { nowMs: 0 }), 'worker-staff-1')).toContain('data-tone="work"');
    // A second in: still up, and the same words.
    expect(groupOf(renderHall(state, { nowMs: 1000 }), 'worker-staff-1')).toContain('data-tone="work"');
    // Past the three seconds of the drawing: gone.
    const after = groupOf(renderHall(state, { nowMs: BUBBLE_WORK_SECONDS * 1000 }), 'worker-staff-1');
    expect(after).not.toContain('data-bubble=');
    // The man beside him is still waiting, and a red bubble stays up as long as it is true.
    expect(groupOf(renderHall(state, { nowMs: 60_000 }), 'worker-staff-2')).toContain(
      'data-bubble="waitingForMachine"',
    );
  });

  it('starts the three seconds again when the words change, and not when the page is written', () => {
    const state = queueAtTheSaw();
    renderHall(state, { nowMs: 0 });
    expect(groupOf(renderHall(state, { nowMs: 2_900 }), 'worker-staff-1')).toContain('data-tone="work"');
    expect(groupOf(renderHall(state, { nowMs: 3_100 }), 'worker-staff-1')).not.toContain('data-bubble=');
    // The same man, further on: the assembly is a new thing to say and it is said.
    const job = state.jobs[0];
    if (!job) throw new Error('a job is wanted');
    job.labourRemaining = job.labourValue * 0.45;
    const said = bubbleFor(state, 'staff-1');
    expect(said?.key).toBe('working');
    expect(said?.text).toContain('assembling');
    const fresh = groupOf(renderHall(state, { nowMs: 3_200 }), 'worker-staff-1');
    expect(fresh).toContain('data-tone="work"');
    expect(fresh).toContain('assembling');
    expect(groupOf(renderHall(state, { nowMs: 6_300 }), 'worker-staff-1')).not.toContain('data-bubble=');
  });

  it('draws no paper bubble above x4, where it would flicker, and keeps the red one', () => {
    const state = queueAtTheSaw();
    for (const speed of [10, 30] as const) {
      const fast = act(state, { type: 'SET_SPEED', speed });
      resetBubbles();
      const svg = renderHall(fast, { nowMs: 0 });
      expect(groupOf(svg, 'worker-staff-1'), String(speed)).not.toContain('data-tone="work"');
      expect(groupOf(svg, 'worker-staff-2'), String(speed)).toContain('data-tone="wait"');
    }
    // And at the speeds the drawing allows it is drawn.
    for (const speed of [1, 2, 4] as const) {
      const slow = act(state, { type: 'SET_SPEED', speed });
      resetBubbles();
      expect(groupOf(renderHall(slow, { nowMs: 0 }), 'worker-staff-1'), String(speed)).toContain(
        'data-tone="work"',
      );
    }
  });

  it('forgets every man when the view is built from nothing', () => {
    const state = queueAtTheSaw();
    renderHall(state, { nowMs: 0 });
    expect(groupOf(renderHall(state, { nowMs: 9_000 }), 'worker-staff-1')).not.toContain('data-bubble=');
    resetBubbles();
    expect(groupOf(renderHall(state, { nowMs: 9_000 }), 'worker-staff-1')).toContain('data-tone="work"');
  });
});

describe('the box itself', () => {
  it('escapes what it is handed and carries the man it belongs to', () => {
    const drawn = bubbleArt(
      { who: 'worker-staff-1', key: 'noMaterial', tone: 'wait', text: 'no sheets for <Bob & Sons>' },
      CAPSULE_HEAD_TOP,
    );
    expect(drawn).toContain('data-bubble-for="worker-staff-1"');
    expect(drawn).toContain('&lt;Bob &amp; Sons&gt;');
    expect(drawn).not.toContain('<Bob');
  });

  it('says at lunch over the whole crew while the dinner hour runs', () => {
    const state = runClock(sixJoinersOnSheetWork({ saws: 1 }), 250);
    resetBubbles();
    const svg = renderHall(state, { nowMs: 0 });
    // Until 2.12 takes them off the hall they stand at the canteen door and say it there; either way
    // the words are the drawing's.
    expect(svg).toContain('data-bubble="atLunch"');
    expect(svg).toContain('class="bubble bubble-away"');
    expect(svg).toContain('at lunch');
  });
});

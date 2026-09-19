// The service rule of CLAUDE.md T20 2.9, which replaces Turn 8's thirty minutes at two per cent:
// a service buys the machine half of its original life again, then a quarter, then an eighth; it
// costs a tenth of what the machine cost; the machine is out for the working day; and a machine
// past its life goes on working and gives up oftener every week.
//
// The cost is read off `SERVICE_COST_FRACTION` and never off the figure 0.10, so the constant is
// the one place the tenth is written down.

import { describe, expect, it } from 'vitest';
import {
  OVERDUE_BREAKDOWN_CHANCE,
  PAST_LIFE_WEEK_HOURS,
  SERVICE_COST_FRACTION,
  SERVICE_INTERVAL_HOURS,
} from '../../src/engine/constants';
import { nextWorkingDay } from '../../src/engine/clock';
import {
  enduranceHoursFor,
  familyStopped,
  freeMachines,
  lifeAfterServices,
  machineIsOut,
  machinesInService,
  originalLifeOf,
  overdueBreakdownChance,
  serviceCallCheck,
  serviceCostFor,
  serviceIsDue,
  serviceMachine,
} from '../../src/engine/machines';
import { hallBlock } from '../../src/engine/jobs';
import { SERVICE_IS_CALLED_IN, startTaskCheck } from '../../src/engine/tasks';
import { jobProgress, tick } from '../../src/engine/index';
import type { Equipment, GameState } from '../../src/engine/index';
import {
  acceptNow,
  act,
  buyStartingKit,
  clearEvents,
  fillRack,
  firstJob,
  newGame,
  placeEnquiry,
} from '../helpers';

function hall(): GameState {
  const state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 20);
  state.enquiries = [];
  return state;
}

function theSaw(state: GameState): Equipment {
  const saw = state.equipment.find((item) => item.specId === 'tableSaw');
  if (saw === undefined) throw new Error('no saw in the hall');
  return saw;
}

describe('a service buys the machine more life (CLAUDE.md T20 2.9.1)', () => {
  it('adds half of the original life, then a quarter of it, then an eighth', () => {
    const state = hall();
    const saw = theSaw(state);
    const original = originalLifeOf(saw);
    expect(original).toBe(enduranceHoursFor(saw.specId, saw.variantId));
    expect(saw.enduranceHours).toBe(original);
    expect(saw.serviceCount).toBe(0);

    saw.hoursUsed = SERVICE_INTERVAL_HOURS;
    serviceMachine(state, saw.id);
    expect(saw.serviceCount).toBe(1);
    expect(saw.enduranceHours).toBe(Math.round(original * 1.5));

    saw.inServiceUntilDay = null;
    saw.hoursUsed += SERVICE_INTERVAL_HOURS;
    serviceMachine(state, saw.id);
    expect(saw.serviceCount).toBe(2);
    expect(saw.enduranceHours).toBe(Math.round(original * 1.75));

    saw.inServiceUntilDay = null;
    saw.hoursUsed += SERVICE_INTERVAL_HOURS;
    serviceMachine(state, saw.id);
    expect(saw.serviceCount).toBe(3);
    expect(saw.enduranceHours).toBe(Math.round(original * 1.875));

    // The three extensions are 50, 25 and 12.5 per cent of the original, and of nothing else,
    // to the hour the rounding leaves them at.
    const extensions = [
      Math.round(original * 1.5) - original,
      Math.round(original * 1.75) - Math.round(original * 1.5),
      Math.round(original * 1.875) - Math.round(original * 1.75),
    ];
    const wanted = [original * 0.5, original * 0.25, original * 0.125];
    for (const [index, gain] of extensions.entries()) {
      expect(Math.abs(gain - (wanted[index] ?? 0)), `extension ${index + 1}`).toBeLessThanOrEqual(1);
    }
  });

  it('works the life out from the original and the count, so it cannot drift', () => {
    const original = 3600;
    expect(lifeAfterServices(original, 0)).toBe(3600);
    expect(lifeAfterServices(original, 1)).toBe(5400);
    expect(lifeAfterServices(original, 2)).toBe(6300);
    expect(lifeAfterServices(original, 3)).toBe(6750);
    // However many are called, the extensions never add the original again.
    expect(lifeAfterServices(original, 20)).toBeLessThanOrEqual(original * 2);
  });

  it('starts the clock on the next service, so one that was due is not due any more', () => {
    const state = hall();
    const saw = theSaw(state);
    saw.hoursUsed = SERVICE_INTERVAL_HOURS + 1;
    expect(serviceIsDue(saw)).toBe(true);
    serviceMachine(state, saw.id);
    expect(serviceIsDue(saw)).toBe(false);
  });
});

describe('a service costs a tenth of the machine (CLAUDE.md T20 2.9.2)', () => {
  it('is the machine s price times the one fraction, and nothing else', () => {
    const state = hall();
    const saw = theSaw(state);
    expect(serviceCostFor(saw)).toBe(
      Math.round(saw.purchasePrice * SERVICE_COST_FRACTION * 100) / 100,
    );
    // The fraction is the tenth of CLAUDE.md T20 2.9.2, landed in T20-C1; this reads it.
    expect(serviceCostFor({ ...saw, purchasePrice: 1800 })).toBe(1800 * SERVICE_COST_FRACTION);
  });

  it('is refused, with its reason, when the cash is not there', () => {
    const state = hall();
    const saw = theSaw(state);
    // The account may go as far as the overdraft and no further, which is the one purse check the
    // game has (`canAfford`).
    state.cash = state.finance.overdraftLimit + serviceCostFor(saw) - 1;
    expect(serviceCallCheck(state, saw.id)).toEqual({ ok: false, reason: 'Not enough cash' });
    state.cash = state.finance.overdraftLimit + serviceCostFor(saw);
    expect(serviceCallCheck(state, saw.id).ok).toBe(true);
  });
});

describe('the machine is out for the working day (CLAUDE.md T20 2.9.3)', () => {
  it('stands there doing nothing until the next working day, the first service too', () => {
    const state = hall();
    const saw = theSaw(state);
    expect(machineIsOut(saw, state.clock.day)).toBe(false);
    serviceMachine(state, saw.id);
    expect(saw.serviceCount).toBe(1);
    expect(saw.inServiceUntilDay).toBe(nextWorkingDay(state.clock.day));
    expect(machineIsOut(saw, state.clock.day)).toBe(true);
    expect(machinesInService(state).map((item) => item.id)).toEqual([saw.id]);
    // And it runs again the next working day, which takes the weekend into account.
    expect(machineIsOut(saw, nextWorkingDay(state.clock.day))).toBe(false);
  });

  it('is no use to anybody while it is out, and its stage falls back as a broken one s does', () => {
    const state = hall();
    const saw = theSaw(state);
    expect(freeMachines(state, 'tableSaw').map((item) => item.id)).toEqual([saw.id]);
    expect(familyStopped(state, 'tableSaw')).toBeNull();
    serviceMachine(state, saw.id);
    expect(freeMachines(state, 'tableSaw')).toEqual([]);
    expect(familyStopped(state, 'tableSaw')).toEqual({ item: saw, why: 'service' });
    // A broken one still says broken: the two are told apart, and stop the stage the same way.
    saw.broken = true;
    expect(familyStopped(state, 'tableSaw')).toEqual({ item: saw, why: 'broken' });
  });

  it('cannot be serviced twice over, and cannot be serviced at all while it is broken', () => {
    const state = hall();
    const saw = theSaw(state);
    expect(serviceCallCheck(state, saw.id).ok).toBe(true);
    serviceMachine(state, saw.id);
    expect(serviceCallCheck(state, saw.id)).toEqual({ ok: false, reason: 'In service' });
    saw.inServiceUntilDay = null;
    saw.broken = true;
    expect(serviceCallCheck(state, saw.id)).toEqual({
      ok: false,
      reason: 'It is broken. Fix it first',
    });
  });

  it('refuses the call on the extraction, which is repaired and never serviced', () => {
    const state = hall();
    const fan = state.equipment.find((item) => item.specId === 'extractor');
    if (fan === undefined) throw new Error('no extractor in the hall');
    expect(serviceCallCheck(state, fan.id)).toEqual({
      ok: false,
      reason: 'It is repaired, never serviced',
    });
  });
});

/** A job on the bench with the material on the rack, at the cutting stage: the saw is what makes
 *  it, so the saw going out is felt in the day's work. */
function cutting(): GameState {
  let state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 40);
  state.enquiries = [];
  const enquiry = placeEnquiry(state, { price: 10000, deadlineDays: 90 });
  state = acceptNow(state, enquiry.id, false);
  firstJob(state).stage = 'ready';
  return act(state, { type: 'WORK_HERE', jobId: null });
}

describe('what the day costs when the machine goes out (CLAUDE.md T20 2.9.3)', () => {
  it('stops the stage from the call to the end of the day, and the day s work with it', () => {
    // Four hours of the morning, once with the saw on the floor and once with it away.
    const worked = clearEvents(tick(cutting(), 240));
    const away = cutting();
    serviceMachine(away, theSaw(away).id);
    const stopped = clearEvents(tick(away, 240));
    // It is still out at the end of those hours: the day is the unit, not the half hour.
    expect(machineIsOut(theSaw(stopped), stopped.clock.day)).toBe(true);
    expect(familyStopped(stopped, 'tableSaw')?.why).toBe('service');
    // And the work did not happen: the stage the saw makes is stopped, so the day's output falls.
    expect(jobProgress(firstJob(worked))).toBeGreaterThan(0);
    expect(jobProgress(firstJob(stopped))).toBe(0);
    // And the card says which of the two it is: away being serviced, not broken (T20 2.9.3).
    expect(hallBlock(stopped, firstJob(stopped))).toBe('table saw is in for a service');
  });
});

describe('a service is called in, never worked off (CLAUDE.md T20 2.9)', () => {
  it('leaves the reminder on the list and refuses the hands that reach for it', () => {
    // Turn 8's half hour at the spanner went with 2.9, and `applyTaskCompletion` has no service
    // case any more: a service task the owner could still start would be thirty minutes of his
    // day for nothing, and a Start button on a row that does nothing. The reminder stays, and it
    // says where the one path is.
    const state = hall();
    const saw = theSaw(state);
    saw.hoursUsed = SERVICE_INTERVAL_HOURS + 1;
    // The day's open raises it and the player answers Leave it, the way the scripted owner does:
    // the reminder is then on the Workshop list with nobody on it, which is the state this is
    // about.
    let raised = act(state, { type: 'END_DAY' });
    let guard = 0;
    while (guard < 3000 && !raised.tasks.some((entry) => entry.kind === 'service' && !entry.done)) {
      guard += 1;
      const open = raised.activeEvent;
      if (open === null) {
        raised = tick(raised, 1);
        continue;
      }
      const later = open.choices.find((choice) => choice.id === 'later');
      raised = act(raised, {
        type: 'RESOLVE_EVENT',
        choiceId: later?.id ?? open.choices[0]?.id ?? 'ok',
      });
    }
    const task = raised.tasks.find((entry) => entry.kind === 'service' && !entry.done);
    expect(task).toBeDefined();
    expect(task?.equipmentId).toBe(saw.id);
    if (task === undefined) throw new Error('no service reminder');
    expect(startTaskCheck(raised, task.id)).toEqual({
      ok: false,
      reason: SERVICE_IS_CALLED_IN,
      blockingTaskId: null,
    });
    // Not even the explicit override starts it: there is nothing to stand at. And the click the
    // player would make on the row leaves him where he was.
    expect(startTaskCheck(raised, task.id, true).ok).toBe(false);
    const pressed = act(raised, { type: 'START_TASK', taskId: task.id });
    expect(pressed.owner.currentTaskId).toBeNull();
    expect(pressed.tasks.some((entry) => entry.kind === 'service' && !entry.done)).toBe(true);
    // And the one path does close it: the call pays, takes the machine out and takes the
    // reminder off the list in the same minute.
    const called = act(raised, { type: 'SERVICE_MACHINE', equipmentId: saw.id });
    expect(called.tasks.some((entry) => entry.kind === 'service' && !entry.done)).toBe(false);
    expect(machineIsOut(theSaw(called), called.clock.day)).toBe(true);
  });
});

describe('a machine past its life (CLAUDE.md T20 2.9.4)', () => {
  it('goes on working, and gives up twice as often for every week it is past the end', () => {
    const state = hall();
    const saw = theSaw(state);
    // Just past the end of its life, with its service up to date, so the one figure moving is the
    // life: the Turn 8 chance, unchanged, in the first week past the end.
    saw.hoursUsed = saw.enduranceHours;
    saw.serviceHours = saw.hoursUsed;
    expect(overdueBreakdownChance(saw)).toBeCloseTo(OVERDUE_BREAKDOWN_CHANCE, 10);
    // A week past it, two weeks, three: double, and double again.
    saw.hoursUsed = saw.enduranceHours + PAST_LIFE_WEEK_HOURS;
    saw.serviceHours = saw.hoursUsed;
    expect(overdueBreakdownChance(saw)).toBeCloseTo(OVERDUE_BREAKDOWN_CHANCE * 2, 10);
    saw.hoursUsed = saw.enduranceHours + PAST_LIFE_WEEK_HOURS * 2;
    saw.serviceHours = saw.hoursUsed;
    expect(overdueBreakdownChance(saw)).toBeCloseTo(OVERDUE_BREAKDOWN_CHANCE * 4, 10);
    saw.hoursUsed = saw.enduranceHours + PAST_LIFE_WEEK_HOURS * 3;
    saw.serviceHours = saw.hoursUsed;
    expect(overdueBreakdownChance(saw)).toBeCloseTo(OVERDUE_BREAKDOWN_CHANCE * 8, 10);
    // It never passes a certainty, and it is still on the floor: nothing scrapped it.
    saw.hoursUsed = saw.enduranceHours * 10;
    saw.serviceHours = saw.hoursUsed;
    expect(overdueBreakdownChance(saw)).toBe(1);
    expect(state.equipment.some((item) => item.id === saw.id)).toBe(true);
    expect(freeMachines(state, 'tableSaw').map((item) => item.id)).toEqual([saw.id]);
  });

  it('is put off by a service, because the service moves the end of the life', () => {
    const state = hall();
    const saw = theSaw(state);
    saw.hoursUsed = saw.enduranceHours + PAST_LIFE_WEEK_HOURS;
    expect(overdueBreakdownChance(saw)).toBeGreaterThan(OVERDUE_BREAKDOWN_CHANCE);
    serviceMachine(state, saw.id);
    // Half the original life again is a long way past where it stood, so it is inside its life.
    expect(saw.hoursUsed).toBeLessThan(saw.enduranceHours);
    expect(overdueBreakdownChance(saw)).toBe(0);
  });
});

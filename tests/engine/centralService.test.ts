// The central systems are serviced exactly as an extractor is (PIOTR, 22.09; REPORT-T23 0.8;
// CLAUDE.md T24 2.7). Turn 23's 2.8 put the fans on the service list and was built as the
// extractors alone, because the two systems sell themselves on "no more bags and no breakdown"
// and everything on the list is rolled for a breakdown past its service. They book their hours,
// come due, take the same card button and go out for the same working day; what they still never
// do is give up, which is the half of their own line that is about breaking down. From v51 the
// due point is the calendar's, six months from the purchase or the last service (PIOTR, 22.09),
// and the hours they book are their life running down and nothing else.

import { describe, expect, it } from 'vitest';
import { SERVICE_COST_FRACTION, SERVICE_INTERVAL_DAYS } from '../../src/engine/constants';
import { extractionKit } from '../../src/engine/media';
import {
  isServiced,
  machineIsOut,
  machinesDueService,
  overdueBreakdownChance,
  serviceCallCheck,
  serviceCostFor,
  serviceIsDue,
  serviceMachine,
  serviceableMachines,
} from '../../src/engine/machines';
import { formatMoney } from '../../src/engine/economy';
import { renderMachinesPage } from '../../src/ui/machinesPage';
import type { Equipment, GameState } from '../../src/engine/index';
import { buyNow, buyStartingKit, fillRack, newGame } from '../helpers';

/** One row of the Machines page, by the id of the thing it is about. */
function rowOf(page: string, id: string): string {
  const at = page.indexOf(`data-machine="${id}"`);
  if (at < 0) throw new Error(`${id} has no row on the Machines page`);
  const from = page.lastIndexOf('<div class="row"', at);
  const next = page.indexOf('<div class="row"', at);
  return page.slice(from, next < 0 ? page.length : next);
}

/** The day one hall with a central system of this family standing on the apron. */
function withSystem(specId: string): { state: GameState; system: Equipment } {
  let state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 400);
  state.cash = 400000;
  state = buyNow(state, specId);
  const system = state.equipment.find((item) => item.specId === specId);
  if (!system) throw new Error(`${specId} is wanted`);
  return { state, system };
}

/** Six months on the calendar since the system was bought, without playing them (v51). */
function sixMonthsOn(state: GameState, system: Equipment): void {
  system.servicedDay = state.clock.day - SERVICE_INTERVAL_DAYS;
}

describe('a central system s service', () => {
  for (const specId of ['dustSystem', 'flexiSystem']) {
    it(`puts the ${specId} on the service list and in the duct run`, () => {
      const { state, system } = withSystem(specId);
      expect(isServiced(specId)).toBe(true);
      expect(serviceableMachines(state).map((item) => item.specId)).toContain(specId);
      // It is in the duct run, which is where the day's loop books its hours from.
      expect(extractionKit(state).map((item) => item.specId)).toContain(specId);
      expect(system.hoursUsed).toBe(0);
    });

    it(`brings the ${specId} due on the same six months as an extractor, at the same tenth of its price`, () => {
      const { state, system } = withSystem(specId);
      expect(serviceIsDue(system, state.clock.day)).toBe(false);
      // Hours on it bring nothing due (v51): the calendar does.
      system.hoursUsed = 500;
      expect(serviceIsDue(system, state.clock.day)).toBe(false);
      sixMonthsOn(state, system);
      expect(serviceIsDue(system, state.clock.day)).toBe(true);
      expect(machinesDueService(state).map((item) => item.specId)).toContain(specId);
      expect(serviceCostFor(system)).toBe(system.purchasePrice * SERVICE_COST_FRACTION);
    });

    it(`calls the ${specId} in on the same button and takes it out for the same working day`, () => {
      const { state, system } = withSystem(specId);
      sixMonthsOn(state, system);
      expect(serviceCallCheck(state, system.id)).toEqual({ ok: true, reason: '' });
      const serviced = serviceMachine(state, system.id);
      expect(serviced?.id).toBe(system.id);
      expect(machineIsOut(system, state.clock.day)).toBe(true);
      expect(serviceIsDue(system, state.clock.day)).toBe(false);
    });

    it(`gives the ${specId} a row on the Machines page with the same words and the same button`, () => {
      const { state, system } = withSystem(specId);
      sixMonthsOn(state, system);
      const row = rowOf(renderMachinesPage(state), system.id);
      expect(row).toContain('service due');
      expect(row).toContain(`Service · ${formatMoney(serviceCostFor(system))}`);
      expect(row).toContain('data-do="serviceMachine"');
      // And once it is called in, the row says it is out and offers no second click.
      serviceMachine(state, system.id);
      const out = rowOf(renderMachinesPage(state), system.id);
      expect(out).toContain('in service');
      expect(out).toContain('In service');
      expect(out).not.toContain('data-do="serviceMachine"');
    });

    it(`never lets the ${specId} give up, which is the line the player bought it on`, () => {
      const { state, system } = withSystem(specId);
      system.servicedDay = state.clock.day - SERVICE_INTERVAL_DAYS * 10;
      expect(serviceIsDue(system, state.clock.day)).toBe(true);
      expect(overdueBreakdownChance(system, state.clock.day)).toBe(0);
    });
  }

  it('leaves an extractor exactly where Turn 23 left it', () => {
    const state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 400);
    const fan = state.equipment.find((item) => item.specId === 'extractor');
    if (!fan) throw new Error('a fan is wanted');
    fan.servicedDay = state.clock.day - SERVICE_INTERVAL_DAYS;
    expect(serviceIsDue(fan, state.clock.day)).toBe(true);
    expect(overdueBreakdownChance(fan, state.clock.day)).toBeGreaterThan(0);
  });
});

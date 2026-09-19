// The Turn 13 months of CLAUDE.md T13 T13-C2: (t) a month with a loan and an overdraft, (u) a
// burglary at level 0 uninsured and at level 1 insured, (v) a contract term with two short weeks
// and a renegotiation, (w) a second shift month with a manager and a holiday, (x) a month of pipes
// and gates with a thicknesser and two saws on one extractor.

import { describe, expect, it } from 'vitest';
import { CAREFUL, IDLE, type Policy, playDay, playUntilDay } from './autopilot';
import { act, buyNow, buyStartingKit, clearEvents, connectAll, newGame, runToDay } from '../helpers';
import {
  BURGLARY_PAYOUT_DAYS,
  DUST_OUTPUT_M3_PER_HOUR,
  EQUIPMENT_SPECS,
  CONTRACT_RENEW_FULL_WEEK,
  CONTRACT_RENEW_SHORT_WEEK,
  CONTRACT_SHORT_WEEK_REPUTATION,
  DAYS_PER_WEEK,
  GATE_OUTPUT_BONUS,
  GATE_PRICE,
  LOAN_MONTHS,
  LOAN_RATE_YEARLY,
  OWNER_AWAY_PENALTY_WITH_PM,
  PIPE_PRICE_PER_METRE,
  SECOND_SHIFT_MINUTES,
  SHEET_VALUE,
} from '../../src/engine/constants';
import {
  MONTH_LINES,
  burgle,
  claimBurglary,
  contractPiece,
  drawContract,
  dustOutputOf,
  extractionCheck,
  extractionDemandOf,
  extractionLoad,
  freeFloorM2,
  freeSheets,
  hasGate,
  isWorkingDay,
  managerOnDuty,
  monthOfDay,
  monthReport,
  unservedMachines,
  weekOfDay,
  onHoliday,
  outputFactorOf,
  staffOutputFactor,
  variantOf,
  findSpec,
} from '../../src/engine/index';
import type { GameEvent, GameState } from '../../src/engine/index';

const SEED = 20260911;

function machinesOf(state: GameState, specId: string): GameState['equipment'] {
  return state.equipment.filter((item) => item.specId === specId && item.soldOnDay === null);
}

// ---------------------------------------------------------------------------
// (t) A month with a loan and an overdraft (CLAUDE.md T13 3.14)
// ---------------------------------------------------------------------------

describe('(t) a month with a loan, on Easy', () => {
  const seen: GameEvent[] = [];
  const start = act(newGame({ seed: SEED, difficulty: 'easy' }), { type: 'TAKE_LOAN', amount: 20000 });
  const state = playUntilDay(start, 32, CAREFUL, seen);

  it('lands the twenty thousand at the click and opens sixty months', () => {
    const drawn = start.ledger.find((entry) => entry.category === 'loan');
    expect(drawn?.amount).toBe(20000);
    expect(start.finance.loan?.balance).toBe(20000);
    expect(start.finance.loan?.monthsLeft).toBe(LOAN_MONTHS);
  });

  it('charges the first instalment and the interest on the balance on the 1st, as two lines', () => {
    const first = state.ledger.filter((entry) => entry.day === 31);
    const interest = first.find((entry) => entry.category === 'loanInterest');
    const capital = first.find((entry) => entry.category === 'loan');
    // Fifteen per cent a year on the balance, over twelve; the capital over sixty.
    expect(interest?.amount).toBeCloseTo(-(20000 * LOAN_RATE_YEARLY) / 12, 2);
    expect(capital?.amount).toBeCloseTo(-20000 / LOAN_MONTHS, 2);
    expect(state.finance.loan?.monthsLeft).toBe(LOAN_MONTHS - 1);
    expect(state.finance.loan?.balance).toBeCloseTo(20000 - 20000 / LOAN_MONTHS, 2);
    expect(state.finance.loan?.interestPaid).toBeCloseTo((20000 * LOAN_RATE_YEARLY) / 12, 2);
  });

  it('never paid overdraft interest, because the loan kept the account above zero', () => {
    expect(state.ledger.some((entry) => entry.category === 'overdraftInterest')).toBe(false);
    expect(state.cash).toBeGreaterThan(0);
  });
});

describe('(t) a month in the overdraft, on Hard doing nothing', () => {
  const day20 = playUntilDay(newGame({ seed: SEED, difficulty: 'hard' }), 20, IDLE);
  // From Turn 21 a Hard company that does nothing does not live to see the 1st: the bills go unpaid
  // from day 11 and on day 22, the first working day after the weekend of days 20 and 21, the net
  // position passes one and a half times its 5,000 overdraft and the bank closes it (PIOTR, 18.09;
  // CLAUDE.md T21 2.2, and the whole scenario of it is in thirtyDays.test.ts). The interest cadence
  // this block is about is a fact about the 1st and not about Hard, so it is shown on the same idle
  // month with the room at the bank it takes to reach the 1st at all.
  const withRoom = newGame({ seed: SEED, difficulty: 'hard' });
  withRoom.finance.overdraftLimit = -20000;
  const day32 = playUntilDay(withRoom, 32, IDLE);

  it('is under zero inside the month and the interest accrues day by day', () => {
    expect(day20.cash).toBeLessThan(0);
    expect(day20.finance.overdraftInterestAccrued).toBeGreaterThan(0);
    expect(day20.ledger.some((entry) => entry.category === 'overdraftInterest')).toBe(false);
  });

  it('is closed by the bank before the 1st on the overdraft Hard really gives it', () => {
    expect(day20.gameOver?.day).toBe(22);
    expect(day20.gameOver?.reason).toContain('cannot pay');
    expect(playUntilDay(day20, 32, IDLE).clock.day).toBe(22);
  });

  it('is charged once on the 1st, interest only, and the balance stays under zero', () => {
    expect(day32.gameOver).toBeNull();
    const charged = day32.ledger.filter((entry) => entry.category === 'overdraftInterest');
    expect(charged).toHaveLength(1);
    expect(charged[0]?.day).toBe(31);
    expect(charged[0]?.amount).toBeLessThan(0);
    expect(day32.cash).toBeLessThan(0);
    // The accrual starts again from the 1st.
    expect(day32.finance.overdraftInterestAccrued).toBeLessThan(-(charged[0]?.amount ?? 0));
  });
});

// ---------------------------------------------------------------------------
// (u) A burglary at level 0 uninsured and at level 1 insured (CLAUDE.md T13 3.15, 3.17)
// ---------------------------------------------------------------------------

describe('(u) a burglary on day 10', () => {
  const day10 = clearEvents(playUntilDay(newGame({ seed: SEED, difficulty: 'easy' }), 10, CAREFUL));

  it('at level 0 with no cover takes the dearest machines and the free stock, and nothing comes back', () => {
    const state = JSON.parse(JSON.stringify(day10)) as GameState;
    expect(state.security.level).toBe(0);
    expect(state.insurance.property).toBe(false);
    const before = state.equipment.filter((item) => item.soldOnDay === null).length;
    const dearest = Math.max(...state.equipment.map((item) => item.purchasePrice));
    const freeBefore = freeSheets(state);
    const lost = burgle(state);
    const paid = claimBurglary(state, lost);
    const after = state.equipment.filter((item) => item.soldOnDay === null).length;
    expect(before - after).toBeGreaterThanOrEqual(1);
    expect(before - after).toBeLessThanOrEqual(2);
    // The dearest first: nothing left in the hall costs more than what went.
    expect(state.equipment.every((item) => item.purchasePrice <= dearest)).toBe(true);
    expect(state.equipment.some((item) => item.purchasePrice === dearest)).toBe(false);
    expect(freeSheets(state)).toBe(0);
    expect(lost).toBeGreaterThanOrEqual(dearest + freeBefore * SHEET_VALUE);
    expect(paid).toBe(false);
    expect(state.insurance.payouts).toEqual([]);
    const line = state.ledger.find((entry) => entry.category === 'burglary');
    expect(line?.unpaid).toBe(true);
    const event = state.activeEvent ?? state.eventQueue[0];
    expect(event?.kind).toBe('burglary');
    expect(event?.body).toContain('No property cover');
  });

  it('at level 1 with property cover is paid out over ten days, a slice a day', () => {
    let state = act(day10, { type: 'SET_INSURANCE', cover: 'property', on: true });
    state = act(state, { type: 'SET_SECURITY_LEVEL', level: 1 });
    expect(state.security.level).toBe(1);
    expect(state.insurance.property).toBe(true);
    const cashBefore = state.cash;
    const lost = burgle(state);
    const paid = claimBurglary(state, lost);
    expect(paid).toBe(true);
    expect(state.insurance.payouts).toHaveLength(1);
    expect(state.insurance.payouts[0]?.daysLeft).toBe(BURGLARY_PAYOUT_DAYS);
    expect(state.insurance.payouts[0]?.perDay).toBeCloseTo(lost / BURGLARY_PAYOUT_DAYS, 2);
    expect((state.activeEvent ?? state.eventQueue[0])?.body).toContain('pays it out');
    // Twelve working days on, every slice has landed and the payouts are done.
    const later = runToDay(clearEvents(state), state.clock.day + 16).state;
    const slices = later.ledger.filter((entry) => entry.category === 'claim' && entry.amount > 0);
    expect(slices).toHaveLength(BURGLARY_PAYOUT_DAYS);
    expect(slices.reduce((total, entry) => total + entry.amount, 0)).toBeCloseTo(lost, 1);
    expect(later.insurance.payouts).toEqual([]);
    void cashBefore;
  });

  it('at level 5 never happens: a month at zero risk raises no burglary at all', () => {
    let state = act(day10, { type: 'SET_SECURITY_LEVEL', level: 5 });
    expect(state.security.level).toBe(5);
    const seen: GameEvent[] = [];
    state = playUntilDay(state, 41, CAREFUL, seen);
    expect(seen.some((event) => event.kind === 'burglary')).toBe(false);
    expect(state.security.lastBurglaryDay).toBeNull();
    // And the firm is paid on the 1st: nothing is free.
    expect(state.ledger.some((entry) => entry.category === 'security' && entry.day === 31)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// (v) A contract term with two short weeks and a renegotiation (CLAUDE.md T13 3.16)
// ---------------------------------------------------------------------------

describe('(v) a four week contract with the joiner taken off it for two of them', () => {
  /** A month with one joiner, and the contract accepted on his first day with a quantity he can
   *  make in a week when he is on it. */
  // Sheets on the rack from day 1: a contract's material comes off the rack now, and the careful
  // month orders only what its jobs need (CLAUDE.md T17 2.22).
  const WITH_JOINER: Policy = { ...CAREFUL, hireJoiner: true, maxOpenJobs: 1, stockSheets: 40 };
  const seen: GameEvent[] = [];
  let state = playUntilDay(newGame({ seed: SEED, difficulty: 'veryEasy' }), 2, WITH_JOINER, seen);
  const joiner = state.workers.find((worker) => worker.role === 'joiner');
  if (!joiner) throw new Error('no joiner on the books');
  // The board's own offer, if the day brought one, makes way for the one the month is about: a
  // quantity the joiner can make in a week when he is on it, over four weeks.
  state.contracts = state.contracts.filter((contract) => contract.status !== 'offered');
  const drawn = drawContract(state);
  drawn.id = 'contract-month-v';
  // The board offers three lengths of work now (CLAUDE.md T17 2.22); this month is about the man
  // going on and off the contract, so it is the short piece whatever the stream drew.
  drawn.pieceId = 'cutSheetPack';
  drawn.quantityPerWeek = 20;
  drawn.termWeeks = 4;
  // The piece's own price off the table, and never a figure this month made up. It read 100 here,
  // written in Turn 13 when a cut sheet pack was 38, so the month was trading at a price the board
  // has never offered. From tonight it is the 50 of CLAUDE.md T20 2.2, and the months run on the
  // prices the game really has.
  drawn.pricePerPiece = contractPiece(drawn).price;
  state.contracts.push(drawn);
  state = act(state, { type: 'ACCEPT_CONTRACT', contractId: drawn.id });
  state = act(state, { type: 'ASSIGN_CONTRACT', contractId: drawn.id, workerId: joiner.id, on: true });
  const startDay = state.clock.day;
  const priceAtStart = drawn.pricePerPiece;
  const reputationAtStart = state.reputation;
  // The term starts mid week, so its four weeks are five calendar weeks, the first and the last
  // part weeks with their quantity pro rata. On it for the first, off it for the second and the
  // third, on it again for the rest: the Monday of each week is the day the script switches him.
  const offOn: Policy = {
    ...WITH_JOINER,
    onDay: (current, day) => {
      const week = weekOfDay(day) - weekOfDay(startDay);
      const on = week === 0 || week >= 3;
      const active = current.contracts.find((contract) => contract.status === 'active');
      if (!active) return current;
      const isOn = active.assigned.includes(joiner.id);
      if (on === isOn) return current;
      return act(current, { type: 'ASSIGN_CONTRACT', contractId: active.id, workerId: joiner.id, on });
    },
  };
  const endDay = startDay + 4 * DAYS_PER_WEEK - 1;
  const ended = playUntilDay(state, endDay + 3, offOn, seen);
  const contract = ended.contracts.find((entry) => entry.id === drawn.id);

  it('has the client ending it on the second short week, with three weeks on the history', () => {
    // Turn 13 ran this term to its end and counted five calendar weeks. From tonight the client
    // puts up with one short week and ends the contract himself on the second, so the month stops
    // at the Monday that closes the third week (PIOTR; CLAUDE.md T20 2.1.6).
    expect(contract?.status).toBe('ended');
    expect(contract?.endedBy).toBe('client');
    expect(contract?.weeks).toHaveLength(3);
    const short = contract?.weeks.filter((week) => week.made < week.wanted) ?? [];
    const full = contract?.weeks.filter((week) => week.made >= week.wanted) ?? [];
    expect(short).toHaveLength(2);
    expect(full).toHaveLength(1);
    // The weeks he was off it made nothing at all.
    expect(short.every((week) => week.made === 0)).toBe(true);
  });

  it('cost a point of reputation for each short week, remembered on the board', () => {
    const hits = ended.reputationLog.filter((entry) => entry.reason.startsWith(drawn.name));
    expect(hits).toHaveLength(2);
    for (const hit of hits) expect(hit.points).toBe(-CONTRACT_SHORT_WEEK_REPUTATION);
    void reputationAtStart;
  });

  it('renegotiates from the history: a per cent up for the full week, four down for the short', () => {
    const factor = 1 + CONTRACT_RENEW_FULL_WEEK - 2 * CONTRACT_RENEW_SHORT_WEEK;
    expect(contract?.renegotiatedPrice).toBe(Math.round(priceAtStart * factor));
    // 49, where it read 97 until tonight: the month runs at the piece's own 50 now instead of the
    // 100 it used to make up, and 0.97 of 50 rounds to 49. The new prices of CLAUDE.md T20 2.2
    // moved it and nothing else did: the weeks, the short weeks and the factor are what they were.
    expect(contract?.renegotiatedPrice).toBe(49);
    const report = seen.find((event) => event.kind === 'contractEnded');
    expect(report).toBeDefined();
    expect(report?.data.pieces).toBe(contract?.piecesMade);
    expect(report?.body).toContain('1 full weeks and 2 short');
    expect(report?.body).toContain('the client has ended it after 2 short weeks');
  });

  it('renews at the new price for another term, or lets it go', () => {
    const renewed = act(ended, { type: 'RENEW_CONTRACT', contractId: drawn.id, accept: true });
    const fresh = renewed.contracts.find((entry) => entry.status === 'active');
    expect(fresh?.pricePerPiece).toBe(contract?.renegotiatedPrice);
    expect(fresh?.weeks).toEqual([]);
    const gone = act(ended, { type: 'RENEW_CONTRACT', contractId: drawn.id, accept: false });
    expect(gone.contracts.some((entry) => entry.id === drawn.id)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// (w) A second shift month with a manager and a holiday (CLAUDE.md T13 3.9)
// ---------------------------------------------------------------------------

describe('(w) a month with a production manager, a night joiner and five days away', () => {
  const HOLIDAY_FROM = 15;
  const NIGHT: Policy = {
    ...CAREFUL,
    maxOpenJobs: 3,
    hireJoiner: true,
    joiners: 2,
    stockSheets: 30,
    reputation: 20,
    onDay: (current, day) => {
      let next = current;
      if (day === 1) next = act(next, { type: 'HIRE', role: 'productionManager', tier: null });
      if (day === 3) {
        next = act(next, { type: 'SET_SECOND_SHIFT', on: true });
        const second = next.workers.filter((worker) => worker.role === 'joiner')[1];
        if (second) next = act(next, { type: 'ASSIGN_SHIFT', workerId: second.id, shift: 'night' });
      }
      if (day === HOLIDAY_FROM) next = act(next, { type: 'TAKE_HOLIDAY', days: 5 });
      return next;
    },
  };
  const seen: GameEvent[] = [];
  const states: GameState[] = [];
  let state = newGame({ seed: SEED, difficulty: 'veryEasy' });
  while (state.clock.day < 31 && state.gameOver === null) {
    state = playDay(state, NIGHT, seen);
    states.push(state);
  }

  it('has the manager on the books, the shift on and one joiner on nights', () => {
    expect(state.workers.some((worker) => worker.role === 'productionManager')).toBe(true);
    expect(managerOnDuty(state)).toBe(true);
    expect(state.shift.second).toBe(true);
    const crew = state.workers.filter((worker) => worker.role === 'joiner');
    expect(crew).toHaveLength(2);
    expect(crew.map((worker) => worker.shift).sort()).toEqual(['day', 'night']);
  });

  it('works the nights and pays the premium for every shift the man turned up for', () => {
    const nights = state.days.filter((day) => day.nightMinutes > 0);
    // Re-measured in Turn 19. It was more than three nights while a drawing took the owner most
    // of a day: the desk was the bottleneck and the night man always had a backlog to pick up.
    // With the drawing read off the value of the job (CLAUDE.md T19 2.11) this script draws its
    // whole book in the first days, the two day joiners and the owner finish thirteen of the
    // fourteen jobs by day 5, and the rack is down to one sheet, so from day 5 on there is
    // nothing for the night man to stand at: he works nights 3 and 4 (480 and 118 minutes) and
    // then idles. Measured, not tuned. What the test is really about, that the premium is paid
    // for every working day the shift was on whether or not he had work, is asserted below and
    // is unchanged.
    // Re-measured again in Turn 20: the tier ladder moved up (a man with no experience is 0.8 of
    // the owner where he was 0.6, CLAUDE.md T20 2.5), so the day crew clear the book a day sooner
    // still and the night man has one night of work in him. Measured, not tuned.
    expect(nights.length).toBeGreaterThanOrEqual(1);
    for (const day of nights) expect(day.nightMinutes).toBeLessThanOrEqual(SECOND_SHIFT_MINUTES);
    // The premium is for the shift, not for the minutes the rack let him work (nothing is free):
    // one line for every working day the shift was on, from the day it was switched on.
    const premium = state.ledger.filter((entry) => entry.category === 'wagesNight');
    const shiftDays = state.days.filter((day) => day.day >= 3 && isWorkingDay(day.day)).length;
    expect(premium.length).toBe(shiftDays);
    for (const entry of premium) expect(entry.amount).toBeLessThan(0);
  });

  it('takes the owner away for five working days with the manager covering at eight per cent', () => {
    const away = states.filter((day) => onHoliday(day));
    expect(away.length).toBeGreaterThanOrEqual(4);
    const first = states.find((day) => day.clock.day === HOLIDAY_FROM + 1);
    expect(first).toBeDefined();
    if (first) {
      expect(first.owner.present).toBe(false);
      expect(staffOutputFactor(first)).toBeCloseTo(1 - OWNER_AWAY_PENALTY_WITH_PM, 6);
    }
    // Back the working week after, and the draw went out every day he was away.
    expect(onHoliday(state)).toBe(false);
    const drawDays = state.ledger
      .filter((entry) => entry.category === 'ownerDraw')
      .map((entry) => entry.day);
    for (let day = HOLIDAY_FROM; day < HOLIDAY_FROM + 7; day += 1) {
      if (isWorkingDay(day)) expect(drawDays, `day ${day}`).toContain(day);
    }
  });

  it('is still trading at the end of it, having paid the manager every Friday', () => {
    expect(state.gameOver).toBeNull();
    expect(state.clock.day).toBe(31);
    expect(state.cash).toBeGreaterThan(state.finance.overdraftLimit);
    // He is paid by the week now, with everybody else, and the office salary line of the 1st is
    // gone with the monthly wage (PIOTR, 18.09; CLAUDE.md T20 2.6).
    expect(state.ledger.filter((entry) => entry.category === 'salaries')).toHaveLength(0);
    expect(state.ledger.filter((entry) => entry.category === 'wages').length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// (x) A month of pipes and gates: a thicknesser and two saws on one extractor (T13 3.11, 3.19)
// ---------------------------------------------------------------------------

describe('(x) a thicknesser and two saws on one extractor, with gates on the saws', () => {
  let state = buyStartingKit(newGame({ seed: SEED, difficulty: 'veryEasy' }));
  state = buyNow(state, 'tableSaw', 'standard');
  state = buyNow(state, 'thicknesser', 'standard');
  const cashBefore = state.cash;
  state = connectAll(state);
  const pipesCost = cashBefore - state.cash;
  const saws = machinesOf(state, 'tableSaw');
  const thicknesser = machinesOf(state, 'thicknesser')[0];
  if (saws.length !== 2 || !thicknesser) throw new Error('the hall is not what the month wants');
  const gated = act(
    act(state, { type: 'BUY_GATE', equipmentId: saws[0]?.id ?? '' }),
    { type: 'BUY_GATE', equipmentId: saws[1]?.id ?? '' },
  );

  it('runs three pipes to the one unit, charged by the metre and occupying no floor', () => {
    expect(state.pipes).toHaveLength(3);
    const runs = state.ledger.filter((entry) => entry.category === 'pipes');
    expect(runs).toHaveLength(3);
    // The used saw was piped on day 1 with the kit; the two new runs tee onto its trunk and are
    // charged for their own metres (CLAUDE.md T13 3.19).
    const fresh = state.pipes.filter((run) => run.equipmentId !== saws[0]?.id);
    expect(fresh).toHaveLength(2);
    const metres = fresh.reduce((total, run) => total + run.metres, 0);
    expect(pipesCost).toBeCloseTo(metres * PIPE_PRICE_PER_METRE, 2);
    for (const run of state.pipes) {
      expect(run.metres).toBeGreaterThanOrEqual(1);
      expect(run.tiles.length).toBeGreaterThan(0);
      expect(run.tiles.some((tile) => tile.key === 'pipe.drop')).toBe(true);
    }
    // A layer above the floor: the free floor is what it was before a pipe was laid.
    const bare = { ...state, pipes: [] };
    expect(freeFloorM2(state)).toBe(freeFloorM2(bare));
  });

  it('fits a gate on each saw for the price, and never on the thicknesser twice over', () => {
    expect(gated.gates).toHaveLength(2);
    expect(state.cash - gated.cash).toBe(2 * GATE_PRICE);
    for (const saw of saws) expect(hasGate(gated, saw)).toBe(true);
    const again = act(gated, { type: 'BUY_GATE', equipmentId: saws[0]?.id ?? '' });
    expect(again.gates).toHaveLength(2);
    expect(again.cash).toBe(gated.cash);
  });

  it('gives a gated saw two per cent more output on its own stage', () => {
    const baseOf = (item: { specId: string; variantId: string }): number => {
      const spec = findSpec(item.specId);
      if (!spec) throw new Error(`no spec ${item.specId}`);
      return variantOf(spec, item.variantId).outputFactor;
    };
    for (const saw of saws) {
      expect(outputFactorOf(gated, saw)).toBeCloseTo(baseOf(saw) * (1 + GATE_OUTPUT_BONUS), 6);
    }
    expect(outputFactorOf(gated, thicknesser)).toBe(baseOf(thicknesser));
  });

  it('counts a gated saw only while it runs, and the ungated thicknesser whenever the fan does', () => {
    const running = (ids: string[]): GameState => {
      const next = JSON.parse(JSON.stringify(gated)) as GameState;
      for (const item of next.equipment) item.takenBy = ids.includes(item.id) ? 'owner' : null;
      return next;
    };
    // Nobody at anything: the fan is off and nothing counts.
    expect(extractionLoad(running([]))).toEqual([]);
    // The thicknesser alone: it counts, the two gated saws do not.
    const thick = extractionLoad(running([thicknesser.id])).map((item) => item.id);
    expect(thick).toEqual([thicknesser.id]);
    // One saw running: the saw and the thicknesser, whose branch is open, and not the other saw.
    const one = extractionLoad(running([saws[0]?.id ?? ''])).map((item) => item.id).sort();
    expect(one).toEqual([saws[0]?.id, thicknesser.id].sort());
    // Both saws: everything.
    const both = extractionLoad(running(saws.map((saw) => saw.id))).map((item) => item.id).sort();
    expect(both).toEqual([...saws.map((saw) => saw.id), thicknesser.id].sort());
    // And the under extraction rule reads that sum: two saws and a thicknesser on a used fan is
    // short, one gated saw alone with the thicknesser is the same shortfall less a saw.
    const check = extractionCheck(running(saws.map((saw) => saw.id)));
    expect(check.short).toBe(true);
    expect(check.demand).toBeGreaterThan(extractionCheck(running([saws[0]?.id ?? ''])).demand);
  });

  it('plays the month on the three machines and stays connected all the way through', () => {
    // The kit is in the hall already, so the month buys nothing on day 1.
    const month = playUntilDay(gated, 31, { ...CAREFUL, buyKit: false, maxOpenJobs: 2 });
    expect(month.gameOver).toBeNull();
    expect(month.pipes).toHaveLength(3);
    expect(month.gates).toHaveLength(2);
    // Nothing in the hall was left unserved: every machine that wants a pipe has one.
    expect(month.equipment.filter((item) => item.specId === 'tableSaw' || item.specId === 'thicknesser')
      .every((item) => month.pipes.some((run) => run.equipmentId === item.id))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// The cross check of CLAUDE.md T13 section 10, asserted where a scenario can assert it
// ---------------------------------------------------------------------------

describe('10.1 one model of dust: a pipe changes connection and nothing else', () => {
  let state = buyStartingKit(newGame({ seed: SEED, difficulty: 'veryEasy' }));
  state = buyNow(state, 'thicknesser', 'standard');
  state = connectAll(state);
  const thicknesser = machinesOf(state, 'thicknesser')[0];
  if (!thicknesser) throw new Error('no thicknesser');
  const running = (base: GameState): GameState => {
    const next = JSON.parse(JSON.stringify(base)) as GameState;
    for (const item of next.equipment) item.takenBy = item.id === thicknesser.id ? 'owner' : null;
    return next;
  };

  it('counts an unconnected machine as not served, and a connected one as served', () => {
    const connected = running(state);
    expect(unservedMachines(connected)).toEqual([]);
    const served = extractionCheck(connected);
    const cut = running({ ...state, pipes: state.pipes.filter((run) => run.equipmentId !== thicknesser.id) });
    expect(unservedMachines(cut).map((item) => item.id)).toEqual([thicknesser.id]);
    const unserved = extractionCheck(cut);
    expect(unserved.short).toBe(true);
    // The pipe moved nothing in the sums but the connection: the same demand either way, and
    // the fan's allowance is the fan's whether the machine is on it or not.
    expect(unserved.allowed).toBe(served.allowed);
    // The used saw is connected and ungated, so its branch is open and it counts with the
    // thicknesser whenever the fan runs (CLAUDE.md T13 3.11).
    const saw = machinesOf(state, 'tableSaw')[0];
    if (!saw) throw new Error('no saw');
    expect(served.demand).toBe(extractionDemandOf(thicknesser) + extractionDemandOf(saw));
  });

  it('makes the same dust connected or not: the family figure, never the class or the gate', () => {
    for (const item of state.equipment) {
      expect(dustOutputOf(item.specId)).toBe(DUST_OUTPUT_M3_PER_HOUR[item.specId] ?? 0);
    }
    const gated = act(state, { type: 'BUY_GATE', equipmentId: thicknesser.id });
    expect(gated.gates).toContain(thicknesser.id);
    expect(dustOutputOf(thicknesser.specId)).toBe(DUST_OUTPUT_M3_PER_HOUR.thicknesser);
    // No class of any family carries a dust figure of its own.
    for (const spec of EQUIPMENT_SPECS) {
      for (const variant of spec.variants) expect(variant).not.toHaveProperty('dust');
    }
  });
});

describe('10.2 one ledger: the month end lines sum to the cash delta of every played month', () => {
  const months: Array<[string, GameState]> = [
    ['Easy, careful, two months', playUntilDay(newGame({ seed: SEED, difficulty: 'easy' }), 62, CAREFUL)],
    ['Hard, idle, one month', playUntilDay(newGame({ seed: SEED, difficulty: 'hard' }), 32, IDLE)],
    [
      'Very easy, a joiner and a loan, one month',
      playUntilDay(
        act(newGame({ seed: SEED, difficulty: 'veryEasy' }), { type: 'TAKE_LOAN', amount: 5000 }),
        32,
        { ...CAREFUL, hireJoiner: true },
      ),
    ],
  ];

  it('holds for each month of each of them', () => {
    for (const [name, state] of months) {
      const last = monthOfDay(state.clock.day - 1);
      for (let month = 1; month <= last; month += 1) {
        const report = monthReport(state, month);
        expect(report.cashClose - report.cashOpen, `${name}, month ${month}`).toBeCloseTo(report.net, 1);
        expect(report.lines.map((line) => line.id), name).toEqual(MONTH_LINES.map((line) => line.id));
      }
    }
  });
});

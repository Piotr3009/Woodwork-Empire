// Letting a man go (PIOTR, 18.09: "how do I fire people?"; CLAUDE.md T20 2.4). One click gives
// him a week's notice: he works it out, he is paid for it, he counts against the crew and the
// hiring gate until it is up, and the morning after his last day his jobs and his contracts are a
// man short. It costs no reputation.

import { describe, expect, it } from 'vitest';
import { LET_GO_NOTICE_DAYS, crewCount, letGo, letGoCheck, runStaffDayStart } from '../../src/engine/staff';
import { canHire, crewLine, hiringOptions } from '../../src/engine/staff';
import { weeklyWageBill } from '../../src/engine/economy';
import { acceptContract, assignContract, drawContract } from '../../src/engine/contracts';
import { assignJob } from '../../src/engine/jobs';
import { formatCalendarDay } from '../../src/engine/clock';
import type { GameState, Worker } from '../../src/engine/index';
import {
  acceptNow,
  buyStartingKit,
  fillRack,
  firstJob,
  hireNow,
  newGame,
  placeEnquiry,
  placeEquipment,
} from '../helpers';

/** A hall with one joiner on the books this morning, and a job on the bench for him. */
function withAJoiner(): { state: GameState; man: Worker } {
  let state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 60);
  state.enquiries = [];
  // The welfare and the tools a joiner cannot start without (CLAUDE.md T6 3.5).
  placeEquipment(state, 'locker', { x: 6, y: 9 });
  placeEquipment(state, 'canteenSeat', { x: 8, y: 9 });
  placeEquipment(state, 'handToolSet', { x: 12, y: 9 });
  placeEquipment(state, 'toolCabinet', { x: 10, y: 9 });
  state.reputation = 20;
  state = hireNow(state, 'joiner', 'experienced');
  const enquiry = placeEnquiry(state, { price: 6000, deadlineDays: 60 });
  state = acceptNow(state, enquiry.id);
  // The man of the state that comes back: every helper hands back a copy, so he is read last.
  const man = state.workers[0];
  if (!man) throw new Error('nobody on the books');
  man.startDay = state.clock.day;
  const job = firstJob(state);
  job.stage = 'ready';
  return { state, man };
}

/** The morning of this day, as the day start runs it. */
function morningOf(state: GameState, day: number): void {
  state.clock.day = day;
  runStaffDayStart(state);
}

describe('let go', () => {
  it('gives him a week of notice, and says when he goes', () => {
    const { state, man } = withAJoiner();
    expect(letGoCheck(state, man.id).ok).toBe(true);
    const reputation = state.reputation;
    expect(letGo(state, man.id)).toBe(true);
    expect(man.leavesOnDay).toBe(state.clock.day + LET_GO_NOTICE_DAYS);
    // Letting somebody go costs no reputation: the trade thinks nothing of it.
    expect(state.reputation).toBe(reputation);
    // And he cannot be given his notice twice: the row says the date instead.
    expect(letGo(state, man.id)).toBe(false);
    expect(letGoCheck(state, man.id).reason).toBe(
      `leaves on ${formatCalendarDay(man.leavesOnDay ?? 0)}`,
    );
  });

  it('keeps him on the books, paid, and counted, until the notice is up', () => {
    const { state, man } = withAJoiner();
    const bill = weeklyWageBill(state);
    expect(bill).toBe(man.weeklyWage);
    letGo(state, man.id);
    const crew = crewCount(state);
    // Every day of the notice: still on the books, still paid, still counted against the floor
    // and against the hiring gate (CLAUDE.md T17 2.11, T13 3.10).
    for (let day = state.clock.day; day <= (man.leavesOnDay ?? 0); day += 1) {
      morningOf(state, day);
      expect(state.workers).toHaveLength(1);
      expect(weeklyWageBill(state)).toBe(bill);
      expect(crewCount(state)).toBe(crew);
    }
    // The morning after his last day he is gone, and the floor has room again.
    morningOf(state, (man.leavesOnDay ?? 0) + 1);
    expect(state.workers).toHaveLength(0);
    expect(weeklyWageBill(state)).toBe(0);
    expect(crewCount(state)).toBe(crew - 1);
  });

  it('drops him off his job the morning he goes, and leaves nobody on it', () => {
    const { state, man } = withAJoiner();
    const job = firstJob(state);
    expect(assignJob(state, job.id, man.id)).toBe(true);
    expect(job.assignees).toContain(man.id);
    letGo(state, man.id);
    morningOf(state, (man.leavesOnDay ?? 0) + 1);
    expect(state.workers).toHaveLength(0);
    expect(firstJob(state).assignees).toHaveLength(0);
  });

  it('drops him off his contract the morning he goes', () => {
    const { state, man } = withAJoiner();
    const contract = drawContract(state);
    state.contracts.push(contract);
    expect(acceptContract(state, contract.id).ok).toBe(true);
    expect(assignContract(state, contract.id, man.id, true).ok).toBe(true);
    expect(contract.assigned).toContain(man.id);
    letGo(state, man.id);
    morningOf(state, (man.leavesOnDay ?? 0) + 1);
    expect(state.contracts[0]?.assigned).toHaveLength(0);
  });

  it('is counted by the crew limit and the hiring gate until he has gone', () => {
    const { state, man } = withAJoiner();
    // The floor counts the owner and the crew, and the team page prints the count
    // (CLAUDE.md T13 3.10). A man under notice is still on the floor.
    const line = crewLine(state);
    expect(line).toContain('Crew 2 /');
    letGo(state, man.id);
    morningOf(state, (man.leavesOnDay ?? 0) - 1);
    expect(crewLine(state)).toBe(line);
    // And the hire is refused for exactly the same reason while he is still there.
    const during = hiringOptions(state).find(
      (option) => option.role === 'joiner' && option.tier === 'experienced',
    );
    expect(canHire(state, 'joiner', 'experienced').reason).toBe(during?.blockReason ?? '');
    morningOf(state, (man.leavesOnDay ?? 0) + 1);
    expect(crewLine(state)).toContain('Crew 1 /');
  });
});

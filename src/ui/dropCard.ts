// Dropping a project, and what it costs before the click (CLAUDE.md T21 2.3;
// docs/mockups/t21/debt.html part 2).
//
// Piotr dropped a 50,000 job with 7,000 in the bank. The deposit he owed came out of an account
// that had nothing in it, the top bar kept saying -7,259, and the game played on. Nothing on screen
// had told him what the click would do, and nothing after it told him what it had done. So
// `Drop project` no longer drops: it
// opens this card, which puts the three figures and the bank's own limit in front of him, and only
// the red button on the card drops anything. It is the one action in the game that takes two
// clicks (PIOTR, 18.09).
//
// The card is a folder card like a machine's: the game's own paper, the one cross, the one button
// helpers. Nothing here is a second version of anything in src/ui/modal.ts.

import { bankruptcyFloor } from '../engine/economy';
import { canAfford, dropReputationCost } from '../engine/index';
import type { GameState, Job } from '../engine/index';
import { button, dangerButton, escapeHtml, money, signedFigure } from './modal';

/** The head of the card: the job by name, and whether it is a commercial client's, because that is
 *  half again on the reputation (CLAUDE.md T21 2.4). */
export function dropCardTitle(job: Job): string {
  const trade = job.kind === 'commercial' ? ', commercial' : '';
  return `Drop ${job.name}${trade}?`;
}

/** What the material bought for this job and written off comes to. The same reading `dropJob`
 *  itself does: a job whose material was ordered in for it loses that money, and a job that drew
 *  from the rack puts what the bench has not cut back on it, which costs nothing
 *  (src/engine/jobs.ts `dropJob`; CLAUDE.md T2 3.6, T9 3.9). */
export function materialWrittenOff(state: GameState, job: Job): number {
  const orderedIn = state.deliveries.some((delivery) => delivery.jobId === job.id);
  return orderedIn ? job.materialCost : 0;
}

/** Whether the deposit can be paid back out of the cash and what the overdraft has left in it. The
 *  one reading the engine does of any cost, `canAfford`; a drop pays it whatever the answer, because
 *  the deposit is not a cost the player can decline, and the account goes under the limit for it
 *  (CLAUDE.md T22 2.1, 2.3). */
export function depositCanBePaid(state: GameState, job: Job): boolean {
  return canAfford(state, job.depositPaid);
}

/** Where the account would stand the moment the deposit went out of it, and what the bank allows:
 *  the two figures the red box is written from. The deposit is paid in full whatever the balance,
 *  so the account after the drop is the cash less the deposit, and what the bank allows is the
 *  bank's own figure (CLAUDE.md T22 2.1, 2.2). */
export function accountAfterDrop(state: GameState, job: Job): { account: number; allowed: number } {
  return { account: state.cash - job.depositPaid, allowed: bankruptcyFloor(state) };
}

/** One line of the card: what it is on the left, what it costs on the right, in the row vocabulary
 *  every list in the game is written in (docs/ui-style.md 11). */
function row(label: string, figure: string): string {
  return (
    `<div class="row"><span class="row-main">${escapeHtml(label)}</span>` +
    `<span class="row-figure">${figure}</span></div>`
  );
}

/** The body of the card: the deposit, the material, the reputation, where the overdraft stands, and
 *  the red box when the deposit cannot be paid back (CLAUDE.md T21 2.3). A small job shows the same
 *  card with green figures and no box, so the player learns the card and not just the danger: the
 *  three costs are money out whatever the job, and the figure that changes colour with the company
 *  is the account, green while it is in the black and red once it is not [TUNE on the reading: the
 *  drawing gives the card no other figure that can carry a sign]. */
export function renderDropCard(state: GameState, job: Job): string {
  const material = materialWrittenOff(state, job);
  const reputation = dropReputationCost(job);
  const rows =
    row(
      'Deposit to return to the client',
      signedFigure(`-${money(job.depositPaid)}`, -job.depositPaid),
    ) +
    row(
      'Material bought for it, written off',
      signedFigure(material === 0 ? money(0) : `-${money(material)}`, -material),
    ) +
    // The points, not pounds, through the same function the drop itself is charged by.
    row('Reputation', signedFigure(`-${reputation}`, -reputation)) +
    overdraftLine(state);
  return `<div class="drop-card">${rows}${dangerBox(state, job)}</div>`;
}

/** Where the account stands against the overdraft, in the words the drawing uses: the balance
 *  carries its sign's colour, and the limit beside it is a fact and carries none. */
function overdraftLine(state: GameState): string {
  return row(
    'You have',
    `${signedFigure(money(state.cash), state.cash)} of ` +
      `${escapeHtml(money(state.finance.overdraftLimit))} overdraft`,
  );
}

/** The red box, and only when the deposit cannot be paid back out of the overdraft. Its last
 *  sentence is one of two, and never a guess: the drop closes the company at the next morning's
 *  look when the account it leaves has passed what the bank allows (`checkBankruptcy`, rule one),
 *  and otherwise the box says the other rule instead, which is the one thing that is true of every
 *  account below the limit. "Puts you N days from the bank closing you" is not something the game
 *  can be sure of, so it is not written (CLAUDE.md T22 2.2, 2.3). */
function dangerBox(state: GameState, job: Job): string {
  if (depositCanBePaid(state, job)) return '';
  const { account, allowed } = accountAfterDrop(state, job);
  const closes = account <= allowed;
  // The look that would close him is the next morning's, because the bank looks once a calendar
  // day at the point the day's money is settled and that day's look has already been (T22 2.2).
  const ending = closes
    ? " Dropping this job closes the company at tomorrow's check."
    : ' The bank counts every day below its limit.';
  return (
    '<p class="warn drop-danger">' +
    escapeHtml(
      'You cannot pay the deposit back from the overdraft. The account goes to ' +
        `${money(account)} against the bank's ${money(allowed)}.${ending}`,
    ) +
    '</p>'
  );
}

/** The two buttons: the red one that does it, and the one that does not. The cross does what
 *  `Keep the job` does (CLAUDE.md T21 2.3). */
export function renderDropCardFooter(job: Job): string {
  return (
    '<p class="choices">' +
    dangerButton('dropJob', 'Drop it anyway', `data-id="${job.id}" data-confirm="1"`) +
    button('keepJob', 'Keep the job') +
    '</p>'
  );
}

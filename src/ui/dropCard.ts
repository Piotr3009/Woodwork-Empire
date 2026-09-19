// Dropping a project, and what it costs before the click (CLAUDE.md T21 2.3;
// docs/mockups/t21/debt.html part 2).
//
// Piotr dropped a 50,000 job with 7,000 in the bank. The deposit he owed went to arrears, the top
// bar kept saying -7,259, and the game played on. Nothing on screen had told him what the click
// would do, and nothing after it told him what it had done. So `Drop project` no longer drops: it
// opens this card, which puts the three figures and the bank's own limit in front of him, and only
// the red button on the card drops anything. It is the one action in the game that takes two
// clicks (PIOTR, 18.09).
//
// The card is a folder card like a machine's: the game's own paper, the one cross, the one button
// helpers. Nothing here is a second version of anything in src/ui/modal.ts.

import { BANKRUPTCY_LIMIT_FACTOR } from '../engine/constants';
import { dropReputationCost, formatMoney } from '../engine/index';
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

/** Whether the deposit can be paid back at all: out of the cash, or out of what the overdraft has
 *  left in it. When it cannot, the deposit becomes arrears, and the arrears are what close a
 *  company (CLAUDE.md T21 2.2, 2.3). */
export function depositCanBePaid(state: GameState, job: Job): boolean {
  return state.cash - job.depositPaid >= state.finance.overdraftLimit;
}

/** Where the company would stand the moment the deposit went to arrears, and what the bank allows:
 *  the two figures the red box is written from (CLAUDE.md T21 2.2). */
export function netAfterDrop(state: GameState, job: Job): { net: number; allowed: number } {
  const arrears = state.finance.arrearsAmount + job.depositPaid;
  return {
    net: state.cash - arrears,
    allowed: state.finance.overdraftLimit * BANKRUPTCY_LIMIT_FACTOR,
  };
}

/** The body of the card: the deposit, the material, the reputation, where the overdraft stands, and
 *  the red box when the deposit cannot be paid back (CLAUDE.md T21 2.3). A small job shows the same
 *  card with green figures and no box, so the player learns the card and not just the danger. */
export function renderDropCard(state: GameState, job: Job): string {
  const material = materialWrittenOff(state, job);
  const reputation = dropReputationCost(job);
  const rows =
    '<div class="row"><span class="row-main">Deposit to return to the client</span>' +
    `${signedFigure(`-${money(job.depositPaid)}`, -job.depositPaid)}</div>` +
    '<div class="row"><span class="row-main">Material bought for it, written off</span>' +
    `${signedFigure(material === 0 ? money(0) : `-${money(material)}`, -material)}</div>` +
    '<div class="row"><span class="row-main">Reputation</span>' +
    `${signedFigure(`-${reputation}`, -reputation)}</div>`;
  return `<div class="drop-card">${rows}${overdraftLine(state)}${dangerBox(state, job)}</div>`;
}

/** Where the account stands against the overdraft, in the words the drawing uses. */
function overdraftLine(state: GameState): string {
  return (
    `<p class="hint">You have ${escapeHtml(formatMoney(state.cash))} of ` +
    `${escapeHtml(formatMoney(state.finance.overdraftLimit))} overdraft</p>`
  );
}

/** The red box, and only when the deposit cannot be paid back. It says `today` when the drop would
 *  close the company at the day's close and nothing at all about days when it would not: a sentence
 *  the game cannot be sure of is not written (CLAUDE.md T21 2.3). */
function dangerBox(state: GameState, job: Job): string {
  if (depositCanBePaid(state, job)) return '';
  const { net, allowed } = netAfterDrop(state, job);
  const closes = net <= allowed;
  const ending = closes ? ' Dropping this job closes the company today.' : '';
  return (
    '<p class="warn drop-danger">' +
    escapeHtml(
      'You cannot pay the deposit back. It goes to arrears: ' +
        `${formatMoney(net)} against the bank's ${formatMoney(allowed)} limit.${ending}`,
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

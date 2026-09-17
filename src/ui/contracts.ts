// The Contracts tab beside Orders, and the standing bar on the Work Plan (CLAUDE.md T13 3.16):
// the offer with Accept and Decline, the active contract with its piece counter, its history and
// its people with the assign controls, and the renew question at the end of the term.

import { CONTRACT_OFFER_DAYS } from '../engine/constants';
import {
  activeContracts,
  closingReport,
  contractAssignCheck,
  contractCounterLine,
  contractPiece,
  contractsAllowed,
  endedContracts,
  formatCalendarDay,
  fullWeeksOf,
  joiners,
  offeredContract,
  shortWeeksOf,
  weekOfTerm,
  weekWanted,
} from '../engine/index';
import {
  contractResultFor,
  contractShortfall,
  endContractCheck,
  sheetsForPieces,
} from '../engine/contracts';
import type { Contract, GameState, Worker } from '../engine/index';
import {
  button,
  days,
  emptyLine,
  escapeHtml,
  lockedButton,
  money,
  plural,
  primaryButton,
  signedMoney,
} from './modal';

function figureRow(label: string, value: number, signed = true): string {
  const tone = signed ? (value < 0 ? ' bad' : value > 0 ? ' good' : '') : '';
  const text = signed ? signedMoney(value) : String(value);
  return (
    `<div class="row"><span class="row-main">${escapeHtml(label)}</span>` +
    `<span class="row-figure${tone}">${text}</span></div>`
  );
}

/** What a piece is, in the words the offer and the bar both use. The material is off the rack
 *  now, so the line says how much of the rack a week of it takes (CLAUDE.md T17 2.22). */
function pieceLine(contract: Contract): string {
  const piece = contractPiece(contract);
  const margin = contract.pricePerPiece - piece.material;
  const week = sheetsForPieces(piece, contract.quantityPerWeek);
  return (
    `${piece.minutes} minutes of ${piece.stages.join(' and ')} a piece, ` +
    `${money(piece.material)} of material in it: ${money(margin)} a piece before labour. ` +
    `It comes off the rack: about ${plural(week, 'sheet', 'sheets')} a week.`
  );
}

/** What the contract makes with this man on it: the price less the material in the piece and less
 *  what his own time costs at his own rate, so the player sees the result of putting him on it
 *  before he does (PIOTR, 17.09; CLAUDE.md T17 2.22). */
function resultLine(contract: Contract, worker: Worker): string {
  const result = contractResultFor(contract, worker);
  return (
    `${result.minutes} minutes a piece, ${money(result.labourCost)} of his time: ` +
    `${signedMoney(result.margin)} a piece`
  );
}

function expiryLine(state: GameState, contract: Contract): string {
  const left = contract.expiresOnDay - state.clock.day;
  if (left <= 0) return 'the offer goes tonight';
  return `the offer stands for ${days(left + 1)} more`;
}

function offerTile(state: GameState, contract: Contract): string {
  const months = Math.round((contract.termWeeks * 7) / 30);
  return (
    `<div class="tile" data-contract="${contract.id}">` +
    `<h3 class="tile-name">${escapeHtml(contract.name)}</h3>` +
    `<p class="tile-price">${money(contract.pricePerPiece)} a piece</p>` +
    `<p class="tile-figures">${contract.quantityPerWeek} a week for ${plural(contract.termWeeks, 'week', 'weeks')}, ` +
    `about ${plural(months, 'month', 'months')} · ${escapeHtml(expiryLine(state, contract))}</p>` +
    `<p class="tile-figures">${escapeHtml(pieceLine(contract))}</p>` +
    `<p class="tile-text">A short week costs a point of reputation and the client remembers it ` +
    'at the end of the term.</p>' +
    `<div class="tile-action">${primaryButton('acceptContract', 'Accept', `data-id="${contract.id}"`)}` +
    `${button('declineContract', 'Decline', `data-id="${contract.id}"`)}</div>` +
    '</div>'
  );
}

/** Every joiner on the books, with the control that puts him on this contract or takes him off. */
function peopleRows(state: GameState, contract: Contract): string {
  const crew = joiners(state);
  if (crew.length === 0) return '<p class="warn">No joiners on the books: hire one for it.</p>';
  const rows = crew
    .map((worker) => {
      const on = contract.assigned.includes(worker.id);
      const check = contractAssignCheck(contract, worker);
      const control = on
        ? button('assignContract', 'Take off', `data-id="${contract.id}" data-worker="${worker.id}" data-on="0"`)
        : check.ok
          ? button('assignContract', 'Put on it', `data-id="${contract.id}" data-worker="${worker.id}" data-on="1"`)
          : lockedButton('Put on it', check.reason);
      const doing = on ? 'on the contract' : worker.jobId === null ? 'free' : 'on a job';
      const result = contractResultFor(contract, worker);
      return (
        `<div class="row${on ? ' is-on-contract' : ''}" data-worker="${worker.id}">` +
        `<span class="row-main">${escapeHtml(worker.name)}` +
        `<small>${escapeHtml(resultLine(contract, worker))}</small></span>` +
        `<span class="row-figure${result.margin < 0 ? ' bad' : ' good'}">${escapeHtml(doing)}</span>` +
        `<span class="row-action">${control}</span></div>`
      );
    })
    .join('');
  const nobody =
    contract.assigned.length === 0
      ? '<p class="warn">Nobody is on it: the week will be short.</p>'
      : '';
  return nobody + rows;
}

function historyRows(contract: Contract): string {
  if (contract.weeks.length === 0) return '';
  const rows = contract.weeks
    .map((week) => {
      const full = week.made >= week.wanted;
      return (
        `<div class="row"><span class="row-main">Week ${week.week}</span>` +
        `<span class="row-figure ${full ? 'good' : 'bad'}">${week.made} / ${week.wanted}, ` +
        `${full ? 'full' : 'short'}</span></div>`
      );
    })
    .join('');
  return `<h4>Delivered</h4>${rows}`;
}

function activeBlock(state: GameState, contract: Contract): string {
  const day = state.clock.day;
  // The first month stands; after it he may walk away for nothing but the work (T17 2.22).
  const ending = endContractCheck(state, contract.id);
  const endIt = ending.ok
    ? button('endContract', 'End it', `data-id="${contract.id}"`)
    : lockedButton('End it', ending.reason);
  const held =
    contract.sheetsReserved > 0 || contractShortfall(state, contract) > 0
      ? ` · ${plural(contract.sheetsReserved, 'sheet', 'sheets')} held on the rack` +
        (contractShortfall(state, contract) > 0 ? ', the rack is short' : '')
      : '';
  return (
    `<div class="contract-active" data-contract="${contract.id}">` +
    `<div class="row"><span class="row-main"><h3>${escapeHtml(contract.name)}</h3></span>` +
    `<span class="row-action">${endIt}</span></div>` +
    `<p class="figures"><strong class="contract-count">${escapeHtml(contractCounterLine(contract, day))}</strong> · ` +
    `week ${weekOfTerm(contract, day)} of ${contract.termWeeks}, ends ` +
    `${formatCalendarDay(contract.endDay ?? day)} · ` +
    `${money(contract.pricePerPiece)} a piece${escapeHtml(held)}</p>` +
    `<p class="hint">${escapeHtml(pieceLine(contract))} The saw stays in the general queue: ` +
    'a better one makes more pieces without a click.</p>' +
    '<h4>People</h4>' +
    peopleRows(state, contract) +
    historyRows(contract) +
    '</div>'
  );
}

function endedBlock(state: GameState, contract: Contract): string {
  const report = closingReport(state, contract);
  const offered = contract.renegotiatedPrice ?? contract.pricePerPiece;
  return (
    `<div class="contract-ended" data-contract="${contract.id}">` +
    `<h3>${escapeHtml(contract.name)}: the term is over</h3>` +
    figureRow('Pieces made', report.pieces, false) +
    figureRow('Revenue', report.revenue) +
    figureRow('Material', -report.material) +
    figureRow(`Labour, ${report.labourHours} hours at cost`, -report.labourCost) +
    figureRow('Net margin', report.margin) +
    `<p class="figures">${fullWeeksOf(contract)} full weeks, ${shortWeeksOf(contract)} short. ` +
    `The client offers <strong>${money(offered)} a piece</strong> for another term of ` +
    `${plural(contract.termWeeks, 'week', 'weeks')}, ${signedMoney(offered - contract.pricePerPiece)} on ` +
    `${money(contract.pricePerPiece)}.</p>` +
    `<div class="row"><span class="row-main"></span><span class="row-action">` +
    `${primaryButton('renewContract', `Renew at ${money(offered)}`, `data-id="${contract.id}" data-accept="1"`)}` +
    `${button('renewContract', 'Let it go', `data-id="${contract.id}" data-accept="0"`)}</span></div>` +
    '</div>'
  );
}

export function renderContracts(state: GameState): string {
  const head =
    '<p class="hint">Repeat work at a low margin: so many pieces a week for a term, at a price a ' +
    'piece. Only people are put on it; the machines stay in the general queue.</p>';
  const offer = offeredContract(state);
  const active = activeContracts(state);
  const ended = endedContracts(state);
  if (!offer && active.length === 0 && ended.length === 0) {
    const why = contractsAllowed(state)
      ? `No contract on offer. A shop rings now and then, and an offer stands for ${plural(CONTRACT_OFFER_DAYS, 'day', 'days')}.`
      : 'No contracts yet. They come with reputation, from the second tier up.';
    return head + emptyLine(why);
  }
  return (
    head +
    ended.map((contract) => endedBlock(state, contract)).join('') +
    (offer ? `<h3>On offer</h3><div class="tile-grid">${offerTile(state, offer)}</div>` : '') +
    active.map((contract) => activeBlock(state, contract)).join('')
  );
}

/** The standing bar on the Work Plan, separate from the jobs, with its piece counter
 *  (CLAUDE.md T13 3.16). Nothing while no contract is running. */
export function renderContractBar(state: GameState): string {
  const active = activeContracts(state);
  if (active.length === 0) return '';
  const day = state.clock.day;
  return active
    .map((contract) => {
      const wanted = weekWanted(contract, day);
      const share = wanted <= 0 ? 100 : Math.min(100, Math.round((contract.piecesThisWeek / wanted) * 100));
      const names = contract.assigned
        .map((id) => state.workers.find((worker) => worker.id === id)?.name ?? '')
        .filter((name) => name !== '');
      const people = names.length === 0 ? 'nobody on it' : names.join(', ');
      return (
        `<div class="contract-bar" data-contract="${contract.id}">` +
        `<div class="row"><span class="row-main">${escapeHtml(contract.name)}</span>` +
        `<span class="contract-count">${escapeHtml(contractCounterLine(contract, day))}</span></div>` +
        `<div class="contract-track"><span class="contract-fill${share < 100 ? '' : ' is-full'}" ` +
        `style="width:${share}%"></span></div>` +
        `<p class="hint">${escapeHtml(people)} · week ${weekOfTerm(contract, day)} of ${contract.termWeeks} · ` +
        `${money(contract.pricePerPiece)} a piece</p>` +
        '</div>'
      );
    })
    .join('');
}

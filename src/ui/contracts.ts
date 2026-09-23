// The Contracts tab beside Orders, and the standing bar on the Work Plan (CLAUDE.md T13 3.16):
// the offer with Accept and Decline, the active contract with its piece counter, its history and
// its people with the assign controls, and the renew question at the end of the term.

import {
  BREAK_MINUTES,
  BREAK_START_MINUTE,
  CONTRACT_FREE_END_DAYS,
  CONTRACT_OFFER_DAYS,
  DAYS_PER_WEEK,
  DAY_END_MINUTE,
  DAY_TRACK_TICK_MINUTES,
  TIER_WORDS,
} from '../engine/constants';
import {
  activeContracts,
  closingReport,
  contractCounterLine,
  contractPiece,
  contractsAllowed,
  endedContracts,
  formatCalendarDay,
  formatTime,
  fullWeeksOf,
  joiners,
  offeredContract,
  onTheBooksToday,
  shortWeeksOf,
  weekOfTerm,
} from '../engine/index';
// Straight off their own module, not round the public API, which Turn 13 froze (REPORT-T13 10).
import {
  contractAssignCheck,
  contractCandidates,
  contractMachineTip,
  contractManCheck,
  contractManOf,
  contractHallLine,
  contractMenNeeded,
  contractResultFor,
  contractShortfall,
  contractWorkerOf,
  endContractCheck,
  endedLine,
  sheetsForPieces,
  weekPace,
} from '../engine/contracts';
import { OWNER } from '../engine/machines';
import { ROLE_WORDS } from './team';
import type { Contract, GameState, Worker } from '../engine/index';
import {
  button,
  closeButton,
  days,
  emptyLine,
  escapeHtml,
  lockedButton,
  minutes,
  money,
  plural,
  primaryButton,
  reasonLabel,
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
function resultLine(state: GameState, contract: Contract, worker: Worker): string {
  const result = contractResultFor(state, contract, worker);
  return (
    `${result.minutes} minutes a piece, ${money(result.labourCost)} of his time` +
    `${result.wear > 0 ? ` and ${money(result.wear)} of wear` : ''}: ` +
    `${signedMoney(result.margin)} a piece, ${signedMoney(result.dayResult)} a day`
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
    hallLine(state, contract) +
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
      const check = contractAssignCheck(state, contract, worker.id);
      const control = on
        ? button('assignContract', 'Take off', `data-id="${contract.id}" data-worker="${worker.id}" data-on="0"`)
        : check.ok
          ? button('assignContract', 'Put on it', `data-id="${contract.id}" data-worker="${worker.id}" data-on="1"`)
          : lockedButton('Put on it', check.reason);
      const doing = on ? 'on the contract' : worker.jobId === null ? 'free' : 'on a job';
      const result = contractResultFor(state, contract, worker);
      return (
        `<div class="row${on ? ' is-on-contract' : ''}" data-worker="${worker.id}">` +
        `<span class="row-main">${escapeHtml(worker.name)}` +
        `<small>${escapeHtml(resultLine(state, contract, worker))}</small></span>` +
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
    `<h3>${escapeHtml(contract.name)}: ${escapeHtml(endedLine(contract))}</h3>` +
    figureRow('Pieces made', report.pieces, false) +
    figureRow('Revenue', report.revenue) +
    figureRow('Material', -report.material) +
    figureRow(`Labour, ${report.labourHours} hours at cost`, -report.labourCost) +
    figureRow('Machine wear over those hours', -report.machineWear) +
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
    '<p class="hint">Repeat work: so many pieces a week for a term, at a price a piece. What a ' +
    'day of it leaves depends on the man and the machine you put on it, wages and wear taken off. ' +
    'Only people are put on it; the machines stay in the general queue.</p>';
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

/** The list the contract's blue button opens: every joiner on the books, with the one click that
 *  puts him on, and everybody else told why not (only a joiner goes on a contract; a man already
 *  on it; a man not in today). A joiner on a job is offered too: the contract takes him alongside
 *  the job, as the engine allows, and the plan shows him on both. */
function contractAssignList(state: GameState, contract: Contract): string {
  const rows = state.workers
    .filter((worker) => onTheBooksToday(state, worker))
    .map((worker) => {
      const head =
        `<span>${escapeHtml(worker.name)} ` +
        `<span class="assign-tier">${escapeHtml(
          manTrade(state, worker.id),
        )}</span></span>`;
      if (contract.assigned.includes(worker.id)) {
        return `<div class="assign-row is-busy">${head}<span class="assign-why">already on this contract</span></div>`;
      }
      const check = contractAssignCheck(state, contract, worker.id);
      if (!check.ok) {
        return `<div class="assign-row is-busy">${head}<span class="assign-why">${escapeHtml(check.reason)}</span></div>`;
      }
      return (
        `<div class="assign-row">${head}` +
        `<button class="chip" data-do="assignContract" data-id="${contract.id}" data-worker="${worker.id}" data-on="1">add</button>` +
        '</div>'
      );
    })
    .join('');
  return (
    '<div class="assign-list" data-popover="assign-contract">' + closeButton('closeAssign') +
    `<span class="row-figure">Who goes on ${escapeHtml(contract.name)}?</span>${rows}</div>`
  );
}

// ---------------------------------------------------------------------------
// The Contracts tab of the Work Plan (PIOTR, the mockup of docs/mockups/t20/contracts-tab.html;
// CLAUDE.md T20 2.1): On offer, with every figure worked out for the man who would do it and his
// day drawn as blocks; Running, with the men on it and what is left of their day going to the job
// they are also on; and Ended, the closing report, greyed.
// ---------------------------------------------------------------------------

/** The name a man is drawn under. The owner is You, as he is on a job card. */
function manName(state: GameState, who: string): string {
  if (who === OWNER) return 'You';
  return state.workers.find((worker) => worker.id === who)?.name ?? who;
}

/** His trade under his name: "experienced joiner", "owner". The words of a tier are TIER_WORDS
 *  and nowhere else (CLAUDE.md T20 2.5). */
function manTrade(state: GameState, who: string): string {
  if (who === OWNER) return 'owner';
  const worker = state.workers.find((entry) => entry.id === who);
  if (!worker) return '';
  const trade = ROLE_WORDS[worker.role];
  return worker.tier === null ? trade : `${TIER_WORDS[worker.tier]} ${trade}`;
}

/** One row of figures that is a count and not money. */
function countRow(label: string, text: string, tone = ''): string {
  return (
    `<div class="row"><span class="row-main">${escapeHtml(label)}</span>` +
    `<span class="row-figure${tone === '' ? '' : ` ${tone}`}">${escapeHtml(text)}</span></div>`
  );
}

/** One block of a man's day: where it starts and ends in the minutes of the working day, what it
 *  is, and what is written on it. */
interface DayBlock {
  from: number;
  to: number;
  kind: 'piece' | 'lunch' | 'free';
  label: string;
}

/** A man's day, 8:00 to 17:00, as the drawing has it: one block a piece, the lunch block where he
 *  puts his tools down, and the tail of the day free. The job block of Turn 20 is gone with the
 *  split day: a man on a contract has no job to give his afternoon to (PIOTR, 21.09; v42). */
function dayBlocks(pieces: number, perPiece: number): DayBlock[] {
  const blocks: DayBlock[] = [];
  const rest = 'free';
  const kind: DayBlock['kind'] = 'free';
  let at = 0;
  let lunch = false;
  const takeLunch = (from: number): number => {
    blocks.push({ from, to: from + BREAK_MINUTES, kind: 'lunch', label: 'lunch' });
    lunch = true;
    return from + BREAK_MINUTES;
  };
  for (let piece = 1; piece <= pieces; piece += 1) {
    // He does not start a piece he would have to put down for his dinner.
    if (!lunch && at + perPiece > BREAK_START_MINUTE) at = takeLunch(at);
    blocks.push({ from: at, to: at + perPiece, kind: 'piece', label: String(piece) });
    at += perPiece;
  }
  if (!lunch && at < BREAK_START_MINUTE) {
    if (at < BREAK_START_MINUTE) blocks.push({ from: at, to: BREAK_START_MINUTE, kind, label: rest });
    at = takeLunch(BREAK_START_MINUTE);
  }
  if (at < DAY_END_MINUTE) blocks.push({ from: at, to: DAY_END_MINUTE, kind, label: rest });
  return blocks;
}

function across(minute: number): number {
  return Math.round((minute / DAY_END_MINUTE) * 10000) / 100;
}

/** The clock under a day track, every `DAY_TRACK_TICK_MINUTES` of it from 8:00, and the end of the
 *  day on the right. The last two hour mark is left off when the end is nearer to it than half of
 *  that, so the two labels never sit on top of each other. */
function dayTicks(): number[] {
  const ticks: number[] = [];
  for (
    let at = 0;
    at < DAY_END_MINUTE - DAY_TRACK_TICK_MINUTES / 2;
    at += DAY_TRACK_TICK_MINUTES
  ) {
    ticks.push(at);
  }
  ticks.push(DAY_END_MINUTE);
  return ticks;
}

/** The track itself, with the head above it and the clock under it. */
function dayTrack(head: string, figure: string, blocks: DayBlock[]): string {
  const drawn = blocks
    .map((block) => {
      const classes =
        'contract-day-block' + (block.kind === 'piece' ? '' : ` is-${block.kind}`);
      return (
        `<span class="${classes}" style="left:${across(block.from)}%;` +
        `width:${across(block.to - block.from)}%" title="${escapeHtml(block.label)}">` +
        `${escapeHtml(block.label)}</span>`
      );
    })
    .join('');
  const ticks = dayTicks()
    .map((minute) => `<span>${formatTime(minute)}</span>`)
    .join('');
  return (
    '<div class="contract-day">' +
    `<div class="row"><span class="row-main">${escapeHtml(head)}</span>` +
    `<span class="row-figure">${escapeHtml(figure)}</span></div>` +
    `<div class="contract-day-track">${drawn}</div>` +
    `<div class="contract-day-ticks">${ticks}</div>` +
    '</div>'
  );
}

/** His day on the offer: pieces from 8:00 to 17:00, and the minutes at the end of it going into
 *  the piece he carries into the morning. The contract has the whole of his day (v42). */
function offerDay(state: GameState, contract: Contract, who: string, head: string): string {
  const result = contractResultFor(state, contract, contractWorkerOf(state, who));
  return dayTrack(
    head,
    `${plural(result.piecesPerDay, 'piece', 'pieces')}, ${result.freeMinutes} min into the next`,
    dayBlocks(result.piecesPerDay, result.minutes),
  );
}

/** The hint under the day's pieces when one man cannot make the client's day: how many men like
 *  him the contract is for, and on a running contract how many are on it (PIOTR, 22.09: "the hint
 *  is: this contract is for two men at the least"; v51). Nothing when he can. */
function menNeededLine(state: GameState, contract: Contract, who: string, onIt: number | null): string {
  const needed = contractMenNeeded(state, contract, contractWorkerOf(state, who));
  if (needed <= 1 || (onIt !== null && onIt >= needed)) return '';
  const tail = onIt === null ? '' : `, ${plural(onIt, 'man', 'men')} on it`;
  return `<p class="hint contract-hands bad">This contract is for ${plural(needed, 'man', 'men')} at the least${tail}.</p>`;
}

/** What the hall makes of the piece in a week at full crew against what the term wants, before
 *  the contract is taken (CLAUDE.md T25 2.7): one row, the hall on the left and what the term wants
 *  as its figure, in the green when the hall keeps up and the red when it cannot. A row and not a
 *  hint, because a row's figure is what the board's paper prints green and red; a hint is inked in
 *  the skin's own grey whatever its class (`.modal-board .row-figure.good`, styles.css). The same
 *  row on the offer tile and the Contracts tab's offer card. */
function hallLine(state: GameState, contract: Contract): string {
  const line = contractHallLine(state, contract);
  return (
    '<div class="row" data-hall-makes>' +
    `<span class="row-main">${escapeHtml(line.hall)};</span>` +
    `<span class="row-figure ${line.short ? 'bad' : 'good'}">${escapeHtml(line.wants)}</span></div>`
  );
}

/** The one machine that would shorten the piece most among those the hall has not got, in the
 *  drawing's own words, every figure of it computed (CLAUDE.md T20 2.1.1). */
function machineTipLine(state: GameState, contract: Contract, who: string): string {
  const tip = contractMachineTip(state, contract, who);
  if (tip === null) return '';
  return (
    `<p class="hint contract-tip">A ${escapeHtml(tip.name)} would take the piece to ` +
    `${minutes(tip.minutes)}: ${escapeHtml(manName(state, who))} makes ${tip.piecesPerDay} a day, ` +
    `${signedMoney(tip.weekGain)} a week.</p>`
  );
}

/** The chips that pick the man the card is worked out for: one of N, the way the game draws one
 *  of N everywhere else (CLAUDE.md T20 2.1.1). */
function manPicker(state: GameState, contract: Contract, who: string): string {
  const chips = contractCandidates(state)
    .map((man) => {
      const result = contractResultFor(state, contract, contractWorkerOf(state, man));
      const under = `${manTrade(state, man)}, ${minutes(result.minutes)} a piece`;
      return (
        `<button class="chip${man === who ? ' is-on' : ''}" data-do="pickContractMan" ` +
        `data-id="${contract.id}" data-worker="${man}">${escapeHtml(manName(state, man))}` +
        `<span class="assign-tier">${escapeHtml(under)}</span></button>`
      );
    })
    .join('');
  return (
    '<div class="assign-line contract-men"><span class="hint">Who would do it?</span>' +
    `${chips}</div>`
  );
}

/** The man the card compares him with: the next best of the others by what the week comes to. */
function nextBestMan(state: GameState, contract: Contract, who: string): string | null {
  let best: string | null = null;
  let bestWeek = 0;
  for (const man of contractCandidates(state)) {
    if (man === who) continue;
    const result = contractResultFor(state, contract, contractWorkerOf(state, man));
    if (best === null || result.weekResult > bestWeek) {
      best = man;
      bestWeek = result.weekResult;
    }
  }
  return best;
}

/** One offer on the board, costed for the man who would do it (CLAUDE.md T20 2.1.1). */
function offerCard(state: GameState, contract: Contract, picked: string | null): string {
  const who = contractManOf(state, picked);
  const worker = contractWorkerOf(state, who);
  const result = contractResultFor(state, contract, worker);
  const piece = contractPiece(contract);
  const name = manName(state, who);
  const check = contractManCheck(state, who);
  // A button that does what it says: with a man who can go on it, one click takes it and puts him
  // on it; with the owner, who cannot, it takes it and says so (CLAUDE.md T20 2.1.1).
  const take = check.ok
    ? primaryButton('takeContract', `Take it, ${name} on it`, `data-id="${contract.id}" data-worker="${who}"`)
    : primaryButton('acceptContract', 'Take it', `data-id="${contract.id}"`) + reasonLabel(check.reason);
  const other = nextBestMan(state, contract, who);
  return (
    `<div class="card contract-offer" data-contract="${contract.id}"><div class="card-main">` +
    `<h3>${escapeHtml(contract.name)}</h3>` +
    `<p class="figures">${contract.quantityPerWeek} a week, ` +
    `${plural(contract.termWeeks, 'week', 'weeks')}, ${money(contract.pricePerPiece)} a piece, ` +
    `${minutes(piece.minutes)} a piece by hand · ${escapeHtml(expiryLine(state, contract))}</p>` +
    manPicker(state, contract, who) +
    countRow('Price a piece', money(contract.pricePerPiece)) +
    figureRow('Material a piece, from stock', -result.material) +
    figureRow(`${name === 'You' ? 'Your' : `${name}'s`} labour a piece, ${minutes(result.minutes)}`, -result.labourCost) +
    // The service those minutes cost the machine he stands at, a tenth of its price every
    // service interval: the line the typed prices of v28 to v39 forgot (PIOTR, 21.09; v40).
    figureRow(
      result.machineName === '' ? 'Machine wear a piece, by hand' : `Machine wear a piece, ${result.machineName.toLowerCase()}`,
      -result.wear,
    ) +
    figureRow('Margin a piece', result.margin) +
    // The client's quantity is the least he will take, not the most: every piece over it is
    // bought too, so a fast man on it is worth more and the row says so (PIOTR, 21.09; v42).
    countRow(
      `Pieces ${name} makes in a day`,
      `${result.piecesPerDay}, the client asks ${result.piecesNeededPerDay} at the least`,
      result.piecesPerDay >= result.piecesNeededPerDay ? 'good' : 'bad',
    ) +
    // One says the hall and the other says the men (CLAUDE.md T25 2.7): the hall's line first.
    hallLine(state, contract) +
    menNeededLine(state, contract, who, null) +
    figureRow(`A day of ${name === 'You' ? 'your' : `${name}'s`} pieces, after wages and wear`, result.dayResult) +
    figureRow(
      `The week: ${result.piecesPerWeek} pieces, five days of wages already counted`,
      result.weekResult,
    ) +
    figureRow(`Over the term, ${plural(contract.termWeeks, 'week', 'weeks')}`, result.termResult) +
    machineTipLine(state, contract, who) +
    offerDay(state, contract, who, `${name === 'You' ? 'Your' : `${name}'s`} day on this contract`) +
    (other === null
      ? ''
      : offerDay(state, contract, other, `${manName(state, other)}, for comparison`)) +
    `<div class="row"><span class="row-main"></span><span class="row-action">${take}` +
    `${button('declineContract', 'Decline', `data-id="${contract.id}"`)}</span></div>` +
    '</div></div>'
  );
}

/** The men on this contract as chips with a cross apiece, and the one button that opens the list
 *  of who else could go on it: the same controls the Work Plan carried in v28, moved into Running
 *  (CLAUDE.md T20 2.1.2, 2.1.5). */
function runningPeople(state: GameState, contract: Contract, open: boolean): string {
  const chips = contract.assigned
    .map((id) => {
      const worker = state.workers.find((entry) => entry.id === id);
      if (!worker) return '';
      return (
        `<span class="assign-chip">${escapeHtml(worker.name)}` +
        `<button class="assign-off" data-do="assignContract" data-id="${contract.id}" ` +
        `data-worker="${id}" data-on="0" title="${escapeHtml(`Take ${worker.name} off this contract`)}">×</button>` +
        '</span>'
      );
    })
    .join('');
  const nobody = chips === '' ? '<span class="assign-none">Nobody is on it</span>' : '';
  const opener =
    `<button class="btn btn-primary assign-open" data-do="${open ? 'closeAssign' : 'openAssign'}" ` +
    `data-id="${contract.id}">Assign to this contract</button>`;
  return (
    `<span class="row-action assign-line">${nobody}${chips}${opener}</span>` +
    (open ? contractAssignList(state, contract) : '')
  );
}

/** What the men on it make a piece, on average: one figure, whoever is standing at it. */
function marginWithTheMen(state: GameState, contract: Contract): number {
  const men = contract.assigned;
  if (men.length === 0) return 0;
  let total = 0;
  for (const id of men) total += contractResultFor(state, contract, contractWorkerOf(state, id)).margin;
  return Math.round((total / men.length) * 100) / 100;
}

/** A man's day on a running contract: pieces from 8:00 to 17:00 and the minutes at the end going
 *  into the next one. The contract has his whole day, so there is no job block on the track any
 *  more (PIOTR, 21.09; v42). */
function runningDay(state: GameState, contract: Contract, id: string): string {
  const worker = contractWorkerOf(state, id);
  if (worker === null) return '';
  const result = contractResultFor(state, contract, worker);
  const figure = `${plural(result.piecesPerDay, 'piece', 'pieces')}, ${result.freeMinutes} min into the next`;
  return dayTrack(`${worker.name}'s day`, figure, dayBlocks(result.piecesPerDay, result.minutes));
}

/** One running contract: the week live, what it is making, the men on it and their day
 *  (CLAUDE.md T20 2.1.2). */
function runningCard(state: GameState, contract: Contract, assignOpen: string | null): string {
  const day = state.clock.day;
  const pace = weekPace(state, contract);
  const margin = marginWithTheMen(state, contract);
  const ending = endContractCheck(state, contract.id);
  const freeAfter = Math.round(CONTRACT_FREE_END_DAYS / DAYS_PER_WEEK);
  const endIt = ending.ok
    ? button('endContract', `End the contract, free after week ${freeAfter}`, `data-id="${contract.id}"`)
    : lockedButton('End the contract', ending.reason);
  const share = pace.wanted <= 0 ? 100 : Math.min(100, Math.round((pace.made / pace.wanted) * 100));
  return (
    `<div class="contract-bar" data-contract="${contract.id}">` +
    `<div class="row"><span class="row-main"><h3>${escapeHtml(contract.name)}</h3></span>` +
    `<span class="row-figure">week ${weekOfTerm(contract, day)} of ${contract.termWeeks}, ` +
    `${contract.quantityPerWeek} a week, ${money(contract.pricePerPiece)} a piece</span></div>` +
    `<div class="contract-track"><span class="contract-fill${share < 100 ? '' : ' is-full'}" ` +
    `style="width:${share}%"></span></div>` +
    runningPeople(state, contract, assignOpen === contract.id) +
    countRow(
      'This week',
      `${pace.made} of ${pace.wanted}, ${pace.onCourse ? 'on course' : 'short'}`,
      pace.onCourse ? 'good' : 'bad',
    ) +
    figureRow('Margin a piece with the men on it', margin) +
    figureRow('This week so far', Math.round(pace.made * margin * 100) / 100) +
    figureRow('Term so far', closingReport(state, contract).margin) +
    countRow('Delivered in full', `${fullWeeksOf(contract)} of ${contract.weeks.length} weeks`) +
    // The hint is worked out for the first man on it, whose day is drawn first under it; a
    // contract with nobody on it is worked out for the first man who could go on it.
    menNeededLine(state, contract, contract.assigned[0] ?? contractManOf(state, null), contract.assigned.length) +
    contract.assigned.map((id) => runningDay(state, contract, id)).join('') +
    `<div class="row"><span class="row-main"></span><span class="row-action">${endIt}</span></div>` +
    '</div>'
  );
}

/** The closing report of a term that is over, greyed. The renew question is the Orders page's,
 *  where the event sends the player (CLAUDE.md T20 2.1.3). */
function endedCard(state: GameState, contract: Contract): string {
  const report = closingReport(state, contract);
  return (
    `<div class="contract-ended dim" data-contract="${contract.id}">` +
    `<div class="row"><span class="row-main"><h3>${escapeHtml(contract.name)}</h3></span>` +
    `<span class="row-figure">${escapeHtml(endedLine(contract))}, ` +
    `${fullWeeksOf(contract)} full and ${shortWeeksOf(contract)} short</span></div>` +
    countRow('Pieces', String(report.pieces)) +
    figureRow('Revenue', report.revenue) +
    figureRow('Material', -report.material) +
    figureRow(`Labour, ${report.labourHours} hours at cost`, -report.labourCost) +
    figureRow('Net', report.margin) +
    '</div>'
  );
}

/** The Contracts tab of the Work Plan, section by section as the drawing has them
 *  (CLAUDE.md T20 2.1). */
export function renderContractsTab(
  state: GameState,
  assignOpen: string | null = null,
  /** The man an offer card is worked out for, or null for the card's own first choice. */
  contractMan: string | null = null,
): string {
  const offer = offeredContract(state);
  const active = activeContracts(state);
  const ended = endedContracts(state);
  if (!offer && active.length === 0 && ended.length === 0) {
    return emptyLine(
      contractsAllowed(state)
        ? `No contract on offer. A shop rings now and then, and an offer stands for ${plural(CONTRACT_OFFER_DAYS, 'day', 'days')}.`
        : 'No contracts yet. They come with reputation, from the second tier up.',
    );
  }
  return (
    '<h3>On offer</h3>' +
    (offer === null ? emptyLine('Nothing on offer today.') : offerCard(state, offer, contractMan)) +
    '<h3>Running</h3>' +
    (active.length === 0
      ? emptyLine('No contract is running.')
      : active.map((contract) => runningCard(state, contract, assignOpen)).join('')) +
    (ended.length === 0
      ? ''
      : `<h3>Ended</h3>${ended.map((contract) => endedCard(state, contract)).join('')}`)
  );
}

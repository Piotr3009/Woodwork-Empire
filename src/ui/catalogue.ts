// The equipment catalogue: everything buyable, with the locked ladder on show (CLAUDE.md 9.2).

import { EQUIPMENT_SPECS, SOFTWARE_ONE_OFF_PRICE, SOFTWARE_SUBSCRIPTION_MONTHLY } from '../engine/constants';
import { canBuy, canBuySoftware, countOf } from '../engine/index';
import type { GameState } from '../engine/index';
import {
  emptyLine,
  escapeHtml,
  filterField,
  lockedButton,
  money,
  primaryButton,
} from './modal';

export function renderCatalogue(state: GameState, filter: string): string {
  const needle = filter.trim().toLowerCase();
  const rows = EQUIPMENT_SPECS.filter(
    (spec) => needle === '' || spec.name.toLowerCase().includes(needle),
  )
    .map((spec) => {
      const check = canBuy(state, spec.id);
      const count = countOf(state, spec.id);
      const owned = count > 0 ? `<span class="badge">Owned ${count}</span>` : '';
      const action = check.ok
        ? primaryButton('buyEquipment', 'Buy', `data-id="${spec.id}"`)
        : lockedButton('Buy', check.reason);
      return (
        `<div class="card${check.ok ? '' : ' is-locked'}">` +
        `<div class="card-main"><h3>${escapeHtml(spec.name)} ${owned}</h3>` +
        `<p class="figures"><strong>${money(spec.price)}</strong> · ` +
        `${escapeHtml(spec.effect)}</p>` +
        (check.ok ? '' : `<p class="lock">${escapeHtml(check.reason)}</p>`) +
        `</div><div class="card-action">${action}</div></div>`
      );
    })
    .join('');
  const software = renderSoftware(state);
  return (
    filterField('catalogue', filter, 'Filter the catalogue') +
    (rows === '' ? emptyLine('Nothing matches that.') : rows) +
    software
  );
}

function renderSoftware(state: GameState): string {
  const oneOff = canBuySoftware(state, 'oneOff');
  const subscription = canBuySoftware(state, 'subscription');
  const current =
    state.software.mode === 'none'
      ? 'No licence'
      : state.software.mode === 'oneOff'
        ? `One off, ${state.software.jobsRemaining} jobs left`
        : 'Subscription';
  return (
    '<h3>Management software</h3>' +
    `<p class="hint">${escapeHtml(current)}</p>` +
    '<div class="card"><div class="card-main"><h3>One off licence</h3>' +
    `<p class="figures"><strong>${money(SOFTWARE_ONE_OFF_PRICE)}</strong> · ` +
    'good for 30 jobs, then buy it again.</p></div>' +
    `<div class="card-action">${
      oneOff.ok
        ? primaryButton('buySoftware', 'Buy', 'data-id="oneOff"')
        : lockedButton('Buy', oneOff.reason)
    }</div></div>` +
    '<div class="card"><div class="card-main"><h3>Subscription</h3>' +
    `<p class="figures"><strong>${money(SOFTWARE_SUBSCRIPTION_MONTHLY)}</strong> a month · ` +
    'quietly eats cash on the 1st.</p></div>' +
    `<div class="card-action">${
      subscription.ok
        ? primaryButton('buySoftware', 'Subscribe', 'data-id="subscription"')
        : lockedButton('Subscribe', subscription.reason)
    }</div></div>`
  );
}

// The Security tab of the laptop, under Admin (CLAUDE.md T13 3.17): the ladder from nothing to a
// firm that takes the risk to zero, so the player feels fixed costs. Every figure on it is the
// engine's; the tab prints what it is handed.

import { SECURITY_LEVELS, SECURITY_SCALE_AREA_M2, SECURITY_SCALE_VALUE } from '../engine/constants';
import type { SecurityLevelSpec } from '../engine/constants';
import {
  burglaryPaidOut,
  securityCheck,
  securityLevel,
  securitySubscriptionParts,
  trimmed,
} from '../engine/index';
import type { GameState } from '../engine/index';
import { button, escapeHtml, lockedButton, money } from './modal';

/** The risk a month as the player reads it: a percentage, or the word for none. */
export function riskLine(spec: SecurityLevelSpec): string {
  if (spec.risk <= 0) return 'burglary risk none: zero means zero';
  return `burglary risk ${trimmed(spec.risk * 100, 2)}% a month`;
}

/** What a level costs, in words: once, a month, both, or a subscription scaled to this hall. */
export function costLine(state: GameState, spec: SecurityLevelSpec): string {
  const parts: string[] = [];
  if (spec.price > 0) parts.push(`${money(spec.price)} once`);
  if (spec.scaled) {
    parts.push(`${money(securitySubscriptionParts(state, spec.level).monthly)} a month at this hall`);
  } else if (spec.monthly > 0) {
    parts.push(`${money(spec.monthly)} a month`);
  }
  return parts.length === 0 ? 'nothing' : parts.join(' plus ');
}

/** The formula of a scaled level in words, with this hall's own figures in it (CLAUDE.md T13
 *  3.17): the base a month, times the area over the reference area, times one plus the insured
 *  value over the reference value. */
export function formulaLine(state: GameState, spec: SecurityLevelSpec): string {
  if (!spec.scaled) return '';
  const parts = securitySubscriptionParts(state, spec.level);
  return (
    `The firm charges ${money(parts.base)} a month for a hall of ${SECURITY_SCALE_AREA_M2} m² ` +
    `with nothing in it, times the hall's area over that (${parts.areaM2} m², so ` +
    `× ${trimmed(parts.areaFactor, 2)}), times one plus the insured value over ` +
    `${money(SECURITY_SCALE_VALUE)} (${money(parts.insured)} insured, so × ${trimmed(parts.valueFactor, 2)}): ` +
    `${money(parts.monthly)} a month.`
  );
}

function levelCard(state: GameState, spec: SecurityLevelSpec): string {
  const held = state.security.level === spec.level;
  const check = securityCheck(state, spec.level);
  const label = spec.level > state.security.level ? 'Buy' : 'Go back to this';
  const action = held
    ? '<span class="badge badge-held">Held</span>'
    : check.ok
      ? button('setSecurityLevel', label, `data-id="${spec.level}"`)
      : lockedButton(label, check.reason);
  const formula = formulaLine(state, spec);
  return (
    `<div class="card security-level${held ? ' is-held' : ''}" data-level="${spec.level}">` +
    `<div class="card-main"><h3>Level ${spec.level}: ${escapeHtml(spec.name)}</h3>` +
    `<p class="figures"><strong>${escapeHtml(costLine(state, spec))}</strong> · ` +
    `${escapeHtml(riskLine(spec))}</p>` +
    (formula === '' ? '' : `<p class="figures dim">${escapeHtml(formula)}</p>`) +
    `</div><div class="card-action">${action}</div></div>`
  );
}

export function renderSecurity(state: GameState): string {
  const level = securityLevel(state);
  const insurer = state.insurance.property
    ? burglaryPaidOut(state)
      ? '<p class="hint">Property cover held: a burglary is paid out.</p>'
      : '<p class="warn">Property cover held, but no alarm: the insurer pays nothing on a burglary. ' +
        'Level 1 is the least it asks for.</p>'
    : '<p class="hint">No property cover: whatever a burglary takes is gone for good. ' +
      'The Insurance tab is next door.</p>';
  return (
    `<p class="hint">Held: level ${level.level}, ${escapeHtml(level.name)}. ` +
    'A burglary takes one or two machines, the dearest first, and the free stock. ' +
    'Levels 1 to 3 are bought once; the two firms are a subscription that grows with the hall ' +
    'and what is in it, and the good one takes the risk to nothing.</p>' +
    insurer +
    SECURITY_LEVELS.map((spec) => levelCard(state, spec)).join('')
  );
}

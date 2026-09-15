// The Website tab of the laptop, under Admin (CLAUDE.md T13 3.7): the five levels as a ladder,
// the one held marked, each with its effects first (the enquiries a week, the quality, the
// reputation bonus of 4 and 5, every one signed and coloured), then its costs (the price and the
// weekly upkeep), then a buy button for a level above the one held, greyed with the reason when
// the cash is short. Bought once, only ever raised.

import { websiteLadder, websiteLevel } from '../engine/website';
import type { WebsiteRung } from '../engine/website';
import type { GameState } from '../engine/index';
import {
  button,
  escapeHtml,
  lockedButton,
  minutes,
  money,
  plural,
  reasonLabel,
  signedFigure,
} from './modal';

/** A signed count with its sign on the front and the word after it: "+2 enquiries", "-1 tier". */
function signedCount(value: number, one: string, many: string): string {
  return `${value > 0 ? '+' : '-'}${plural(Math.abs(value), one, many)}`;
}

function enquiriesLine(perWeek: number): string {
  if (perWeek === 0) return '<span class="figure">Enquiries as they come</span>';
  return signedFigure(`${signedCount(perWeek, 'enquiry', 'enquiries')} a week`, perWeek);
}

function qualityLine(tier: number): string {
  if (tier === 0) return '';
  return signedFigure(`${signedCount(tier, 'tier', 'tiers')} of quality`, tier);
}

function reputationLine(bonus: number): string {
  if (bonus === 0) return '';
  return signedFigure(`+${bonus} reputation while held`, bonus);
}

function costsLine(rung: WebsiteRung): string {
  const price = rung.spec.price === 0 ? 'Nothing to buy' : money(rung.spec.price);
  const upkeep =
    rung.spec.upkeepMinutes === 0
      ? 'No upkeep'
      : `Upkeep ${minutes(rung.spec.upkeepMinutes)} a week`;
  return `<span class="figure">${price}</span><span class="figure">${escapeHtml(upkeep)}</span>`;
}

/** The one control of a rung: Held, Outgrown, or Buy at the level's price. */
function action(rung: WebsiteRung): string {
  if (rung.held) return '<span class="badge">Held</span>';
  if (rung.outgrown) return reasonLabel('Outgrown');
  const label = `Buy, ${money(rung.spec.price)}`;
  if (!rung.check.ok) return lockedButton(label, rung.check.reason);
  return button('setWebsiteLevel', label, `data-id="${rung.spec.level}"`);
}

function rungHtml(rung: WebsiteRung): string {
  const spec = rung.spec;
  const effects = [
    enquiriesLine(spec.enquiriesPerWeek),
    qualityLine(spec.qualityTier),
    reputationLine(spec.reputation),
  ]
    .filter((line) => line !== '')
    .join('');
  return (
    `<div class="website-level${rung.held ? ' is-on' : ''}" data-level="${spec.level}">` +
    `<h3>Level ${spec.level}: ${escapeHtml(spec.name)}</h3>` +
    `<p class="card-effects">${effects}</p>` +
    `<p class="card-costs">${costsLine(rung)}</p>` +
    `<div class="row-action">${action(rung)}</div>` +
    '</div>'
  );
}

export function renderWebsite(state: GameState): string {
  const held = websiteLevel(state);
  return (
    `<p class="hint">Level ${held.level}, ${escapeHtml(held.name)}. Bought once and only ever ` +
    'raised. Levels 1 to 3 change how many enquiries come in and how good they are; 4 and 5 add ' +
    'a small reputation bonus while they are held.</p>' +
    websiteLadder(state).map(rungHtml).join('')
  );
}

// The Website tab of the laptop, under Admin (CLAUDE.md T13 3.7). Phase A: a stub; phase B3.

import { websiteLevel } from '../engine/website';
import type { GameState } from '../engine/index';
import { escapeHtml } from './modal';

export function renderWebsite(state: GameState): string {
  const level = websiteLevel(state);
  return `<p class="figures">Level ${level.level}: ${escapeHtml(level.name)}</p>`;
}

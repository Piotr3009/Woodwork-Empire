// The Security tab of the laptop, under Admin (CLAUDE.md T13 3.17). Phase A: a stub; phase B4.

import { securityLevel } from '../engine/security';
import type { GameState } from '../engine/index';
import { escapeHtml } from './modal';

export function renderSecurity(state: GameState): string {
  const level = securityLevel(state);
  return `<p class="figures">Level ${level.level}: ${escapeHtml(level.name)}</p>`;
}

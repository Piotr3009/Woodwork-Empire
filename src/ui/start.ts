// The start screen: an empty unit seen from outside, and the three decisions (CLAUDE.md 10.1).

import { DIFFICULTIES } from '../engine/constants';
import { escapeHtml } from './modal';

export interface StartChoice {
  difficulty: string;
  playerName: string;
  companyName: string;
}

const UNIT_SKETCH =
  '<svg class="unit-sketch" viewBox="0 0 420 200" xmlns="http://www.w3.org/2000/svg" ' +
  'role="img" aria-label="An empty rented unit">' +
  '<polygon points="40,150 240,150 240,60 40,60" fill="var(--room)" />' +
  '<polygon points="240,150 380,120 380,40 240,60" fill="var(--room-dark)" />' +
  '<polygon points="40,60 140,20 380,40 240,60" fill="var(--kit-furniture)" />' +
  '<polygon points="100,150 100,100 170,100 170,150" fill="var(--concrete)" />' +
  '<polygon points="40,150 380,120 380,132 40,162" fill="var(--yard)" />' +
  '</svg>';

export function renderStart(choice: StartChoice): string {
  const options = DIFFICULTIES.map(
    (spec) =>
      `<button class="btn${choice.difficulty === spec.id ? ' btn-primary' : ''}" ` +
      `data-do="pickDifficulty" data-id="${spec.id}">${escapeHtml(spec.label)}` +
      `<small>${escapeHtml(spec.startingCash.toLocaleString('en-GB'))} to start</small></button>`,
  ).join('');
  return (
    '<div class="start">' +
    '<div class="panel start-panel">' +
    '<h1>Woodwork Empire</h1>' +
    UNIT_SKETCH +
    '<p class="lead">You quit your job. You have some savings and the trade. Find a unit.</p>' +
    `<div class="difficulties">${options}</div>` +
    '<label class="field-row">Your name' +
    `<input type="text" data-field="playerName" data-focus-key="playerName" ` +
    `value="${escapeHtml(choice.playerName)}" /></label>` +
    '<label class="field-row">Company name' +
    `<input type="text" data-field="companyName" data-focus-key="companyName" ` +
    `value="${escapeHtml(choice.companyName)}" /></label>` +
    '<button class="btn btn-primary btn-big" data-do="startGame">Start</button>' +
    '</div></div>'
  );
}

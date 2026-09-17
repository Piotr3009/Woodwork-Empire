// The start screen: an empty unit seen from outside, and the three decisions (CLAUDE.md 10.1).

import { DIFFICULTIES } from '../engine/constants';
import { formatCalendarDay } from '../engine/index';
import type { StoredSave } from '../cloud/store';
import { escapeHtml, money } from './modal';

export interface StartChoice {
  difficulty: string;
  playerName: string;
  companyName: string;
  showWhy: boolean;
  /** Saving to the cloud, when the build was given somewhere to save to. */
  cloud: {
    available: boolean;
    email: string;
    signedIn: string | null;
    hasSave: boolean;
    note: string;
  };
  /** What is waiting in the browser's own store, and whether the player has been asked yet
   *  whether he really means to lose it (CLAUDE.md T11 3.2). */
  saved: StoredSave;
  startOverAsked: boolean;
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

/** Sign in and Continue, and nothing at all when the build has no Supabase (CLAUDE.md T2 3.14). */
function cloudBlock(choice: StartChoice): string {
  const cloud = choice.cloud;
  if (!cloud.available) return '';
  const note = cloud.note === '' ? '' : `<p class="hint">${escapeHtml(cloud.note)}</p>`;
  if (cloud.signedIn === null) {
    return (
      '<label class="field-row">Email for a sign in link' +
      '<input type="text" data-field="cloudEmail" ' +
      `value="${escapeHtml(cloud.email)}" /></label>` +
      '<button class="btn" data-do="signIn">Sign in to save</button>' +
      note
    );
  }
  const carryOn = cloud.hasSave
    ? '<button class="btn" data-do="continueGame">Continue</button>'
    : '';
  return (
    `<p class="hint">Signed in as ${escapeHtml(cloud.signedIn)}.</p>` +
    carryOn +
    '<button class="btn" data-do="signOut">Sign out</button>' +
    note
  );
}

/** Continue, and the one question a New game asks before it throws the save away. A save from a
 *  build that is gone is said so and offered to be cleared (CLAUDE.md T11 3.2). */
function savedBlock(choice: StartChoice): string {
  const saved = choice.saved;
  if (saved.kind === 'stale') {
    return (
      '<p class="hint">A saved game from an older build was found; it cannot be continued.</p>' +
      '<button class="btn" data-do="clearSaved">Clear the old save</button>'
    );
  }
  if (saved.kind !== 'ready') return '';
  const where = `${saved.companyName}, ${formatCalendarDay(saved.day)}`;
  return (
    '<button class="btn btn-primary btn-big" data-do="continueSaved">' +
    `Continue · ${escapeHtml(where)}</button>`
  );
}

/** The button that starts a new company. With a game in the store it asks once, on a second
 *  button of its own: a double click is never a decision (CLAUDE.md T11 3.2, T9 3.9). */
function startBlock(choice: StartChoice): string {
  if (choice.saved.kind !== 'ready') {
    return '<button class="btn btn-primary btn-big" data-do="startGame">Start</button>';
  }
  if (!choice.startOverAsked) {
    return '<button class="btn btn-big" data-do="askStartOver">New game</button>';
  }
  return (
    '<p class="hint">Start over? The saved game will be lost.</p>' +
    '<button class="btn btn-primary btn-big" data-do="startGame">Start over</button>' +
    '<button class="btn" data-do="keepSaved">Keep it</button>'
  );
}

export function renderStart(choice: StartChoice): string {
  const options = DIFFICULTIES.map(
    (spec) =>
      `<button class="btn${choice.difficulty === spec.id ? ' is-on' : ''}" ` +
      `data-do="pickDifficulty" data-id="${spec.id}">${escapeHtml(spec.label)}` +
      `<small>${money(spec.startingCash)} to start</small></button>`,
  ).join('');
  return (
    '<div class="start">' +
    '<div class="panel start-panel">' +
    '<h1>Woodwork Empire</h1>' +
    UNIT_SKETCH +
    '<p class="lead">You quit your job. You have some savings and the trade. Find a unit.</p>' +
    `<div class="difficulties">${options}</div>` +
    '<label class="field-row">Your name' +
    `<input type="text" data-field="playerName" ` +
    `value="${escapeHtml(choice.playerName)}" /></label>` +
    '<label class="field-row">Company name' +
    `<input type="text" data-field="companyName" ` +
    `value="${escapeHtml(choice.companyName)}" /></label>` +
    '<label class="field-row check-row">' +
    `<input type="checkbox" data-field="showWhy"${choice.showWhy ? ' checked' : ''} />` +
    ' Show real-life notes</label>' +
    savedBlock(choice) +
    startBlock(choice) +
    cloudBlock(choice) +
    '</div></div>'
  );
}

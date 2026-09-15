// @vitest-environment jsdom
// With no Supabase environment the saving feature is dark from top to bottom (CLAUDE.md T2 3.14).

import { describe, expect, it } from 'vitest';
import { cloudAvailable, cloudKey, cloudUrl } from '../../src/cloud/supabase';
import { hasSave, loadGame, openSavedRow, saveGame, sendMagicLink } from '../../src/cloud/saves';
import { encodeSaveFile } from '../../src/cloud/file';
import { STATE_VERSION } from '../../src/engine/index';
import { renderStart } from '../../src/ui/start';
import { renderMenu } from '../../src/ui/topbar';
import { NO_STORED_SAVE } from '../../src/cloud/store';
import { buyStartingKit, newGame } from '../helpers';

const DARK = {
  available: false,
  email: '',
  signedIn: null,
  hasSave: false,
  note: '',
};

describe('saving with no Supabase in the build', () => {
  it('says it is not available and never makes a client', () => {
    expect(cloudUrl()).toBe('');
    expect(cloudKey()).toBe('');
    expect(cloudAvailable()).toBe(false);
  });

  it('answers every call with a line instead of an error', async () => {
    expect((await sendMagicLink('piotr@example.com')).ok).toBe(false);
    expect((await sendMagicLink('piotr@example.com')).note).toContain('not set up');
    expect((await saveGame(newGame())).ok).toBe(false);
    expect((await loadGame()).state).toBeNull();
    expect(await hasSave()).toBe(false);
  });

  it('shows no Sign in on the start screen', () => {
    const html = renderStart({
      difficulty: 'easy',
      playerName: 'Piotr',
      companyName: 'Woodwork Empire',
      showWhy: true,
      cloud: DARK,
      saved: NO_STORED_SAVE,
      startOverAsked: false,
    });
    expect(html).not.toContain('Sign in to save');
    expect(html).not.toContain('data-do="continueGame"');
    // Everything else on the start screen is untouched.
    expect(html).toContain('data-do="startGame"');
    expect(html).toContain('Show real-life notes');
  });

  it('shows no Save in the Menu', () => {
    const html = renderMenu(newGame(), { available: false, signedIn: null });
    expect(html).not.toContain('data-do="saveGame"');
    expect(html).not.toContain('data-do="loadGame"');
    expect(html).toContain('data-do="endDay"');
  });
});

describe('the row the cloud keeps', () => {
  it('is the same bytes the file and the browser hold, and opens with the same decoder', () => {
    const state = buyStartingKit(newGame({ companyName: 'Joinery Core' }));
    const row = { state: encodeSaveFile(state), state_version: STATE_VERSION };
    const opened = openSavedRow(row);
    expect(opened.note).toBe('Loaded.');
    expect(opened.state).toEqual(state);
  });

  it('refuses a row from another build, and one written before the bytes were the bytes', () => {
    const state = newGame();
    expect(openSavedRow({ state: encodeSaveFile(state), state_version: 1 }).state).toBeNull();
    expect(openSavedRow({ state: encodeSaveFile(state), state_version: 1 }).note).toContain(
      'older build',
    );
    // A row written before Turn 11 holds the state object itself, not the bytes.
    const old = { state: JSON.parse(JSON.stringify(state)) as unknown, state_version: STATE_VERSION };
    expect(openSavedRow(old).state).toBeNull();
    expect(openSavedRow(old).note).toContain('older build');
    // And rubbish in the column is refused by the one decoder, not by a second idea of a save.
    expect(openSavedRow({ state: 'not json', state_version: STATE_VERSION }).state).toBeNull();
  });
});

describe('saving when the build has Supabase', () => {
  it('offers Sign in, and Continue once there is something to come back to', () => {
    const signedOut = renderStart({
      difficulty: 'easy',
      playerName: 'Piotr',
      companyName: 'Woodwork Empire',
      showWhy: true,
      cloud: { ...DARK, available: true },
      saved: NO_STORED_SAVE,
      startOverAsked: false,
    });
    expect(signedOut).toContain('Sign in to save');
    expect(signedOut).not.toContain('data-do="continueGame"');

    const signedIn = renderStart({
      difficulty: 'easy',
      playerName: 'Piotr',
      companyName: 'Woodwork Empire',
      showWhy: true,
      cloud: { ...DARK, available: true, signedIn: 'piotr@example.com', hasSave: true },
      saved: NO_STORED_SAVE,
      startOverAsked: false,
    });
    expect(signedIn).toContain('Signed in as piotr@example.com');
    expect(signedIn).toContain('data-do="continueGame"');
    expect(signedIn).toContain('data-do="signOut"');
  });

  it('offers Save now and Load in the Menu once signed in', () => {
    const html = renderMenu(newGame(), { available: true, signedIn: 'piotr@example.com' });
    expect(html).toContain('data-do="saveGame"');
    expect(html).toContain('data-do="loadGame"');
  });
});

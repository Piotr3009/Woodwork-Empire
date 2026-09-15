// Saving a game to Supabase. One row per player per slot, and the player owns his own rows.
// Every call answers with a line the Menu can show, and a missing table is "save unavailable"
// rather than an error the player has to understand (CLAUDE.md T2 3.14).

import { STATE_VERSION } from '../engine/index';
import type { GameState } from '../engine/index';
import { decodeSaveFile, encodeSaveFile } from './file';
import { cloud, cloudAvailable } from './supabase';

/** The autosave slot. More slots are parked. */
export const SAVE_SLOT = 1;

export interface SaveResult {
  ok: boolean;
  note: string;
}

export interface LoadResult {
  state: GameState | null;
  note: string;
}

const NO_CLOUD: SaveResult = { ok: false, note: 'Saving is not set up in this build.' };

/** PostgREST says 42P01 when the table is not there. The player gets one plain line. */
function describe(error: { code?: string; message?: string } | null): string {
  if (!error) return '';
  if (error.code === '42P01') return 'Saving is not ready: the saves table has not been made yet.';
  return error.message ?? 'Saving failed.';
}

export async function signedInEmail(): Promise<string | null> {
  const client = cloud();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data.session?.user.email ?? null;
}

/** One button, one email, one link in the inbox. No passwords anywhere. */
export async function sendMagicLink(email: string): Promise<SaveResult> {
  const client = cloud();
  if (!client) return NO_CLOUD;
  if (email.trim() === '') return { ok: false, note: 'Type an email address first.' };
  const { error } = await client.auth.signInWithOtp({ email: email.trim() });
  if (error) return { ok: false, note: error.message };
  return { ok: true, note: 'Check your email for the sign in link.' };
}

export async function signOut(): Promise<void> {
  const client = cloud();
  if (!client) return;
  await client.auth.signOut();
}

export async function saveGame(state: GameState): Promise<SaveResult> {
  const client = cloud();
  if (!client) return NO_CLOUD;
  const { data } = await client.auth.getSession();
  const userId = data.session?.user.id;
  if (userId === undefined) return { ok: false, note: 'Sign in first.' };
  // The same bytes the file save and the browser's store hold: one encoder for every store
  // (CLAUDE.md T11 3.2).
  const { error } = await client.from('saves').upsert(
    {
      user_id: userId,
      slot: SAVE_SLOT,
      state: encodeSaveFile(state),
      state_version: STATE_VERSION,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,slot' },
  );
  if (error) return { ok: false, note: describe(error) };
  return { ok: true, note: `Saved on day ${state.clock.day}.` };
}

/** What a row of the saves table opens into. The row holds the same bytes the file save and the
 *  browser's store hold, so it goes through the one decoder; a row written before Turn 11 holds
 *  the state itself and is refused the way a save from any older build is (CLAUDE.md T11 3.2). */
export function openSavedRow(row: { state: unknown; state_version: number }): LoadResult {
  const stale = { state: null, note: 'That save is from an older build of the game.' };
  if (row.state_version !== STATE_VERSION) return stale;
  if (typeof row.state !== 'string') return stale;
  const opened = decodeSaveFile(row.state);
  if (opened.state === null) return { state: null, note: opened.note };
  return { state: opened.state, note: 'Loaded.' };
}

export async function loadGame(): Promise<LoadResult> {
  const client = cloud();
  if (!client) return { state: null, note: NO_CLOUD.note };
  const { data: session } = await client.auth.getSession();
  const userId = session.session?.user.id;
  if (userId === undefined) return { state: null, note: 'Sign in first.' };
  const { data, error } = await client
    .from('saves')
    .select('state, state_version')
    .eq('user_id', userId)
    .eq('slot', SAVE_SLOT)
    .maybeSingle();
  if (error) return { state: null, note: describe(error) };
  if (!data) return { state: null, note: 'Nothing saved yet.' };
  return openSavedRow(data as { state: unknown; state_version: number });
}

export async function hasSave(): Promise<boolean> {
  if (!cloudAvailable()) return false;
  const result = await loadGame();
  return result.state !== null;
}

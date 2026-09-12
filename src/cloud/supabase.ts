// The Supabase client, and the one place that decides whether saving exists at all.
//
// Without both environment variables the whole feature is dark: no Sign in on the start screen,
// no Save in the Menu, and no network call is ever made (CLAUDE.md T2 3.14).

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

interface CloudEnv {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
}

/** Read without a build time type dependency, so the game still compiles with no env at all. */
function env(): CloudEnv {
  return (import.meta as unknown as { env?: CloudEnv }).env ?? {};
}

export function cloudUrl(): string {
  return env().VITE_SUPABASE_URL ?? '';
}

export function cloudKey(): string {
  return env().VITE_SUPABASE_ANON_KEY ?? '';
}

/** True only when the build was given somewhere to save to. */
export function cloudAvailable(): boolean {
  return cloudUrl() !== '' && cloudKey() !== '';
}

let client: SupabaseClient | null = null;

/** The client, made on first use. Null when the feature is off. */
export function cloud(): SupabaseClient | null {
  if (!cloudAvailable()) return null;
  if (client === null) {
    client = createClient(cloudUrl(), cloudKey());
  }
  return client;
}

/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// Pictures held in memory before the hall asks for them [PIOTR, 19.10: "the houses disappear"]
// (v120). A house factory's station changes its picture at every sixteenth of its cycle (v117), and
// an `<image>` whose `href` moves to a file the browser has to go and get shows nothing until the
// file is down and decoded: half a megabyte a frame, six stations at once, at 30x or 100x a change
// every second or two, so the houses on the stations blinked out and came back. A served file is no
// help the second time either: the dev server and the preview send `Cache-Control: no-cache`, and
// the pages' ten minutes run out, so every swap went to the network again (measured: 48 requests in
// six seconds at 100x).
//
// The hall now asks for the frames ahead of their minute, one at a time in the order they are
// wanted (the next two of every station first, then the rest of its sixteen and the empty
// picture), keeps each as a blob of its own in memory (`URL.createObjectURL`, about half a megabyte
// a frame, fifty for a whole factory), and from then on draws the station from that blob
// (`cachedUrl`): no network at the swap, whatever the server's headers. The renderer's and nothing
// of the state; a page without `fetch` or object URLs (the tests' jsdom) asks nothing and draws the
// files as before.
//
// Decoded, a frame is five megabytes, a factory's hundred and two over five hundred: more than the
// browser keeps of decoded pictures, so v120's decode of every frame as it landed pushed out of the
// browser's keeping the pictures on the screen, and those were painted blank again until decoded
// again. From v122 a blob is only held, and the one frame each station shows next is decoded ahead
// (`warm`), a few seconds at the most before it is wanted.

/** Every URL ever queued, so a file is asked for once a page; and the blob each one became. */
const queued = new Set<string>();
const cached = new Map<string, string>();
/** When each URL was last decoded ahead, real milliseconds, so a page a frame asks it once. */
const warmed = new Map<string, number>();
/** A frame decoded ahead is decoded again no sooner than this [TUNE]: long enough that sixty pages
 *  a second ask nothing, short enough that a frame decoded and pushed out is decoded again before
 *  its turn at 1x, thirty seconds a frame. */
export const WARM_AGAIN_MS = 5000;
const queue: string[] = [];
let busy = false;

/** The one place the queue is read, so a test can see the order and the count. */
export function prefetchQueue(): readonly string[] {
  return queue.slice();
}

/** Forgets what was asked and held: for the tests, which stand a fresh page each. */
export function resetPrefetch(): void {
  for (const url of cached.values()) {
    if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(url);
  }
  cached.clear();
  queued.clear();
  warmed.clear();
  queue.length = 0;
  busy = false;
}

function canPrefetch(): boolean {
  return typeof fetch === 'function' && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function';
}

/** Queues these URLs, those not yet asked for, at the front of the line when `first` (the frames
 *  wanted next) and otherwise at its end, and starts fetching if nothing is on the way. */
export function prefetch(urls: readonly string[], first = false): void {
  if (!canPrefetch()) return;
  const fresh = urls.filter((url) => !queued.has(url));
  for (const url of fresh) queued.add(url);
  if (first) queue.unshift(...fresh);
  else queue.push(...fresh);
  pump();
}

/** The URL the hall draws a picture from: the blob held for it once it is down, else the file. */
export function cachedUrl(url: string): string {
  return cached.get(url) ?? url;
}

/** Decodes the picture a station shows next, from its blob, so the swap at its minute finds it
 *  decoded: once in `WARM_AGAIN_MS`, and not before its blob is held (the page after it lands asks
 *  again). True when a decode was asked for (v122). */
export function warm(url: string, nowMs: number = typeof performance === 'undefined' ? Date.now() : performance.now()): boolean {
  if (!canPrefetch() || typeof Image === 'undefined') return false;
  const held = cached.get(url);
  if (held === undefined) return false;
  const last = warmed.get(url);
  if (last !== undefined && nowMs - last < WARM_AGAIN_MS) return false;
  warmed.set(url, nowMs);
  const image = new Image();
  image.src = held;
  if (typeof image.decode === 'function') image.decode().catch(() => undefined);
  return true;
}

function pump(): void {
  if (busy) return;
  const url = queue.shift();
  if (url === undefined) return;
  busy = true;
  const done = (): void => {
    busy = false;
    pump();
  };
  fetch(url)
    .then((response) => (response.ok ? response.blob() : Promise.reject(new Error(String(response.status)))))
    .then((blob) => {
      // Held, not decoded: the frame wanted next is decoded by `warm` (v122).
      cached.set(url, URL.createObjectURL(blob));
    })
    .then(done, done);
}

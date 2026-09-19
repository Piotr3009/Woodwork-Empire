// The one piece of memory the bubbles need (PIOTR, 19.09; docs/mockups/t21/bubbles.html;
// CLAUDE.md T21 2.6).
//
// The words are `src/engine/bubbles.ts` and the paper they are drawn on is `src/render/hall.ts`.
// What is here is when each man last changed what he was saying, so a bubble about a stage he has
// just started can be taken down after three real seconds. It is the same shape as the walkers' and
// the doors': the render layer's, never game state, keyed by the figure, and thrown away when a view
// is built from nothing.

import { BUBBLE_WORK_SECONDS } from '../engine/constants';
import type { Bubble } from '../engine/types';

/** The real clock, read where the house card reads it (`nowMs` in `src/ui/app.ts`). The render layer
 *  owns the reading and the engine never sees it: a bubble lasts three real seconds and not three
 *  game minutes, the same rule the walking and the sprite frames follow (CLAUDE.md T9 3.13,
 *  T16 2.2). */
export function bubbleNowMs(): number {
  return typeof performance === 'undefined' ? 0 : performance.now();
}

/** What each man last said, and when he started saying it. */
const started = new Map<string, { text: string; since: number }>();

/** Forgets every bubble: the view is being built from nothing, or a test wants a fresh clock. */
export function resetBubbles(): void {
  started.clear();
}

/** True while this man has only just begun to say this, inside the three seconds of the drawing.
 *  Every bubble is recorded and only the `work` ones are asked, so a man who stood waiting for the
 *  saw and then got it is saying something new when he says "cutting Small kitchen" again. The answer
 *  is always yes the first time a man says a thing, so a page built from nothing shows the stage he
 *  is at and then takes it down. */
export function bubbleIsFresh(bubble: Bubble, nowMs: number): boolean {
  const was = started.get(bubble.who);
  if (was === undefined || was.text !== bubble.text) {
    started.set(bubble.who, { text: bubble.text, since: nowMs });
    return true;
  }
  return nowMs - was.since < BUBBLE_WORK_SECONDS * 1000;
}

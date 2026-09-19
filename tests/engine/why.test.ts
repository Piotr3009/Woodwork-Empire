import { describe, expect, it } from 'vitest';
import { WHY } from '../../src/engine/constants';
import { whyKeyForEvent } from '../../src/ui/eventModal';

/** Everything CLAUDE.md T2 3.12 asks for a note on. The two notes about a debt beside the bank
 *  balance went with that debt in Turn 22: there is one track for money now, so there is nothing
 *  left for them to explain (CLAUDE.md T22 2.1). */
const WANTED = [
  'unitDeposit',
  'rates',
  'rent',
  'depositReturn',
  'jobDeposit',
  'lateAccounts',
  'extractor',
  'service',
  'finishedGoods',
  'lowStock',
];

describe('the real life notes', () => {
  it('has one for every decision the brief lists', () => {
    for (const key of WANTED) {
      expect(WHY[key], key).toBeDefined();
    }
    expect(Object.keys(WHY).sort()).toEqual([...WANTED].sort());
  });

  it('writes two or three plain sentences, with no dashes and no numbers from the engine', () => {
    for (const [key, text] of Object.entries(WHY)) {
      const sentences = text.split('. ').filter((part) => part.trim() !== '');
      expect(sentences.length, key).toBeGreaterThanOrEqual(2);
      expect(sentences.length, key).toBeLessThanOrEqual(3);
      expect(text, key).not.toContain(String.fromCharCode(0x2014));
      expect(text, key).not.toContain(String.fromCharCode(0x2013));
      expect(text.endsWith('.'), key).toBe(true);
    }
  });

  it('hangs a note on the events that carry one', () => {
    expect(whyKeyForEvent('lateAccounts')).toBe('lateAccounts');
    expect(whyKeyForEvent('serviceDue')).toBe('service');
    expect(whyKeyForEvent('jobAtGate')).toBe('finishedGoods');
    expect(whyKeyForEvent('lowStock')).toBe('lowStock');
    expect(whyKeyForEvent('dayEnd')).toBeNull();
    // Only the extraction itself gets the extraction note. Everything else is a service note.
    expect(whyKeyForEvent('machineBroken', 'extractor')).toBe('extractor');
    expect(whyKeyForEvent('machineBroken', 'tableSaw')).toBe('service');
  });
});

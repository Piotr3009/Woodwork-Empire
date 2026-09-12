import { describe, expect, it } from 'vitest';
import { plural } from '../../src/engine/text';
import { days, minutes, plural as uiPlural } from '../../src/ui/modal';

describe('the one plural helper', () => {
  it('says one of a thing in the singular and everything else in the plural', () => {
    expect(plural(0, 'enquiry', 'enquiries')).toBe('0 enquiries');
    expect(plural(1, 'enquiry', 'enquiries')).toBe('1 enquiry');
    expect(plural(2, 'enquiry', 'enquiries')).toBe('2 enquiries');
    expect(plural(1, 'sheet', 'sheets')).toBe('1 sheet');
    expect(plural(12, 'sheet', 'sheets')).toBe('12 sheets');
    expect(plural(1, 'day', 'days')).toBe('1 day');
  });

  it('is the same helper in the UI, not a second copy', () => {
    expect(uiPlural).toBe(plural);
    expect(days(1)).toBe('1 day');
    expect(days(2)).toBe('2 days');
    expect(minutes(1)).toBe('1 min');
  });
});

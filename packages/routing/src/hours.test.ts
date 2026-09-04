import { describe, expect, it } from 'vitest';
import { isOpen, type WeeklyHours } from './hours.js';

const weekdayNineToFive: WeeklyHours = {
  sun: null,
  mon: { start: '09:00', end: '17:00' },
  tue: { start: '09:00', end: '17:00' },
  wed: { start: '09:00', end: '17:00' },
  thu: { start: '09:00', end: '17:00' },
  fri: { start: '09:00', end: '17:00' },
  sat: null,
};

describe('isOpen', () => {
  it('is open Monday 10:00 America/New_York', () => {
    const now = new Date('2026-09-07T14:00:00.000Z');
    expect(isOpen(weekdayNineToFive, 'America/New_York', now)).toBe(true);
  });

  it('is closed Monday 20:00 America/New_York', () => {
    const now = new Date('2026-09-08T00:00:00.000Z');
    expect(isOpen(weekdayNineToFive, 'America/New_York', now)).toBe(false);
  });

  it('is closed Sunday', () => {
    const now = new Date('2026-09-06T15:00:00.000Z');
    expect(isOpen(weekdayNineToFive, 'America/New_York', now)).toBe(false);
  });
});

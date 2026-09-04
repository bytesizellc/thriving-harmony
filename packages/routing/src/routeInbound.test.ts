import { describe, expect, it } from 'vitest';
import { routeInbound } from './routeInbound.js';
import type { WeeklyHours } from './hours.js';

const hours: WeeklyHours = {
  sun: null,
  mon: { start: '09:00', end: '17:00' },
  tue: { start: '09:00', end: '17:00' },
  wed: { start: '09:00', end: '17:00' },
  thu: { start: '09:00', end: '17:00' },
  fri: { start: '09:00', end: '17:00' },
  sat: null,
};

const users = [
  {
    id: 'user-a',
    ivrDigit: '1',
    mobileE164: '+15555550101',
    webrtcSipUsername: 'a',
    recordingEnabled: true,
  },
  {
    id: 'user-b',
    ivrDigit: '2',
    mobileE164: '+15555550102',
    webrtcSipUsername: 'b',
    recordingEnabled: false,
  },
];

const base = {
  timezone: 'America/New_York',
  weeklyHours: hours,
  afterHoursGreeting: 'Leave a message',
  ivrGreeting: 'Press 1 or 2',
  recordingNotice: 'This call may be recorded.',
  users,
};

describe('routeInbound', () => {
  it('sends after-hours calls to voicemail without ringing a cell', () => {
    const decision = routeInbound({
      ...base,
      now: new Date('2026-09-07T00:00:00.000Z'),
      digit: '1',
    });
    expect(decision).toEqual({ type: 'voicemail', greeting: 'Leave a message' });
  });

  it('plays IVR when open and no digit yet', () => {
    const decision = routeInbound({
      ...base,
      now: new Date('2026-09-07T14:00:00.000Z'),
      digit: null,
    });
    expect(decision).toEqual({ type: 'ivr', greeting: 'Press 1 or 2' });
  });

  it('sim-rings the matching user and honors recording off', () => {
    const decision = routeInbound({
      ...base,
      now: new Date('2026-09-07T14:00:00.000Z'),
      digit: '2',
    });
    expect(decision).toMatchObject({
      type: 'sim_ring',
      userId: 'user-b',
      record: false,
      mobileE164: '+15555550102',
    });
  });

  it('falls to voicemail on an unknown digit', () => {
    const decision = routeInbound({
      ...base,
      now: new Date('2026-09-07T14:00:00.000Z'),
      digit: '9',
    });
    expect(decision.type).toBe('voicemail');
  });
});

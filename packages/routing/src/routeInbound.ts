import { isOpen, type WeeklyHours } from './hours.js';

export type RoutableUser = {
  id: string;
  ivrDigit: string | null;
  mobileE164: string;
  webrtcSipUsername: string | null;
  recordingEnabled: boolean;
};

export type RouteInboundInput = {
  now: Date;
  timezone: string;
  weeklyHours: WeeklyHours;
  afterHoursGreeting: string;
  ivrGreeting: string;
  recordingNotice: string;
  digit: string | null;
  users: RoutableUser[];
};

export type RouteDecision =
  | { type: 'ivr'; greeting: string }
  | {
      type: 'sim_ring';
      userId: string;
      mobileE164: string;
      webrtcSipUsername: string | null;
      record: boolean;
      recordingNotice: string;
    }
  | { type: 'voicemail'; greeting: string };

export function routeInbound(input: RouteInboundInput): RouteDecision {
  if (!isOpen(input.weeklyHours, input.timezone, input.now)) {
    return { type: 'voicemail', greeting: input.afterHoursGreeting };
  }
  if (input.digit === null) {
    return { type: 'ivr', greeting: input.ivrGreeting };
  }
  const user = input.users.find((u) => u.ivrDigit === input.digit);
  if (!user) {
    return { type: 'voicemail', greeting: input.afterHoursGreeting };
  }
  return {
    type: 'sim_ring',
    userId: user.id,
    mobileE164: user.mobileE164,
    webrtcSipUsername: user.webrtcSipUsername,
    record: user.recordingEnabled,
    recordingNotice: input.recordingNotice,
  };
}

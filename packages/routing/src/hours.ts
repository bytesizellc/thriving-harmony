export type DayHours = { start: string; end: string } | null;

export type WeeklyHours = {
  sun: DayHours;
  mon: DayHours;
  tue: DayHours;
  wed: DayHours;
  thu: DayHours;
  fri: DayHours;
  sat: DayHours;
};

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

function partsInZone(now: Date, timezone: string): { weekday: (typeof DAY_KEYS)[number]; hhmm: string } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const bag: Record<string, string> = {};
  for (const part of fmt.formatToParts(now)) {
    if (part.type !== 'literal') bag[part.type] = part.value;
  }
  const weekdayMap: Record<string, (typeof DAY_KEYS)[number]> = {
    Sun: 'sun',
    Mon: 'mon',
    Tue: 'tue',
    Wed: 'wed',
    Thu: 'thu',
    Fri: 'fri',
    Sat: 'sat',
  };
  const weekday = weekdayMap[bag.weekday];
  if (!weekday) throw new Error(`Unknown weekday ${bag.weekday}`);
  return { weekday, hhmm: `${bag.hour}:${bag.minute}` };
}

export function isOpen(hours: WeeklyHours, timezone: string, now: Date): boolean {
  const { weekday, hhmm } = partsInZone(now, timezone);
  const window = hours[weekday];
  if (!window) return false;
  return hhmm >= window.start && hhmm < window.end;
}

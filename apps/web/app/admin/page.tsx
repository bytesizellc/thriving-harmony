'use client';

import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

type Org = {
  timezone: string;
  weeklyHours: Record<string, { start: string; end: string } | null>;
  ivrGreeting: string;
  afterHoursGreeting: string;
  smsEnabled: boolean;
};
type User = { id: string; displayName: string; email: string; role: string; ivrDigit: string | null; recordingEnabled: boolean; mobileE164: string };

export default function AdminPage() {
  const [org, setOrg] = useState<Org | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api<Org>('/v1/organization').then(setOrg).catch((e: Error) => setError(e.message));
    api<User[]>('/v1/users').then(setUsers).catch((e: Error) => setError(e.message));
  }, []);

  async function saveOrg() {
    if (!org) return;
    setError(null);
    try {
      await api('/v1/organization', {
        method: 'PATCH',
        body: JSON.stringify({
          timezone: org.timezone,
          weeklyHours: org.weeklyHours,
          ivrGreeting: org.ivrGreeting,
          afterHoursGreeting: org.afterHoursGreeting,
        }),
      });
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function toggleRecording(user: User) {
    const updated = await api<User>(`/v1/users/${user.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ recordingEnabled: !user.recordingEnabled }),
    });
    setUsers((list) => list.map((u) => (u.id === updated.id ? updated : u)));
  }

  if (!org) return <p>Loading…</p>;

  return (
    <>
      <h1>Admin</h1>
      <p className="lede">
        Hours, IVR copy, and per-line recording. SMS production flag is {org.smsEnabled ? 'on' : 'off'}.
      </p>
      {error ? <p className="error">{error}</p> : null}
      {saved ? <p>Saved.</p> : null}
      <div className="card">
        <label htmlFor="tz">Timezone</label>
        <input id="tz" value={org.timezone} onChange={(e) => setOrg({ ...org, timezone: e.target.value })} />
        <label htmlFor="ivr">IVR greeting</label>
        <textarea id="ivr" rows={3} value={org.ivrGreeting} onChange={(e) => setOrg({ ...org, ivrGreeting: e.target.value })} />
        <label htmlFor="ah">After-hours greeting</label>
        <textarea
          id="ah"
          rows={3}
          value={org.afterHoursGreeting}
          onChange={(e) => setOrg({ ...org, afterHoursGreeting: e.target.value })}
        />
        <button type="button" onClick={saveOrg}>
          Save hours copy
        </button>
      </div>
      {users.map((u) => (
        <div className="card" key={u.id}>
          <p>
            Press {u.ivrDigit ?? '—'} · {u.displayName} · {u.role} · {u.mobileE164}
          </p>
          <button type="button" className="secondary" onClick={() => toggleRecording(u)}>
            Recording {u.recordingEnabled ? 'on' : 'off'}
          </button>
        </div>
      ))}
    </>
  );
}

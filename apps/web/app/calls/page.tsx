'use client';

import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

type Call = {
  id: string;
  fromE164: string;
  toE164: string;
  direction: string;
  disposition: string;
  recorded: boolean;
  startedAt: string;
  user?: { displayName: string } | null;
};

export default function CallsPage() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Call[]>('/v1/calls').then(setCalls).catch((e: Error) => setError(e.message));
  }, []);

  return (
    <>
      <h1>Calls</h1>
      <p className="lede">Inbound and outbound history for the practice.</p>
      {error ? <p className="error">{error}</p> : null}
      <table>
        <thead>
          <tr>
            <th>When</th>
            <th>From</th>
            <th>To</th>
            <th>Who</th>
            <th>Result</th>
            <th>Rec</th>
          </tr>
        </thead>
        <tbody>
          {calls.map((c) => (
            <tr key={c.id}>
              <td>{new Date(c.startedAt).toLocaleString()}</td>
              <td>{c.fromE164}</td>
              <td>{c.toE164}</td>
              <td>{c.user?.displayName ?? '—'}</td>
              <td>{c.disposition}</td>
              <td>{c.recorded ? 'yes' : 'no'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

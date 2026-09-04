'use client';

import { useEffect, useState } from 'react';
import { api, getDevEmail } from '../../lib/api';

type Vm = { id: string; fromE164: string; createdAt: string; durationSec: number | null };

export default function VoicemailPage() {
  const [items, setItems] = useState<Vm[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Vm[]>('/v1/voicemails').then(setItems).catch((e: Error) => setError(e.message));
  }, []);

  return (
    <>
      <h1>Voicemail</h1>
      <p className="lede">After-hours and unanswered IVR land here. Playback is audited.</p>
      {error ? <p className="error">{error}</p> : null}
      {items.length === 0 ? <p className="muted">No voicemails yet.</p> : null}
      {items.map((vm) => (
        <div className="card" key={vm.id}>
          <p>
            {vm.fromE164} · {new Date(vm.createdAt).toLocaleString()}
          </p>
          <audio
            controls
            src={`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/v1/voicemails/${vm.id}/audio?devUser=${encodeURIComponent(getDevEmail())}`}
          />
        </div>
      ))}
    </>
  );
}

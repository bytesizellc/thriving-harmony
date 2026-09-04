'use client';

import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

type Me = { displayName: string; extension: string; webrtcSipUsername: string | null; recordingEnabled: boolean };
type Token = { sipUsername: string | null; token: string | null; note: string };

export default function DialerPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [token, setToken] = useState<Token | null>(null);
  const [number, setNumber] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Me>('/v1/me').then(setMe).catch((e: Error) => setError(e.message));
    api<Token>('/v1/webrtc/token').then(setToken).catch(() => undefined);
  }, []);

  return (
    <>
      <h1>Dialer</h1>
      <p className="lede">
        Browser softphone for extension {me?.extension ?? '—'}. Inbound also rings your cell. Telnyx WebRTC
        attaches after the carrier connection exists.
      </p>
      {error ? <p className="error">{error}</p> : null}
      <div className="card">
        <p>
          {me?.displayName} · recording {me?.recordingEnabled ? 'on' : 'off'} · SIP {me?.webrtcSipUsername ?? 'unset'}
        </p>
        <label htmlFor="dest">Place outbound as the practice DID</label>
        <input id="dest" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="+1…" />
        <button type="button" disabled>
          Call (WebRTC pending Telnyx credentials)
        </button>
        {token?.note ? <p className="muted">{token.note}</p> : null}
      </div>
    </>
  );
}

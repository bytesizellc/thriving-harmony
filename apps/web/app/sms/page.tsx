'use client';

import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

type Msg = {
  id: string;
  fromE164: string;
  toE164: string;
  body: string;
  direction: string;
  status: string;
  createdAt: string;
};

export default function SmsPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [toE164, setTo] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    api<Msg[]>('/v1/messages').then(setMessages).catch((e: Error) => setError(e.message));
  }

  useEffect(() => {
    refresh();
  }, []);

  async function send() {
    setError(null);
    try {
      await api('/v1/messages', { method: 'POST', body: JSON.stringify({ toE164, body }) });
      setBody('');
      refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <>
      <h1>SMS</h1>
      <p className="lede">
        Threads on the practice number. Outbound is locked until 10DLC is approved (`smsEnabled`).
      </p>
      {error ? <p className="error">{error}</p> : null}
      <div className="card">
        <label htmlFor="to">To</label>
        <input id="to" value={toE164} onChange={(e) => setTo(e.target.value)} placeholder="+1…" />
        <label htmlFor="body">Message</label>
        <textarea id="body" rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
        <button type="button" onClick={send}>
          Send
        </button>
      </div>
      {messages.map((m) => (
        <div className="card" key={m.id}>
          <p className="muted">
            {m.direction} · {m.fromE164} → {m.toE164} · {m.status}
          </p>
          <p>{m.body}</p>
        </div>
      ))}
    </>
  );
}

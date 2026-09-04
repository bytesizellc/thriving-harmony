'use client';

import { useState } from 'react';
import { setDevEmail } from '../lib/api';

const users = [
  { email: 'doc@thrivingharmony.example', label: 'Practice owner' },
  { email: 'clinician@thrivingharmony.example', label: 'Clinician' },
];

export default function HomePage() {
  const [email, setEmail] = useState(users[0].email);
  return (
    <>
      <h1>Voice for the practice</h1>
      <p className="lede">
        Local development uses a seeded Thriving Harmony tenant. Pick a user, then open the dialer.
        Cognito replaces this screen when the dedicated AWS account is live.
      </p>
      <div className="card">
        <label htmlFor="user">Sign in as</label>
        <select id="user" value={email} onChange={(e) => setEmail(e.target.value)}>
          {users.map((u) => (
            <option key={u.email} value={u.email}>
              {u.label} ({u.email})
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            setDevEmail(email);
            window.location.href = '/dialer';
          }}
        >
          Continue
        </button>
      </div>
    </>
  );
}

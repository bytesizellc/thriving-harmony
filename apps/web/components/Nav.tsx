'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  ['/dialer', 'Dialer'],
  ['/calls', 'Calls'],
  ['/voicemail', 'Voicemail'],
  ['/sms', 'SMS'],
  ['/admin', 'Admin'],
  ['/meetings', 'Meetings'],
  ['/chat', 'Chat'],
] as const;

export function Nav() {
  const path = usePathname();
  return (
    <header className="topbar">
      <Link href="/" className="brand">
        Thriving Harmony
      </Link>
      <nav>
        {links.map(([href, label]) => (
          <Link key={href} href={href} className={path === href ? 'active' : ''}>
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

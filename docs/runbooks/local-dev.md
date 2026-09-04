# Local development

From the repo root:

```bash
cp .env.example .env
pnpm install
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm test
pnpm dev
```

- API: http://localhost:4000/health
- Web: http://localhost:3000
- Postgres: localhost:5433 (avoids colliding with other local DBs). Requires Docker Desktop on PATH.

Dev auth: pick a seeded user on the home page (`x-dev-user`). Never set `AUTH_MODE=dev` in production.

Simulate an inbound call (open hours depend on the org timezone):

```bash
curl -s -X POST http://localhost:4000/webhooks/telnyx/voice \
  -H 'Content-Type: application/json' \
  -d '{"From":"+15555559999","To":"+15555551000","CallSid":"test-1"}'
```

Then POST digits to `/webhooks/telnyx/voice/ivr` with `"Digits":"1"`.

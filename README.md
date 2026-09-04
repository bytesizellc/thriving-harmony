# Thriving Harmony Voice

HIPAA-eligible phone system for **Thriving Harmony LLC**, built and operated by Bytesize until handoff.

This is a **standalone Bytesize client project**. It is not part of Intry, does not live in the Intry monorepo, and must not import Intry app code or share Intry infrastructure.

- **Covered entity:** Thriving Harmony LLC
- **Business associate / operator (until handoff):** Bytesize LLC
- **Replaces:** Dialpad
- **Launch tenant:** one practice, two users
- **MVP:** phone + SMS + admin. Video and chat are scoped, not built.

## Repo

| Path | Role |
|---|---|
| `apps/api` | Express webhooks + REST |
| `apps/web` | Next.js softphone / admin |
| `packages/db` | Prisma schema |
| `packages/routing` | Hours + IVR + sim-ring decisions |
| `infra/terraform` | Dedicated AWS account (skeleton) |
| `docs/` | Spec, plan, BAA and local runbooks |

## Run locally

See [`docs/runbooks/local-dev.md`](docs/runbooks/local-dev.md).

```bash
cp .env.example .env
pnpm install
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm test
pnpm dev
```

Web: http://localhost:3000 · API: http://localhost:4000/health

## Do not

- Put PHI in this stack until the [BAA checklist](docs/runbooks/baa-checklist.md) is done
- Use the Intry AWS account or Railway/R2/Clerk/Knock
- Port the Dialpad number before a parallel run on a new DID

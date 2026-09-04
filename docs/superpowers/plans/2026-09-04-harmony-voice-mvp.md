# Harmony Voice MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A locally runnable phone + SMS + admin app for Thriving Harmony (2 users, IVR in hours, voicemail after hours, browser softphone + sim-ring) with video/chat stubs, zero Intry coupling.

**Architecture:** pnpm workspaces. Pure routing in `packages/routing`. Prisma in `packages/db`. Express webhooks/REST in `apps/api`. Next.js softphone/admin in `apps/web`. Local Postgres via Docker. Object storage is a filesystem adapter that S3 can replace. Auth is `AUTH_MODE=dev` locally and Cognito-shaped headers for production.

**Tech Stack:** Node 22, TypeScript, pnpm, Prisma, PostgreSQL, Express, Next.js App Router, Vitest, Telnyx TeXML + WebRTC (adapter), Terraform stubs.

## Global Constraints

- This repo is not Intry. Do not import from `intry-mvp` or share its env, numbers, or cloud.
- Covered entity: Thriving Harmony LLC. BA: Bytesize LLC.
- Phone + SMS + admin now. Meetings and chat are stub routes and tables only.
- Recording default on; `User.recordingEnabled` can turn it off per line.
- Transcription off. No Clerk, Railway, R2, Knock.
- `AUTH_MODE=dev` never ships to production.
- Patient SMS blocked until `Organization.smsEnabled` is true (10DLC gate).
- PHI reads (recording/voicemail audio, SMS bodies) write `AuditEvent`.
- API `{ data, error? }` envelope.

---

### Task 1: Monorepo + database

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `docker-compose.yml`, `.env.example`, `packages/db/prisma/schema.prisma`, `packages/db/src/index.ts`, `packages/db/src/seed.ts`

**Interfaces:**
- Produces: Prisma models `Organization`, `User`, `PhoneNumber`, `Call`, `Voicemail`, `Message`, `Meeting`, `ChatChannel`, `AuditEvent`, `RetentionPolicy`

- [x] Scaffold workspaces, Postgres on host port 5433, schema, seed of 1 org + 2 users

### Task 2: Routing engine

**Files:**
- Create: `packages/routing/src/hours.ts`, `packages/routing/src/routeInbound.ts`, `packages/routing/src/index.ts`, `packages/routing/src/hours.test.ts`, `packages/routing/src/routeInbound.test.ts`

**Interfaces:**
- Produces: `isOpen(hours, timezone, now) => boolean`
- Produces: `routeInbound(input) => { type: 'ivr' | 'sim_ring' | 'voicemail', ... }`

- [x] Closed hours → voicemail, no digit → IVR, matching digit → sim-ring with record flag, unknown digit → voicemail

### Task 3: API

**Files:**
- Create: `apps/api/src/index.ts`, `apps/api/src/texml.ts`, `apps/api/src/webhooks/telnyxVoice.ts`, `apps/api/src/webhooks/telnyxSms.ts`, `apps/api/src/routes/v1.ts`, `apps/api/src/auth.ts`, `apps/api/src/audit.ts`, `apps/api/src/storage.ts`

- [x] TeXML IVR / sim-ring / voicemail, REST for org/users/calls/sms/voicemail, PHI GET audits, SMS 10DLC gate, `/v1/meetings` and `/v1/chat` stub 501

### Task 4: Web app

**Files:**
- Create: `apps/web` Next.js app — dialer, SMS, voicemail, calls, admin hours/users, `/meetings` and `/chat` stubs

- [x] Dev login as owner or clinician; hours admin; recording toggle; SMS compose respects smsEnabled

### Task 5: Infra + runbooks

**Files:**
- Create: `infra/terraform` skeleton, `docs/runbooks/baa-checklist.md`, `docs/runbooks/local-dev.md`

- [x] Dedicated AWS account placeholders; BAA steps; how to run locally

### Task 6: Verify

- [x] `pnpm test` for routing; `pnpm --filter api` typecheck; docker compose up; seed; health endpoint

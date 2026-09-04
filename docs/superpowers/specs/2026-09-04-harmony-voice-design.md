# Harmony Voice — Design Spec

**Date:** 2026-09-04
**Client:** Thriving Harmony LLC
**Operator:** Bytesize LLC (build, operate, then hand off)
**Status:** Approved for spec; awaiting implementation plan
**Repo:** standalone (`thriving-harmony`). Not part of Intry.

## 1. Problem

Thriving Harmony is a two-person, home-based practice leaving Dialpad. Client calls, voicemails, and SMS currently sit in a tool that is not their HIPAA system of record. They need a phone system Bytesize can operate, then transfer, without rebuilding when video and team chat are added later.

## 2. Locked decisions

| Decision | Choice |
|---|---|
| Product cut | Phone + SMS + admin now. Video and chat scoped in the data model and routes, not built. |
| Headcount | 2 users |
| Routing | IVR during open hours; voicemail after hours |
| Client UX | Browser softphone + simultaneous ring to cell |
| Recording | On for all calls; clinician can disable their line |
| Transcription | Off. Not in MVP. |
| SMS | Appointment reminders, front-desk texts, and clinical content |
| Hosting | New dedicated AWS account (not Intry, not account `533350584402`) |
| Carrier | Telnyx first; Twilio HIPAA-eligible products if Telnyx will not sign a BAA covering voice, recording, and SMS |
| Auth | Amazon Cognito (covered by AWS BAA). Not Clerk. |
| Cutover | Parallel run: new DID live first, then port Dialpad number(s) |
| Repo | New folder and git repo. Zero coupling to `intry-mvp`. |

Telephony *patterns* (provider adapter, inbound webhook, IVR/DTMF, sim-ring, recording callback, 10DLC) may be re-implemented here. Intry source, env, numbers, and Railway/R2/Clerk/Knock stack are not reused.

## 3. Goals

- Both users can answer, place, and SMS from the practice DID in a browser.
- Inbound during hours hits a two-key IVR, then rings that user’s browser and cell together.
- Inbound after hours goes to voicemail; both users are notified.
- Recordings, voicemail, and SMS bodies are encrypted at rest, access-logged, and retained on a policy.
- Signed BAAs exist before any PHI (call audio, voicemail, SMS, recordings) touches the system.
- Schema and app shell can take Amazon Chime meetings and internal chat later without a rewrite.

## 4. Non-goals (MVP)

- Team chat UI, Zoom-like meetings, calendar, EHR, SSO, native apps
- Live or voicemail transcription, spam blocking, call flip, 3-way, toll-free, webinars
- Public self-serve signup or other tenants in production
- International calling outside US/Canada
- Folding this into Intry

## 5. Actors

- **Practice owner (Doc)** — admin: users, hours, IVR prompts, recording defaults, retention, recordings access
- **Clinician / contractor** — softphone, SMS, voicemail, disable recording on own line
- **Caller / client** — PSTN or SMS to the practice DID
- **Bytesize operator** — AWS + Telnyx, on-call until handoff

No front-desk role at launch. Both users are clinical.

## 6. Architecture

```
Browser (Next.js)
  Cognito session
  Telnyx WebRTC softphone
  SMS inbox, voicemail, call history, hours/IVR admin

  API (Express + TypeScript on ECS Fargate)
  TelephonyProvider (Telnyx adapter; Twilio adapter stub for BAA fallback)
  Routing: hours → IVR → sim-ring → voicemail
  Recording / voicemail ingest → S3
  SMS send/receive via Telnyx Messaging
  Audit log on every PHI read

AWS (dedicated account)
  Cognito, ALB, ECS Fargate, RDS Postgres (encrypted),
  S3 + KMS (recordings, voicemail, MMS),
  CloudTrail, CloudWatch, Secrets Manager

Telnyx
  DID(s), Call Control or TeXML, WebRTC, Messaging/10DLC
```

PHI never lands on Railway, Cloudflare R2, Clerk, Knock, or the Intry AWS/audit account.

### 6.1 Why Telnyx + AWS, not Amazon Connect

Two-person PBX plus SMS is a CPaaS job. Connect is a contact center. Telnyx matches Bytesize operational knowledge. AWS holds the app and PHI so the AWS BAA covers storage, auth, and logs. Connect remains a rejected option unless Telnyx and Twilio both fail the BAA gate.

### 6.2 BAA gate

Before any PHI:

1. Bytesize ↔ Thriving Harmony (Bytesize is BA)
2. Bytesize ↔ AWS (standard AWS BAA / Artifact)
3. Bytesize ↔ Telnyx covering programmable voice, call recording, and SMS

Telnyx publicly leans on the HIPAA conduit exception and may decline a BAA. If they decline, keep this app and swap the adapter to Twilio HIPAA-eligible Voice + Messaging. Do not go live on conduit-exception-only carrier terms.

Sub-processor list for the covered entity: AWS, Telnyx (or Twilio).

## 7. Call flows

### 7.1 Inbound, open hours

1. Caller dials practice DID.
2. Telnyx webhook → API. Org hours say open.
3. IVR: greet, press 1 for user A, press 2 for user B. Invalid/timeout → voicemail.
4. Chosen user’s WebRTC endpoint and mobile number ring together (`timeout` ~25s).
5. First answer wins; other legs cancel.
6. Recording starts unless that user disabled recording on their line. Play recording notice if legally required for the practice’s state(s).
7. Hangup → CDR, recording to S3+KMS, audit row.

### 7.2 Inbound, after hours

1. Hours say closed.
2. After-hours greeting → record voicemail → S3.
3. Notify both users in-app + SMS to their personal numbers (operational, not clinical content).

### 7.3 Outbound

Staff place calls from the browser. Caller ID is the practice DID. Recording follows the same per-line flag. Cell phones are not used to originate as the business number.

### 7.4 Simultaneous ring

Cell is inbound backup only. If the cell answers, the WebRTC leg is cancelled. Outbound and SMS still require the browser app.

## 8. SMS

- Shared practice DID (or a dedicated SMS DID if 10DLC review requires it).
- Threads in the app; delivery status; MMS stored in S3.
- **No patient SMS until** 10DLC brand + campaign are approved for Thriving Harmony LLC.
- Campaign must cover mixed use: reminders, front-desk, clinical. Prefer a healthcare / conversational classification; if the registrar splits types, use two campaigns rather than lying on the form.
- Retention and export apply to SMS bodies the same as call recordings.

## 9. Data model (multi-tenant from day one)

One production tenant at launch. Do not special-case a single-tenant schema.

- `Organization` — hours, timezone, retention windows, IVR greeting, BAA flags
- `User` — Cognito subject, extension, mobile E.164, recording_enabled (default true), dispatch/E911 address
- `PhoneNumber` — E.164, Telnyx id, assigned org, porting state
- `RoutingRule` — hours, IVR tree (two leaves in MVP)
- `Call` — legs, disposition, recording_id, recorded boolean
- `Voicemail`
- `Message` — `channel`: `sms` now; `team` reserved for chat
- `Meeting` — stub table only (phase 2)
- `ChatChannel` — stub table only (phase 3)
- `AuditEvent` — actor, action, resource, timestamp; append-only
- `RetentionPolicy` — per data type; sweeper job deletes from S3 + DB and logs the deletion

RBAC: `owner` | `clinician`. Owner can play any recording. Clinician can play recordings/voicemail/SMS for calls they were a party to.

## 10. Video and chat (not built)

Same app, same auth, same audit and retention.

- **Phase 2 — video:** Amazon Chime SDK Meetings. Browser join, waiting room, host lock, optional PSTN dial-in later. Routes `/meetings` exist as stubs.
- **Phase 3 — chat:** internal 1:1 and channels on `Message.channel = team`. SMS UI is the template. Routes `/chat` exist as stubs.

Do not build a custom SFU or a second messenger.

## 11. HIPAA and security

- TLS 1.2+ in transit; SRTP / Telnyx encrypted media; AES-256 at rest via KMS
- No unencrypted SIP fallback
- PHI fields: recording objects, voicemail audio, SMS/MMS bodies, transcripts (when they exist later)
- Every PHI read is an `AuditEvent`
- Transcription engines are out of MVP so they are not sub-processors yet
- E911: DID has a registered address; each user has a dispatch location (home-based)
- Breach: CloudWatch alarm → Bytesize on-call → notify Doc within the HIPAA window; documented in the runbook
- Handoff: transfer the dedicated AWS account and Telnyx sub-account; Bytesize retains a maintenance relationship

## 12. Parallel run and porting

1. Provision a new Telnyx DID. Both users live on it in the new app.
2. Dialpad keeps the published number. Dual-app period is expected.
3. When the new system is stable, submit Dialpad port-out (LOA + CSR). Carrier SLA typically 1–3 weeks.
4. Port completes → update published materials if needed → cancel Dialpad.

Do not port as the first production action.

## 13. Stack

| Layer | Choice |
|---|---|
| Repo | `thriving-harmony` on Desktop, independent git history |
| Web | Next.js App Router |
| API | Node.js + TypeScript, Express |
| DB | PostgreSQL on RDS, Prisma |
| Auth | Cognito |
| Voice / SMS | Telnyx (Twilio adapter if BAA fails) |
| Softphone | Telnyx WebRTC in the browser |
| Video later | Amazon Chime SDK Meetings |
| Jobs | ECS scheduled task or EventBridge + Lambda (retention sweeper) |
| IaC | Terraform in this repo |

Languages and APIs may resemble Intry. Packages, CI, and cloud accounts must not.

## 14. Proposed repo layout (when implementation starts)

```
thriving-harmony/
  docs/           specs, plans, runbooks, BAA checklist
  apps/web/       Next.js softphone + admin
  apps/api/       telephony webhooks + REST
  packages/db/    Prisma schema
  infra/          AWS + Telnyx IaC
```

MVP does not need a mobile app.

## 15. Phased delivery

1. **Legal** — BAAs (TH, AWS, Telnyx/Twilio). Stop if carrier BAA is missing.
2. **Foundation** — AWS account, IaC, Cognito, RDS, S3+KMS, empty app deploys.
3. **Phone** — DID, IVR, sim-ring, WebRTC, recording, voicemail, hours admin.
4. **SMS** — 10DLC, inbox, retention.
5. **Parallel** — both users live on the new DID beside Dialpad.
6. **Port** — Dialpad number(s) in; Dialpad cancelled.
7. **Stubs** — `/meetings` and `/chat` routes + tables only.
8. **Handoff** — account transfer + runbook.

## 16. Open items (do not block scaffolding)

- Spoken IVR names for press 1 / press 2
- Dialpad number(s) to port and contract end date
- Practice timezone and weekly hours
- State(s) of practice (recording announcement / two-party consent)
- Default retention windows (recordings, voicemail, SMS)
- 10DLC legal entity details (EIN, website, sample copy)
- On-call rotation during Bytesize operate period

## 17. Success criteria

- Both users complete a test inbound, outbound, voicemail, and SMS on the new DID before port
- Recording on by default; disable on one line is honored
- After-hours call never rings a cell
- Audit log shows who played a recording
- Zero PHI on Intry systems
- Dialpad cancelled only after the port is confirmed

import type { Request, Response } from 'express';
import { prisma, CallDirection, CallDisposition, type Prisma } from '@harmony/db';
import { routeInbound, type WeeklyHours } from '@harmony/routing';
import { renderDecision, texmlResponse } from '../texml.js';
import { createObjectStore } from '../storage.js';

const store = createObjectStore();

function publicUrl(): string {
  return process.env.API_PUBLIC_URL ?? 'http://localhost:4000';
}

function asRecord(body: unknown): Record<string, unknown> {
  if (body && typeof body === 'object') return body as Record<string, unknown>;
  return {};
}

function field(body: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = body[key];
    if (typeof value === 'string' && value.length > 0) return value;
    if (typeof value === 'number') return String(value);
  }
  return '';
}

async function orgForDid(toE164: string) {
  const number = await prisma.phoneNumber.findUnique({
    where: { e164: toE164 },
    include: { organization: { include: { users: true } } },
  });
  return number?.organization ?? null;
}

export async function inboundVoice(req: Request, res: Response): Promise<void> {
  const body = asRecord(req.body);
  const from = field(body, 'From', 'from', 'fromE164');
  const to = field(body, 'To', 'to', 'toE164');
  const callId = field(body, 'CallSid', 'call_control_id', 'CallControlId') || `local-${Date.now()}`;

  const org = await orgForDid(to);
  if (!org) {
    res.type('application/xml').send(texmlResponse('<Say>This number is not in service.</Say><Hangup/>'));
    return;
  }

  const call = await prisma.call.create({
    data: {
      organizationId: org.id,
      telnyxCallId: callId,
      direction: CallDirection.INBOUND,
      fromE164: from || 'anonymous',
      toE164: to,
      disposition: CallDisposition.IVR,
    },
  });

  const decision = routeInbound({
    now: new Date(),
    timezone: org.timezone,
    weeklyHours: org.weeklyHours as WeeklyHours,
    afterHoursGreeting: org.afterHoursGreeting,
    ivrGreeting: org.ivrGreeting,
    recordingNotice: org.recordingNotice,
    digit: null,
    users: org.users,
  });

  if (decision.type === 'voicemail') {
    await prisma.call.update({
      where: { id: call.id },
      data: { disposition: CallDisposition.VOICEMAIL },
    });
  }

  res.type('application/xml').send(renderDecision(decision, publicUrl(), call.id));
}

export async function ivrDigit(req: Request, res: Response): Promise<void> {
  const body = asRecord(req.body);
  const digits = field(body, 'Digits', 'digits', 'dtmf');
  const to = field(body, 'To', 'to');
  const callSid = field(body, 'CallSid', 'call_control_id');

  const org = await orgForDid(to);
  const call = callSid
    ? await prisma.call.findUnique({ where: { telnyxCallId: callSid } })
    : await prisma.call.findFirst({ where: { toE164: to }, orderBy: { startedAt: 'desc' } });

  if (!org || !call) {
    res.type('application/xml').send(renderDecision({ type: 'voicemail', greeting: 'Please leave a message.' }, publicUrl(), 'unknown'));
    return;
  }

  const decision = routeInbound({
    now: new Date(),
    timezone: org.timezone,
    weeklyHours: org.weeklyHours as WeeklyHours,
    afterHoursGreeting: org.afterHoursGreeting,
    ivrGreeting: org.ivrGreeting,
    recordingNotice: org.recordingNotice,
    digit: digits.slice(0, 1) || null,
    users: org.users,
  });

  const data: Prisma.CallUpdateInput = {};
  if (decision.type === 'sim_ring') {
    data.user = { connect: { id: decision.userId } };
    data.recorded = decision.record;
    data.disposition = CallDisposition.ANSWERED;
  }
  if (decision.type === 'voicemail') {
    data.disposition = CallDisposition.VOICEMAIL;
  }
  await prisma.call.update({ where: { id: call.id }, data });

  res.type('application/xml').send(renderDecision(decision, publicUrl(), call.id));
}

export async function voicemailStart(req: Request, res: Response): Promise<void> {
  const body = asRecord(req.body);
  const to = field(body, 'To', 'to');
  const org = await orgForDid(to);
  const greeting = org?.afterHoursGreeting ?? 'Please leave a message after the tone.';
  const call = await prisma.call.findFirst({ where: { toE164: to }, orderBy: { startedAt: 'desc' } });
  res.type('application/xml').send(renderDecision({ type: 'voicemail', greeting }, publicUrl(), call?.id ?? 'unknown'));
}

export async function recordingDone(req: Request, res: Response): Promise<void> {
  const body = asRecord(req.body);
  const recordingUrl = field(body, 'RecordingUrl', 'recording_url');
  const callId = String(req.query.callControlId ?? field(body, 'CallSid') ?? '');
  const call = await prisma.call.findFirst({
    where: { OR: [{ id: callId }, { telnyxCallId: callId }] },
  });
  if (call && recordingUrl) {
    const audio = await fetch(recordingUrl).then((r) => r.arrayBuffer()).catch(() => null);
    const key = `voicemail/${call.organizationId}/${call.id}.wav`;
    if (audio) await store.put(key, Buffer.from(audio), 'audio/wav');
    await prisma.voicemail.create({
      data: {
        organizationId: call.organizationId,
        callId: call.id,
        userId: call.userId,
        fromE164: call.fromE164,
        audioKey: key,
      },
    });
    await prisma.call.update({
      where: { id: call.id },
      data: { disposition: CallDisposition.VOICEMAIL, endedAt: new Date() },
    });
  }
  res.type('application/xml').send(texmlResponse('<Hangup/>'));
}

export async function dialComplete(req: Request, res: Response): Promise<void> {
  const body = asRecord(req.body);
  const status = field(body, 'DialCallStatus', 'CallStatus', 'status');
  const to = field(body, 'To', 'to');
  const call = await prisma.call.findFirst({ where: { toE164: to }, orderBy: { startedAt: 'desc' } });
  if (call && status && !['completed', 'answered'].includes(status.toLowerCase())) {
    await prisma.call.update({
      where: { id: call.id },
      data: { disposition: CallDisposition.NO_ANSWER },
    });
    const org = await prisma.organization.findUnique({ where: { id: call.organizationId } });
    res
      .type('application/xml')
      .send(renderDecision({ type: 'voicemail', greeting: org?.afterHoursGreeting ?? 'Please leave a message.' }, publicUrl(), call.id));
    return;
  }
  res.type('application/xml').send(texmlResponse('<Hangup/>'));
}

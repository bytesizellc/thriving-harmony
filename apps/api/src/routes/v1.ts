import { Router } from 'express';
import { prisma, MessageChannel, MessageStatus, CallDirection } from '@harmony/db';
import { requireAuth, requireOwner, type AuthedRequest } from '../auth.js';
import { audit } from '../audit.js';
import { createObjectStore } from '../storage.js';

export const v1 = Router();
const store = createObjectStore();

v1.use(requireAuth);

v1.get('/me', (req, res) => {
  const user = (req as AuthedRequest).user;
  res.json({ data: user });
});

v1.get('/organization', async (req, res) => {
  const user = (req as AuthedRequest).user;
  const org = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    include: { phoneNumbers: true, retentionPolicies: true },
  });
  res.json({ data: org });
});

v1.patch('/organization', requireOwner, async (req, res) => {
  const user = (req as AuthedRequest).user;
  const { timezone, weeklyHours, ivrGreeting, afterHoursGreeting, recordingNotice } = req.body as Record<string, unknown>;
  const org = await prisma.organization.update({
    where: { id: user.organizationId },
    data: {
      ...(typeof timezone === 'string' ? { timezone } : {}),
      ...(weeklyHours ? { weeklyHours } : {}),
      ...(typeof ivrGreeting === 'string' ? { ivrGreeting } : {}),
      ...(typeof afterHoursGreeting === 'string' ? { afterHoursGreeting } : {}),
      ...(typeof recordingNotice === 'string' ? { recordingNotice } : {}),
    },
  });
  res.json({ data: org });
});

v1.get('/users', async (req, res) => {
  const user = (req as AuthedRequest).user;
  const users = await prisma.user.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { extension: 'asc' },
  });
  res.json({ data: users });
});

v1.patch('/users/:id', async (req, res) => {
  const actor = (req as unknown as AuthedRequest).user;
  const target = await prisma.user.findFirst({
    where: { id: req.params.id, organizationId: actor.organizationId },
  });
  if (!target) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found.' } });
    return;
  }
  if (actor.role !== 'OWNER' && actor.id !== target.id) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Cannot edit this user.' } });
    return;
  }
  const { recordingEnabled, mobileE164, displayName } = req.body as Record<string, unknown>;
  const updated = await prisma.user.update({
    where: { id: target.id },
    data: {
      ...(typeof recordingEnabled === 'boolean' ? { recordingEnabled } : {}),
      ...(typeof mobileE164 === 'string' ? { mobileE164 } : {}),
      ...(typeof displayName === 'string' && actor.role === 'OWNER' ? { displayName } : {}),
    },
  });
  res.json({ data: updated });
});

v1.get('/calls', async (req, res) => {
  const user = (req as AuthedRequest).user;
  const calls = await prisma.call.findMany({
    where: { organizationId: user.organizationId },
    include: { user: true },
    orderBy: { startedAt: 'desc' },
    take: 100,
  });
  res.json({ data: calls });
});

v1.get('/voicemails', async (req, res) => {
  const user = (req as AuthedRequest).user;
  const items = await prisma.voicemail.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json({ data: items });
});

v1.get('/voicemails/:id/audio', async (req, res) => {
  const user = (req as unknown as AuthedRequest).user;
  const vm = await prisma.voicemail.findFirst({
    where: { id: req.params.id, organizationId: user.organizationId },
  });
  if (!vm) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Voicemail not found.' } });
    return;
  }
  if (user.role !== 'OWNER' && vm.userId && vm.userId !== user.id) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not a party to this voicemail.' } });
    return;
  }
  await audit({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: 'voicemail.read_audio',
    resourceType: 'Voicemail',
    resourceId: vm.id,
  });
  try {
    const buf = await store.get(vm.audioKey);
    res.setHeader('Content-Type', 'audio/wav');
    res.send(buf);
  } catch {
    res.status(404).json({ error: { code: 'MISSING_OBJECT', message: 'Audio is not in the store yet.' } });
  }
});

v1.get('/messages', async (req, res) => {
  const user = (req as AuthedRequest).user;
  await audit({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: 'message.list',
    resourceType: 'Message',
    resourceId: user.organizationId,
  });
  const items = await prisma.message.findMany({
    where: { organizationId: user.organizationId, channel: MessageChannel.SMS },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  res.json({ data: items });
});

v1.post('/messages', async (req, res) => {
  const user = (req as AuthedRequest).user;
  const org = await prisma.organization.findUnique({ where: { id: user.organizationId } });
  if (!org?.smsEnabled) {
    res.status(403).json({
      error: {
        code: 'SMS_LOCKED',
        message: 'Patient SMS is disabled until 10DLC is approved and Organization.smsEnabled is true.',
      },
    });
    return;
  }
  const { toE164, body } = req.body as { toE164?: string; body?: string };
  if (!toE164 || !body) {
    res.status(400).json({ error: { code: 'INVALID', message: 'toE164 and body are required.' } });
    return;
  }
  const fromNumber = await prisma.phoneNumber.findFirst({
    where: { organizationId: user.organizationId, isPrimary: true },
  });
  const message = await prisma.message.create({
    data: {
      organizationId: user.organizationId,
      userId: user.id,
      channel: MessageChannel.SMS,
      direction: CallDirection.OUTBOUND,
      fromE164: fromNumber?.e164 ?? process.env.TELNYX_FROM_E164 ?? '',
      toE164,
      body,
      status: MessageStatus.QUEUED,
    },
  });
  res.status(201).json({ data: message });
});

v1.get('/webrtc/token', (req, res) => {
  const user = (req as AuthedRequest).user;
  res.json({
    data: {
      sipUsername: user.webrtcSipUsername,
      token: process.env.TELNYX_API_KEY ? 'set-via-telnyx-on-go-live' : null,
      note: 'Telnyx WebRTC credentials are issued after the carrier BAA and connection exist.',
    },
  });
});

v1.get('/meetings', (_req, res) => {
  res.status(501).json({
    error: { code: 'NOT_BUILT', message: 'Meetings are scoped for phase 2 (Amazon Chime SDK).' },
  });
});

v1.get('/chat', (_req, res) => {
  res.status(501).json({
    error: { code: 'NOT_BUILT', message: 'Team chat is scoped for phase 3.' },
  });
});

v1.get('/audit', requireOwner, async (req, res) => {
  const user = (req as AuthedRequest).user;
  const events = await prisma.auditEvent.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  res.json({ data: events });
});

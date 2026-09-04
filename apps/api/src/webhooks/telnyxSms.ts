import type { Request, Response } from 'express';
import { prisma, CallDirection, MessageChannel, MessageStatus } from '@harmony/db';

function asRecord(body: unknown): Record<string, unknown> {
  if (body && typeof body === 'object') return body as Record<string, unknown>;
  return {};
}

export async function inboundSms(req: Request, res: Response): Promise<void> {
  const payload = asRecord(req.body);
  const data = asRecord(payload.data ?? payload);
  const payloadInner = asRecord(data.payload ?? data);
  const from = String(payloadInner.from ?? payloadInner.From ?? '');
  const to = String(payloadInner.to ?? payloadInner.To ?? '');
  const text = String(payloadInner.text ?? payloadInner.Body ?? '');
  const telnyxId = String(data.id ?? payloadInner.id ?? '') || null;

  const number = await prisma.phoneNumber.findUnique({
    where: { e164: to },
  });
  if (!number) {
    res.status(200).json({ data: { ignored: true } });
    return;
  }

  await prisma.message.create({
    data: {
      organizationId: number.organizationId,
      channel: MessageChannel.SMS,
      direction: CallDirection.INBOUND,
      fromE164: from,
      toE164: to,
      body: text,
      status: MessageStatus.RECEIVED,
      telnyxId,
    },
  });

  res.status(200).json({ data: { ok: true } });
}

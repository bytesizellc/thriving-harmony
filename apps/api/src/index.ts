import path from 'node:path';
import { config } from 'dotenv';
import express from 'express';
import cors from 'cors';
import { inboundVoice, ivrDigit, voicemailStart, recordingDone, dialComplete } from './webhooks/telnyxVoice.js';
import { inboundSms } from './webhooks/telnyxSms.js';
import { v1 } from './routes/v1.js';

config({ path: path.resolve(import.meta.dirname, '../../../.env') });

const app = express();
app.use(cors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000' }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => {
  res.json({ data: { ok: true, service: 'harmony-api' } });
});

app.post('/webhooks/telnyx/voice', inboundVoice);
app.post('/webhooks/telnyx/voice/ivr', ivrDigit);
app.post('/webhooks/telnyx/voice/voicemail', voicemailStart);
app.post('/webhooks/telnyx/voice/recording', recordingDone);
app.post('/webhooks/telnyx/voice/dial-complete', dialComplete);
app.post('/webhooks/telnyx/sms', inboundSms);

app.use('/v1', v1);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Unexpected error.' } });
});

const port = Number(process.env.API_PORT ?? 4000);
app.listen(port, () => {
  console.log(`harmony-api listening on ${port}`);
});

import type { RouteDecision } from '@harmony/routing';

function say(text: string): string {
  return `<Say>${escapeXml(text)}</Say>`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function texmlResponse(body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`;
}

export function renderDecision(decision: RouteDecision, publicUrl: string, callControlId: string): string {
  if (decision.type === 'ivr') {
    return texmlResponse(
      `<Gather action="${publicUrl}/webhooks/telnyx/voice/ivr" numDigits="1" timeout="6">${say(decision.greeting)}</Gather><Redirect>${publicUrl}/webhooks/telnyx/voice/voicemail</Redirect>`,
    );
  }
  if (decision.type === 'voicemail') {
    return texmlResponse(
      `${say(decision.greeting)}<Record action="${publicUrl}/webhooks/telnyx/voice/recording?callControlId=${encodeURIComponent(callControlId)}" maxLength="120" playBeep="true" />`,
    );
  }
  const recordAttr = decision.record ? ' record="record-from-answer"' : '';
  const notice = decision.record ? say(decision.recordingNotice) : '';
  const sip = decision.webrtcSipUsername
    ? `<Sip>sip:${escapeXml(decision.webrtcSipUsername)}@sip.telnyx.com</Sip>`
    : '';
  return texmlResponse(
    `${notice}<Dial timeout="25"${recordAttr} action="${publicUrl}/webhooks/telnyx/voice/dial-complete">${sip}<Number>${escapeXml(decision.mobileE164)}</Number></Dial>`,
  );
}

# BAA checklist

No PHI (call audio, voicemail, SMS bodies, recordings) until all three are signed and on file.

1. Bytesize LLC ↔ Thriving Harmony LLC (Bytesize is the business associate).
2. Bytesize LLC ↔ AWS (AWS Artifact BAA on the **dedicated** Harmony account, not Intry, not `533350584402`).
3. Bytesize LLC ↔ Telnyx covering programmable voice, recording, and SMS. If Telnyx refuses, switch the adapter to Twilio HIPAA-eligible Voice + Messaging. Do not go live on conduit-exception-only terms.

Sub-processors to disclose: AWS, Telnyx (or Twilio).

After BAAs: provision a new Telnyx DID, run parallel with Dialpad, then port. Do not port first.

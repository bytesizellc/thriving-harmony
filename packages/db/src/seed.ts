import { PrismaClient, UserRole, DataType, PortingState } from '@prisma/client';

const prisma = new PrismaClient();

const weeklyHours = {
  sun: null,
  mon: { start: '09:00', end: '17:00' },
  tue: { start: '09:00', end: '17:00' },
  wed: { start: '09:00', end: '17:00' },
  thu: { start: '09:00', end: '17:00' },
  fri: { start: '09:00', end: '17:00' },
  sat: null,
};

async function main() {
  await prisma.auditEvent.deleteMany();
  await prisma.message.deleteMany();
  await prisma.voicemail.deleteMany();
  await prisma.call.deleteMany();
  await prisma.retentionPolicy.deleteMany();
  await prisma.phoneNumber.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.chatChannel.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  const org = await prisma.organization.create({
    data: {
      name: 'Thriving Harmony LLC',
      timezone: 'America/New_York',
      weeklyHours,
      ivrGreeting:
        'Thank you for calling Thriving Harmony. Press 1 for the first clinician. Press 2 for the second clinician.',
      afterHoursGreeting:
        'You have reached Thriving Harmony after hours. Please leave a message after the tone.',
      recordingNotice: 'This call may be recorded.',
      smsEnabled: false,
      users: {
        create: [
          {
            email: 'doc@thrivingharmony.example',
            displayName: 'Practice Owner',
            role: UserRole.OWNER,
            extension: '101',
            mobileE164: '+15555550101',
            webrtcSipUsername: 'harmony-owner',
            recordingEnabled: true,
            ivrDigit: '1',
            e911Address: 'Set before go-live',
          },
          {
            email: 'clinician@thrivingharmony.example',
            displayName: 'Clinician',
            role: UserRole.CLINICIAN,
            extension: '102',
            mobileE164: '+15555550102',
            webrtcSipUsername: 'harmony-clinician',
            recordingEnabled: true,
            ivrDigit: '2',
            e911Address: 'Set before go-live',
          },
        ],
      },
      phoneNumbers: {
        create: {
          e164: '+15555551000',
          portingState: PortingState.NONE,
          isPrimary: true,
        },
      },
      retentionPolicies: {
        create: [
          { dataType: DataType.RECORDING, retainDays: 2555 },
          { dataType: DataType.VOICEMAIL, retainDays: 2555 },
          { dataType: DataType.SMS, retainDays: 2555 },
        ],
      },
    },
  });

  console.log(`Seeded organization ${org.id}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

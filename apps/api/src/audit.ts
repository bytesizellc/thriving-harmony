import { prisma } from '@harmony/db';

export async function audit(input: {
  organizationId: string;
  actorUserId: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
}): Promise<void> {
  await prisma.auditEvent.create({ data: input });
}

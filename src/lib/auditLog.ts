import { prisma } from './prisma'
import { Prisma } from '@prisma/client'

interface AuditParams {
  userId: string
  userEmail: string
  action: string
  entity: string
  entityId: string
  before?: Prisma.InputJsonValue | null
  after?: Prisma.InputJsonValue | null
}

export async function logAudit(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        userEmail: params.userEmail,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        before: params.before ?? undefined,
        after: params.after ?? undefined,
      },
    })
  } catch {
    // Audit failures must never break the main flow
  }
}

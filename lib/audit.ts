import { prisma } from "@/lib/prisma";

export async function logAudit(params: {
  clinicId?: string | null;
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  severity?: "INFO" | "WARN" | "CRITICAL";
  description?: string;
  before?: any;
  after?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        clinicId: params.clinicId ?? null,
        userId: params.userId ?? null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId ?? null,
        severity: params.severity ?? "INFO",
        description: params.description,
        before: params.before ?? undefined,
        after: params.after ?? undefined,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
      },
    });
  } catch (e) {
    console.error("[audit] failed", e);
  }
}

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return new Response('unauthorized', { status: 401 });
  const role = (session.user as any).role as string;
  if (role !== 'OWNER' && role !== 'SUPER_ADMIN') return new Response('forbidden', { status: 403 });

  const where: any = {};
  if (role !== 'SUPER_ADMIN') where.clinicId = (session.user as any).clinicId;

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 5000,
    include: { user: { select: { name: true, email: true } } },
  });

  const header = ['createdAt', 'user', 'email', 'action', 'entity', 'entityId', 'severity', 'ip', 'userAgent'];
  const rows = logs.map((l) =>
    [
      l.createdAt.toISOString(),
      l.user?.name ?? '',
      l.user?.email ?? '',
      l.action,
      l.entity,
      l.entityId ?? '',
      l.severity,
      l.ipAddress ?? '',
      l.userAgent ?? '',
    ]
      .map(csvEscape)
      .join(','),
  );

  const csv = [header.join(','), ...rows].join('\n');
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="auditoria-${Date.now()}.csv"`,
    },
  });
}

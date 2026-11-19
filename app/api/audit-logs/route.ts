import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const role = (session.user as any).role as string;
  if (role !== 'OWNER' && role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const where: any = {};
  if (role !== 'SUPER_ADMIN') where.clinicId = (session.user as any).clinicId;
  if (searchParams.get('action')) where.action = searchParams.get('action');
  if (searchParams.get('severity')) where.severity = searchParams.get('severity');
  if (searchParams.get('entity')) where.entity = searchParams.get('entity');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to + 'T23:59:59');
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 500,
    include: { user: { select: { name: true, email: true, role: true } } },
  });

  return NextResponse.json({ logs });
}

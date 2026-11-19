import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const role = session.user.role;
  if (role === 'RECEPTION') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month') ?? new Date().toISOString().slice(0, 7);
  const status = searchParams.get('status');

  const where: Record<string, unknown> = {
    clinicId: session.user.clinicId,
    referenceMonth: month,
  };
  if (status) where.status = status;

  if (role === 'DENTIST') {
    const dentist = await prisma.dentist.findFirst({
      where: { clinicId: session.user.clinicId!, userId: session.user.id },
      select: { id: true },
    });
    if (!dentist) return NextResponse.json({ error: 'Dentista não vinculado' }, { status: 403 });
    where.dentistId = dentist.id;
  }

  const commissions = await prisma.commission.findMany({
    where,
    include: {
      dentist: { select: { fullName: true, color: true } },
      procedure: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  return NextResponse.json({ commissions });
}

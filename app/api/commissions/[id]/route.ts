import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const ALLOWED = new Set(['APPROVED', 'PAID', 'CANCELED']);

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  if (session.user.role !== 'OWNER' && session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const status = String(body.status ?? '');
  if (!ALLOWED.has(status)) {
    return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
  }

  const existing = await prisma.commission.findFirst({
    where: { id: params.id, clinicId: session.user.clinicId! },
    select: { id: true, status: true, amount: true, dentistId: true },
  });
  if (!existing) return NextResponse.json({ error: 'Comissão não encontrada' }, { status: 404 });

  const updated = await prisma.commission.update({
    where: { id: existing.id },
    data: {
      status,
      paidAt: status === 'PAID' ? new Date() : null,
    },
  });

  await prisma.auditLog.create({
    data: {
      clinicId: session.user.clinicId,
      userId: session.user.id,
      action: 'UPDATE',
      entity: 'Commission',
      entityId: existing.id,
      severity: 'WARN',
      description: `Comissão alterada de ${existing.status} para ${status}`,
      before: { status: existing.status },
      after: { status },
    },
  });

  return NextResponse.json({ commission: updated });
}

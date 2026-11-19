import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const clinicId = (session.user as any).clinicId as string | undefined;
  if (!clinicId) return NextResponse.json({ error: 'No clinic' }, { status: 400 });

  const prices = await prisma.insurancePriceTable.findMany({
    where: { insurance: { clinicId }, isActive: true },
    include: { insurance: true, procedure: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ prices });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as any).role as string;
  if (!['OWNER', 'SUPER_ADMIN'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const clinicId = (session.user as any).clinicId as string | undefined;
  if (!clinicId) return NextResponse.json({ error: 'No clinic' }, { status: 400 });

  const body = await req.json();
  const { insuranceId, procedureId, price, reimbursementAmount, copayPercent } = body ?? {};
  if (!insuranceId || !procedureId || typeof price !== 'number') {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  }

  const insurance = await prisma.insurance.findFirst({ where: { id: insuranceId, clinicId } });
  if (!insurance) return NextResponse.json({ error: 'Convênio inválido' }, { status: 404 });
  const procedure = await prisma.procedure.findFirst({ where: { id: procedureId, clinicId } });
  if (!procedure) return NextResponse.json({ error: 'Procedimento inválido' }, { status: 404 });

  const created = await prisma.insurancePriceTable.create({
    data: {
      insuranceId,
      procedureId,
      price,
      reimbursementAmount: reimbursementAmount ?? null,
      copayPercent: copayPercent ?? null,
    },
  });

  await prisma.auditLog.create({
    data: {
      clinicId,
      userId: session.user.id,
      action: 'CREATE',
      entity: 'InsurancePriceTable',
      entityId: created.id,
      severity: 'INFO',
      description: `Preço ${price} cadastrado para ${procedure.name} em ${insurance.name}`,
      after: { insuranceId, procedureId, price } as any,
    },
  });

  return NextResponse.json({ price: created }, { status: 201 });
}

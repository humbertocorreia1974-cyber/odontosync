import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const VALID_STATUS = ['HEALTHY', 'TREATED', 'EXTRACTED', 'IN_TREATMENT', 'MISSING'];

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.clinicId) return NextResponse.json({ error: 'no clinic' }, { status: 400 });

  const patient = await prisma.patient.findFirst({ where: { id: params.id, clinicId: user.clinicId } });
  if (!patient) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const records = await prisma.toothRecord.findMany({ where: { patientId: params.id } });
  return NextResponse.json({ records });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.clinicId) return NextResponse.json({ error: 'no clinic' }, { status: 400 });
  if (user.role === 'RECEPTION' || user.role === 'PATIENT') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const patient = await prisma.patient.findFirst({ where: { id: params.id, clinicId: user.clinicId } });
  if (!patient) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const body = await request.json();
  const updates: Array<{ toothNumber: number; face: string; status: string; notes?: string }> = body.updates || [];
  if (!Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json({ error: 'updates vazio' }, { status: 400 });
  }

  const dentist = await prisma.dentist.findFirst({ where: { userId: user.id } });

  const results = await prisma.$transaction(
    updates.map((u) => {
      if (!VALID_STATUS.includes(u.status)) throw new Error(`status inválido: ${u.status}`);
      return prisma.toothRecord.upsert({
        where: { patientId_toothNumber_face: { patientId: params.id, toothNumber: u.toothNumber, face: u.face } },
        create: {
          patientId: params.id,
          dentistId: dentist?.id ?? null,
          toothNumber: u.toothNumber,
          face: u.face,
          status: u.status,
          notes: u.notes ?? null,
        },
        update: { status: u.status, notes: u.notes ?? null, dentistId: dentist?.id ?? null },
      });
    })
  );

  await prisma.auditLog.create({
    data: {
      clinicId: user.clinicId,
      userId: user.id,
      action: 'UPDATE',
      entity: 'ToothRecord',
      entityId: params.id,
      severity: 'INFO',
      description: `Odontograma atualizado (${updates.length} faces)`,
    },
  });

  return NextResponse.json({ updated: results.length });
}

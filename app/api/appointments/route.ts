import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const unitId = searchParams.get('unitId');
  const dentistId = searchParams.get('dentistId');
  const chairId = searchParams.get('chairId');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.clinicId) return NextResponse.json({ error: 'no clinic' }, { status: 400 });

  const where: any = { clinicId: user.clinicId };
  if (unitId) where.unitId = unitId;
  if (dentistId) where.dentistId = dentistId;
  if (chairId) where.chairId = chairId;
  if (from || to) {
    where.startAt = {};
    if (from) where.startAt.gte = new Date(from);
    if (to) where.startAt.lte = new Date(to);
  }

  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      patient: { select: { id: true, fullName: true } },
      dentist: { select: { id: true, fullName: true, color: true } },
      chair: { select: { id: true, name: true } },
      procedure: { select: { id: true, name: true } },
    },
    orderBy: { startAt: 'asc' },
    take: 200,
  });

  return NextResponse.json({ appointments });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.clinicId) return NextResponse.json({ error: 'no clinic' }, { status: 400 });
  if (user.role === 'PATIENT') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await request.json();
  const { unitId, patientId, dentistId, chairId, procedureId, startAt, endAt, title, notes } = body;

  if (!unitId || !patientId || !dentistId || !chairId || !startAt || !endAt) {
    return NextResponse.json({ error: 'campos obrigatórios faltando' }, { status: 400 });
  }

  const start = new Date(startAt);
  const end = new Date(endAt);
  if (end <= start) return NextResponse.json({ error: 'horário final deve ser após o inicial' }, { status: 400 });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const chairConflict = await tx.appointment.findFirst({
        where: {
          chairId,
          status: { notIn: ['CANCELED', 'NO_SHOW'] },
          AND: [{ startAt: { lt: end } }, { endAt: { gt: start } }],
        },
        include: { patient: { select: { fullName: true } } },
      });
      if (chairConflict) {
        throw new Error(`Conflito de CADEIRA: já existe agendamento de ${chairConflict.patient.fullName} neste horário.`);
      }

      const dentistConflict = await tx.appointment.findFirst({
        where: {
          dentistId,
          status: { notIn: ['CANCELED', 'NO_SHOW'] },
          AND: [{ startAt: { lt: end } }, { endAt: { gt: start } }],
        },
        include: { patient: { select: { fullName: true } } },
      });
      if (dentistConflict) {
        throw new Error(`Conflito de DENTISTA: já existe agendamento de ${dentistConflict.patient.fullName} neste horário.`);
      }

      const created = await tx.appointment.create({
        data: {
          clinicId: user.clinicId!,
          unitId,
          patientId,
          dentistId,
          chairId,
          procedureId: procedureId || null,
          createdById: user.id,
          dentistUserId: null,
          title: title || null,
          notes: notes || null,
          startAt: start,
          endAt: end,
          status: 'SCHEDULED',
        },
      });

      await tx.auditLog.create({
        data: {
          clinicId: user.clinicId!,
          userId: user.id,
          action: 'CREATE',
          entity: 'Appointment',
          entityId: created.id,
          severity: 'INFO',
          description: `Agendamento criado para ${start.toISOString()}`,
        },
      });

      return created;
    });

    return NextResponse.json({ appointment: result }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'erro ao criar agendamento' }, { status: 409 });
  }
}

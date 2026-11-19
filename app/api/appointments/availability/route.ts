import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const SLOT_MINUTES = 30;
const DAY_START_HOUR = 8;
const DAY_END_HOUR = 19;

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const unitId = searchParams.get('unitId');
  const dentistId = searchParams.get('dentistId');
  const dateStr = searchParams.get('date');
  if (!unitId || !dentistId || !dateStr) {
    return NextResponse.json({ error: 'unitId, dentistId e date são obrigatórios' }, { status: 400 });
  }

  const dayStart = new Date(`${dateStr}T00:00:00`);
  const dayEnd = new Date(`${dateStr}T23:59:59`);

  const [chairs, busy] = await Promise.all([
    prisma.chair.findMany({ where: { unitId, isActive: true }, orderBy: { name: 'asc' } }),
    prisma.appointment.findMany({
      where: {
        clinicId: session.user.clinicId ?? undefined,
        unitId,
        status: { notIn: ['CANCELED', 'NO_SHOW'] },
        startAt: { lt: dayEnd },
        endAt: { gt: dayStart },
      },
      select: { chairId: true, dentistId: true, startAt: true, endAt: true },
    }),
  ]);

  const slots: { start: string; end: string; chairId: string; chairName: string; free: boolean }[] = [];
  for (const chair of chairs) {
    for (let h = DAY_START_HOUR; h < DAY_END_HOUR; h++) {
      for (let m = 0; m < 60; m += SLOT_MINUTES) {
        const s = new Date(dayStart);
        s.setHours(h, m, 0, 0);
        const e = new Date(s.getTime() + SLOT_MINUTES * 60_000);
        const chairBusy = busy.some(
          (b) => b.chairId === chair.id && b.startAt < e && b.endAt > s,
        );
        const dentistBusy = busy.some(
          (b) => b.dentistId === dentistId && b.startAt < e && b.endAt > s,
        );
        slots.push({
          start: s.toISOString(),
          end: e.toISOString(),
          chairId: chair.id,
          chairName: chair.name,
          free: !chairBusy && !dentistBusy,
        });
      }
    }
  }

  return NextResponse.json({ slots });
}

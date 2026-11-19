import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const role = (session.user as any).role as string;
  if (!['OWNER', 'SUPER_ADMIN', 'RECEPTION'].includes(role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  const { unitId } = await request.json();
  if (!unitId) return NextResponse.json({ error: 'unitId obrigatório' }, { status: 400 });

  const clinicId = (session.user as any).clinicId as string | undefined;

  const unit = await prisma.unit.findFirst({
    where: { id: unitId, ...(clinicId ? { clinicId } : {}) },
    include: { clinic: true },
  });
  if (!unit) return NextResponse.json({ error: 'Unidade não encontrada' }, { status: 404 });

  const items = await prisma.inventoryItem.findMany({
    where: { unitId, isActive: true },
  });
  const alerts = items.filter((i) => Number(i.currentQuantity) <= Number(i.minimumQuantity));

  if (alerts.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const recipients = await prisma.user.findMany({
    where: {
      clinicId: unit.clinicId,
      role: { in: ['OWNER', 'RECEPTION'] },
      isActive: true,
    },
    select: { id: true, email: true, name: true },
  });

  const rows = alerts
    .map(
      (a) =>
        `<tr><td style="padding:6px 10px;border-bottom:1px solid #eee">${a.sku}</td><td style="padding:6px 10px;border-bottom:1px solid #eee">${a.name}</td><td style="padding:6px 10px;border-bottom:1px solid #eee">${Number(a.currentQuantity).toFixed(2)} ${a.unitOfMeasure}</td><td style="padding:6px 10px;border-bottom:1px solid #eee">${Number(a.minimumQuantity).toFixed(2)}</td></tr>`,
    )
    .join('');

  const html = `
    <h2>Alerta de estoque mínimo — ${unit.name}</h2>
    <p>${alerts.length} item(ns) abaixo do mínimo configurado.</p>
    <table style="border-collapse:collapse;font-family:sans-serif;font-size:13px">
      <thead><tr><th align="left" style="padding:6px 10px;border-bottom:2px solid #333">SKU</th><th align="left" style="padding:6px 10px;border-bottom:2px solid #333">Item</th><th align="left" style="padding:6px 10px;border-bottom:2px solid #333">Atual</th><th align="left" style="padding:6px 10px;border-bottom:2px solid #333">Mínimo</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="margin-top:16px">Acesse o OdontoSync para repor.</p>
  `;

  let sent = 0;
  for (const r of recipients) {
    try {
      await sendEmail({ to: r.email, subject: `[OdontoSync] Estoque crítico em ${unit.name}`, html });
      await prisma.notification.create({
        data: {
          clinicId: unit.clinicId,
          userId: r.id,
          channel: 'EMAIL',
          provider: 'RESEND',
          template: 'inventory_low_stock',
          recipient: r.email,
          subject: `Estoque crítico em ${unit.name}`,
          body: `${alerts.length} itens abaixo do mínimo`,
          status: 'SENT',
          sentAt: new Date(),
        },
      });
      sent++;
    } catch (e: any) {
      await prisma.notification.create({
        data: {
          clinicId: unit.clinicId,
          userId: r.id,
          channel: 'EMAIL',
          provider: 'RESEND',
          template: 'inventory_low_stock',
          recipient: r.email,
          subject: `Estoque crítico em ${unit.name}`,
          body: `${alerts.length} itens abaixo do mínimo`,
          status: 'FAILED',
          errorMessage: e?.message ?? 'erro',
        },
      });
    }
  }

  return NextResponse.json({ ok: true, sent, alerts: alerts.length });
}

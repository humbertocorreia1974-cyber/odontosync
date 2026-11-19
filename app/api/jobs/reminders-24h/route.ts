import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

const WHATSAPP_API_URL = 'https://graph.facebook.com/v20.0';

async function sendWhatsApp(to: string, body: string) {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneId || !token) return { ok: false, error: 'WhatsApp não configurado' };
  const res = await fetch(`${WHATSAPP_API_URL}/${phoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body } }),
  });
  if (!res.ok) return { ok: false, error: await res.text() };
  const data = await res.json().catch(() => ({}));
  return { ok: true, externalId: data?.messages?.[0]?.id as string | undefined };
}

export async function POST() {
  const session = await getServerSession(authOptions);
  const isCron = false;
  if (!session?.user && !isCron) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const appointments = await prisma.appointment.findMany({
    where: {
      startAt: { gte: now, lte: in24h },
      status: { in: ['SCHEDULED', 'CONFIRMED'] },
      reminderSentAt: null,
      ...(session?.user?.clinicId ? { clinicId: session.user.clinicId } : {}),
    },
    include: { patient: true, dentist: true, unit: true, clinic: true },
    take: 200,
  });

  let sent = 0;
  let failed = 0;

  for (const a of appointments) {
    const when = a.startAt.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    const body = `Olá ${a.patient.fullName.split(' ')[0]}! Lembrete da sua consulta em ${when} com ${a.dentist.fullName} na unidade ${a.unit.name}. Confirme respondendo SIM.`;
    const waNumber = a.patient.whatsapp ?? a.patient.phone ?? '';
    const email = a.patient.email ?? '';

    let waOk = false;
    let waExternalId: string | undefined;
    let waError: string | undefined;

    if (waNumber) {
      const r = await sendWhatsApp(waNumber.replace(/\D/g, ''), body);
      waOk = r.ok;
      waExternalId = r.externalId;
      waError = r.error;
    }

    await prisma.notification.create({
      data: {
        clinicId: a.clinicId,
        patientId: a.patientId,
        appointmentId: a.id,
        channel: 'WHATSAPP',
        provider: 'EVOLUTION_API',
        template: 'reminder_24h',
        recipient: waNumber || '—',
        body,
        status: waOk ? 'SENT' : waNumber ? 'FAILED' : 'PENDING',
        errorMessage: waError,
        externalId: waExternalId,
        sentAt: waOk ? new Date() : null,
      },
    });

    if (email) {
      try {
        await sendEmail({
          to: email,
          subject: `Lembrete: consulta em ${when}`,
          html: `<p>Olá ${a.patient.fullName},</p><p>Este é um lembrete da sua consulta em <strong>${when}</strong> com <strong>${a.dentist.fullName}</strong> na unidade <strong>${a.unit.name}</strong>.</p><p>Até logo!</p>`,
        });
        await prisma.notification.create({
          data: {
            clinicId: a.clinicId,
            patientId: a.patientId,
            appointmentId: a.id,
            channel: 'EMAIL',
            provider: 'RESEND',
            template: 'reminder_24h',
            recipient: email,
            subject: `Lembrete: consulta em ${when}`,
            body,
            status: 'SENT',
            sentAt: new Date(),
          },
        });
      } catch (e: any) {
        await prisma.notification.create({
          data: {
            clinicId: a.clinicId,
            patientId: a.patientId,
            appointmentId: a.id,
            channel: 'EMAIL',
            provider: 'RESEND',
            template: 'reminder_24h',
            recipient: email,
            subject: `Lembrete: consulta em ${when}`,
            body,
            status: 'FAILED',
            errorMessage: e?.message ?? 'erro',
          },
        });
      }
    }

    if (waOk) {
      await prisma.appointment.update({
        where: { id: a.id },
        data: { reminderSentAt: new Date(), reminderChannel: email ? 'BOTH' : 'WHATSAPP' },
      });
      sent++;
    } else {
      failed++;
    }
  }

  return NextResponse.json({ ok: true, sent, failed, total: appointments.length });
}

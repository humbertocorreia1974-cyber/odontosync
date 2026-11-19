import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

async function sendWhatsApp(to: string, body: string) {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneId || !token) {
    return { ok: false, error: 'WhatsApp Cloud API não configurada (WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN)' };
  }
  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data?.error?.message ?? 'erro WhatsApp' };
  return { ok: true, externalId: data?.messages?.[0]?.id };
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!session.user.clinicId) return NextResponse.json({ error: 'no clinic' }, { status: 400 });

  const body = await request.json().catch(() => null);
  if (!body?.appointmentId) return NextResponse.json({ error: 'appointmentId obrigatório' }, { status: 400 });

  const appointment = await prisma.appointment.findFirst({
    where: { id: body.appointmentId, clinicId: session.user.clinicId },
    include: {
      patient: { select: { id: true, fullName: true, email: true, whatsapp: true, phone: true } },
      dentist: { select: { fullName: true } },
      chair: { select: { name: true } },
      unit: { select: { name: true } },
    },
  });
  if (!appointment) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const when = appointment.startAt.toLocaleString('pt-BR', {
    dateStyle: 'full',
    timeStyle: 'short',
  });
  const message =
    `Olá, ${appointment.patient.fullName}! Lembrete da sua consulta na ${appointment.unit.name} ` +
    `em ${when} com Dr(a). ${appointment.dentist.fullName} (cadeira ${appointment.chair.name}). ` +
    `Confirme sua presença respondendo esta mensagem.`;

  const results: { channel: string; ok: boolean; error?: string }[] = [];

  const phone = appointment.patient.whatsapp ?? appointment.patient.phone;
  if (phone) {
    const r = await sendWhatsApp(phone, message);
    await prisma.notification.create({
      data: {
        clinicId: session.user.clinicId,
        patientId: appointment.patient.id,
        appointmentId: appointment.id,
        channel: 'WHATSAPP',
        provider: 'WHATSAPP_CLOUD',
        recipient: phone,
        body: message,
        status: r.ok ? 'SENT' : 'FAILED',
        errorMessage: r.ok ? null : r.error,
        externalId: r.ok ? r.externalId : null,
        sentAt: r.ok ? new Date() : null,
      },
    });
    results.push({ channel: 'WHATSAPP', ok: r.ok, error: r.error });
  }

  if (appointment.patient.email) {
    try {
      await sendEmail({
        to: appointment.patient.email,
        subject: `Lembrete de consulta — ${when}`,
        html: `<p>${message}</p>`,
      });
      await prisma.notification.create({
        data: {
          clinicId: session.user.clinicId,
          patientId: appointment.patient.id,
          appointmentId: appointment.id,
          channel: 'EMAIL',
          provider: 'RESEND',
          recipient: appointment.patient.email,
          subject: `Lembrete de consulta — ${when}`,
          body: message,
          status: 'SENT',
          sentAt: new Date(),
        },
      });
      results.push({ channel: 'EMAIL', ok: true });
    } catch (err: any) {
      await prisma.notification.create({
        data: {
          clinicId: session.user.clinicId,
          patientId: appointment.patient.id,
          appointmentId: appointment.id,
          channel: 'EMAIL',
          provider: 'RESEND',
          recipient: appointment.patient.email,
          subject: `Lembrete de consulta — ${when}`,
          body: message,
          status: 'FAILED',
          errorMessage: err?.message ?? 'erro',
        },
      });
      results.push({ channel: 'EMAIL', ok: false, error: err?.message });
    }
  }

  await prisma.appointment.update({
    where: { id: appointment.id },
    data: { reminderSentAt: new Date(), reminderChannel: results.map((r) => r.channel).join('+') },
  });

  return NextResponse.json({ results });
}

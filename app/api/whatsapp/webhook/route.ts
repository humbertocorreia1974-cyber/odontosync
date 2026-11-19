import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const WHATSAPP_API_URL = 'https://graph.facebook.com/v20.0';

async function reply(to: string, body: string) {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneId || !token) {
    console.warn('[whatsapp] credenciais ausentes — configure WHATSAPP_PHONE_NUMBER_ID e WHATSAPP_ACCESS_TOKEN');
    return;
  }
  const res = await fetch(`${WHATSAPP_API_URL}/${phoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body } }),
  });
  if (!res.ok) console.error('[whatsapp] envio falhou', await res.text());
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? '', { status: 200 });
  }
  return new NextResponse('forbidden', { status: 403 });
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  if (!payload) return NextResponse.json({ ok: false }, { status: 400 });

  const entries = payload?.entry ?? [];
  for (const entry of entries) {
    for (const change of entry?.changes ?? []) {
      const value = change?.value ?? {};
      const messages = value?.messages ?? [];
      for (const msg of messages) {
        const from = msg?.from as string | undefined;
        const text = (msg?.text?.body ?? '').toString().trim();
        if (!from) continue;

        const digits = from.replace(/\D/g, '');
        const patient = await prisma.patient.findFirst({
          where: { OR: [{ whatsapp: { contains: digits.slice(-8) } }, { phone: { contains: digits.slice(-8) } }] },
        });

        const upper = text.toUpperCase();
        if (upper === 'SIM' || upper === 'CONFIRMAR' || upper === '1') {
          if (patient) {
            const next = await prisma.appointment.findFirst({
              where: { patientId: patient.id, status: { in: ['SCHEDULED'] }, startAt: { gte: new Date() } },
              orderBy: { startAt: 'asc' },
            });
            if (next) {
              await prisma.appointment.update({
                where: { id: next.id },
                data: { status: 'CONFIRMED', confirmedAt: new Date() },
              });
              await reply(from, `Presença confirmada para ${next.startAt.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}. Até lá!`);
              continue;
            }
          }
          await reply(from, 'Não encontrei uma consulta futura para confirmar. Fale com a recepção.');
          continue;
        }

        if (upper === 'NAO' || upper === 'NÃO' || upper === '2') {
          await reply(from, 'Tudo bem. Sua recepção entrará em contato para reagendar.');
          continue;
        }

        await reply(from, 'Olá! Responda SIM para confirmar sua consulta ou NÃO para reagendar.');
      }
    }
  }

  return NextResponse.json({ ok: true });
}

import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardTitle, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ReminderRunClient } from './reminder-run-client';
import { ReminderRowClient } from './reminder-row-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Lembretes 24h | OdontoSync',
  description: 'Disparo automático de lembretes de consulta 24h antes via WhatsApp e e-mail.',
  openGraph: { title: 'Lembretes 24h | OdontoSync', description: 'Reduza no-show com lembretes automáticos.' },
};

export default async function Page() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  if (!['OWNER', 'RECEPTION', 'SUPER_ADMIN'].includes(session.user.role ?? '')) redirect('/');

  const clinicId = session.user.clinicId ?? undefined;
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const [upcoming, recent] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        clinicId,
        startAt: { gte: now, lte: in24h },
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
      },
      include: { patient: true, dentist: true, unit: true },
      orderBy: { startAt: 'asc' },
      take: 50,
    }),
    prisma.notification.findMany({
      where: { clinicId, channel: { in: ['WHATSAPP', 'EMAIL'] } },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
  ]);

  const sent = recent.filter((n) => n.status === 'SENT' || n.status === 'DELIVERED').length;
  const failed = recent.filter((n) => n.status === 'FAILED').length;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-fg">Lembretes 24h</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Disparo automático via WhatsApp (Evolution API / Z-API) e e-mail — reduz no-show.
          </p>
        </div>
        <ReminderRunClient />
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardBody>
          <p className="text-xs uppercase tracking-wide text-fg-muted">Consultas nas próximas 24h</p>
          <p className="mt-1 text-2xl font-semibold text-fg">{upcoming.length}</p>
        </CardBody></Card>
        <Card><CardBody>
          <p className="text-xs uppercase tracking-wide text-fg-muted">Enviados (últimos 30)</p>
          <p className="mt-1 text-2xl font-semibold text-brand">{sent}</p>
        </CardBody></Card>
        <Card><CardBody>
          <p className="text-xs uppercase tracking-wide text-fg-muted">Falhas (últimos 30)</p>
          <p className="mt-1 text-2xl font-semibold text-fg">{failed}</p>
        </CardBody></Card>
      </div>

      <Card>
        <CardBody>
          <CardTitle>Consultas nas próximas 24 horas</CardTitle>
          {upcoming.length === 0 ? (
            <div className="mt-4 rounded-md border border-border bg-surface/60 p-6 text-center">
              <p className="text-sm text-fg-muted">Nenhuma consulta nas próximas 24h.</p>
              <Link href="/agenda" className="mt-3 inline-block">
                <Button variant="secondary" size="sm">Ver agenda</Button>
              </Link>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-fg-muted">
                  <tr className="border-b border-border">
                    <th className="py-2 pr-4">Paciente</th>
                    <th className="py-2 pr-4">Dentista</th>
                    <th className="py-2 pr-4">Unidade</th>
                    <th className="py-2 pr-4">Horário</th>
                    <th className="py-2 pr-4">Lembrete</th>
                    <th className="py-2">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {upcoming.map((a) => (
                    <tr key={a.id} className="border-b border-border/60">
                      <td className="py-2 pr-4 text-fg">{a.patient.fullName}</td>
                      <td className="py-2 pr-4 text-fg-muted">{a.dentist.fullName}</td>
                      <td className="py-2 pr-4 text-fg-muted">{a.unit.name}</td>
                      <td className="py-2 pr-4 text-fg-muted">
                        {a.startAt.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="py-2 pr-4">
                        {a.reminderSentAt ? (
                          <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs text-brand">
                            enviado {a.reminderChannel ?? ''}
                          </span>
                        ) : (
                          <span className="rounded-full bg-fg-muted/10 px-2 py-0.5 text-xs text-fg-muted">pendente</span>
                        )}
                      </td>
                      <td className="py-2">
                        <ReminderRowClient appointmentId={a.id} alreadySent={!!a.reminderSentAt} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <CardTitle>Log recente de notificações</CardTitle>
          {recent.length === 0 ? (
            <p className="mt-4 text-sm text-fg-muted">Nenhuma notificação registrada ainda.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {recent.map((n) => (
                <li key={n.id} className="flex items-center justify-between py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate text-fg">{n.subject ?? n.template ?? 'Lembrete'}</p>
                    <p className="truncate text-xs text-fg-muted">
                      {n.channel} · {n.recipient} · {n.createdAt.toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <span
                    className={
                      'rounded-full px-2 py-0.5 text-xs ' +
                      (n.status === 'FAILED'
                        ? 'bg-red-500/10 text-red-500'
                        : n.status === 'SENT' || n.status === 'DELIVERED'
                        ? 'bg-brand/10 text-brand'
                        : 'bg-fg-muted/10 text-fg-muted')
                    }
                  >
                    {n.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

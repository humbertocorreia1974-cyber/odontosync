import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardTitle, CardBody } from '@/components/ui/card';
import { NewAppointmentClient } from './new-appointment-client';
import { CalendarDays, Filter } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Agenda cirúrgica | OdontoSync',
  description: 'Agenda por cadeira e dentista com bloqueio duplo de conflito.',
  openGraph: { title: 'Agenda cirúrgica | OdontoSync', description: 'Agenda por cadeira e dentista com bloqueio duplo de conflito.' },
};

export default async function AgendaPage({ searchParams }: { searchParams: { unitId?: string; date?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.clinicId) redirect('/onboarding');

  const units = await prisma.unit.findMany({
    where: { clinicId: user.clinicId, isActive: true },
    orderBy: { name: 'asc' },
  });

  const selectedUnitId = searchParams.unitId || units[0]?.id || '';
  const dateStr = searchParams.date || new Date().toISOString().slice(0, 10);
  const dayStart = new Date(`${dateStr}T00:00:00`);
  const dayEnd = new Date(`${dateStr}T23:59:59`);

  const [appointments, patients, dentists, chairs, procedures] = await Promise.all([
    selectedUnitId
      ? prisma.appointment.findMany({
          where: { clinicId: user.clinicId, unitId: selectedUnitId, startAt: { gte: dayStart, lte: dayEnd } },
          include: {
            patient: { select: { id: true, fullName: true } },
            dentist: { select: { id: true, fullName: true, color: true } },
            chair: { select: { id: true, name: true } },
            procedure: { select: { id: true, name: true } },
          },
          orderBy: { startAt: 'asc' },
        })
      : Promise.resolve([]),
    prisma.patient.findMany({ where: { clinicId: user.clinicId, isActive: true }, select: { id: true, fullName: true }, orderBy: { fullName: 'asc' }, take: 500 }),
    prisma.dentist.findMany({ where: { clinicId: user.clinicId, isActive: true }, select: { id: true, fullName: true }, orderBy: { fullName: 'asc' } }),
    selectedUnitId ? prisma.chair.findMany({ where: { unitId: selectedUnitId, isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }) : Promise.resolve([]),
    prisma.procedure.findMany({ where: { clinicId: user.clinicId, isActive: true }, select: { id: true, name: true, durationMinutes: true }, orderBy: { name: 'asc' } }),
  ]);

  const canWrite = user.role === 'OWNER' || user.role === 'RECEPTION' || user.role === 'DENTIST';

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-fg">Agenda cirúrgica</h1>
          <p className="mt-1 text-sm text-fg-muted">Bloqueio duplo: nenhum horário sobrepõe cadeira nem dentista.</p>
        </div>
        <form className="flex flex-wrap items-end gap-2" action="/agenda">
          <label className="flex flex-col text-xs text-fg-muted">
            Unidade
            <select name="unitId" defaultValue={selectedUnitId} className="mt-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg">
              {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </label>
          <label className="flex flex-col text-xs text-fg-muted">
            Data
            <input type="date" name="date" defaultValue={dateStr} className="mt-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg" />
          </label>
          <button type="submit" className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-fg transition-all duration-150 hover:opacity-90">
            <Filter className="h-4 w-4" /> Filtrar
          </button>
        </form>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Card>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-brand" />
            {new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </CardTitle>
          <CardBody>
            {appointments.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-surface/50 p-8 text-center">
                <p className="text-sm text-fg-muted">Nenhum agendamento neste dia.</p>
                <p className="mt-1 text-xs text-fg-muted">Use o formulário ao lado para criar o primeiro.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
                      <th className="py-2 pr-3">Horário</th>
                      <th className="py-2 pr-3">Paciente</th>
                      <th className="py-2 pr-3">Dentista</th>
                      <th className="py-2 pr-3">Cadeira</th>
                      <th className="py-2 pr-3">Procedimento</th>
                      <th className="py-2 pr-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((a) => (
                      <tr key={a.id} className="border-b border-border/60 transition-colors duration-150 hover:bg-white/5">
                        <td className="py-2 pr-3 font-mono text-xs text-fg">
                          {a.startAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} – {a.endAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-2 pr-3 text-fg">{a.patient.fullName}</td>
                        <td className="py-2 pr-3">
                          <span className="inline-flex items-center gap-2 text-fg">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: a.dentist.color }} />
                            {a.dentist.fullName}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-fg-muted">{a.chair.name}</td>
                        <td className="py-2 pr-3 text-fg-muted">{a.procedure?.name ?? '—'}</td>
                        <td className="py-2 pr-3">
                          <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs text-brand">{a.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>

        {canWrite && selectedUnitId && (
          <NewAppointmentClient
            unitId={selectedUnitId}
            patients={patients}
            dentists={dentists}
            chairs={chairs}
            procedures={procedures}
          />
        )}
      </div>
    </div>
  );
}

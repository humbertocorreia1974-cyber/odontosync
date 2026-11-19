import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardTitle, CardBody } from '@/components/ui/card';
import { TrendingUp, Users, Percent, AlertCircle, CalendarX, Receipt } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'KPIs do dono | OdontoSync',
  description: 'Faturamento por unidade, dentista e convênio, taxa de ocupação, inadimplência, no-show e ticket médio.',
  openGraph: {
    title: 'KPIs do dono | OdontoSync',
    description: 'Painel consolidado multiunidade com os indicadores que importam.',
  },
};

function brl(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default async function Page({ searchParams }: { searchParams: { from?: string; to?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  const role = (session.user as any).role as string;
  if (!['OWNER', 'SUPER_ADMIN'].includes(role)) redirect('/');

  const clinicId = (session.user as any).clinicId as string | undefined;
  if (!clinicId) redirect('/');

  const to = searchParams.to ? new Date(searchParams.to) : new Date();
  const from = searchParams.from
    ? new Date(searchParams.from)
    : new Date(to.getFullYear(), to.getMonth() - 2, 1);

  const [units, dentists, insurances, transactions, appointments, chairs] = await Promise.all([
    prisma.unit.findMany({ where: { clinicId }, select: { id: true, name: true } }),
    prisma.dentist.findMany({ where: { clinicId }, select: { id: true, fullName: true } }),
    prisma.insurance.findMany({ where: { clinicId }, select: { id: true, name: true } }),
    prisma.transaction.findMany({
      where: { clinicId, type: 'RECEIVABLE', dueDate: { gte: from, lte: to } },
      select: { id: true, unitId: true, insuranceId: true, amount: true, paidAmount: true, status: true, dueDate: true, appointmentId: true },
    }),
    prisma.appointment.findMany({
      where: { clinicId, startAt: { gte: from, lte: to } },
      select: { id: true, unitId: true, dentistId: true, chairId: true, startAt: true, endAt: true, status: true, noShow: true },
    }),
    prisma.chair.findMany({ where: { unit: { clinicId } }, select: { id: true, unitId: true } }),
  ]);

  const totalBilled = transactions.reduce((s, t) => s + Number(t.amount), 0);
  const totalPaid = transactions.reduce((s, t) => s + Number(t.paidAmount), 0);
  const overdue = transactions.filter((t) => t.status === 'OVERDUE' || (t.status === 'PENDING' && t.dueDate < new Date()));
  const overdueAmount = overdue.reduce((s, t) => s + (Number(t.amount) - Number(t.paidAmount)), 0);
  const inadimplencia = totalBilled > 0 ? (overdueAmount / totalBilled) * 100 : 0;

  const completed = appointments.filter((a) => a.status === 'COMPLETED');
  const noShows = appointments.filter((a) => a.noShow || a.status === 'NO_SHOW');
  const noShowRate = appointments.length > 0 ? (noShows.length / appointments.length) * 100 : 0;
  const ticketMedio = completed.length > 0 ? totalPaid / completed.length : 0;

  const days = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)));
  const totalChairMinutes = chairs.length * days * 8 * 60;
  const usedMinutes = completed.reduce(
    (s, a) => s + Math.max(0, (a.endAt.getTime() - a.startAt.getTime()) / 60000),
    0,
  );
  const occupancy = totalChairMinutes > 0 ? (usedMinutes / totalChairMinutes) * 100 : 0;

  const byUnit = units.map((u) => {
    const txs = transactions.filter((t) => t.unitId === u.id);
    const billed = txs.reduce((s, t) => s + Number(t.amount), 0);
    const paid = txs.reduce((s, t) => s + Number(t.paidAmount), 0);
    const appts = appointments.filter((a) => a.unitId === u.id);
    const unitChairs = chairs.filter((c) => c.unitId === u.id).length;
    const unitMinutes = appts
      .filter((a) => a.status === 'COMPLETED')
      .reduce((s, a) => s + Math.max(0, (a.endAt.getTime() - a.startAt.getTime()) / 60000), 0);
    const unitCapacity = unitChairs * days * 8 * 60;
    return {
      id: u.id,
      name: u.name,
      billed,
      paid,
      occupancy: unitCapacity > 0 ? (unitMinutes / unitCapacity) * 100 : 0,
      noShow: appts.length > 0 ? (appts.filter((a) => a.noShow).length / appts.length) * 100 : 0,
    };
  });

  const byDentist = dentists.map((d) => {
    const appts = appointments.filter((a) => a.dentistId === d.id);
    const apptIds = new Set(appts.map((a) => a.id));
    const txs = transactions.filter((t) => t.appointmentId && apptIds.has(t.appointmentId));
    const billed = txs.reduce((s, t) => s + Number(t.amount), 0);
    return { id: d.id, name: d.fullName, billed, count: appts.filter((a) => a.status === 'COMPLETED').length };
  }).sort((a, b) => b.billed - a.billed);

  const byInsurance = insurances.map((i) => {
    const txs = transactions.filter((t) => t.insuranceId === i.id);
    const billed = txs.reduce((s, t) => s + Number(t.amount), 0);
    return { id: i.id, name: i.name, billed, count: txs.length };
  }).sort((a, b) => b.billed - a.billed);

  const particular = transactions.filter((t) => !t.insuranceId).reduce((s, t) => s + Number(t.amount), 0);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-fg-muted">Painel do dono</p>
          <h1 className="mt-1 text-3xl font-semibold text-fg">KPIs consolidados</h1>
          <p className="mt-2 text-sm text-fg-muted">
            Período: {from.toLocaleDateString('pt-BR')} — {to.toLocaleDateString('pt-BR')}
          </p>
        </div>
        <form className="flex flex-wrap items-center gap-2" action="/kpis">
          <input type="date" name="from" defaultValue={from.toISOString().slice(0, 10)} className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg" />
          <input type="date" name="to" defaultValue={to.toISOString().slice(0, 10)} className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg" />
          <button type="submit" className="rounded-md bg-brand px-3 py-2 text-sm text-brand-fg">Aplicar</button>
        </form>
      </header>

      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card><CardBody>
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-brand" />
            <div>
              <p className="text-xs text-fg-muted">Faturamento no período</p>
              <p className="text-2xl font-semibold text-fg">{brl(totalBilled)}</p>
              <p className="text-xs text-fg-muted">Recebido: {brl(totalPaid)}</p>
            </div>
          </div>
        </CardBody></Card>
        <Card><CardBody>
          <div className="flex items-center gap-3">
            <Percent className="h-5 w-5 text-brand" />
            <div>
              <p className="text-xs text-fg-muted">Ocupação de cadeira</p>
              <p className="text-2xl font-semibold text-fg">{occupancy.toFixed(1)}%</p>
              <p className="text-xs text-fg-muted">{chairs.length} cadeiras · 8h/dia</p>
            </div>
          </div>
        </CardBody></Card>
        <Card><CardBody>
          <div className="flex items-center gap-3">
            <Receipt className="h-5 w-5 text-brand" />
            <div>
              <p className="text-xs text-fg-muted">Ticket médio</p>
              <p className="text-2xl font-semibold text-fg">{brl(ticketMedio)}</p>
              <p className="text-xs text-fg-muted">{completed.length} atendimentos concluídos</p>
            </div>
          </div>
        </CardBody></Card>
        <Card><CardBody>
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-brand" />
            <div>
              <p className="text-xs text-fg-muted">Inadimplência</p>
              <p className="text-2xl font-semibold text-fg">{inadimplencia.toFixed(1)}%</p>
              <p className="text-xs text-fg-muted">{brl(overdueAmount)} em atraso</p>
            </div>
          </div>
        </CardBody></Card>
        <Card><CardBody>
          <div className="flex items-center gap-3">
            <CalendarX className="h-5 w-5 text-brand" />
            <div>
              <p className="text-xs text-fg-muted">No-show</p>
              <p className="text-2xl font-semibold text-fg">{noShowRate.toFixed(1)}%</p>
              <p className="text-xs text-fg-muted">{noShows.length} de {appointments.length} agendamentos</p>
            </div>
          </div>
        </CardBody></Card>
        <Card><CardBody>
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-brand" />
            <div>
              <p className="text-xs text-fg-muted">Particular (sem convênio)</p>
              <p className="text-2xl font-semibold text-fg">{brl(particular)}</p>
              <p className="text-xs text-fg-muted">{insurances.length} convênios ativos</p>
            </div>
          </div>
        </CardBody></Card>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardBody>
          <CardTitle className="mb-4">Faturamento por unidade</CardTitle>
          {byUnit.length === 0 ? (
            <p className="text-sm text-fg-muted">Nenhuma unidade cadastrada.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-fg-muted">
                  <th className="py-2 pr-4">Unidade</th>
                  <th className="py-2 pr-4">Faturado</th>
                  <th className="py-2 pr-4">Ocupação</th>
                  <th className="py-2 pr-4">No-show</th>
                </tr>
              </thead>
              <tbody>
                {byUnit.map((u) => (
                  <tr key={u.id} className="border-b border-border/60">
                    <td className="py-2 pr-4 text-fg">{u.name}</td>
                    <td className="py-2 pr-4 text-fg">{brl(u.billed)}</td>
                    <td className="py-2 pr-4 text-fg-muted">{u.occupancy.toFixed(1)}%</td>
                    <td className="py-2 pr-4 text-fg-muted">{u.noShow.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody></Card>

        <Card><CardBody>
          <CardTitle className="mb-4">Faturamento por dentista</CardTitle>
          {byDentist.length === 0 ? (
            <p className="text-sm text-fg-muted">Nenhum dentista cadastrado.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-fg-muted">
                  <th className="py-2 pr-4">Dentista</th>
                  <th className="py-2 pr-4">Faturado</th>
                  <th className="py-2 pr-4">Atendimentos</th>
                </tr>
              </thead>
              <tbody>
                {byDentist.map((d) => (
                  <tr key={d.id} className="border-b border-border/60">
                    <td className="py-2 pr-4 text-fg">{d.name}</td>
                    <td className="py-2 pr-4 text-fg">{brl(d.billed)}</td>
                    <td className="py-2 pr-4 text-fg-muted">{d.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody></Card>

        <Card><CardBody>
          <CardTitle className="mb-4">Faturamento por convênio</CardTitle>
          {byInsurance.length === 0 ? (
            <p className="text-sm text-fg-muted">Nenhum convênio cadastrado.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-fg-muted">
                  <th className="py-2 pr-4">Convênio</th>
                  <th className="py-2 pr-4">Faturado</th>
                  <th className="py-2 pr-4">Lançamentos</th>
                </tr>
              </thead>
              <tbody>
                {byInsurance.map((i) => (
                  <tr key={i.id} className="border-b border-border/60">
                    <td className="py-2 pr-4 text-fg">{i.name}</td>
                    <td className="py-2 pr-4 text-fg">{brl(i.billed)}</td>
                    <td className="py-2 pr-4 text-fg-muted">{i.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody></Card>

        <Card><CardBody>
          <CardTitle className="mb-4">Particular x Convênio</CardTitle>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm">
                <span className="text-fg">Particular</span>
                <span className="text-fg">{brl(particular)}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-border">
                <div className="h-2 rounded-full bg-brand" style={{ width: `${totalBilled > 0 ? (particular / totalBilled) * 100 : 0}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm">
                <span className="text-fg">Convênios</span>
                <span className="text-fg">{brl(totalBilled - particular)}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-border">
                <div className="h-2 rounded-full bg-accent" style={{ width: `${totalBilled > 0 ? ((totalBilled - particular) / totalBilled) * 100 : 0}%` }} />
              </div>
            </div>
          </div>
        </CardBody></Card>
      </div>
    </div>
  );
}

import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardTitle, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import CommissionActions from './commission-actions';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Comissões | OdontoSync',
  description: 'Controle de comissões por dentista, com visibilidade por papel.',
  openGraph: { title: 'Comissões | OdontoSync', description: 'Comissões por dentista.' },
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovada',
  PAID: 'Paga',
  CANCELED: 'Cancelada',
};

const STATUS_CLASS: Record<string, string> = {
  PENDING: 'bg-amber-500/10 text-amber-600',
  APPROVED: 'bg-brand/10 text-brand',
  PAID: 'bg-emerald-500/10 text-emerald-600',
  CANCELED: 'bg-red-500/10 text-red-600',
};

function fmtBRL(v: unknown) {
  const n = typeof v === 'number' ? v : Number(v ?? 0);
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default async function ComissoesPage({
  searchParams,
}: {
  searchParams: { month?: string; status?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const role = session.user.role;
  if (role === 'RECEPTION') {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <Card>
          <CardBody>
            <CardTitle>Acesso restrito</CardTitle>
            <p className="mt-2 text-sm text-fg-muted">
              A recepção não possui permissão para visualizar comissões.
            </p>
          </CardBody>
        </Card>
      </main>
    );
  }

  const clinicId = session.user.clinicId ?? '';
  const month = searchParams.month ?? new Date().toISOString().slice(0, 7);
  const statusFilter = searchParams.status ?? '';

  const where: Record<string, unknown> = { clinicId, referenceMonth: month };
  if (statusFilter) where.status = statusFilter;

  if (role === 'DENTIST') {
    const dentist = await prisma.dentist.findFirst({
      where: { clinicId, userId: session.user.id },
      select: { id: true },
    });
    if (!dentist) {
      return (
        <main className="mx-auto max-w-3xl px-6 py-16">
          <Card>
            <CardBody>
              <CardTitle>Perfil de dentista não encontrado</CardTitle>
              <p className="mt-2 text-sm text-fg-muted">
                Fale com o dono da clínica para vincular seu usuário a um dentista.
              </p>
            </CardBody>
          </Card>
        </main>
      );
    }
    where.dentistId = dentist.id;
  }

  const commissions = await prisma.commission.findMany({
    where,
    include: {
      dentist: { select: { fullName: true, color: true } },
      procedure: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  const totals = commissions.reduce(
    (acc, c) => {
      const amt = Number(c.amount);
      acc.total += amt;
      if (c.status === 'PENDING') acc.pending += amt;
      if (c.status === 'APPROVED') acc.approved += amt;
      if (c.status === 'PAID') acc.paid += amt;
      return acc;
    },
    { total: 0, pending: 0, approved: 0, paid: 0 },
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Comissões</h1>
          <p className="mt-1 text-sm text-fg-muted">
            {role === 'OWNER'
              ? 'Visão consolidada de todas as comissões da clínica.'
              : 'Suas comissões do período selecionado.'}
          </p>
        </div>
        {role === 'OWNER' && (
          <Link href="/comissoes/regras">
            <Button variant="secondary">Regras por dentista</Button>
          </Link>
        )}
      </header>

      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card><CardBody>
          <p className="text-xs uppercase tracking-wide text-fg-muted">Total</p>
          <p className="mt-1 text-xl font-semibold text-fg">{fmtBRL(totals.total)}</p>
        </CardBody></Card>
        <Card><CardBody>
          <p className="text-xs uppercase tracking-wide text-fg-muted">Pendente</p>
          <p className="mt-1 text-xl font-semibold text-amber-600">{fmtBRL(totals.pending)}</p>
        </CardBody></Card>
        <Card><CardBody>
          <p className="text-xs uppercase tracking-wide text-fg-muted">Aprovada</p>
          <p className="mt-1 text-xl font-semibold text-brand">{fmtBRL(totals.approved)}</p>
        </CardBody></Card>
        <Card><CardBody>
          <p className="text-xs uppercase tracking-wide text-fg-muted">Paga</p>
          <p className="mt-1 text-xl font-semibold text-emerald-600">{fmtBRL(totals.paid)}</p>
        </CardBody></Card>
      </section>

      <form className="mb-4 flex flex-wrap items-end gap-3" method="get">
        <label className="flex flex-col text-xs text-fg-muted">
          Mês de referência
          <input
            type="month"
            name="month"
            defaultValue={month}
            className="mt-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg"
          />
        </label>
        <label className="flex flex-col text-xs text-fg-muted">
          Status
          <select
            name="status"
            defaultValue={statusFilter}
            className="mt-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg"
          >
            <option value="">Todos</option>
            <option value="PENDING">Pendente</option>
            <option value="APPROVED">Aprovada</option>
            <option value="PAID">Paga</option>
            <option value="CANCELED">Cancelada</option>
          </select>
        </label>
        <Button type="submit" size="sm">Filtrar</Button>
      </form>

      {commissions.length === 0 ? (
        <Card>
          <CardBody>
            <CardTitle>Nenhuma comissão no período</CardTitle>
            <p className="mt-2 text-sm text-fg-muted">
              As comissões são geradas automaticamente quando um atendimento é finalizado.
            </p>
            <div className="mt-4">
              <Link href="/agenda"><Button size="sm">Ir para a agenda</Button></Link>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
                <tr>
                  <th className="px-4 py-3">Dentista</th>
                  <th className="px-4 py-3">Procedimento</th>
                  <th className="px-4 py-3">Base</th>
                  <th className="px-4 py-3">Modo</th>
                  <th className="px-4 py-3">Valor</th>
                  <th className="px-4 py-3">Status</th>
                  {role === 'OWNER' && <th className="px-4 py-3">Ações</th>}
                </tr>
              </thead>
              <tbody>
                {commissions.map((c) => (
                  <tr key={c.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2 text-fg">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: c.dentist.color }}
                        />
                        {c.dentist.fullName}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-fg-muted">{c.procedure?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-fg-muted">{fmtBRL(c.baseAmount)}</td>
                    <td className="px-4 py-3 text-fg-muted">
                      {c.mode === 'PERCENTAGE'
                        ? `${Number(c.percentApplied ?? 0).toFixed(2)}%`
                        : c.mode === 'FIXED'
                        ? 'Fixo'
                        : 'Tabela'}
                    </td>
                    <td className="px-4 py-3 font-medium text-fg">{fmtBRL(c.amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_CLASS[c.status] ?? 'bg-surface text-fg-muted'}`}>
                        {STATUS_LABEL[c.status] ?? c.status}
                      </span>
                    </td>
                    {role === 'OWNER' && (
                      <td className="px-4 py-3">
                        <CommissionActions id={c.id} status={c.status} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}
    </main>
  );
}

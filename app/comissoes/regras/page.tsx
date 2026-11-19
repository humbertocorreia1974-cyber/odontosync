import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardTitle, CardBody } from '@/components/ui/card';
import CommissionRuleForm from './commission-rule-form';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Regras de comissão | OdontoSync',
  description: 'Configure percentuais, valores fixos e tabelas customizadas por dentista.',
  openGraph: { title: 'Regras de comissão | OdontoSync', description: 'Regras por dentista.' },
};

export default async function RegrasPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'OWNER' && session.user.role !== 'SUPER_ADMIN') {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <Card>
          <CardBody>
            <CardTitle>Acesso restrito</CardTitle>
            <p className="mt-2 text-sm text-fg-muted">
              Apenas o dono da clínica pode configurar regras de comissão.
            </p>
          </CardBody>
        </Card>
      </main>
    );
  }

  const clinicId = session.user.clinicId!;
  const [dentists, procedures, insurances, rules] = await Promise.all([
    prisma.dentist.findMany({
      where: { clinicId, isActive: true },
      select: {
        id: true,
        fullName: true,
        color: true,
        commissionMode: true,
        commissionPercentPrivate: true,
        commissionPercentInsurance: true,
        commissionFixedAmount: true,
      },
      orderBy: { fullName: 'asc' },
    }),
    prisma.procedure.findMany({
      where: { clinicId, isActive: true },
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    }),
    prisma.insurance.findMany({
      where: { clinicId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.commissionRule.findMany({
      where: { dentist: { clinicId }, isActive: true },
      include: {
        procedure: { select: { name: true } },
        insurance: { select: { name: true } },
        dentist: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Regras de comissão</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Defina o modo padrão por dentista e sobrescreva por procedimento ou convênio.
        </p>
      </header>

      <section className="mb-8 grid gap-4 md:grid-cols-2">
        {dentists.length === 0 ? (
          <Card>
            <CardBody>
              <CardTitle>Nenhum dentista cadastrado</CardTitle>
              <p className="mt-2 text-sm text-fg-muted">
                Cadastre dentistas para configurar comissões.
              </p>
            </CardBody>
          </Card>
        ) : (
          dentists.map((d) => (
            <Card key={d.id}>
              <CardBody>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    <CardTitle>{d.fullName}</CardTitle>
                  </div>
                  <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs text-brand">
                    {d.commissionMode === 'PERCENTAGE'
                      ? 'Percentual'
                      : d.commissionMode === 'FIXED'
                      ? 'Fixo'
                      : 'Tabela customizada'}
                  </span>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <dt className="text-fg-muted">Particular</dt>
                    <dd className="text-fg">
                      {d.commissionPercentPrivate ? `${Number(d.commissionPercentPrivate).toFixed(2)}%` : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-fg-muted">Convênio</dt>
                    <dd className="text-fg">
                      {d.commissionPercentInsurance ? `${Number(d.commissionPercentInsurance).toFixed(2)}%` : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-fg-muted">Fixo</dt>
                    <dd className="text-fg">
                      {d.commissionFixedAmount
                        ? Number(d.commissionFixedAmount).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })
                        : '—'}
                    </dd>
                  </div>
                </dl>
              </CardBody>
            </Card>
          ))
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-fg">Nova regra customizada</h2>
        <CommissionRuleForm dentists={dentists} procedures={procedures} insurances={insurances} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-fg">Regras ativas</h2>
        {rules.length === 0 ? (
          <Card>
            <CardBody>
              <p className="text-sm text-fg-muted">
                Nenhuma regra customizada. O modo padrão do dentista será aplicado.
              </p>
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
                    <th className="px-4 py-3">Convênio</th>
                    <th className="px-4 py-3">Modo</th>
                    <th className="px-4 py-3">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((r) => (
                    <tr key={r.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3 text-fg">{r.dentist.fullName}</td>
                      <td className="px-4 py-3 text-fg-muted">{r.procedure?.name ?? 'Todos'}</td>
                      <td className="px-4 py-3 text-fg-muted">{r.insurance?.name ?? 'Todos'}</td>
                      <td className="px-4 py-3 text-fg-muted">{r.mode === 'PERCENTAGE' ? 'Percentual' : 'Fixo'}</td>
                      <td className="px-4 py-3 text-fg">
                        {r.mode === 'PERCENTAGE'
                          ? `${Number(r.percentPrivate ?? r.percentInsurance ?? 0).toFixed(2)}%`
                          : Number(r.fixedAmount ?? 0).toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>
        )}
      </section>
    </main>
  );
}

import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardTitle, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PriceTableClient from './price-table-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Tabela de Preços por Convênio | OdontoSync',
  description:
    'Preços por convênio × procedimento, com tabela particular própria. Multiunidade, multi-tenant.',
  openGraph: {
    title: 'Tabela de Preços por Convênio | OdontoSync',
    description: 'Preços por convênio × procedimento, com tabela particular própria.',
  },
};

export default async function Page() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  const role = (session.user as any).role as string;
  if (!['OWNER', 'RECEPTION', 'SUPER_ADMIN'].includes(role)) redirect('/');

  const clinicId = (session.user as any).clinicId as string | undefined;
  if (!clinicId) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10">
        <Card>
          <CardBody>
            <p className="text-fg-muted">
              Sua conta não está vinculada a uma clínica. Fale com o administrador.
            </p>
          </CardBody>
        </Card>
      </main>
    );
  }

  const [insurances, procedures, prices] = await Promise.all([
    prisma.insurance.findMany({
      where: { clinicId, isActive: true },
      orderBy: { name: 'asc' },
    }),
    prisma.procedure.findMany({
      where: { clinicId, isActive: true },
      orderBy: { name: 'asc' },
    }),
    prisma.insurancePriceTable.findMany({
      where: { insurance: { clinicId }, isActive: true },
      include: { insurance: true, procedure: true },
      orderBy: [{ insurance: { name: 'asc' } }, { procedure: { name: 'asc' } }],
    }),
  ]);

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-fg">
            Tabela de Preços por Convênio
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            Preço negociado por convênio × procedimento. A tabela particular usa o preço padrão do
            procedimento.
          </p>
        </div>
        <Link href="/convenios">
          <Button variant="secondary" size="sm">
            Gerenciar convênios
          </Button>
        </Link>
      </header>

      {insurances.length === 0 || procedures.length === 0 ? (
        <Card>
          <CardBody>
            <CardTitle>Cadastre convênios e procedimentos primeiro</CardTitle>
            <p className="mt-2 text-sm text-fg-muted">
              Você precisa ter pelo menos 1 convênio e 1 procedimento cadastrados para montar a
              tabela de preços.
            </p>
            <div className="mt-4 flex gap-3">
              <Link href="/convenios">
                <Button size="sm">Cadastrar convênio</Button>
              </Link>
              <Link href="/procedimentos">
                <Button variant="secondary" size="sm">
                  Cadastrar procedimento
                </Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      ) : (
        <PriceTableClient
          insurances={insurances.map((i) => ({ id: i.id, name: i.name }))}
          procedures={procedures.map((p) => ({
            id: p.id,
            name: p.name,
            code: p.code,
            defaultPrice: Number(p.defaultPrice),
          }))}
          prices={prices.map((p) => ({
            id: p.id,
            insuranceId: p.insuranceId,
            insuranceName: p.insurance.name,
            procedureId: p.procedureId,
            procedureName: p.procedure.name,
            price: Number(p.price),
            reimbursementAmount: p.reimbursementAmount ? Number(p.reimbursementAmount) : null,
            copayPercent: p.copayPercent ? Number(p.copayPercent) : null,
            validFrom: p.validFrom.toISOString(),
          }))}
        />
      )}
    </main>
  );
}

import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardBody, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import GuidesClient from './guides-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Guias por Convênio | OdontoSync',
  description:
    'Controle interno de guias por convênio — status, autorização, valores. Preparado para TISS.',
  openGraph: {
    title: 'Guias por Convênio | OdontoSync',
    description: 'Controle interno de guias por convênio.',
  },
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Rascunho',
  SUBMITTED: 'Enviada',
  AUTHORIZED: 'Autorizada',
  DENIED: 'Negada',
  BILLED: 'Faturada',
  PAID: 'Paga',
};

export default async function Page({
  searchParams,
}: {
  searchParams: { status?: string; insuranceId?: string };
}) {
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
            <p className="text-fg-muted">Sua conta não está vinculada a uma clínica.</p>
          </CardBody>
        </Card>
      </main>
    );
  }

  const status = searchParams.status || '';
  const insuranceId = searchParams.insuranceId || '';

  const [insurances, patients, procedures, guides] = await Promise.all([
    prisma.insurance.findMany({ where: { clinicId, isActive: true }, orderBy: { name: 'asc' } }),
    prisma.patient.findMany({
      where: { clinicId, isActive: true },
      orderBy: { fullName: 'asc' },
      take: 500,
    }),
    prisma.procedure.findMany({
      where: { clinicId, isActive: true },
      orderBy: { name: 'asc' },
    }),
    prisma.insuranceGuide.findMany({
      where: {
        clinicId,
        ...(status ? { status } : {}),
        ...(insuranceId ? { insuranceId } : {}),
      },
      include: { insurance: true, patient: true, procedure: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
  ]);

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-fg">Guias por Convênio</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Controle interno de guias — sem envio TISS nesta versão, mas com payload preparado para
            extensão.
          </p>
        </div>
        <Link href="/convenios">
          <Button variant="secondary" size="sm">
            Convênios
          </Button>
        </Link>
      </header>

      <Card className="mb-6">
        <CardBody>
          <form className="grid gap-3 md:grid-cols-4" method="GET">
            <select
              name="status"
              defaultValue={status}
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg"
            >
              <option value="">Todos os status</option>
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <select
              name="insuranceId"
              defaultValue={insuranceId}
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg"
            >
              <option value="">Todos os convênios</option>
              {insurances.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
            <Button type="submit" size="sm" variant="secondary">
              Filtrar
            </Button>
          </form>
        </CardBody>
      </Card>

      {insurances.length === 0 ? (
        <Card>
          <CardBody>
            <CardTitle>Cadastre um convênio primeiro</CardTitle>
            <p className="mt-2 text-sm text-fg-muted">
              Você precisa de pelo menos 1 convênio ativo para registrar guias.
            </p>
            <Link href="/convenios" className="mt-4 inline-block">
              <Button size="sm">Cadastrar convênio</Button>
            </Link>
          </CardBody>
        </Card>
      ) : (
        <GuidesClient
          insurances={insurances.map((i) => ({ id: i.id, name: i.name }))}
          patients={patients.map((p) => ({ id: p.id, name: p.fullName }))}
          procedures={procedures.map((p) => ({ id: p.id, name: p.name }))}
          guides={guides.map((g) => ({
            id: g.id,
            guideNumber: g.guideNumber,
            insuranceName: g.insurance.name,
            patientName: g.patient.fullName,
            procedureName: g.procedure?.name ?? null,
            status: g.status,
            amountClaimed: g.amountClaimed ? Number(g.amountClaimed) : null,
            amountApproved: g.amountApproved ? Number(g.amountApproved) : null,
            authorizationCode: g.authorizationCode,
            createdAt: g.createdAt.toISOString(),
          }))}
        />
      )}
    </main>
  );
}

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardTitle, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import NovaConsultaForm from './nova-consulta-form';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Nova consulta — OdontoSync',
  description: 'Agende uma consulta com bloqueio duplo de conflito de cadeira e dentista.',
  openGraph: {
    title: 'Nova consulta — OdontoSync',
    description: 'Agenda cirúrgica com bloqueio duplo de conflito.',
  },
};

export default async function Page() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');
  if (!session.user.clinicId) redirect('/');

  const [units, patients, dentists, procedures] = await Promise.all([
    prisma.unit.findMany({
      where: { clinicId: session.user.clinicId, isActive: true },
      orderBy: { name: 'asc' },
      include: { chairs: { where: { isActive: true }, orderBy: { name: 'asc' } } },
    }),
    prisma.patient.findMany({
      where: { clinicId: session.user.clinicId, isActive: true },
      orderBy: { fullName: 'asc' },
      select: { id: true, fullName: true },
      take: 500,
    }),
    prisma.dentist.findMany({
      where: { clinicId: session.user.clinicId, isActive: true },
      orderBy: { fullName: 'asc' },
      select: { id: true, fullName: true, color: true },
    }),
    prisma.procedure.findMany({
      where: { clinicId: session.user.clinicId, isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, durationMinutes: true, defaultPrice: true },
    }),
  ]);

  const unitsData = units.map((u) => ({
    id: u.id,
    name: u.name,
    chairs: u.chairs.map((c) => ({ id: c.id, name: c.name })),
  }));

  const empty = unitsData.length === 0 || patients.length === 0 || dentists.length === 0;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-fg-muted">Agenda cirúrgica</p>
          <h1 className="mt-1 text-3xl font-semibold text-fg">Nova consulta</h1>
          <p className="mt-2 max-w-2xl text-sm text-fg-muted">
            O sistema bloqueia automaticamente sobreposição de <strong>cadeira</strong> e de{' '}
            <strong>dentista</strong>. Se houver conflito, você verá o horário já ocupado antes de confirmar.
          </p>
        </div>
        <Link href="/agenda">
          <Button variant="ghost" size="md">Voltar para agenda</Button>
        </Link>
      </div>

      {empty ? (
        <Card>
          <CardBody>
            <CardTitle>Faltam dados para agendar</CardTitle>
            <p className="mt-2 text-sm text-fg-muted">
              Você precisa ter pelo menos 1 unidade com cadeira ativa, 1 paciente e 1 dentista cadastrados.
            </p>
            <div className="mt-4 flex gap-3">
              <Link href="/pacientes"><Button variant="primary" size="sm">Cadastrar paciente</Button></Link>
              <Link href="/dentistas"><Button variant="secondary" size="sm">Cadastrar dentista</Button></Link>
            </div>
          </CardBody>
        </Card>
      ) : (
        <NovaConsultaForm
          units={unitsData}
          patients={patients.map((p) => ({ id: p.id, name: p.fullName }))}
          dentists={dentists.map((d) => ({ id: d.id, name: d.fullName, color: d.color }))}
          procedures={procedures.map((p) => ({
            id: p.id,
            name: p.name,
            durationMinutes: p.durationMinutes,
            price: Number(p.defaultPrice),
          }))}
        />
      )}
    </div>
  );
}

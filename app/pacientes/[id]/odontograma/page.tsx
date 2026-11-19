import { getServerSession } from 'next-auth';
import { redirect, notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardTitle, CardBody } from '@/components/ui/card';
import { OdontogramClient } from './odontogram-client';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { id: string } }) {
  return {
    title: 'Odontograma | OdontoSync',
    description: 'Odontograma interativo com 32 dentes e 5 faces por dente.',
    openGraph: { title: 'Odontograma | OdontoSync', description: 'Odontograma interativo com 32 dentes e 5 faces por dente.' },
  };
}

export default async function OdontogramaPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.clinicId) redirect('/onboarding');

  const patient = await prisma.patient.findFirst({
    where: { id: params.id, clinicId: user.clinicId },
    select: { id: true, fullName: true, birthDate: true, phone: true },
  });
  if (!patient) notFound();

  const records = await prisma.toothRecord.findMany({ where: { patientId: params.id } });
  const canEdit = user.role === 'OWNER' || user.role === 'DENTIST';

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-fg">Odontograma — {patient.fullName}</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Clique em uma face do dente para alterar o status. 32 dentes · 5 faces cada.
        </p>
      </header>

      <Card>
        <CardTitle>Arcada completa</CardTitle>
        <CardBody>
          <OdontogramClient
            patientId={patient.id}
            initialRecords={records.map((r) => ({ toothNumber: r.toothNumber, face: r.face, status: r.status, notes: r.notes }))}
            canEdit={canEdit}
          />
        </CardBody>
      </Card>
    </div>
  );
}

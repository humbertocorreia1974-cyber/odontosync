import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardTitle, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileImage, FileText, Upload, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import AttachmentUploader from './attachment-uploader';
import AttachmentList from './attachment-list';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { id: string } }) {
  const patient = await prisma.patient.findUnique({
    where: { id: params.id },
    select: { fullName: true },
  });
  return {
    title: patient ? `Anexos — ${patient.fullName} | OdontoSync` : 'Anexos | OdontoSync',
    description:
      'Radiografias, fotos clínicas e documentos do prontuário com upload S3-compatible e trilha de auditoria.',
    openGraph: { title: 'Anexos do prontuário | OdontoSync' },
  };
}

export default async function AnexosPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const clinicId = (session.user as any).clinicId as string | undefined;
  const role = (session.user as any).role as string;

  const patient = await prisma.patient.findUnique({
    where: { id: params.id },
    select: { id: true, fullName: true, clinicId: true, unitId: true },
  });
  if (!patient) notFound();
  if (role !== 'SUPER_ADMIN' && patient.clinicId !== clinicId) redirect('/');

  const attachments = await prisma.attachment.findMany({
    where: { patientId: patient.id },
    orderBy: { createdAt: 'desc' },
    include: { uploadedBy: { select: { name: true } } },
  });

  const canWrite = role === 'OWNER' || role === 'DENTIST' || role === 'RECEPTION';

  return (
    <div className="min-h-screen bg-bg p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <Link
          href={`/pacientes/${patient.id}/odontograma`}
          className="inline-flex items-center gap-1 text-sm text-fg-muted transition-colors duration-150 hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar ao prontuário
        </Link>

        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-brand">
              <FileImage className="h-5 w-5" />
              <span className="text-xs font-medium uppercase tracking-wider">Prontuário digital</span>
            </div>
            <h1 className="mt-1 text-3xl font-semibold text-fg">Anexos de {patient.fullName}</h1>
            <p className="mt-1 text-sm text-fg-muted">
              Radiografias, fotos clínicas e documentos — armazenamento S3-compatible com URL pré-assinada.
            </p>
          </div>
        </header>

        {canWrite && (
          <Card>
            <CardTitle className="flex items-center gap-2 px-6 pt-6">
              <Upload className="h-4 w-4 text-brand" /> Novo anexo
            </CardTitle>
            <CardBody>
              <AttachmentUploader patientId={patient.id} />
            </CardBody>
          </Card>
        )}

        <Card>
          <CardTitle className="flex items-center gap-2 px-6 pt-6">
            <FileText className="h-4 w-4 text-brand" /> Arquivos ({attachments.length})
          </CardTitle>
          <CardBody className="p-0">
            {attachments.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
                <FileImage className="h-10 w-10 text-fg-muted" />
                <p className="text-sm text-fg-muted">
                  Nenhum anexo ainda. Envie a primeira radiografia ou foto clínica.
                </p>
              </div>
            ) : (
              <AttachmentList
                canWrite={canWrite}
                attachments={attachments.map((a) => ({
                  id: a.id,
                  kind: a.kind,
                  title: a.title,
                  description: a.description,
                  fileName: a.fileName,
                  mimeType: a.mimeType,
                  sizeBytes: a.sizeBytes,
                  url: a.url,
                  createdAt: a.createdAt.toISOString(),
                  uploadedByName: a.uploadedBy?.name ?? null,
                }))}
              />
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

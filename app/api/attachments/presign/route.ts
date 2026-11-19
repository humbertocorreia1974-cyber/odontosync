import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const role = (session.user as any).role as string;
  if (!['OWNER', 'DENTIST', 'RECEPTION', 'SUPER_ADMIN'].includes(role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { patientId, fileName, mimeType, sizeBytes } = body as {
    patientId: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  };

  if (!patientId || !fileName || !mimeType) {
    return NextResponse.json({ error: 'missing fields' }, { status: 400 });
  }
  if (sizeBytes && sizeBytes > 50 * 1024 * 1024) {
    return NextResponse.json({ error: 'arquivo maior que 50MB' }, { status: 413 });
  }

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { id: true, clinicId: true },
  });
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });
  if (role !== 'SUPER_ADMIN' && patient.clinicId !== (session.user as any).clinicId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const ext = fileName.split('.').pop() ?? 'bin';
  const storageKey = `clinics/${patient.clinicId}/patients/${patient.id}/${randomUUID()}.${ext}`;

  // Em produção, gere URL pré-assinada real via @aws-sdk/s3-request-presigner.
  // Aqui devolvemos um endpoint interno que aceita PUT e grava no storage configurado.
  const uploadUrl = `/api/attachments/upload?key=${encodeURIComponent(storageKey)}`;
  const publicUrl = `${process.env.S3_PUBLIC_URL ?? ''}/${storageKey}`;

  return NextResponse.json({ uploadUrl, storageKey, publicUrl });
}

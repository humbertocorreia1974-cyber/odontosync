import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Endpoint interno que recebe o PUT do browser quando S3 não está configurado.
// Em produção com S3/R2/MinIO, o presign devolve a URL do bucket e este arquivo
// pode ser removido — mantido aqui para o app funcionar sem credenciais.
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');
  if (!key) return NextResponse.json({ error: 'missing key' }, { status: 400 });

  const bytes = await request.arrayBuffer();
  if (bytes.byteLength > 50 * 1024 * 1024) {
    return NextResponse.json({ error: 'arquivo maior que 50MB' }, { status: 413 });
  }

  // Sem S3 configurado, apenas aceitamos o upload e devolvemos OK.
  // O registro do anexo é feito em /api/attachments (POST) com o storageKey.
  return NextResponse.json({ ok: true, key, size: bytes.byteLength });
}

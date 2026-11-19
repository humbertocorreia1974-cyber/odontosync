'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileImage, FileText, Trash2, ExternalLink } from 'lucide-react';

type Attachment = {
  id: string;
  kind: string;
  title: string | null;
  description: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  url: string | null;
  createdAt: string;
  uploadedByName: string | null;
};

const KIND_LABEL: Record<string, string> = {
  XRAY: 'Radiografia',
  PHOTO: 'Foto clínica',
  DOCUMENT: 'Documento',
  OTHER: 'Outro',
};

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function AttachmentList({
  attachments,
  canWrite,
}: {
  attachments: Attachment[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function remove(id: string) {
    if (!confirm('Excluir este anexo? A ação será registrada na auditoria.')) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/attachments/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao excluir');
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <ul className="divide-y divide-border">
      {attachments.map((a) => (
        <li
          key={a.id}
          className="flex flex-wrap items-center gap-4 px-6 py-4 transition-colors duration-150 hover:bg-white/5"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand/10 text-brand">
            {a.kind === 'PHOTO' || a.kind === 'XRAY' ? (
              <FileImage className="h-5 w-5" />
            ) : (
              <FileText className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-fg">{a.title ?? a.fileName}</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-fg-muted">
              <span className="rounded-full bg-brand/10 px-2 py-0.5 text-brand">
                {KIND_LABEL[a.kind] ?? a.kind}
              </span>
              <span>{fmtSize(a.sizeBytes)}</span>
              <span>·</span>
              <span>{new Date(a.createdAt).toLocaleString('pt-BR')}</span>
              {a.uploadedByName && (
                <>
                  <span>·</span>
                  <span>por {a.uploadedByName}</span>
                </>
              )}
            </div>
            {a.description && <p className="mt-1 text-xs text-fg-muted">{a.description}</p>}
          </div>
          <div className="flex items-center gap-2">
            {a.url && (
              <a href={a.url} target="_blank" rel="noreferrer">
                <Button variant="ghost" size="sm">
                  <ExternalLink className="mr-1 h-4 w-4" /> Abrir
                </Button>
              </a>
            )}
            {canWrite && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => remove(a.id)}
                disabled={busy === a.id}
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

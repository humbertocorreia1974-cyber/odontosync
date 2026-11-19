'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const KINDS = [
  { value: 'XRAY', label: 'Radiografia' },
  { value: 'PHOTO', label: 'Foto clínica' },
  { value: 'DOCUMENT', label: 'Documento' },
  { value: 'OTHER', label: 'Outro' },
];

export default function AttachmentUploader({ patientId }: { patientId: string }) {
  const router = useRouter();
  const [kind, setKind] = useState('XRAY');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError('Selecione um arquivo.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const presign = await fetch('/api/attachments/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          kind,
        }),
      });
      if (!presign.ok) throw new Error('Falha ao gerar URL de upload');
      const { uploadUrl, storageKey, publicUrl } = await presign.json();

      const put = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!put.ok) throw new Error('Falha no upload do arquivo');

      const confirm = await fetch('/api/attachments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          kind,
          title: title || file.name,
          description,
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          storageKey,
          url: publicUrl,
        }),
      });
      if (!confirm.ok) throw new Error('Falha ao registrar anexo');

      setTitle('');
      setDescription('');
      setFile(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? 'Erro inesperado');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-fg-muted">Tipo</span>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          {KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-fg-muted">Título</span>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Panorâmica 2026" />
      </label>

      <label className="flex flex-col gap-1 md:col-span-2">
        <span className="text-xs text-fg-muted">Descrição</span>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Observações clínicas sobre o arquivo"
        />
      </label>

      <label className="flex flex-col gap-1 md:col-span-2">
        <span className="text-xs text-fg-muted">Arquivo</span>
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg file:mr-3 file:rounded-md file:border-0 file:bg-brand/10 file:px-3 file:py-1 file:text-xs file:font-medium file:text-brand"
        />
      </label>

      {error && <p className="md:col-span-2 text-sm text-red-600">{error}</p>}

      <div className="md:col-span-2">
        <Button variant="primary" size="md" type="submit" disabled={loading}>
          {loading ? 'Enviando…' : 'Enviar anexo'}
        </Button>
      </div>
    </form>
  );
}

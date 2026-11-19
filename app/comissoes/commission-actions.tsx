'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function CommissionActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  async function update(next: 'APPROVED' | 'PAID' | 'CANCELED') {
    setBusy(true);
    try {
      const res = await fetch(`/api/commissions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? 'Falha ao atualizar comissão');
        return;
      }
      startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  }

  const disabled = busy || pending;

  return (
    <div className="flex flex-wrap gap-2">
      {status === 'PENDING' && (
        <Button size="sm" variant="secondary" disabled={disabled} onClick={() => update('APPROVED')}>
          Aprovar
        </Button>
      )}
      {(status === 'PENDING' || status === 'APPROVED') && (
        <Button size="sm" disabled={disabled} onClick={() => update('PAID')}>
          Pagar
        </Button>
      )}
      {status !== 'PAID' && status !== 'CANCELED' && (
        <Button size="sm" variant="ghost" disabled={disabled} onClick={() => update('CANCELED')}>
          Cancelar
        </Button>
      )}
    </div>
  );
}

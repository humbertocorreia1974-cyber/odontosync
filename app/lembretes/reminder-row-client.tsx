'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function ReminderRowClient({ appointmentId, alreadySent }: { appointmentId: string; alreadySent: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  async function send() {
    setErr(null);
    const res = await fetch('/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId, channel: 'BOTH', template: 'reminder_24h' }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setErr(d.error ?? 'Erro');
      return;
    }
    start(() => router.refresh());
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant={alreadySent ? 'ghost' : 'secondary'} onClick={send} disabled={pending}>
        {pending ? '…' : alreadySent ? 'Reenviar' : 'Enviar'}
      </Button>
      {err && <span className="text-xs text-red-500">{err}</span>}
    </div>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function ReminderRunClient() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setMsg(null);
    const res = await fetch('/api/jobs/reminders-24h', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(data.error ?? 'Falha ao disparar lembretes.');
      return;
    }
    setMsg(`Disparados: ${data.sent ?? 0} · Falhas: ${data.failed ?? 0}`);
    start(() => router.refresh());
  }

  return (
    <div className="flex items-center gap-3">
      {msg && <span className="text-xs text-fg-muted">{msg}</span>}
      <Button onClick={run} disabled={pending} variant="primary" size="md">
        {pending ? 'Disparando…' : 'Disparar lembretes agora'}
      </Button>
    </div>
  );
}

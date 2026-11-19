'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, Loader2 } from 'lucide-react';

export default function NotifyButton({ unitId, count }: { unitId: string; count: number }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function notify() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/inventory/alerts/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao notificar');
      setMsg(`Notificação enviada (${data.sent ?? count} itens)`);
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {msg && <span className="text-xs text-fg-muted">{msg}</span>}
      <Button onClick={notify} disabled={loading} size="sm">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
        <span className="ml-2">Notificar responsável</span>
      </Button>
    </div>
  );
}

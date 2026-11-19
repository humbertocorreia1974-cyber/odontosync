'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const ACTIONS = ['', 'CREATE', 'UPDATE', 'DELETE', 'VIEW', 'LOGIN', 'EXPORT', 'SIGN'];
const SEVERITIES = ['', 'INFO', 'WARN', 'CRITICAL'];

export default function AuditFilters({
  initial,
}: {
  initial: { action: string; severity: string; entity: string; from: string; to: string };
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [form, setForm] = useState(initial);

  function apply() {
    const q = new URLSearchParams();
    Object.entries(form).forEach(([k, v]) => {
      if (v) q.set(k, v);
    });
    router.push(`/auditoria${q.toString() ? `?${q.toString()}` : ''}`);
  }

  function clear() {
    setForm({ action: '', severity: '', entity: '', from: '', to: '' });
    router.push('/auditoria');
  }

  return (
    <div className="grid gap-3 md:grid-cols-5">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-fg-muted">Ação</span>
        <select
          value={form.action}
          onChange={(e) => setForm({ ...form, action: e.target.value })}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          {ACTIONS.map((a) => (
            <option key={a} value={a}>
              {a || 'Todas'}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-fg-muted">Severidade</span>
        <select
          value={form.severity}
          onChange={(e) => setForm({ ...form, severity: e.target.value })}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {s || 'Todas'}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-fg-muted">Entidade</span>
        <Input
          value={form.entity}
          onChange={(e) => setForm({ ...form, entity: e.target.value })}
          placeholder="TreatmentPlan, Commission…"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-fg-muted">De</span>
        <Input
          type="date"
          value={form.from}
          onChange={(e) => setForm({ ...form, from: e.target.value })}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-fg-muted">Até</span>
        <Input
          type="date"
          value={form.to}
          onChange={(e) => setForm({ ...form, to: e.target.value })}
        />
      </label>

      <div className="md:col-span-5 flex gap-2">
        <Button variant="primary" size="md" onClick={apply}>
          Aplicar filtros
        </Button>
        <Button variant="ghost" size="md" onClick={clear}>
          Limpar
        </Button>
      </div>
    </div>
  );
}

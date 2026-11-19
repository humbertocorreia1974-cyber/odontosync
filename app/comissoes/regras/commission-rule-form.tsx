'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardBody } from '@/components/ui/card';

type Dentist = { id: string; fullName: string };
type Procedure = { id: string; name: string; code: string };
type Insurance = { id: string; name: string };

export default function CommissionRuleForm({
  dentists,
  procedures,
  insurances,
}: {
  dentists: Dentist[];
  procedures: Procedure[];
  insurances: Insurance[];
}) {
  const router = useRouter();
  const [dentistId, setDentistId] = useState(dentists[0]?.id ?? '');
  const [procedureId, setProcedureId] = useState('');
  const [insuranceId, setInsuranceId] = useState('');
  const [mode, setMode] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [percentPrivate, setPercentPrivate] = useState('');
  const [percentInsurance, setPercentInsurance] = useState('');
  const [fixedAmount, setFixedAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!dentistId) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/dentists/${dentistId}/commission-rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          procedureId: procedureId || null,
          insuranceId: insuranceId || null,
          mode,
          percentPrivate: percentPrivate ? Number(percentPrivate) : null,
          percentInsurance: percentInsurance ? Number(percentInsurance) : null,
          fixedAmount: fixedAmount ? Number(fixedAmount) : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.error ?? 'Falha ao salvar regra');
        return;
      }
      setMsg('Regra criada com sucesso.');
      setProcedureId('');
      setInsuranceId('');
      setPercentPrivate('');
      setPercentInsurance('');
      setFixedAmount('');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const selectCls =
    'mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg';

  return (
    <Card>
      <CardBody>
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-3">
          <label className="text-xs text-fg-muted md:col-span-1">
            Dentista *
            <select value={dentistId} onChange={(e) => setDentistId(e.target.value)} className={selectCls} required>
              {dentists.map((d) => (
                <option key={d.id} value={d.id}>{d.fullName}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-fg-muted">
            Procedimento (opcional)
            <select value={procedureId} onChange={(e) => setProcedureId(e.target.value)} className={selectCls}>
              <option value="">Todos</option>
              {procedures.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-fg-muted">
            Convênio (opcional)
            <select value={insuranceId} onChange={(e) => setInsuranceId(e.target.value)} className={selectCls}>
              <option value="">Todos</option>
              {insurances.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-fg-muted">
            Modo
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as 'PERCENTAGE' | 'FIXED')}
              className={selectCls}
            >
              <option value="PERCENTAGE">Percentual</option>
              <option value="FIXED">Valor fixo</option>
            </select>
          </label>
          {mode === 'PERCENTAGE' ? (
            <>
              <label className="text-xs text-fg-muted">
                % Particular
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={percentPrivate}
                  onChange={(e) => setPercentPrivate(e.target.value)}
                  placeholder="30"
                />
              </label>
              <label className="text-xs text-fg-muted">
                % Convênio
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={percentInsurance}
                  onChange={(e) => setPercentInsurance(e.target.value)}
                  placeholder="20"
                />
              </label>
            </>
          ) : (
            <label className="text-xs text-fg-muted md:col-span-2">
              Valor fixo (R$)
              <Input
                type="number"
                step="0.01"
                min="0"
                value={fixedAmount}
                onChange={(e) => setFixedAmount(e.target.value)}
                placeholder="50.00"
              />
            </label>
          )}
          <div className="md:col-span-3 flex items-center gap-3">
            <Button type="submit" disabled={busy || !dentistId}>
              {busy ? 'Salvando…' : 'Criar regra'}
            </Button>
            {msg && <span className="text-xs text-fg-muted">{msg}</span>}
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

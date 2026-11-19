'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Insurance = { id: string; name: string };
type Patient = { id: string; name: string };
type Procedure = { id: string; name: string };
type Guide = {
  id: string;
  guideNumber: string;
  insuranceName: string;
  patientName: string;
  procedureName: string | null;
  status: string;
  amountClaimed: number | null;
  amountApproved: number | null;
  authorizationCode: string | null;
  createdAt: string;
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Rascunho',
  SUBMITTED: 'Enviada',
  AUTHORIZED: 'Autorizada',
  DENIED: 'Negada',
  BILLED: 'Faturada',
  PAID: 'Paga',
};

const STATUS_TONE: Record<string, string> = {
  DRAFT: 'bg-fg-muted/10 text-fg-muted',
  SUBMITTED: 'bg-brand/10 text-brand',
  AUTHORIZED: 'bg-accent/15 text-accent-fg',
  DENIED: 'bg-red-500/10 text-red-500',
  BILLED: 'bg-brand/15 text-brand',
  PAID: 'bg-accent/20 text-accent-fg',
};

export default function GuidesClient({
  insurances,
  patients,
  procedures,
  guides,
}: {
  insurances: Insurance[];
  patients: Patient[];
  procedures: Procedure[];
  guides: Guide[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [insuranceId, setInsuranceId] = useState(insurances[0]?.id ?? '');
  const [patientId, setPatientId] = useState(patients[0]?.id ?? '');
  const [procedureId, setProcedureId] = useState('');
  const [guideNumber, setGuideNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function createGuide(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/insurance-guides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insuranceId,
          patientId,
          procedureId: procedureId || null,
          guideNumber,
          amountClaimed: amount ? Number(amount) : null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Falha ao criar guia');
      }
      setOpen(false);
      setGuideNumber('');
      setAmount('');
      router.refresh();
    } catch (err: any) {
      setMsg(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    const res = await fetch(`/api/insurance-guides/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen((v) => !v)}>
          {open ? 'Cancelar' : 'Nova guia'}
        </Button>
      </div>

      {open && (
        <Card>
          <CardBody>
            <CardTitle>Registrar nova guia</CardTitle>
            <form onSubmit={createGuide} className="mt-4 grid gap-3 md:grid-cols-3">
              <select
                value={insuranceId}
                onChange={(e) => setInsuranceId(e.target.value)}
                className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg"
              >
                {insurances.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
              <select
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <select
                value={procedureId}
                onChange={(e) => setProcedureId(e.target.value)}
                className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg"
              >
                <option value="">Procedimento (opcional)</option>
                {procedures.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <Input
                placeholder="Número da guia"
                value={guideNumber}
                onChange={(e) => setGuideNumber(e.target.value)}
                required
              />
              <Input
                type="number"
                step="0.01"
                placeholder="Valor solicitado R$"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <div className="flex items-center gap-3">
                <Button type="submit" size="sm" disabled={saving}>
                  {saving ? 'Salvando...' : 'Criar guia'}
                </Button>
                {msg && <span className="text-xs text-red-500">{msg}</span>}
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {guides.length === 0 ? (
        <Card>
          <CardBody>
            <CardTitle>Nenhuma guia registrada</CardTitle>
            <p className="mt-2 text-sm text-fg-muted">
              Clique em "Nova guia" para registrar a primeira guia de convênio.
            </p>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-fg-muted">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Nº</th>
                    <th className="py-2 pr-4 font-medium">Convênio</th>
                    <th className="py-2 pr-4 font-medium">Paciente</th>
                    <th className="py-2 pr-4 font-medium">Procedimento</th>
                    <th className="py-2 pr-4 font-medium text-right">Solicitado</th>
                    <th className="py-2 pr-4 font-medium text-right">Aprovado</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {guides.map((g) => (
                    <tr key={g.id} className="border-b border-border/50">
                      <td className="py-2 pr-4 font-mono text-xs text-fg">{g.guideNumber}</td>
                      <td className="py-2 pr-4 text-fg-muted">{g.insuranceName}</td>
                      <td className="py-2 pr-4 text-fg">{g.patientName}</td>
                      <td className="py-2 pr-4 text-fg-muted">{g.procedureName ?? '—'}</td>
                      <td className="py-2 pr-4 text-right text-fg-muted">
                        {g.amountClaimed != null ? `R$ ${g.amountClaimed.toFixed(2)}` : '—'}
                      </td>
                      <td className="py-2 pr-4 text-right text-fg-muted">
                        {g.amountApproved != null ? `R$ ${g.amountApproved.toFixed(2)}` : '—'}
                      </td>
                      <td className="py-2 pr-4">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            STATUS_TONE[g.status] ?? 'bg-fg-muted/10 text-fg-muted'
                          }`}
                        >
                          {STATUS_LABEL[g.status] ?? g.status}
                        </span>
                      </td>
                      <td className="py-2 pr-4">
                        <select
                          value={g.status}
                          onChange={(e) => updateStatus(g.id, e.target.value)}
                          className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-fg"
                        >
                          {Object.entries(STATUS_LABEL).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

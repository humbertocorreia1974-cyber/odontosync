'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Insurance = { id: string; name: string };
type Procedure = { id: string; name: string; code: string; defaultPrice: number };
type Price = {
  id: string;
  insuranceId: string;
  insuranceName: string;
  procedureId: string;
  procedureName: string;
  price: number;
  reimbursementAmount: number | null;
  copayPercent: number | null;
  validFrom: string;
};

export default function PriceTableClient({
  insurances,
  procedures,
  prices,
}: {
  insurances: Insurance[];
  procedures: Procedure[];
  prices: Price[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<'particular' | 'convenio'>('particular');
  const [insuranceId, setInsuranceId] = useState(insurances[0]?.id ?? '');
  const [procedureId, setProcedureId] = useState(procedures[0]?.id ?? '');
  const [price, setPrice] = useState('');
  const [reimbursement, setReimbursement] = useState('');
  const [copay, setCopay] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const filtered = useMemo(
    () => prices.filter((p) => p.insuranceId === insuranceId),
    [prices, insuranceId],
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/insurance-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insuranceId,
          procedureId,
          price: Number(price),
          reimbursementAmount: reimbursement ? Number(reimbursement) : null,
          copayPercent: copay ? Number(copay) : null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Falha ao salvar');
      }
      setMsg('Preço salvo com sucesso.');
      setPrice('');
      setReimbursement('');
      setCopay('');
      router.refresh();
    } catch (err: any) {
      setMsg(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setTab('particular')}
          className={`-mb-px border-b-2 px-4 py-2 text-sm transition-colors ${
            tab === 'particular'
              ? 'border-brand text-brand'
              : 'border-transparent text-fg-muted hover:text-fg'
          }`}
        >
          Particular
        </button>
        <button
          onClick={() => setTab('convenio')}
          className={`-mb-px border-b-2 px-4 py-2 text-sm transition-colors ${
            tab === 'convenio'
              ? 'border-brand text-brand'
              : 'border-transparent text-fg-muted hover:text-fg'
          }`}
        >
          Convênios
        </button>
      </div>

      {tab === 'particular' && (
        <Card>
          <CardBody>
            <CardTitle>Tabela Particular</CardTitle>
            <p className="mt-1 text-sm text-fg-muted">
              Preço padrão do procedimento quando o paciente não usa convênio.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-fg-muted">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Código</th>
                    <th className="py-2 pr-4 font-medium">Procedimento</th>
                    <th className="py-2 pr-4 font-medium text-right">Preço</th>
                  </tr>
                </thead>
                <tbody>
                  {procedures.map((p) => (
                    <tr key={p.id} className="border-b border-border/50">
                      <td className="py-2 pr-4 font-mono text-xs text-fg-muted">{p.code}</td>
                      <td className="py-2 pr-4 text-fg">{p.name}</td>
                      <td className="py-2 pr-4 text-right font-medium text-fg">
                        R$ {p.defaultPrice.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {tab === 'convenio' && (
        <>
          <Card>
            <CardBody>
              <CardTitle>Novo preço negociado</CardTitle>
              <form onSubmit={submit} className="mt-4 grid gap-3 md:grid-cols-5">
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
                  value={procedureId}
                  onChange={(e) => setProcedureId(e.target.value)}
                  className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg"
                >
                  {procedures.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Preço R$"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Reembolso R$"
                  value={reimbursement}
                  onChange={(e) => setReimbursement(e.target.value)}
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Copay %"
                  value={copay}
                  onChange={(e) => setCopay(e.target.value)}
                />
                <div className="md:col-span-5 flex items-center gap-3">
                  <Button type="submit" size="sm" disabled={saving}>
                    {saving ? 'Salvando...' : 'Salvar preço'}
                  </Button>
                  {msg && <span className="text-xs text-fg-muted">{msg}</span>}
                </div>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <CardTitle>
                Preços vigentes — {insurances.find((i) => i.id === insuranceId)?.name}
              </CardTitle>
              {filtered.length === 0 ? (
                <p className="mt-3 text-sm text-fg-muted">
                  Nenhum preço cadastrado para este convênio. Adicione o primeiro acima.
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border text-left text-fg-muted">
                      <tr>
                        <th className="py-2 pr-4 font-medium">Procedimento</th>
                        <th className="py-2 pr-4 font-medium text-right">Preço</th>
                        <th className="py-2 pr-4 font-medium text-right">Reembolso</th>
                        <th className="py-2 pr-4 font-medium text-right">Copay</th>
                        <th className="py-2 pr-4 font-medium">Vigência</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((p) => (
                        <tr key={p.id} className="border-b border-border/50">
                          <td className="py-2 pr-4 text-fg">{p.procedureName}</td>
                          <td className="py-2 pr-4 text-right text-fg">
                            R$ {p.price.toFixed(2)}
                          </td>
                          <td className="py-2 pr-4 text-right text-fg-muted">
                            {p.reimbursementAmount != null
                              ? `R$ ${p.reimbursementAmount.toFixed(2)}`
                              : '—'}
                          </td>
                          <td className="py-2 pr-4 text-right text-fg-muted">
                            {p.copayPercent != null ? `${p.copayPercent}%` : '—'}
                          </td>
                          <td className="py-2 pr-4 text-xs text-fg-muted">
                            {new Date(p.validFrom).toLocaleDateString('pt-BR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}

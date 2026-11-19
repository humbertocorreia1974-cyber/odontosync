'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Unit = { id: string; name: string; chairs: { id: string; name: string }[] };
type Opt = { id: string; name: string };
type DentistOpt = Opt & { color: string };
type ProcedureOpt = Opt & { durationMinutes: number; price: number };
type Slot = { start: string; end: string; chairId: string; chairName: string; free: boolean };

export default function NovaConsultaForm({
  units,
  patients,
  dentists,
  procedures,
}: {
  units: Unit[];
  patients: Opt[];
  dentists: DentistOpt[];
  procedures: ProcedureOpt[];
}) {
  const router = useRouter();
  const [unitId, setUnitId] = useState(units[0]?.id ?? '');
  const [patientId, setPatientId] = useState('');
  const [dentistId, setDentistId] = useState(dentists[0]?.id ?? '');
  const [procedureId, setProcedureId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<{ type: string; detail: any } | null>(null);

  const selectedProcedure = useMemo(
    () => procedures.find((p) => p.id === procedureId),
    [procedureId, procedures],
  );

  useEffect(() => {
    if (!unitId || !dentistId || !date) return;
    let cancel = false;
    setLoadingSlots(true);
    setSelected(null);
    fetch(`/api/appointments/availability?unitId=${unitId}&dentistId=${dentistId}&date=${date}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancel) setSlots(d.slots ?? []);
      })
      .finally(() => !cancel && setLoadingSlots(false));
    return () => {
      cancel = true;
    };
  }, [unitId, dentistId, date]);

  const slotsByChair = useMemo(() => {
    const map = new Map<string, { chairName: string; slots: Slot[] }>();
    for (const s of slots) {
      if (!map.has(s.chairId)) map.set(s.chairId, { chairName: s.chairName, slots: [] });
      map.get(s.chairId)!.slots.push(s);
    }
    return Array.from(map.entries());
  }, [slots]);

  async function submit() {
    setError(null);
    setConflict(null);
    if (!selected || !patientId) {
      setError('Selecione paciente e um horário livre.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitId,
          patientId,
          dentistId,
          chairId: selected.chairId,
          procedureId: procedureId || null,
          startAt: selected.start,
          endAt: selected.end,
          notes,
        }),
      });
      const data = await res.json();
      if (res.status === 409) {
        setConflict({ type: data.conflict, detail: data.detail });
        return;
      }
      if (!res.ok) {
        setError(data.error ?? 'Erro ao criar consulta.');
        return;
      }
      router.push('/agenda');
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Card>
        <CardBody>
          <CardTitle>Dados da consulta</CardTitle>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              <span className="text-fg-muted">Unidade</span>
              <select
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-fg"
              >
                {units.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="text-fg-muted">Dentista</span>
              <select
                value={dentistId}
                onChange={(e) => setDentistId(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-fg"
              >
                {dentists.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="text-fg-muted">Paciente</span>
              <select
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-fg"
              >
                <option value="">Selecione…</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="text-fg-muted">Procedimento</span>
              <select
                value={procedureId}
                onChange={(e) => setProcedureId(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-fg"
              >
                <option value="">— opcional —</option>
                {procedures.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.durationMinutes}min
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="text-fg-muted">Data</span>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="text-fg-muted">Observações</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-fg"
                placeholder="Anotações internas sobre a consulta…"
              />
            </label>
          </div>

          {selectedProcedure && (
            <p className="mt-4 text-xs text-fg-muted">
              Procedimento selecionado: <strong className="text-fg">{selectedProcedure.name}</strong> ·{' '}
              {selectedProcedure.durationMinutes} min · R$ {selectedProcedure.price.toFixed(2)}
            </p>
          )}

          {error && (
            <div className="mt-4 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}
          {conflict && (
            <div className="mt-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
              <strong>Conflito de {conflict.type === 'CHAIR' ? 'cadeira' : 'dentista'}.</strong>{' '}
              Já existe consulta de {conflict.detail?.patient?.fullName ?? 'outro paciente'} das{' '}
              {new Date(conflict.detail?.startAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} às{' '}
              {new Date(conflict.detail?.endAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <CardTitle>Horários livres</CardTitle>
          <p className="mt-1 text-xs text-fg-muted">
            {loadingSlots ? 'Carregando…' : `${slots.filter((s) => s.free).length} slots livres`}
          </p>
          <div className="mt-4 max-h-[520px] space-y-4 overflow-y-auto pr-1">
            {slotsByChair.map(([chairId, group]) => (
              <div key={chairId}>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-fg-muted">
                  Cadeira {group.chairName}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {group.slots.map((s) => {
                    const isSel = selected?.start === s.start && selected?.chairId === s.chairId;
                    return (
                      <button
                        key={`${s.chairId}-${s.start}`}
                        type="button"
                        disabled={!s.free}
                        onClick={() => setSelected(s)}
                        className={[
                          'rounded-md border px-2 py-1 text-xs transition-all duration-150',
                          s.free
                            ? isSel
                              ? 'border-brand bg-brand text-brand-fg'
                              : 'border-border bg-surface text-fg hover:bg-white/5'
                            : 'cursor-not-allowed border-border/50 bg-surface/40 text-fg-muted line-through',
                        ].join(' ')}
                      >
                        {new Date(s.start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {!loadingSlots && slots.length === 0 && (
              <p className="text-sm text-fg-muted">Nenhum slot disponível para esta data.</p>
            )}
          </div>

          <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-4">
            <p className="text-xs text-fg-muted">
              {selected
                ? `${new Date(selected.start).toLocaleString('pt-BR')} · cadeira ${selected.chairName}`
                : 'Selecione um horário'}
            </p>
            <Button variant="primary" size="md" onClick={submit} disabled={submitting || !selected}>
              {submitting ? 'Agendando…' : 'Confirmar'}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

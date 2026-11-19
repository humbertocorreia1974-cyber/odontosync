'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardTitle, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';

type Option = { id: string; name?: string; fullName?: string; durationMinutes?: number };

export function NewAppointmentClient({
  unitId, patients, dentists, chairs, procedures,
}: {
  unitId: string;
  patients: Option[];
  dentists: Option[];
  chairs: Option[];
  procedures: Option[];
}) {
  const router = useRouter();
  const [patientId, setPatientId] = useState('');
  const [dentistId, setDentistId] = useState('');
  const [chairId, setChairId] = useState('');
  const [procedureId, setProcedureId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('09:00');
  const [duration, setDuration] = useState(30);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const startAt = new Date(`${date}T${time}:00`).toISOString();
    const endAt = new Date(new Date(`${date}T${time}:00`).getTime() + duration * 60000).toISOString();
    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unitId, patientId, dentistId, chairId, procedureId: procedureId || null, startAt, endAt }),
    });
    setLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || 'Erro ao criar agendamento');
      return;
    }
    setPatientId(''); setDentistId(''); setChairId(''); setProcedureId('');
    router.refresh();
  }

  return (
    <Card>
      <CardTitle className="flex items-center gap-2"><Plus className="h-4 w-4 text-brand" /> Novo agendamento</CardTitle>
      <CardBody>
        <form onSubmit={submit} className="space-y-3">
          <label className="block text-xs text-fg-muted">
            Paciente
            <select required value={patientId} onChange={(e) => setPatientId(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg">
              <option value="">Selecione…</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.fullName}</option>)}
            </select>
          </label>
          <label className="block text-xs text-fg-muted">
            Dentista
            <select required value={dentistId} onChange={(e) => setDentistId(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg">
              <option value="">Selecione…</option>
              {dentists.map((d) => <option key={d.id} value={d.id}>{d.fullName}</option>)}
            </select>
          </label>
          <label className="block text-xs text-fg-muted">
            Cadeira
            <select required value={chairId} onChange={(e) => setChairId(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg">
              <option value="">Selecione…</option>
              {chairs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="block text-xs text-fg-muted">
            Procedimento (opcional)
            <select value={procedureId} onChange={(e) => {
              setProcedureId(e.target.value);
              const p = procedures.find((x) => x.id === e.target.value);
              if (p?.durationMinutes) setDuration(p.durationMinutes);
            }} className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg">
              <option value="">—</option>
              {procedures.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs text-fg-muted">
              Data
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </label>
            <label className="block text-xs text-fg-muted">
              Hora
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
            </label>
          </div>
          <label className="block text-xs text-fg-muted">
            Duração (min)
            <Input type="number" min={5} step={5} value={duration} onChange={(e) => setDuration(Number(e.target.value))} required />
          </label>
          {error && <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Criando…' : 'Criar agendamento'}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}

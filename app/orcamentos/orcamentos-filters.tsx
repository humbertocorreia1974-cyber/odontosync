"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Option = { id: string; fullName: string };

type Props = {
  patients: Option[];
  dentists: Option[];
  showDentistFilter: boolean;
  initial: {
    status: string;
    patientId: string;
    dentistId: string;
    q: string;
  };
};

const STATUSES = [
  { value: "", label: "Todos os status" },
  { value: "DRAFT", label: "Rascunho" },
  { value: "SENT", label: "Enviado" },
  { value: "PARTIALLY_APPROVED", label: "Parcialmente aprovado" },
  { value: "APPROVED", label: "Aprovado" },
  { value: "REJECTED", label: "Rejeitado" },
  { value: "CANCELED", label: "Cancelado" },
  { value: "COMPLETED", label: "Concluído" },
];

export function OrcamentosFilters({
  patients,
  dentists,
  showDentistFilter,
  initial,
}: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(initial.q);

  function apply(next: Partial<typeof initial>) {
    const params = new URLSearchParams(sp?.toString() ?? "");
    const merged = { ...initial, q, ...next };
    (Object.keys(merged) as (keyof typeof merged)[]).forEach((k) => {
      const v = merged[k];
      if (v) params.set(k, v);
      else params.delete(k);
    });
    startTransition(() => router.push(`/orcamentos?${params.toString()}`));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        apply({ q });
      }}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface/70 p-3 backdrop-blur-sm"
    >
      <div className="min-w-[220px] flex-1">
        <label className="mb-1 block text-xs font-medium text-fg-muted">
          Buscar
        </label>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Título ou nome do paciente"
        />
      </div>

      <div className="min-w-[160px]">
        <label className="mb-1 block text-xs font-medium text-fg-muted">
          Status
        </label>
        <select
          value={initial.status}
          onChange={(e) => apply({ status: e.target.value })}
          className="h-10 w-full rounded-md border border-border bg-bg px-3 text-sm text-fg outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-brand"
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="min-w-[200px]">
        <label className="mb-1 block text-xs font-medium text-fg-muted">
          Paciente
        </label>
        <select
          value={initial.patientId}
          onChange={(e) => apply({ patientId: e.target.value })}
          className="h-10 w-full rounded-md border border-border bg-bg px-3 text-sm text-fg outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-brand"
        >
          <option value="">Todos</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.fullName}
            </option>
          ))}
        </select>
      </div>

      {showDentistFilter && (
        <div className="min-w-[200px]">
          <label className="mb-1 block text-xs font-medium text-fg-muted">
            Dentista
          </label>
          <select
            value={initial.dentistId}
            onChange={(e) => apply({ dentistId: e.target.value })}
            className="h-10 w-full rounded-md border border-border bg-bg px-3 text-sm text-fg outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-brand"
          >
            <option value="">Todos</option>
            {dentists.map((d) => (
              <option key={d.id} value={d.id}>
                {d.fullName}
              </option>
            ))}
          </select>
        </div>
      )}

      <Button type="submit" variant="secondary" size="md" disabled={pending}>
        {pending ? "Filtrando..." : "Aplicar"}
      </Button>
    </form>
  );
}

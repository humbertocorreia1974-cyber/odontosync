"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Dentist = { id: string; fullName: string };

export function FiltrosOrcamentos({ dentists }: { dentists: Dentist[] }) {
  const router = useRouter();
  const sp = useSearchParams();

  function submit(formData: FormData) {
    const params = new URLSearchParams();
    const q = String(formData.get("q") ?? "").trim();
    const status = String(formData.get("status") ?? "ALL");
    const dentistId = String(formData.get("dentistId") ?? "ALL");
    if (q) params.set("q", q);
    if (status !== "ALL") params.set("status", status);
    if (dentistId !== "ALL") params.set("dentistId", dentistId);
    router.push(`/orcamentos${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <form
      action={submit}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface/70 p-4 backdrop-blur-sm"
    >
      <div className="min-w-[220px] flex-1">
        <label className="mb-1 block text-xs font-medium text-fg-muted">Buscar</label>
        <Input
          name="q"
          defaultValue={sp.get("q") ?? ""}
          placeholder="Título ou paciente"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-fg-muted">Status</label>
        <select
          name="status"
          defaultValue={sp.get("status") ?? "ALL"}
          className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
        >
          <option value="ALL">Todos</option>
          <option value="DRAFT">Rascunho</option>
          <option value="SENT">Enviado</option>
          <option value="PARTIALLY_APPROVED">Parcialmente aprovado</option>
          <option value="APPROVED">Aprovado</option>
          <option value="REJECTED">Rejeitado</option>
          <option value="CANCELED">Cancelado</option>
          <option value="COMPLETED">Concluído</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-fg-muted">Dentista</label>
        <select
          name="dentistId"
          defaultValue={sp.get("dentistId") ?? "ALL"}
          className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
        >
          <option value="ALL">Todos</option>
          {dentists.map((d) => (
            <option key={d.id} value={d.id}>
              {d.fullName}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" variant="primary" size="md">
        Filtrar
      </Button>
    </form>
  );
}

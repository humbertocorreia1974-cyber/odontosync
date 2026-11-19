"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Dentist = { id: string; fullName: string };

export function NovoOrcamentoButton({ dentists }: { dentists: Dentist[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(formData: FormData) {
    setBusy(true);
    setError(null);
    try {
      const body = {
        patientId: String(formData.get("patientId") ?? ""),
        dentistId: String(formData.get("dentistId") ?? ""),
        title: String(formData.get("title") ?? "").trim(),
        description: String(formData.get("description") ?? "").trim() || null,
      };
      const res = await fetch("/api/treatment-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Falha ao criar");
      setOpen(false);
      router.push(`/orcamentos/${data.id}`);
    } catch (e: any) {
      setError(e?.message ?? "Erro");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button type="button" variant="primary" size="md" onClick={() => setOpen(true)}>
        Novo orçamento
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-fg">Novo orçamento</h2>
        <p className="mt-1 text-xs text-fg-muted">
          Crie o plano e adicione etapas em seguida.
        </p>
        <form action={submit} className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-fg-muted">
              ID do paciente
            </label>
            <Input name="patientId" required placeholder="cuid do paciente" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-fg-muted">Dentista</label>
            <select
              name="dentistId"
              required
              className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg"
            >
              <option value="">Selecione</option>
              {dentists.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.fullName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-fg-muted">Título</label>
            <Input name="title" required placeholder="Ex: Reabilitação oral" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-fg-muted">
              Descrição (opcional)
            </label>
            <Input name="description" placeholder="Observações iniciais" />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => setOpen(false)}
              disabled={busy}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="md" disabled={busy}>
              {busy ? "Criando..." : "Criar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

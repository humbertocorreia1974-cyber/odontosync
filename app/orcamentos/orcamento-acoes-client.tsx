"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Props = {
  id: string;
  status: string;
  publicToken: string;
  canManage: boolean;
};

export function OrcamentoAcoes({ id, status, publicToken, canManage }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function send() {
    setBusy("send");
    setMsg(null);
    try {
      const res = await fetch(`/api/treatment-plans/${id}/send`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Falha ao enviar");
      setMsg("Link enviado ao paciente");
      startTransition(() => router.refresh());
    } catch (e: any) {
      setMsg(e?.message ?? "Erro");
    } finally {
      setBusy(null);
    }
  }

  async function cancel() {
    if (!confirm("Cancelar este orçamento?")) return;
    setBusy("cancel");
    try {
      const res = await fetch(`/api/treatment-plans/${id}/cancel`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Falha");
      startTransition(() => router.refresh());
    } catch (e: any) {
      setMsg(e?.message ?? "Erro");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!confirm("Excluir permanentemente este orçamento?")) return;
    setBusy("del");
    try {
      const res = await fetch(`/api/treatment-plans/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Falha");
      startTransition(() => router.refresh());
    } catch (e: any) {
      setMsg(e?.message ?? "Erro");
    } finally {
      setBusy(null);
    }
  }

  const publicUrl =
    typeof window !== "undefined" && publicToken
      ? `${window.location.origin}/orcamento/${publicToken}`
      : null;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {msg && <span className="text-xs text-fg-muted">{msg}</span>}
      {publicUrl && (
        <a
          href={publicUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-medium text-brand hover:underline"
        >
          Ver link
        </a>
      )}
      {canManage && status !== "CANCELED" && status !== "COMPLETED" && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={send}
          disabled={busy === "send" || pending}
        >
          {busy === "send" ? "Enviando..." : "Enviar"}
        </Button>
      )}
      {canManage && status !== "CANCELED" && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={cancel}
          disabled={busy === "cancel" || pending}
        >
          Cancelar
        </Button>
      )}
      {canManage && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={remove}
          disabled={busy === "del" || pending}
        >
          Excluir
        </Button>
      )}
    </div>
  );
}

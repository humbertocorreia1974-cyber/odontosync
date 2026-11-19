"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Stage = {
  id: string;
  title: string;
  status: string;
  totalPrice: number;
  toothNumber: number | null;
  quantity: number;
};

type Plan = {
  id: string;
  title: string;
  status: string;
  totalAmount: number;
  approvedAmount: number;
  publicToken: string;
  publicTokenExpiresAt: string | null;
  sentAt: string | null;
  approvedAt: string | null;
  createdAt: string;
  patient: { id: string; fullName: string; phone: string | null; email: string | null };
  dentist: { id: string; fullName: string; color: string };
  insurance: { id: string; name: string } | null;
  stages: Stage[];
  lastSignature: {
    id: string;
    signedAt: string;
    hashSha256: string;
    signerName: string;
  } | null;
};

function brl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function OrcamentoDrawer({
  plan,
  canManage,
  canSign,
  onClose,
}: {
  plan: Plan;
  canManage: boolean;
  canSign: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [signerName, setSignerName] = useState(plan.patient.fullName);
  const [signerCpf, setSignerCpf] = useState("");

  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/p/orcamento/${plan.publicToken}`
      : `/p/orcamento/${plan.publicToken}`;

  async function sendLink() {
    setBusy("send");
    setMsg(null);
    try {
      const res = await fetch(`/api/treatment-plans/${plan.id}/send`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Falha ao enviar");
      setMsg("Link enviado por WhatsApp e e-mail.");
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erro ao enviar");
    } finally {
      setBusy(null);
    }
  }

  async function sign() {
    setBusy("sign");
    setMsg(null);
    try {
      const res = await fetch(`/api/treatment-plans/${plan.id}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signerName, signerCpf }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Falha ao assinar");
      setMsg(`Assinado. Hash: ${data.hashSha256?.slice(0, 16)}...`);
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erro ao assinar");
    } finally {
      setBusy(null);
    }
  }

  async function stageAction(stageId: string, action: "approve" | "reject") {
    setBusy(stageId);
    setMsg(null);
    try {
      const res = await fetch(
        `/api/treatment-plans/${plan.id}/stages/${stageId}/${action}`,
        { method: "POST" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Falha");
      setMsg(action === "approve" ? "Etapa aprovada." : "Etapa rejeitada.");
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
      <div className="h-full w-full max-w-2xl overflow-y-auto border-l border-border bg-bg p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-fg-muted">
              Orçamento
            </p>
            <h2 className="text-xl font-semibold text-fg">{plan.title}</h2>
            <p className="mt-1 text-sm text-fg-muted">
              {plan.patient.fullName} · {plan.dentist.fullName} ·{" "}
              {plan.insurance?.name ?? "Particular"}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-border bg-surface/70 p-3">
            <p className="text-xs text-fg-muted">Total</p>
            <p className="text-sm font-semibold text-fg">{brl(plan.totalAmount)}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface/70 p-3">
            <p className="text-xs text-fg-muted">Aprovado</p>
            <p className="text-sm font-semibold text-fg">{brl(plan.approvedAmount)}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface/70 p-3">
            <p className="text-xs text-fg-muted">Status</p>
            <p className="text-sm font-semibold text-fg">{plan.status}</p>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-border bg-surface/70 p-3">
          <p className="text-xs font-medium text-fg-muted">Link público do paciente</p>
          <div className="mt-1 flex items-center gap-2">
            <code className="flex-1 truncate rounded-md bg-bg px-2 py-1 text-xs text-fg">
              {publicUrl}
            </code>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigator.clipboard.writeText(publicUrl)}
            >
              Copiar
            </Button>
          </div>
          {canManage && (
            <div className="mt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={sendLink}
                disabled={busy === "send"}
              >
                {busy === "send" ? "Enviando..." : "Enviar link (WhatsApp + e-mail)"}
              </Button>
            </div>
          )}
        </div>

        <h3 className="mt-6 text-sm font-semibold text-fg">Etapas</h3>
        <ul className="mt-2 space-y-2">
          {plan.stages.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface/70 p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-fg">{s.title}</p>
                <p className="text-xs text-fg-muted">
                  {s.toothNumber ? `Dente ${s.toothNumber} · ` : ""}
                  Qtd {s.quantity} · {brl(s.totalPrice)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-fg-muted/10 px-2 py-0.5 text-xs text-fg-muted">
                  {s.status}
                </span>
                {canManage && s.status === "PENDING" && (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => stageAction(s.id, "approve")}
                      disabled={busy === s.id}
                    >
                      Aprovar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => stageAction(s.id, "reject")}
                      disabled={busy === s.id}
                    >
                      Rejeitar
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>

        <h3 className="mt-6 text-sm font-semibold text-fg">Assinatura digital</h3>
        {plan.lastSignature ? (
          <div className="mt-2 rounded-lg border border-border bg-surface/70 p-3 text-xs text-fg-muted">
            <p>
              Assinado por{" "}
              <span className="font-medium text-fg">
                {plan.lastSignature.signerName}
              </span>{" "}
              em {new Date(plan.lastSignature.signedAt).toLocaleString("pt-BR")}
            </p>
            <p className="mt-1 break-all">
              SHA-256:{" "}
              <code className="text-fg">{plan.lastSignature.hashSha256}</code>
            </p>
          </div>
        ) : canSign ? (
          <div className="mt-2 space-y-2 rounded-lg border border-border bg-surface/70 p-3">
            <Input
              placeholder="Nome completo do signatário"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
            />
            <Input
              placeholder="CPF (opcional)"
              value={signerCpf}
              onChange={(e) => setSignerCpf(e.target.value)}
            />
            <Button
              variant="primary"
              size="sm"
              onClick={sign}
              disabled={busy === "sign" || signerName.trim().length < 3}
            >
              {busy === "sign" ? "Assinando..." : "Assinar com registro SHA-256"}
            </Button>
          </div>
        ) : (
          <p className="mt-2 text-xs text-fg-muted">
            Aguardando assinatura do paciente via link público.
          </p>
        )}

        {msg && (
          <p className="mt-4 rounded-md border border-border bg-surface/70 px-3 py-2 text-xs text-fg">
            {msg}
          </p>
        )}
      </div>
    </div>
  );
}

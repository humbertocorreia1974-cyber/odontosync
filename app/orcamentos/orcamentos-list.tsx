"use client";

import { useState } from "react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OrcamentoDrawer } from "./orcamento-drawer";

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

const STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-fg-muted/10 text-fg-muted",
  SENT: "bg-brand/10 text-brand",
  PARTIALLY_APPROVED: "bg-accent/15 text-accent",
  APPROVED: "bg-emerald-500/15 text-emerald-600",
  REJECTED: "bg-red-500/15 text-red-600",
  CANCELED: "bg-fg-muted/10 text-fg-muted",
  COMPLETED: "bg-brand/15 text-brand",
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Rascunho",
  SENT: "Enviado",
  PARTIALLY_APPROVED: "Parcial",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
  CANCELED: "Cancelado",
  COMPLETED: "Concluído",
};

function brl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function OrcamentosList({
  plans,
  canManage,
  canSign,
}: {
  plans: Plan[];
  canManage: boolean;
  canSign: boolean;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = plans.find((p) => p.id === openId) ?? null;

  return (
    <>
      <Card>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface/60 text-left text-xs uppercase tracking-wider text-fg-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Orçamento</th>
                  <th className="px-4 py-3 font-medium">Paciente</th>
                  <th className="px-4 py-3 font-medium">Dentista</th>
                  <th className="px-4 py-3 font-medium">Convênio</th>
                  <th className="px-4 py-3 font-medium text-right">Total</th>
                  <th className="px-4 py-3 font-medium text-right">Aprovado</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-border/60 transition-colors duration-150 hover:bg-white/5"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-fg">{p.title}</div>
                      <div className="text-[11px] text-fg-muted">
                        {p.stages.length} etapa{p.stages.length === 1 ? "" : "s"} ·{" "}
                        {new Date(p.createdAt).toLocaleDateString("pt-BR")}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-fg">{p.patient.fullName}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2 text-fg">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: p.dentist.color }}
                        />
                        {p.dentist.fullName}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-fg-muted">
                      {p.insurance?.name ?? "Particular"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-fg">
                      {brl(p.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-right text-fg-muted">
                      {brl(p.approvedAmount)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          STATUS_STYLE[p.status] ?? "bg-fg-muted/10 text-fg-muted"
                        }`}
                      >
                        {STATUS_LABEL[p.status] ?? p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setOpenId(p.id)}
                      >
                        Abrir
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {open && (
        <OrcamentoDrawer
          plan={open}
          canManage={canManage}
          canSign={canSign}
          onClose={() => setOpenId(null)}
        />
      )}
    </>
  );
}

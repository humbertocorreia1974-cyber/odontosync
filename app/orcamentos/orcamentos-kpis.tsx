import { Card, CardBody } from "@/components/ui/card";

type Props = {
  total: number;
  approved: number;
  pending: number;
  count: number;
  approvalRate: number;
};

function brl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function OrcamentosKpis({ total, approved, pending, count, approvalRate }: Props) {
  const items = [
    { label: "Orçamentos", value: String(count), hint: "no período filtrado" },
    { label: "Valor total", value: brl(total), hint: "soma dos planos" },
    { label: "Aprovado", value: brl(approved), hint: "etapas aprovadas" },
    { label: "Pendente", value: brl(pending), hint: "aguardando paciente" },
    {
      label: "Taxa de aprovação",
      value: `${approvalRate.toFixed(1)}%`,
      hint: "aprovado / total",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((it) => (
        <Card key={it.label}>
          <CardBody className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-fg-muted">
              {it.label}
            </p>
            <p className="mt-1 text-lg font-semibold text-fg">{it.value}</p>
            <p className="mt-0.5 text-[11px] text-fg-muted">{it.hint}</p>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

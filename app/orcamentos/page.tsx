import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FiltrosOrcamentos } from "./filtros-form";
import { NovoOrcamentoButton } from "./novo-orcamento-client";
import { OrcamentoAcoes } from "./orcamento-acoes-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Orçamentos | OdontoSync",
  description:
    "Orçamentos em etapas com aprovação individual do paciente via link público e assinatura digital com valor jurídico.",
  openGraph: {
    title: "Orçamentos | OdontoSync",
    description:
      "Envie orçamentos por etapas, aprove individualmente e colete assinatura digital com hash SHA-256.",
  },
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Rascunho",
  SENT: "Enviado",
  PARTIALLY_APPROVED: "Parcialmente aprovado",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
  CANCELED: "Cancelado",
  COMPLETED: "Concluído",
};

const STATUS_CLASS: Record<string, string> = {
  DRAFT: "bg-fg-muted/10 text-fg-muted",
  SENT: "bg-brand/10 text-brand",
  PARTIALLY_APPROVED: "bg-accent/15 text-accent-fg",
  APPROVED: "bg-emerald-500/15 text-emerald-600",
  REJECTED: "bg-red-500/15 text-red-600",
  CANCELED: "bg-fg-muted/10 text-fg-muted",
  COMPLETED: "bg-emerald-500/15 text-emerald-600",
};

function brl(v: unknown) {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function OrcamentosPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string; dentistId?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const role = session.user.role ?? "user";
  const clinicId = session.user.clinicId;
  if (!clinicId) redirect("/");

  const where: any = { clinicId };
  if (searchParams.status && searchParams.status !== "ALL") {
    where.status = searchParams.status;
  }
  if (searchParams.dentistId && searchParams.dentistId !== "ALL") {
    where.dentistId = searchParams.dentistId;
  }
  if (role === "DENTIST" && session.user.dentistId) {
    where.dentistId = session.user.dentistId;
  }
  if (searchParams.q) {
    where.OR = [
      { title: { contains: searchParams.q, mode: "insensitive" } },
      { patient: { fullName: { contains: searchParams.q, mode: "insensitive" } } },
    ];
  }

  const [plans, dentists, totals] = await Promise.all([
    prisma.treatmentPlan.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        patient: { select: { id: true, fullName: true } },
        dentist: { select: { id: true, fullName: true } },
        insurance: { select: { id: true, name: true } },
        _count: { select: { stages: true, signatures: true } },
      },
    }),
    prisma.dentist.findMany({
      where: { clinicId, isActive: true },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
    prisma.treatmentPlan.groupBy({
      by: ["status"],
      where: { clinicId },
      _count: { _all: true },
      _sum: { totalAmount: true, approvedAmount: true },
    }),
  ]);

  const totalCount = totals.reduce((a, t) => a + t._count._all, 0);
  const approvedCount = totals.find((t) => t.status === "APPROVED")?._count._all ?? 0;
  const totalValue = totals.reduce((a, t) => a + Number(t._sum.totalAmount ?? 0), 0);
  const approvedValue = totals.reduce((a, t) => a + Number(t._sum.approvedAmount ?? 0), 0);
  const approvalRate = totalCount ? Math.round((approvedCount / totalCount) * 100) : 0;

  const canCreate = role === "OWNER" || role === "RECEPTION" || role === "DENTIST";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Orçamentos</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Planos de tratamento em etapas com aprovação individual e assinatura digital.
          </p>
        </div>
        {canCreate && <NovoOrcamentoButton dentists={dentists} />}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardBody>
            <p className="text-xs uppercase tracking-wide text-fg-muted">Total</p>
            <p className="mt-1 text-xl font-semibold text-fg">{totalCount}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs uppercase tracking-wide text-fg-muted">Valor total</p>
            <p className="mt-1 text-xl font-semibold text-fg">{brl(totalValue)}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs uppercase tracking-wide text-fg-muted">Aprovado</p>
            <p className="mt-1 text-xl font-semibold text-emerald-600">{brl(approvedValue)}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs uppercase tracking-wide text-fg-muted">Taxa de aprovação</p>
            <p className="mt-1 text-xl font-semibold text-brand">{approvalRate}%</p>
          </CardBody>
        </Card>
      </div>

      <FiltrosOrcamentos dentists={dentists} />

      <Card className="mt-6">
        <CardBody className="p-0">
          {plans.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <p className="text-sm text-fg-muted">
                Nenhum orçamento encontrado com os filtros atuais.
              </p>
              {canCreate && <NovoOrcamentoButton dentists={dentists} />}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Orçamento</th>
                    <th className="px-4 py-3 font-medium">Paciente</th>
                    <th className="px-4 py-3 font-medium">Dentista</th>
                    <th className="px-4 py-3 font-medium">Etapas</th>
                    <th className="px-4 py-3 font-medium">Total</th>
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
                        <Link
                          href={`/orcamentos/${p.id}`}
                          className="font-medium text-fg hover:text-brand"
                        >
                          {p.title}
                        </Link>
                        <p className="text-xs text-fg-muted">
                          {p.insurance?.name ?? "Particular"} ·{" "}
                          {new Date(p.createdAt).toLocaleDateString("pt-BR")}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-fg">{p.patient.fullName}</td>
                      <td className="px-4 py-3 text-fg-muted">{p.dentist.fullName}</td>
                      <td className="px-4 py-3 text-fg-muted">
                        {p._count.stages} etapa{p._count.stages === 1 ? "" : "s"}
                        {p._count.signatures > 0 && (
                          <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                            assinado
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-fg">{brl(p.totalAmount)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            STATUS_CLASS[p.status] ?? "bg-fg-muted/10 text-fg-muted"
                          }`}
                        >
                          {STATUS_LABEL[p.status] ?? p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <OrcamentoAcoes
                          id={p.id}
                          status={p.status}
                          publicToken={p.publicToken}
                          canManage={role === "OWNER" || role === "RECEPTION"}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

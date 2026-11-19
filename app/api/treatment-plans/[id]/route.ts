import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  const role = session.user.role ?? "user";
  if (!["OWNER", "RECEPTION", "DENTIST"].includes(role)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const existing = await prisma.treatmentPlan.findFirst({
    where: { id: params.id, clinicId: session.user.clinicId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }
  if (role === "DENTIST" && existing.dentistId !== session.user.dentistId) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const data: any = {};
  if (typeof body.title === "string") data.title = body.title;
  if (typeof body.description === "string" || body.description === null)
    data.description = body.description;
  if (typeof body.notes === "string" || body.notes === null) data.notes = body.notes;
  if (body.validUntil) data.validUntil = new Date(body.validUntil);

  const updated = await prisma.treatmentPlan.update({
    where: { id: params.id },
    data,
  });

  await prisma.auditLog.create({
    data: {
      clinicId: session.user.clinicId,
      userId: session.user.id,
      action: "UPDATE",
      entity: "TreatmentPlan",
      entityId: params.id,
      severity: "INFO",
      description: `Orçamento atualizado: ${updated.title}`,
      before: { title: existing.title, description: existing.description },
      after: { title: updated.title, description: updated.description },
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  const role = session.user.role ?? "user";
  if (!["OWNER", "RECEPTION"].includes(role)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const existing = await prisma.treatmentPlan.findFirst({
    where: { id: params.id, clinicId: session.user.clinicId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  await prisma.treatmentPlan.delete({ where: { id: params.id } });

  await prisma.auditLog.create({
    data: {
      clinicId: session.user.clinicId,
      userId: session.user.id,
      action: "DELETE",
      entity: "TreatmentPlan",
      entityId: params.id,
      severity: "CRITICAL",
      description: `Orçamento excluído: ${existing.title}`,
      before: {
        id: existing.id,
        title: existing.title,
        patientId: existing.patientId,
        totalAmount: existing.totalAmount.toString(),
        status: existing.status,
      },
    },
  });

  return NextResponse.json({ ok: true });
}

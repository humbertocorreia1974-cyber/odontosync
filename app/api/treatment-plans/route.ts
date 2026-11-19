import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const patientId = searchParams.get("patientId");
  const where: any = { clinicId: session.user.clinicId };
  if (status) where.status = status;
  if (patientId) where.patientId = patientId;
  if (session.user.role === "DENTIST" && session.user.dentistId) {
    where.dentistId = session.user.dentistId;
  }
  const plans = await prisma.treatmentPlan.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      patient: { select: { id: true, fullName: true } },
      dentist: { select: { id: true, fullName: true } },
    },
  });
  return NextResponse.json({ plans });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  const role = session.user.role ?? "user";
  if (!["OWNER", "RECEPTION", "DENTIST"].includes(role)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.patientId || !body?.dentistId || !body?.title) {
    return NextResponse.json(
      { error: "patientId, dentistId e title são obrigatórios" },
      { status: 400 }
    );
  }

  const patient = await prisma.patient.findFirst({
    where: { id: body.patientId, clinicId: session.user.clinicId },
    select: { id: true },
  });
  if (!patient) {
    return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 });
  }

  const dentist = await prisma.dentist.findFirst({
    where: { id: body.dentistId, clinicId: session.user.clinicId },
    select: { id: true },
  });
  if (!dentist) {
    return NextResponse.json({ error: "Dentista não encontrado" }, { status: 404 });
  }

  const publicToken = randomBytes(24).toString("hex");

  const plan = await prisma.treatmentPlan.create({
    data: {
      clinicId: session.user.clinicId,
      unitId: session.user.unitId ?? null,
      patientId: body.patientId,
      dentistId: body.dentistId,
      createdById: session.user.id,
      title: body.title,
      description: body.description ?? null,
      status: "DRAFT",
      publicToken,
      publicTokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    },
  });

  await prisma.auditLog.create({
    data: {
      clinicId: session.user.clinicId,
      userId: session.user.id,
      action: "CREATE",
      entity: "TreatmentPlan",
      entityId: plan.id,
      severity: "INFO",
      description: `Orçamento criado: ${plan.title}`,
      after: { id: plan.id, title: plan.title, patientId: plan.patientId },
    },
  });

  return NextResponse.json({ id: plan.id, publicToken: plan.publicToken });
}

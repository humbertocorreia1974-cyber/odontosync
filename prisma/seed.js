const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

const senha = bcrypt.hashSync('Demo@1234', 10);

async function main() {
  const clinic = await prisma.clinic.upsert({
    where: { slug: 'odontosync-demo' },
    update: {},
    create: { name: 'OdontoSync Demo', slug: 'odontosync-demo', cnpj: '12.345.678/0001-90', email: 'contato@odontosync.demo', phone: '(11) 3456-7890', primaryColor: '#1E5FBF', accentColor: '#3DD9B0' },
  });

  const unit = await prisma.unit.upsert({
    where: { clinicId_name: { clinicId: clinic.id, name: 'Unidade Centro' } },
    update: {},
    create: { clinicId: clinic.id, name: 'Unidade Centro', code: 'CTR', addressLine: 'Av. Paulista, 1000', city: 'São Paulo', state: 'SP', zipCode: '01310-100', phone: '(11) 3456-7891', latitude: -23.5613, longitude: -46.6565 },
  });

  const usersData = [
    { email: 'admin@demo.app', name: 'Administrador Demo', role: 'OWNER' },
    { email: 'superadmin@demo.app', name: 'Super Admin Demo', role: 'SUPER_ADMIN' },
    { email: 'dentist@demo.app', name: 'Dra. Ana Dentista', role: 'DENTIST' },
    { email: 'patient@demo.app', name: 'Paciente Demo', role: 'PATIENT' },
    { email: 'reception@demo.app', name: 'Recepção Demo', role: 'RECEPTION' },
    { email: 'jogador@demo.app', name: 'Jogador Demo', role: 'user' },
  ];
  const users = {};
  for (const u of usersData) {
    users[u.role] = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { email: u.email, name: u.name, passwordHash: senha, role: u.role, plan: 'pro', termsAcceptedAt: new Date() },
    });
  }

  const dentist = await prisma.dentist.upsert({
    where: { clinicId_cro_croState: { clinicId: clinic.id, cro: '12345', croState: 'SP' } },
    update: {},
    create: { clinicId: clinic.id, unitId: unit.id, userId: users.DENTIST.id, fullName: 'Dra. Ana Dentista', cro: '12345', croState: 'SP', specialties: ['Ortodontia', 'Clínica Geral'], email: 'dentist@demo.app', phone: '(11) 98765-4321', color: '#1E5FBF', commissionMode: 'PERCENTAGE', commissionPercentPrivate: 30, commissionPercentInsurance: 20 },
  });

  const patient = await prisma.patient.upsert({
    where: { userId: users.PATIENT.id },
    update: {},
    create: { clinicId: clinic.id, unitId: unit.id, userId: users.PATIENT.id, fullName: 'Paciente Demo', cpf: '123.456.789-00', birthDate: new Date('1990-05-15'), gender: 'M', email: 'patient@demo.app', phone: '(11) 91234-5678', whatsapp: '(11) 91234-5678', addressLine: 'Rua das Flores, 123', city: 'São Paulo', state: 'SP', zipCode: '01234-567' },
  });

  const chair = await prisma.chair.upsert({
    where: { unitId_name: { unitId: unit.id, name: 'Cadeira 01' } },
    update: {},
    create: { unitId: unit.id, name: 'Cadeira 01', code: 'C1', color: '#3DD9B0' },
  });

  const proceduresData = [
    { code: 'PROF', name: 'Profilaxia', defaultPrice: 150, durationMinutes: 30, category: 'Preventivo' },
    { code: 'REST', name: 'Restauração em Resina', defaultPrice: 280, durationMinutes: 60, category: 'Restaurador', requiresTooth: true },
    { code: 'CANAL', name: 'Tratamento de Canal', defaultPrice: 850, durationMinutes: 90, category: 'Endodontia', requiresTooth: true },
    { code: 'EXTR', name: 'Extração Simples', defaultPrice: 320, durationMinutes: 45, category: 'Cirurgia', requiresTooth: true },
    { code: 'IMPL', name: 'Implante Dentário', defaultPrice: 2500, durationMinutes: 120, category: 'Implantodontia', requiresTooth: true },
  ];
  const procedures = [];
  for (const p of proceduresData) {
    procedures.push(await prisma.procedure.upsert({
      where: { clinicId_code: { clinicId: clinic.id, code: p.code } },
      update: {},
      create: { clinicId: clinic.id, ...p },
    }));
  }

  const insurance = await prisma.insurance.upsert({
    where: { clinicId_name: { clinicId: clinic.id, name: 'OdontoPrev' } },
    update: {},
    create: { clinicId: clinic.id, name: 'OdontoPrev', ansCode: '301', cnpj: '98.765.432/0001-10', contactName: 'Carlos Silva', contactEmail: 'contato@odontoprev.com', contactPhone: '(11) 4000-1234', paymentTermDays: 30, defaultDiscountPercent: 10 },
  });

  const nPlans = await prisma.treatmentPlan.count();
  if (nPlans === 0) {
    const plan = await prisma.treatmentPlan.create({
      data: { clinicId: clinic.id, unitId: unit.id, patientId: patient.id, dentistId: dentist.id, insuranceId: insurance.id, createdById: users.DENTIST.id, title: 'Plano de Tratamento - Restaurações', description: 'Restaurações em resina nos dentes 16 e 26', status: 'APPROVED', totalAmount: 560, approvedAmount: 560, publicToken: 'demo-token-' + Date.now(), sentAt: new Date(), approvedAt: new Date(), validUntil: new Date(Date.now() + 30 * 86400000) },
    });
    await prisma.treatmentPlanStage.createMany({
      data: [
        { treatmentPlanId: plan.id, procedureId: procedures[1].id, order: 1, title: 'Restauração dente 16', toothNumber: 16, faces: ['O', 'M'], quantity: 1, unitPrice: 280, totalPrice: 280, status: 'APPROVED', approvedAt: new Date() },
        { treatmentPlanId: plan.id, procedureId: procedures[1].id, order: 2, title: 'Restauração dente 26', toothNumber: 26, faces: ['O', 'D'], quantity: 1, unitPrice: 280, totalPrice: 280, status: 'APPROVED', approvedAt: new Date() },
      ],
    });
  }

  const nAppts = await prisma.appointment.count();
  if (nAppts === 0) {
    const base = new Date();
    base.setHours(9, 0, 0, 0);
    const appts = [];
    for (let i = 0; i < 7; i++) {
      const start = new Date(base.getTime() + i * 86400000);
      const end = new Date(start.getTime() + 60 * 60000);
      appts.push({ clinicId: clinic.id, unitId: unit.id, patientId: patient.id, dentistId: dentist.id, chairId: chair.id, procedureId: procedures[i % procedures.length].id, createdById: users.RECEPTION.id, dentistUserId: users.DENTIST.id, title: 'Consulta ' + (i + 1), startAt: start, endAt: end, status: i < 3 ? 'COMPLETED' : i === 3 ? 'CONFIRMED' : 'SCHEDULED', confirmationToken: 'tok-' + i + '-' + Date.now() });
    }
    await prisma.appointment.createMany({ data: appts });
  }

  const nInv = await prisma.inventoryItem.count();
  if (nInv === 0) {
    await prisma.inventoryItem.createMany({
      data: [
        { clinicId: clinic.id, unitId: unit.id, name: 'Luva de Procedimento', sku: 'LUV-M', unit: 'caixa', quantity: 50, minQuantity: 10, costPrice: 25.5 },
        { clinicId: clinic.id, unitId: unit.id, name: 'Resina Composta A2', sku: 'RES-A2', unit: 'unidade', quantity: 30, minQuantity: 5, costPrice: 45.0 },
        { clinicId: clinic.id, unitId: unit.id, name: 'Anestésico Lidocaína', sku: 'ANE-LID', unit: 'caixa', quantity: 20, minQuantity: 5, costPrice: 38.9 },
      ],
    });
  }

  const nTx = await prisma.transaction.count();
  if (nTx === 0) {
    await prisma.transaction.createMany({
      data: [
        { clinicId: clinic.id, unitId: unit.id, patientId: patient.id, dentistId: dentist.id, type: 'INCOME', category: 'Procedimento', description: 'Restauração dente 16', amount: 280, paymentMethod: 'PIX', status: 'PAID', paidAt: new Date() },
        { clinicId: clinic.id, unitId: unit.id, patientId: patient.id, dentistId: dentist.id, type: 'INCOME', category: 'Procedimento', description: 'Profilaxia', amount: 150, paymentMethod: 'CASH', status: 'PAID', paidAt: new Date() },
        { clinicId: clinic.id, unitId: unit.id, type: 'EXPENSE', category: 'Material', description: 'Compra de resinas', amount: 450, paymentMethod: 'TRANSFER', status: 'PAID', paidAt: new Date() },
      ],
    });
  }

  const nNotif = await prisma.notification.count();
  if (nNotif === 0) {
    await prisma.notification.createMany({
      data: [
        { clinicId: clinic.id, userId: users.DENTIST.id, patientId: patient.id, title: 'Nova consulta agendada', message: 'Consulta agendada para amanhã às 09:00', type: 'APPOINTMENT', isRead: false },
        { clinicId: clinic.id, userId: users.OWNER.id, title: 'Plano aprovado', message: 'Plano de tratamento aprovado pelo paciente', type: 'TREATMENT_PLAN', isRead: false },
      ],
    });
  }

  const nAudit = await prisma.auditLog.count();
  if (nAudit === 0) {
    await prisma.auditLog.createMany({
      data: [
        { clinicId: clinic.id, userId: users.OWNER.id, action: 'CREATE', entity: 'Patient', entityId: patient.id, description: 'Paciente criado' },
        { clinicId: clinic.id, userId: users.DENTIST.id, action: 'UPDATE', entity: 'TreatmentPlan', entityId: 'demo', description: 'Plano atualizado' },
      ],
    });
  }

  const nSub = await prisma.subscription.count();
  if (nSub === 0) {
    await prisma.subscription.create({
      data: { clinicId: clinic.id, userId: users.OWNER.id, plan: 'pro', status: 'ACTIVE', currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 86400000), priceAmount: 299.9 },
    });
  }
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error('[seed] ERRO:', e.message); await prisma.$disconnect(); process.exit(1); });
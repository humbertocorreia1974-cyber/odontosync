import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardTitle, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Filter, Download } from 'lucide-react';
import AuditFilters from './audit-filters';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Auditoria de ações sensíveis | OdontoSync',
  description:
    'Trilha completa de auditoria: alterações de prontuário, exclusões de orçamento e mudanças de comissão com IP, usuário e diff.',
  openGraph: {
    title: 'Auditoria de ações sensíveis | OdontoSync',
    description: 'Rastreabilidade LGPD de ações críticas na clínica.',
  },
};

const SEVERITY_STYLE: Record<string, string> = {
  INFO: 'bg-brand/10 text-brand',
  WARN: 'bg-amber-500/10 text-amber-600',
  CRITICAL: 'bg-red-500/10 text-red-600',
};

const ACTION_LABEL: Record<string, string> = {
  CREATE: 'Criação',
  UPDATE: 'Alteração',
  DELETE: 'Exclusão',
  VIEW: 'Visualização',
  LOGIN: 'Login',
  EXPORT: 'Exportação',
  SIGN: 'Assinatura',
};

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: { action?: string; severity?: string; entity?: string; from?: string; to?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  const role = (session.user as any).role as string;
  if (role !== 'OWNER' && role !== 'SUPER_ADMIN') redirect('/');

  const clinicId = (session.user as any).clinicId as string | undefined;

  const where: any = {};
  if (role !== 'SUPER_ADMIN') where.clinicId = clinicId;
  if (searchParams.action) where.action = searchParams.action;
  if (searchParams.severity) where.severity = searchParams.severity;
  if (searchParams.entity) where.entity = searchParams.entity;
  if (searchParams.from || searchParams.to) {
    where.createdAt = {};
    if (searchParams.from) where.createdAt.gte = new Date(searchParams.from);
    if (searchParams.to) where.createdAt.lte = new Date(searchParams.to + 'T23:59:59');
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { user: { select: { name: true, email: true, role: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return (
    <div className="min-h-screen bg-bg p-6 md:p-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-brand">
              <ShieldAlert className="h-5 w-5" />
              <span className="text-xs font-medium uppercase tracking-wider">Compliance LGPD</span>
            </div>
            <h1 className="mt-1 text-3xl font-semibold text-fg">Auditoria de ações sensíveis</h1>
            <p className="mt-1 text-sm text-fg-muted">
              {total} registro{total === 1 ? '' : 's'} — alterações de prontuário, exclusões de orçamento e mudanças de comissão.
            </p>
          </div>
          <a href="/api/audit-logs/export" download>
            <Button variant="secondary" size="md">
              <Download className="mr-2 h-4 w-4" /> Exportar CSV
            </Button>
          </a>
        </header>

        <Card>
          <CardBody>
            <div className="mb-4 flex items-center gap-2 text-fg-muted">
              <Filter className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Filtros</span>
            </div>
            <AuditFilters
              initial={{
                action: searchParams.action ?? '',
                severity: searchParams.severity ?? '',
                entity: searchParams.entity ?? '',
                from: searchParams.from ?? '',
                to: searchParams.to ?? '',
              }}
            />
          </CardBody>
        </Card>

        <Card>
          <CardTitle className="px-6 pt-6">Trilha de eventos</CardTitle>
          <CardBody className="p-0">
            {logs.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
                <ShieldAlert className="h-10 w-10 text-fg-muted" />
                <p className="text-sm text-fg-muted">
                  Nenhum evento de auditoria encontrado com os filtros atuais.
                </p>
                <a href="/auditoria">
                  <Button variant="secondary" size="sm">Limpar filtros</Button>
                </a>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-fg-muted">
                      <th className="px-6 py-3 font-medium">Quando</th>
                      <th className="px-6 py-3 font-medium">Usuário</th>
                      <th className="px-6 py-3 font-medium">Ação</th>
                      <th className="px-6 py-3 font-medium">Entidade</th>
                      <th className="px-6 py-3 font-medium">Severidade</th>
                      <th className="px-6 py-3 font-medium">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr
                        key={log.id}
                        className="border-b border-border/60 transition-colors duration-150 hover:bg-white/5"
                      >
                        <td className="whitespace-nowrap px-6 py-3 text-fg-muted">
                          {new Date(log.createdAt).toLocaleString('pt-BR')}
                        </td>
                        <td className="px-6 py-3">
                          <div className="text-fg">{log.user?.name ?? '—'}</div>
                          <div className="text-xs text-fg-muted">{log.user?.email ?? 'sistema'}</div>
                        </td>
                        <td className="px-6 py-3">
                          <span className="rounded-md bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
                            {ACTION_LABEL[log.action] ?? log.action}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <div className="text-fg">{log.entity}</div>
                          {log.entityId && (
                            <div className="font-mono text-xs text-fg-muted">{log.entityId.slice(0, 12)}…</div>
                          )}
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              SEVERITY_STYLE[log.severity] ?? SEVERITY_STYLE.INFO
                            }`}
                          >
                            {log.severity}
                          </span>
                        </td>
                        <td className="px-6 py-3 font-mono text-xs text-fg-muted">
                          {log.ipAddress ?? '—'}
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
    </div>
  );
}

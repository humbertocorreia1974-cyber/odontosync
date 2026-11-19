import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardTitle, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Bell, Package } from 'lucide-react';
import NotifyButton from './notify-button';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Alertas de estoque mínimo | OdontoSync',
  description: 'Itens abaixo do mínimo por unidade com notificação automática para o responsável.',
  openGraph: {
    title: 'Alertas de estoque mínimo | OdontoSync',
    description: 'Monitore itens críticos por unidade e dispare notificações.',
  },
};

export default async function Page({ searchParams }: { searchParams: { unitId?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  const role = (session.user as any).role as string;
  if (!['OWNER', 'SUPER_ADMIN', 'RECEPTION'].includes(role)) redirect('/');

  const clinicId = (session.user as any).clinicId as string | undefined;
  const where: any = { isActive: true };
  if (clinicId) where.clinicId = clinicId;
  if (searchParams.unitId) where.unitId = searchParams.unitId;

  const units = await prisma.unit.findMany({
    where: clinicId ? { clinicId } : {},
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  const items = await prisma.inventoryItem.findMany({
    where,
    include: { unit: { select: { id: true, name: true } } },
    orderBy: [{ unit: { name: 'asc' } }, { name: 'asc' }],
  });

  const alerts = items.filter((i) => Number(i.currentQuantity) <= Number(i.minimumQuantity));

  const grouped = alerts.reduce<Record<string, { unitName: string; items: typeof alerts }>>((acc, it) => {
    const key = it.unitId;
    if (!acc[key]) acc[key] = { unitName: it.unit?.name ?? 'Sem unidade', items: [] };
    acc[key].items.push(it);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-fg-muted">Estoque</p>
          <h1 className="mt-1 text-3xl font-semibold text-fg">Alertas de estoque mínimo</h1>
          <p className="mt-2 max-w-2xl text-sm text-fg-muted">
            Itens abaixo do mínimo configurado por unidade. Dispare notificação para o responsável de compras.
          </p>
        </div>
        <form className="flex items-center gap-2" action="/estoque/alertas">
          <select
            name="unitId"
            defaultValue={searchParams.unitId ?? ''}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg"
          >
            <option value="">Todas as unidades</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          <Button type="submit" variant="secondary" size="sm">Filtrar</Button>
        </form>
      </header>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardBody>
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-brand" />
              <div>
                <p className="text-xs text-fg-muted">Itens em alerta</p>
                <p className="text-2xl font-semibold text-fg">{alerts.length}</p>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-brand" />
              <div>
                <p className="text-xs text-fg-muted">Unidades afetadas</p>
                <p className="text-2xl font-semibold text-fg">{Object.keys(grouped).length}</p>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-brand" />
              <div>
                <p className="text-xs text-fg-muted">Ação</p>
                <p className="text-sm text-fg">Notificar responsável</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {alerts.length === 0 ? (
        <Card>
          <CardBody>
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Package className="h-8 w-8 text-fg-muted" />
              <p className="text-sm text-fg-muted">Nenhum item abaixo do mínimo. Estoque saudável.</p>
              <Link href="/estoque">
                <Button variant="secondary" size="sm">Ver estoque completo</Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([unitId, group]) => (
            <Card key={unitId}>
              <CardBody>
                <div className="mb-4 flex items-center justify-between">
                  <CardTitle>{group.unitName}</CardTitle>
                  <NotifyButton unitId={unitId} count={group.items.length} />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-fg-muted">
                        <th className="py-2 pr-4">SKU</th>
                        <th className="py-2 pr-4">Item</th>
                        <th className="py-2 pr-4">Atual</th>
                        <th className="py-2 pr-4">Mínimo</th>
                        <th className="py-2 pr-4">Déficit</th>
                        <th className="py-2 pr-4">Fornecedor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((it) => {
                        const deficit = Number(it.minimumQuantity) - Number(it.currentQuantity);
                        return (
                          <tr key={it.id} className="border-b border-border/60">
                            <td className="py-2 pr-4 font-mono text-xs text-fg-muted">{it.sku}</td>
                            <td className="py-2 pr-4 text-fg">{it.name}</td>
                            <td className="py-2 pr-4 text-fg">{Number(it.currentQuantity).toFixed(2)} {it.unitOfMeasure}</td>
                            <td className="py-2 pr-4 text-fg-muted">{Number(it.minimumQuantity).toFixed(2)}</td>
                            <td className="py-2 pr-4">
                              <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs text-brand">
                                {deficit.toFixed(2)}
                              </span>
                            </td>
                            <td className="py-2 pr-4 text-fg-muted">{it.supplierName ?? '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

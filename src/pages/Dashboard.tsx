import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, DollarSign, ShoppingBag, Factory, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '@/lib/format';
import type { DashboardStats, Producto, Insumo, Venta } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/authStore';

export default function Dashboard() {
  const { user } = useAuthStore();
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats', user?.role],
    queryFn: async (): Promise<DashboardStats> => {
      const [productosRes, insumosRes] = await Promise.all([
        api.get<{ data: Producto[] }>('/production/products'),
        api.get<{ data: Insumo[] }>('/inventory'),
      ]);

      const productos = productosRes.data.data;
      const insumos = insumosRes.data.data;

      const productosDisponibles = productos.filter((producto) => producto.stockDisponible > 0).length;
      const insumosStockBajo = insumos.filter((insumo) => insumo.stock < 10).length;

      let ventasHoy = 0;
      if (user && (user.role === 'ADMIN' || user.role === 'CAJERO')) {
        try {
          const start = new Date();
          start.setHours(0, 0, 0, 0);
          const end = new Date();
          end.setHours(23, 59, 59, 999);

          const { data } = await api.get<{ data: Venta[] }>('/sales', {
            params: {
              from: start.toISOString(),
              to: end.toISOString(),
            },
          });

          ventasHoy = data.data.reduce((total, venta) => total + venta.totalNIO, 0);
        } catch (error) {
          console.warn('No se pudo obtener ventas del día', error);
        }
      }

      return {
        ventasHoy,
        insumosStockBajo,
        productosDisponibles,
      };
    },
  });

  const cards = [
    {
      title: 'Ventas Hoy',
      value: stats?.ventasHoy ? formatCurrency(stats.ventasHoy) : 'C$0.00',
      icon: DollarSign,
      description: 'Total de ventas del día',
      accent: 'from-indigo-500/15 via-indigo-500/5 to-transparent',
    },
    {
      title: 'Stock Bajo',
      value: stats?.insumosStockBajo || 0,
      icon: AlertCircle,
      description: 'Insumos con stock bajo',
      accent: 'from-amber-500/15 via-amber-500/5 to-transparent',
    },
    {
      title: 'Productos Disponibles',
      value: stats?.productosDisponibles || 0,
      icon: ShoppingBag,
      description: 'Productos en stock',
      accent: 'from-emerald-500/15 via-emerald-500/5 to-transparent',
    },
  ];

  const quickLinks = [
    {
      title: 'Punto de Venta',
      subtitle: 'Registrar nuevas ventas',
      icon: ShoppingBag,
      href: '/pos',
    },
    {
      title: 'Inventario',
      subtitle: 'Control de insumos y compras',
      icon: Package,
      href: '/inventory',
    },
    {
      title: 'Producción',
      subtitle: 'Recetas y lotes',
      icon: Factory,
      href: '/production',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Panel principal</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="text-base text-muted-foreground">Visualiza el pulso general del ERP.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.title} className="relative overflow-hidden border-none bg-white/90 p-0 shadow-sm ring-1 ring-slate-100">
            <div className={`absolute inset-0 bg-gradient-to-br ${card.accent}`} />
            <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <div className="rounded-full bg-white/70 p-2 text-primary shadow-inner">
                <card.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-3xl font-bold text-slate-900">{card.value}</div>
                  <p className="text-xs text-muted-foreground">{card.description}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-none bg-slate-900 text-white shadow-lg">
        <CardHeader className="flex flex-col gap-2 pb-4">
          <p className="text-xs uppercase tracking-[0.3em] text-white/70">Acceso rápido</p>
          <CardTitle className="text-2xl font-semibold">Operaciones clave</CardTitle>
          <p className="text-sm text-white/70">Atajos hacia las tareas que realizas todos los días.</p>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {quickLinks.map((link) => (
            <Link
              key={link.title}
              to={link.href}
              className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-white/30 hover:bg-white/10"
            >
              <div>
                <p className="text-sm font-semibold text-white">{link.title}</p>
                <p className="text-xs text-white/70">{link.subtitle}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white">
                <link.icon className="h-5 w-5" />
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

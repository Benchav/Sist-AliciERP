import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, TrendingUp, ShoppingBag, Factory, Package, ArrowRight, Clock, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '@/lib/format';
import type { DashboardStats, Producto, Insumo, Venta } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/authStore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Dashboard() {
  const { user } = useAuthStore();
  
  // Fetch stats and recent sales
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard-data', user?.role],
    queryFn: async () => {
      const [productosRes, insumosRes] = await Promise.all([
        api.get<{ data: Producto[] }>('/production/products'),
        api.get<{ data: Insumo[] }>('/inventory'),
      ]);

      const productos = productosRes.data.data;
      const insumos = insumosRes.data.data;

      const productosDisponibles = productos.filter((producto) => producto.stockDisponible > 0).length;
      const insumosStockBajo = insumos.filter((insumo) => insumo.stock < 10).length;

      let ventasHoy = 0;
      let recentSales: Venta[] = [];

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
          // Get last 5 sales
          recentSales = data.data.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).slice(0, 5);
        } catch (error) {
          console.warn('No se pudo obtener ventas del día', error);
        }
      }

      return {
        stats: {
          ventasHoy,
          insumosStockBajo,
          productosDisponibles,
        },
        recentSales
      };
    },
  });

  const stats = dashboardData?.stats;
  const recentSales = dashboardData?.recentSales || [];

  const cards = [
    {
      title: 'Ventas Hoy',
      value: stats?.ventasHoy ? formatCurrency(stats.ventasHoy) : 'C$0.00',
      icon: TrendingUp,
      description: 'Ingresos acumulados',
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      border: 'border-indigo-100'
    },
    {
      title: 'Stock Crítico',
      value: stats?.insumosStockBajo || 0,
      icon: AlertTriangle,
      description: 'Insumos por agotarse',
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-100'
    },
    {
      title: 'Productos Activos',
      value: stats?.productosDisponibles || 0,
      icon: ShoppingBag,
      description: 'Listos para venta',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100'
    },
  ];

  const quickLinks = [
    {
      title: 'Nueva Venta',
      subtitle: 'Ir al POS',
      icon: ShoppingBag,
      href: '/pos',
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    {
      title: 'Inventario',
      subtitle: 'Gestionar stock',
      icon: Package,
      href: '/inventory',
      color: 'text-violet-600',
      bg: 'bg-violet-50'
    },
    {
      title: 'Producción',
      subtitle: 'Ver recetas',
      icon: Factory,
      href: '/production',
      color: 'text-orange-600',
      bg: 'bg-orange-50'
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Hola, {user?.username || 'Usuario'}
        </h1>
        <p className="text-slate-500">
          Aquí tienes el resumen de operaciones de hoy, {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.title} className="group overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className={`rounded-xl p-3 ${card.bg} ${card.color}`}>
                  <card.icon className="h-6 w-6" />
                </div>
                {isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${card.bg} ${card.color}`}>
                    Hoy
                  </span>
                )}
              </div>
              <div className="mt-4 space-y-1">
                <p className="text-sm font-medium text-slate-500">{card.title}</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-32" />
                ) : (
                  <h3 className="text-3xl font-bold tracking-tight text-slate-900">
                    {card.value}
                  </h3>
                )}
                <p className="text-xs text-slate-400">{card.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Recent Transactions Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Últimas Ventas</h2>
            <Link to="/sales" className="group flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700">
              Ver todo
              <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          
          <Card className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="border-b border-slate-100 px-6 py-4 font-medium">Hora</th>
                    <th className="border-b border-slate-100 px-6 py-4 font-medium">Total</th>
                    <th className="border-b border-slate-100 px-6 py-4 font-medium">Items</th>
                    <th className="border-b border-slate-100 px-6 py-4 font-medium text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    [...Array(3)].map((_, i) => (
                      <tr key={i}>
                        <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-4 w-12" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-4 w-16 ml-auto" /></td>
                      </tr>
                    ))
                  ) : recentSales.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                        No hay ventas registradas hoy
                      </td>
                    </tr>
                  ) : (
                    recentSales.map((venta) => (
                      <tr key={venta.id} className="group transition-colors hover:bg-slate-50/80">
                        <td className="px-6 py-4 text-slate-600">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            {format(new Date(venta.fecha), 'HH:mm')}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          {formatCurrency(venta.totalNIO)}
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {venta.items.length} productos
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            venta.estado === 'COMPLETA' 
                              ? 'bg-emerald-50 text-emerald-700' 
                              : 'bg-red-50 text-red-700'
                          }`}>
                            {venta.estado}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Accesos Directos</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {quickLinks.map((link) => (
              <Link
                key={link.title}
                to={link.href}
                className="group relative flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-500/5"
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${link.bg} ${link.color} transition-transform group-hover:scale-110`}>
                  <link.icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {link.title}
                  </h3>
                  <p className="text-sm text-slate-500">{link.subtitle}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-indigo-400" />
              </Link>
            ))}
          </div>
          
          {/* Mini Promo / Status Card */}
          <div className="mt-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white shadow-lg">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold">Objetivo Mensual</h3>
            <p className="mt-1 text-sm text-slate-300">
              Mantén el ritmo de ventas para superar el mes anterior.
            </p>
            <div className="mt-4 h-1.5 w-full rounded-full bg-white/10">
              <div className="h-1.5 w-3/4 rounded-full bg-indigo-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

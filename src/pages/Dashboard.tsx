import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, TrendingUp, ShoppingBag, Factory, Package, ArrowRight, Clock, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '@/lib/format';
import type { Producto, Insumo, Venta, Receta } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/authStore';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { fetchInsumos } from '@/lib/inventoryApi';
import { AxiosError } from 'axios';

export default function Dashboard() {
  const { user } = useAuthStore();
  
  // Fetch stats and recent sales
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard-data', user?.role],
    queryFn: async () => {
      const safeFetchRecetas = async (): Promise<Receta[]> => {
        try {
          const { data } = await api.get<{ data: Receta[] }>('/production/recipes');
          return data.data;
        } catch (error) {
          if (error instanceof AxiosError && error.response?.status === 404) {
            console.info('Endpoint /production/recipes no disponible, continuando sin recetas.');
            return [];
          }
          console.warn('No se pudieron obtener recetas', error);
          return [];
        }
      };

      const [productosRes, insumosData, recetas] = await Promise.all([
        api.get<{ data: Producto[] }>('/production/products'),
        fetchInsumos(),
        safeFetchRecetas(),
      ]);

      const productos = productosRes.data.data;
      const insumos = insumosData;

      const productosDisponibles = productos.filter((producto) => producto.stockDisponible > 0).length;
      const insumosStockBajo = insumos.filter((insumo) => insumo.stock < 10).length;

      // Helper to calculate cost of a product based on its recipe
      const calculateProductCost = (productoId: string) => {
        const producto = productos.find((p) => p.id === productoId);
        if (producto) {
          if (typeof producto.precioUnitario === 'number') {
            return producto.precioUnitario;
          }
          if (typeof producto.costoUnitario === 'number') {
            return producto.costoUnitario;
          }
        }

        const receta = recetas.find((r) => r.productoId === productoId);
        if (!receta) return 0;

        const insumosCost = receta.items.reduce((total, item) => {
          const insumo = insumos.find((i) => i.id === item.insumoId);
          return total + (item.cantidad * (insumo?.costoPromedio || 0));
        }, 0);

        return (receta.costoManoObra || 0) + insumosCost;
      };

      let ventasHoy = 0;
      let ventasMes = 0;
      let ventasMesAnterior = 0;
      let gastosMes = 0;
      let recentSales: Venta[] = [];

      if (user && (user.role === 'ADMIN' || user.role === 'CAJERO')) {
        try {
          const now = new Date();
          const startDay = new Date(now); startDay.setHours(0, 0, 0, 0);
          const endDay = new Date(now); endDay.setHours(23, 59, 59, 999);

          const startMonth = startOfMonth(now);
          const endMonth = endOfMonth(now);
          
          const startPrevMonth = startOfMonth(subMonths(now, 1));
          const endPrevMonth = endOfMonth(subMonths(now, 1));

          const [dayRes, monthRes, prevMonthRes] = await Promise.all([
            api.get<{ data: Venta[] }>('/sales', {
                params: { from: startDay.toISOString(), to: endDay.toISOString() }
            }),
            api.get<{ data: Venta[] }>('/sales', {
                params: { from: startMonth.toISOString(), to: endMonth.toISOString() }
            }),
            api.get<{ data: Venta[] }>('/sales', {
                params: { from: startPrevMonth.toISOString(), to: endPrevMonth.toISOString() }
            })
          ]);

          const ventasDiaData = dayRes.data.data;
          ventasHoy = ventasDiaData.reduce((total, venta) => total + (venta.estado === 'COMPLETA' ? venta.totalNIO : 0), 0);
          recentSales = ventasDiaData.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).slice(0, 5);

          const ventasMesData = monthRes.data.data.filter(v => v.estado === 'COMPLETA');
          ventasMes = ventasMesData.reduce((total, venta) => total + venta.totalNIO, 0);
          
          ventasMesAnterior = prevMonthRes.data.data.reduce((total, venta) => total + (venta.estado === 'COMPLETA' ? venta.totalNIO : 0), 0);

          // Calculate expenses based on COGS (Cost of Goods Sold)
          gastosMes = ventasMesData.reduce((totalGastos, venta) => {
            const costoVenta = venta.items.reduce((totalVenta, item) => {
              return totalVenta + (calculateProductCost(item.productoId) * item.cantidad);
            }, 0);
            return totalGastos + costoVenta;
          }, 0);

        } catch (error) {
          console.warn('No se pudo obtener ventas', error);
        }
      }

      return {
        stats: {
          ventasHoy,
          ventasMes,
          ventasMesAnterior,
          gastosMes,
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
      gradient: 'from-indigo-500 to-violet-500',
      shadow: 'shadow-indigo-500/25',
    },
    {
      title: 'Stock Crítico',
      value: stats?.insumosStockBajo || 0,
      icon: AlertTriangle,
      description: 'Insumos por agotarse',
      gradient: 'from-amber-500 to-orange-500',
      shadow: 'shadow-amber-500/25',
    },
    {
      title: 'Productos Activos',
      value: stats?.productosDisponibles || 0,
      icon: ShoppingBag,
      description: 'Listos para venta',
      gradient: 'from-emerald-500 to-teal-500',
      shadow: 'shadow-emerald-500/25',
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
    <div className="space-y-6 pb-8 md:space-y-8">
      {/* Header Section */}
      <div className="flex flex-col gap-2 md:gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Hola, <span className="text-indigo-600">{user?.username || 'Usuario'}</span>
        </h1>
        <p className="text-sm text-slate-500 md:text-base">
          Resumen de operaciones del {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.title} className="relative overflow-hidden border-none shadow-md transition-all hover:shadow-lg">
            <div className={`absolute right-0 top-0 h-24 w-24 translate-x-8 translate-y--8 rounded-full bg-gradient-to-br ${card.gradient} opacity-10 blur-2xl`} />
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className={`rounded-xl bg-gradient-to-br ${card.gradient} p-3 shadow-lg ${card.shadow}`}>
                  <card.icon className="h-6 w-6 text-white" />
                </div>
                {isLoading ? (
                  <Skeleton className="h-6 w-16" />
                ) : (
                  <span className="flex items-center text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                    Hoy
                  </span>
                )}
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-slate-500">{card.title}</p>
                {isLoading ? (
                  <Skeleton className="mt-2 h-8 w-32" />
                ) : (
                  <h3 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                    {card.value}
                  </h3>
                )}
                <p className="mt-1 text-xs text-slate-400">{card.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
        {/* Recent Transactions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-semibold text-slate-900">Últimas Ventas</h2>
            <Link to="/sales" className="group flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700">
              Ver todo
              <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          
          {/* Desktop Table */}
          <Card className="hidden overflow-hidden border-slate-200 bg-white shadow-sm md:block">
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
                            {format(new Date(venta.fecha), 'h:mm a')}
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

          {/* Mobile List View */}
          <div className="space-y-3 md:hidden">
            {isLoading ? (
              [...Array(3)].map((_, i) => (
                <Card key={i} className="p-4">
                  <div className="flex justify-between mb-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                  <Skeleton className="h-6 w-24 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </Card>
              ))
            ) : recentSales.length === 0 ? (
              <Card className="p-8 text-center text-slate-500">
                No hay ventas registradas hoy
              </Card>
            ) : (
              recentSales.map((venta) => (
                <Card key={venta.id} className="overflow-hidden border-slate-200 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-slate-500 text-sm">
                        <Clock className="h-3.5 w-3.5" />
                        {format(new Date(venta.fecha), 'h:mm a')}
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            venta.estado === 'COMPLETA' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                              : 'bg-red-50 text-red-700 border border-red-100'
                          }`}>
                        {venta.estado}
                      </span>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-xs text-slate-400 mb-1">{venta.items.length} productos</p>
                        <p className="font-bold text-lg text-slate-900">{formatCurrency(venta.totalNIO)}</p>
                      </div>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full" asChild>
                         <Link to={`/sales`}>
                           <ChevronRight className="h-4 w-4 text-slate-400" />
                         </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 px-1">Accesos Directos</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {quickLinks.map((link) => (
              <Link
                key={link.title}
                to={link.href}
                className="group relative flex flex-col lg:flex-row items-center lg:items-start gap-3 lg:gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-500/5 text-center lg:text-left"
              >
                <div className={`flex h-10 w-10 lg:h-12 lg:w-12 items-center justify-center rounded-xl ${link.bg} ${link.color} transition-transform group-hover:scale-110`}>
                  <link.icon className="h-5 w-5 lg:h-6 lg:w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm lg:text-base text-slate-900 group-hover:text-indigo-600 transition-colors truncate w-full">
                    {link.title}
                  </h3>
                  <p className="text-xs text-slate-500 hidden lg:block">{link.subtitle}</p>
                </div>
              </Link>
            ))}
          </div>
          
          {/* Financial Summary */}
          <div className="mt-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 px-1">Resumen Financiero</h2>
            
            {/* Ingresos Card */}
            <div className="relative overflow-hidden rounded-2xl bg-slate-900 p-6 text-white shadow-lg transition-transform hover:scale-[1.02]">
              <div className="absolute right-0 top-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-24 w-24 rounded-full bg-indigo-500/20 blur-2xl" />
              
              <div className="relative">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm">
                  <TrendingUp className="h-5 w-5 text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-100">Ingresos</h3>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white">{stats?.ventasMes ? formatCurrency(stats.ventasMes) : 'C$0.00'}</span>
                </div>
                <p className="mt-1 text-sm text-slate-400 capitalize">
                  Acumulado en {format(new Date(), 'MMMM', { locale: es })}
                </p>
                
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Vs. Mes Anterior</span>
                    <span className={stats?.ventasMes && stats?.ventasMesAnterior && stats.ventasMes >= stats.ventasMesAnterior ? 'text-emerald-400' : 'text-slate-400'}>
                      {stats?.ventasMesAnterior ? Math.round((stats.ventasMes / stats.ventasMesAnterior) * 100) : 0}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-white/10">
                    <div 
                      className="h-1.5 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-all duration-1000" 
                      style={{ width: `${Math.min(((stats?.ventasMes || 0) / (stats?.ventasMesAnterior || 1)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>



            {/* Gastos Card */}
            <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 shadow-sm transition-transform hover:scale-[1.02]">
              <div className="relative">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
                  <TrendingUp className="h-5 w-5 text-red-500 rotate-180" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Gastos</h3>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900">{stats?.gastosMes ? formatCurrency(stats.gastosMes) : 'C$0.00'}</span>
                </div>
                <p className="mt-1 text-sm text-slate-500 capitalize">
                  Acumulado en {format(new Date(), 'MMMM', { locale: es })}
                </p>
                
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>% de Ingresos</span>
                    <span>
                      {stats?.ventasMes && stats?.ventasMes > 0 
                        ? Math.round(((stats.gastosMes || 0) / stats.ventasMes) * 100) 
                        : 0}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100">
                    <div 
                      className="h-1.5 rounded-full bg-red-500 transition-all duration-1000" 
                      style={{ width: `${stats?.ventasMes && stats?.ventasMes > 0 ? Math.min(((stats.gastosMes || 0) / stats.ventasMes) * 100, 100) : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

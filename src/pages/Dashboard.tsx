import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, DollarSign, Package, ShoppingBag } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import type { DashboardStats } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data } = await api.get<DashboardStats>('/dashboard/stats');
      return data;
    },
  });

  const cards = [
    {
      title: 'Ventas Hoy',
      value: stats?.ventasHoy ? formatCurrency(stats.ventasHoy) : 'C$0.00',
      icon: DollarSign,
      description: 'Total de ventas del día',
      color: 'text-primary',
    },
    {
      title: 'Stock Bajo',
      value: stats?.insumosStockBajo || 0,
      icon: AlertCircle,
      description: 'Insumos con stock bajo',
      color: 'text-warning',
    },
    {
      title: 'Productos Disponibles',
      value: stats?.productosDisponibles || 0,
      icon: ShoppingBag,
      description: 'Productos en stock',
      color: 'text-success',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Resumen general del sistema</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{card.value}</div>
                  <p className="text-xs text-muted-foreground">{card.description}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Acceso Rápido</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 text-sm">
            <p className="text-muted-foreground">
              Use el menú lateral para acceder a las diferentes secciones del sistema.
            </p>
            <ul className="ml-4 list-disc space-y-1 text-muted-foreground">
              <li>Punto de Venta para procesar ventas</li>
              <li>Inventario para gestionar insumos</li>
              <li>Producción para registrar producción de productos</li>
              <li>Ventas para ver historial y reportes</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

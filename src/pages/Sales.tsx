import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, FileDown, FileText, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Venta } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { hasRole } from '@/lib/auth';

export default function Sales() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();

  const { data: sales, isLoading } = useQuery({
    queryKey: ['sales', dateFrom, dateTo],
    queryFn: async () => {
      let url = '/sales';
      const params = new URLSearchParams();
      if (dateFrom) params.append('from', format(dateFrom, 'yyyy-MM-dd'));
      if (dateTo) params.append('to', format(dateTo, 'yyyy-MM-dd'));
      if (params.toString()) url += `?${params.toString()}`;

      const { data } = await api.get<Venta[]>(url);
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/sales/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast.success('Venta anulada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al anular venta');
    },
  });

  const handleViewPDF = async (id: string) => {
    try {
      const response = await api.get(`/sales/${id}/pdf`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `factura-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error: any) {
      toast.error('Error al descargar factura');
    }
  };

  const handleExportExcel = async () => {
    try {
      let url = '/sales/report/excel';
      const params = new URLSearchParams();
      if (dateFrom) params.append('from', format(dateFrom, 'yyyy-MM-dd'));
      if (dateTo) params.append('to', format(dateTo, 'yyyy-MM-dd'));
      if (params.toString()) url += `?${params.toString()}`;

      const response = await api.get(url, {
        responseType: 'blob',
      });
      const downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', 'reporte-ventas.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Reporte exportado exitosamente');
    } catch (error: any) {
      toast.error('Error al exportar reporte');
    }
  };

  const isAdmin = user && hasRole(user, ['ADMIN']);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ventas</h1>
          <p className="text-muted-foreground">Historial y reportes de ventas</p>
        </div>
        {isAdmin && (
          <Button onClick={handleExportExcel}>
            <FileDown className="mr-2 h-4 w-4" />
            Exportar Excel
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'justify-start text-left font-normal',
                  !dateFrom && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFrom ? format(dateFrom, 'PPP') : <span>Desde</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateFrom}
                onSelect={setDateFrom}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'justify-start text-left font-normal',
                  !dateTo && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateTo ? format(dateTo, 'PPP') : <span>Hasta</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateTo}
                onSelect={setDateTo}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Ventas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : sales?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    No hay ventas registradas
                  </TableCell>
                </TableRow>
              ) : (
                sales?.map((venta) => (
                  <TableRow key={venta.id}>
                    <TableCell>{format(new Date(venta.fecha), 'dd/MM/yyyy HH:mm')}</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(venta.total)}
                    </TableCell>
                    <TableCell>{venta.items.length} items</TableCell>
                    <TableCell>
                      <Badge
                        variant={venta.estado === 'ACTIVA' ? 'default' : 'destructive'}
                      >
                        {venta.estado}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewPDF(venta.id)}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        {isAdmin && venta.estado === 'ACTIVA' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteMutation.mutate(venta.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

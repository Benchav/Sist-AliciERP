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
import { CalendarIcon, FileDown, FileText, Loader2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Venta } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { hasRole } from '@/lib/auth';
import { getApiErrorMessage } from '@/lib/errors';
import { PageHeading } from '@/components/PageHeading';

export default function Sales() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();

  const { data: sales, isLoading } = useQuery({
    queryKey: ['sales', dateFrom, dateTo],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (dateFrom) params.from = dateFrom.toISOString();
      if (dateTo) params.to = dateTo.toISOString();

      const { data } = await api.get<{ data: Venta[] }>('/sales', {
        params: Object.keys(params).length ? params : undefined,
      });
      return data.data;
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
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Error al anular venta'));
    },
  });

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const pdfMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.get<Blob>(`/sales/${id}/pdf`, {
        responseType: 'blob' as const,
      });
      return data;
    },
    onSuccess: (blob, id) => {
      triggerDownload(blob, `factura-${id}.pdf`);
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Error al descargar factura'));
    },
  });

  const exportExcelMutation = useMutation({
    mutationFn: async ({ from, to }: { from?: string; to?: string }) => {
      const { data } = await api.get<Blob>('/sales/report/excel', {
        responseType: 'blob' as const,
        params: {
          ...(from ? { from } : {}),
          ...(to ? { to } : {}),
        },
      });
      return data;
    },
    onSuccess: (blob) => {
      triggerDownload(blob, 'reporte-ventas.xlsx');
      toast.success('Reporte exportado exitosamente');
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Error al exportar reporte'));
    },
  });

  const handleExportExcel = () => {
    exportExcelMutation.mutate({
      from: dateFrom ? dateFrom.toISOString() : undefined,
      to: dateTo ? dateTo.toISOString() : undefined,
    });
  };

  const isAdmin = hasRole(user, ['ADMIN']);

  return (
    <div className="space-y-6">
      <PageHeading
        title="Ventas"
        description="Consulta históricos, descargas y anulaciones en segundos."
        actions={
          isAdmin ? (
            <Button
              onClick={handleExportExcel}
              disabled={exportExcelMutation.isPending}
              className="w-full sm:w-auto"
            >
              {exportExcelMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <FileDown className="mr-2 h-4 w-4" />
                  Exportar Excel
                </>
              )}
            </Button>
          ) : null
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="lg"
                className={cn(
                  'w-full justify-between text-left font-normal sm:w-auto',
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
                size="lg"
                className={cn(
                  'w-full justify-between text-left font-normal sm:w-auto',
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
          <div className="hidden md:block">
            <div className="overflow-x-auto rounded-lg border bg-card">
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
                        {formatCurrency(venta.totalNIO)}
                      </TableCell>
                      <TableCell>{venta.items.length} items</TableCell>
                      <TableCell>
                        <Badge variant={venta.estado === 'ANULADA' ? 'destructive' : 'default'}>
                          {venta.estado}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => pdfMutation.mutate(venta.id)}
                            disabled={pdfMutation.isPending && pdfMutation.variables === venta.id}
                          >
                            {pdfMutation.isPending && pdfMutation.variables === venta.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <FileText className="h-4 w-4" />
                            )}
                          </Button>
                          {isAdmin && venta.estado !== 'ANULADA' && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteMutation.mutate(venta.id)}
                              disabled={deleteMutation.isPending && deleteMutation.variables === venta.id}
                            >
                              {deleteMutation.isPending && deleteMutation.variables === venta.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>
          </div>

          <div className="space-y-3 md:hidden">
            {isLoading ? (
              <p className="text-center text-sm text-muted-foreground">Cargando...</p>
            ) : sales?.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">No hay ventas registradas</p>
            ) : (
              sales?.map((venta) => (
                <div key={venta.id} className="space-y-2 rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold">
                        {format(new Date(venta.fecha), 'dd/MM/yyyy HH:mm')}
                      </p>
                      <p className="text-xs text-muted-foreground">{venta.items.length} items</p>
                    </div>
                    <Badge variant={venta.estado === 'ANULADA' ? 'destructive' : 'default'}>
                      {venta.estado}
                    </Badge>
                  </div>
                  <p className="text-lg font-bold text-primary">{formatCurrency(venta.totalNIO)}</p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => pdfMutation.mutate(venta.id)}
                      disabled={pdfMutation.isPending && pdfMutation.variables === venta.id}
                      className="flex-1 sm:flex-none"
                    >
                      {pdfMutation.isPending && pdfMutation.variables === venta.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <FileText className="mr-2 h-4 w-4" /> Ver factura
                        </>
                      )}
                    </Button>
                    {isAdmin && venta.estado !== 'ANULADA' && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteMutation.mutate(venta.id)}
                        disabled={deleteMutation.isPending && deleteMutation.variables === venta.id}
                        className="flex-1 sm:flex-none"
                      >
                        {deleteMutation.isPending && deleteMutation.variables === venta.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Trash2 className="mr-2 h-4 w-4" /> Anular
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

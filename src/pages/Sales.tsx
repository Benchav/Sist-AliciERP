import { useMemo, useState } from 'react';
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
import { endOfDay, endOfMonth, format, isSameDay, isWithinInterval, startOfDay, startOfMonth, subDays, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Venta } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { hasRole } from '@/lib/auth';
import { getApiErrorMessage } from '@/lib/errors';
import { PageHeading } from '@/components/PageHeading';
import type { DateRange } from 'react-day-picker';

export default function Sales() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const fromISO = dateRange?.from ? startOfDay(dateRange.from).toISOString() : undefined;
  const toISO = dateRange?.from
    ? endOfDay((dateRange.to ?? dateRange.from)).toISOString()
    : undefined;

  const { data: sales, isLoading } = useQuery({
    queryKey: ['sales', fromISO, toISO],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (fromISO) params.from = fromISO;
      if (toISO) params.to = toISO;

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
      from: fromISO,
      to: toISO,
    });
  };

  const isAdmin = hasRole(user, ['ADMIN']);
  const quickPresets = useMemo(
    () => [
      {
        label: 'Hoy',
        getRange: (): DateRange => {
          const today = new Date();
          return { from: startOfDay(today), to: endOfDay(today) };
        },
      },
      {
        label: 'Ayer',
        getRange: (): DateRange => {
          const yesterday = subDays(new Date(), 1);
          return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
        },
      },
      {
        label: 'Últimos 7 días',
        getRange: (): DateRange => {
          const today = new Date();
          return { from: startOfDay(subDays(today, 7)), to: endOfDay(today) };
        },
      },
      {
        label: 'Este Mes',
        getRange: (): DateRange => {
          const today = new Date();
          return { from: startOfMonth(today), to: endOfMonth(today) };
        },
      },
      {
        label: 'Mes Pasado',
        getRange: (): DateRange => {
          const previousMonth = subMonths(new Date(), 1);
          return { from: startOfMonth(previousMonth), to: endOfMonth(previousMonth) };
        },
      },
    ],
    [],
  );

  const handlePresetClick = (getRange: () => DateRange) => {
    setDateRange(getRange());
  };

  const rangeLabel = useMemo(() => {
    if (!dateRange?.from) return 'Seleccionar fechas';
    const sameDaySelection = !dateRange.to || isSameDay(dateRange.from, dateRange.to);
    const hasDifferentYears = dateRange.to
      ? dateRange.from.getFullYear() !== dateRange.to.getFullYear()
      : false;
    const baseFormat = hasDifferentYears ? 'dd MMM y' : 'dd MMM';

    if (sameDaySelection) {
      return format(dateRange.from, baseFormat, { locale: es });
    }

    const fromLabel = format(dateRange.from, baseFormat, { locale: es });
    const toLabel = format(dateRange.to as Date, baseFormat, { locale: es });
    return `${fromLabel} - ${toLabel}`;
  }, [dateRange]);

  const filteredSales = useMemo(() => {
    if (!sales) return [];
    if (!dateRange?.from) return sales;

    const rangeStart = startOfDay(dateRange.from);
    const rangeEnd = endOfDay(dateRange.to ?? dateRange.from);

    return sales.filter((venta) =>
      isWithinInterval(new Date(venta.fecha), { start: rangeStart, end: rangeEnd }),
    );
  }, [sales, dateRange]);

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
                  !dateRange?.from && 'text-muted-foreground',
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {rangeLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={1}
                  initialFocus
                  defaultMonth={dateRange?.from ?? new Date()}
                  className="pointer-events-auto"
                />
                <div className="min-w-[180px] border-t p-4 sm:border-l sm:border-t-0">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Preajustes rápidos
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-1">
                    {quickPresets.map((preset) => (
                      <Button
                        key={preset.label}
                        variant="ghost"
                        size="sm"
                        className="justify-start"
                        onClick={() => handlePresetClick(preset.getRange)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
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
                ) : filteredSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      No hay ventas registradas
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSales.map((venta) => (
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
            ) : filteredSales.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">No hay ventas registradas</p>
            ) : (
              filteredSales.map((venta) => (
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

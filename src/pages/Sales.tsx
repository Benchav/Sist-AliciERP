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
import { CalendarIcon, FileDown, FileText, Loader2, Trash2, Filter } from 'lucide-react';
import { endOfDay, endOfMonth, format, isSameDay, isWithinInterval, startOfDay, startOfMonth, subDays, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Categoria, Producto, Venta } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { hasRole } from '@/lib/auth';
import { getApiErrorMessage } from '@/lib/errors';
import { PageHeading } from '@/components/PageHeading';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { DateRange } from 'react-day-picker';
import { salesService } from '@/services/sales.service';
import { productService } from '@/services/product.service';
import { categoryService } from '@/services/category.service';
import { INVENTORY_CATEGORIES_QUERY_KEY, PRODUCTION_PRODUCTS_QUERY_KEY } from '@/lib/queryKeys';

export default function Sales() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const fromISO = dateRange?.from ? startOfDay(dateRange.from).toISOString() : undefined;
  const toISO = dateRange?.from
    ? endOfDay((dateRange.to ?? dateRange.from)).toISOString()
    : undefined;

  const { data: categories } = useQuery({
    queryKey: INVENTORY_CATEGORIES_QUERY_KEY,
    queryFn: categoryService.getCategories,
  });

  const { data: products } = useQuery({
    queryKey: PRODUCTION_PRODUCTS_QUERY_KEY,
    queryFn: productService.getProducts,
  });

  const { data: sales, isLoading } = useQuery({
    queryKey: ['sales', fromISO, toISO],
    queryFn: () => salesService.getSales({ from: fromISO, to: toISO }),
  });

  const categoriesMap = useMemo(() => {
    if (!categories) return new Map<string, Categoria>();
    return new Map(categories.map((category) => [category.id, category]));
  }, [categories]);

  const productMap = useMemo(() => {
    if (!products) return new Map<string, Producto>();
    return new Map(products.map((product) => [product.id, product]));
  }, [products]);

  const resolveItemCategory = (productoId?: string): Categoria | undefined => {
    if (!productoId) return undefined;
    const producto = productMap.get(productoId);
    if (!producto?.categoriaId) return undefined;
    return categoriesMap.get(producto.categoriaId);
  };

  const formatOriginLabel = (categoria?: Categoria | null): string => {
    if (!categoria) return 'Sin origen asignado';
    return categoria.tipo === 'PRODUCCION' ? 'Producción' : 'Reventa';
  };

  const getOriginBadgeClasses = (categoria?: Categoria | null): string => {
    if (!categoria) return 'bg-slate-50 text-slate-600 border-slate-200';
    return categoria.tipo === 'PRODUCCION'
      ? 'bg-amber-50 text-amber-700 border-amber-100'
      : 'bg-emerald-50 text-emerald-700 border-emerald-100';
  };

  const buildSaleOriginSummary = (venta: Venta) => {
    return venta.items.reduce<Record<string, number>>((acc, item) => {
      const categoria = resolveItemCategory(item.productoId);
      const key = categoria?.tipo ?? 'SIN_ORIGEN';
      acc[key] = (acc[key] ?? 0) + item.cantidad;
      return acc;
    }, {});
  };

  const resolveOriginLabelByKey = (key: string) => {
    if (key === 'PRODUCCION') return 'Producción';
    if (key === 'REVENTA') return 'Reventa';
    return 'Sin origen';
  };

  const resolveOriginBadgeClassesByKey = (key: string) => {
    if (key === 'PRODUCCION') return 'bg-amber-50 text-amber-700 border-amber-100';
    if (key === 'REVENTA') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    return 'bg-slate-50 text-slate-600 border-slate-200';
  };

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
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200"
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

      <Alert className="border-indigo-200 bg-indigo-50/80 text-slate-800">
        <AlertTitle>Origen de productos en ventas</AlertTitle>
        <AlertDescription>
          El POS y los reportes identifican automáticamente si cada línea proviene de producción o reventa según la categoría asignada.
        </AlertDescription>
      </Alert>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-white px-6 py-4">
          <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Filter className="h-5 w-5 text-indigo-600" />
            Filtros de Búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="lg"
                  className={cn(
                    'w-full justify-between text-left font-normal sm:w-auto border-slate-200 hover:bg-slate-50 hover:text-slate-900',
                    !dateRange?.from && 'text-slate-500',
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
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
                  <div className="min-w-[180px] border-t p-4 sm:border-l sm:border-t-0 bg-slate-50/50">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Preajustes rápidos
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-1">
                      {quickPresets.map((preset) => (
                        <Button
                          key={preset.label}
                          variant="ghost"
                          size="sm"
                          className="justify-start text-slate-600 hover:text-indigo-600 hover:bg-indigo-50"
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
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm overflow-hidden rounded-xl">
        <CardHeader className="border-b border-slate-100 bg-white px-6 py-4">
          <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-600" />
            Historial de Ventas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="hidden md:block">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent border-b border-slate-100">
                    <TableHead className="h-10 text-xs font-medium uppercase tracking-wider text-slate-500 pl-6">Fecha</TableHead>
                    <TableHead className="h-10 text-xs font-medium uppercase tracking-wider text-slate-500">Total</TableHead>
                    <TableHead className="h-10 text-xs font-medium uppercase tracking-wider text-slate-500">Items</TableHead>
                    <TableHead className="h-10 text-xs font-medium uppercase tracking-wider text-slate-500">Estado</TableHead>
                    <TableHead className="h-10 text-xs font-medium uppercase tracking-wider text-slate-500 text-right pr-6">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                        Cargando ventas...
                      </TableCell>
                    </TableRow>
                  ) : filteredSales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                        No hay ventas registradas
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSales.map((venta) => (
                      <TableRow key={venta.id} className="hover:bg-slate-50/50 border-b border-slate-50 transition-colors">
                        <TableCell className="text-slate-700 pl-6">{format(new Date(venta.fecha), 'dd/MM/yyyy h:mm a')}</TableCell>
                        <TableCell className="font-medium text-slate-900">
                          {formatCurrency(venta.totalNIO)}
                        </TableCell>
                        <TableCell className="text-slate-500">
                          {venta.items.length} items
                          {(() => {
                            const summary = buildSaleOriginSummary(venta);
                            const entries = Object.entries(summary);
                            if (!entries.length) return null;
                            return (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {entries.map(([key, cantidad]) => (
                                  <Badge
                                    key={`${venta.id}-${key}`}
                                    variant="outline"
                                    className={resolveOriginBadgeClassesByKey(key)}
                                  >
                                    {resolveOriginLabelByKey(key)}: {cantidad}
                                  </Badge>
                                ))}
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={venta.estado === 'ANULADA' ? "bg-red-50 text-red-700 border-red-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"}>
                            {venta.estado}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => pdfMutation.mutate(venta.id)}
                              disabled={pdfMutation.isPending && pdfMutation.variables === venta.id}
                              className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
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
                                variant="ghost"
                                onClick={() => deleteMutation.mutate(venta.id)}
                                disabled={deleteMutation.isPending && deleteMutation.variables === venta.id}
                                className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
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

          <div className="space-y-3 p-4 md:hidden">
            {isLoading ? (
              <p className="text-center text-sm text-slate-500">Cargando...</p>
            ) : filteredSales.length === 0 ? (
              <p className="text-center text-sm text-slate-500">No hay ventas registradas</p>
            ) : (
              filteredSales.map((venta) => (
                <Card key={venta.id} className="overflow-hidden border border-slate-200 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="text-base font-semibold text-slate-900">
                          {format(new Date(venta.fecha), 'dd/MM/yyyy h:mm a')}
                        </p>
                        <p className="text-xs text-slate-500">
                          {venta.items.length} items
                        </p>
                        {(() => {
                          const summary = buildSaleOriginSummary(venta);
                          const entries = Object.entries(summary);
                          if (!entries.length) return null;
                          return (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {entries.map(([key, cantidad]) => (
                                <Badge
                                  key={`${venta.id}-${key}-mobile`}
                                  variant="outline"
                                  className={`${resolveOriginBadgeClassesByKey(key)} text-[11px]`}
                                >
                                  {resolveOriginLabelByKey(key)}: {cantidad}
                                </Badge>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                      <Badge variant="outline" className={venta.estado === 'ANULADA' ? "bg-red-50 text-red-700 border-red-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"}>
                        {venta.estado}
                      </Badge>
                    </div>
                    <p className="text-lg font-bold text-slate-900 mb-3">{formatCurrency(venta.totalNIO)}</p>
                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => pdfMutation.mutate(venta.id)}
                        disabled={pdfMutation.isPending && pdfMutation.variables === venta.id}
                        className="flex-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
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
                          variant="outline"
                          onClick={() => deleteMutation.mutate(venta.id)}
                          disabled={deleteMutation.isPending && deleteMutation.variables === venta.id}
                          className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
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
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

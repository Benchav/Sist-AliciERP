import { useEffect, useMemo, useState } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, PenSquare, Trash2, Factory, Layers, AlertTriangle, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/format';
import { TooltipProvider } from '@/components/ui/tooltip';
import { castAxiosError, getApiErrorMessage, type ApiErrorPayload } from '@/lib/errors';
import type {
  DailyProductionRequest,
  DailyProductionResponse,
  Insumo,
  Producto,
  ProductionRecord,
} from '@/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PageHeading } from '@/components/PageHeading';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { INVENTORY_CATEGORIES_QUERY_KEY, PRODUCTION_HISTORY_QUERY_KEY, PRODUCTION_PRODUCTS_QUERY_KEY } from '@/lib/queryKeys';
import { fetchInsumos } from '@/lib/inventoryApi';
import {
  DEFAULT_PRODUCT_CATEGORY,
  getAvailableProductCategories,
  getProductCategory,
} from '@/lib/productCategories';
import { productionService } from '@/services/production.service';
import { categoryService } from '@/services/category.service';
import { cn } from '@/lib/utils';

export default function Production() {
  const queryClient = useQueryClient();
  const [productionDialog, setProductionDialog] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null);
  const [productForm, setProductForm] = useState({
    nombre: '',
    precioVenta: '',
    stockDisponible: '',
  });
  const [productDeleteDialogOpen, setProductDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Producto | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('TODAS');
  type DailyProductionInsumoForm = { insumoId: string; cantidad: string };
  type DailyProductionLotForm = {
    productoId: string;
    cantidadProducida: string;
    costoManoObra: string;
    insumos: DailyProductionInsumoForm[];
  };

  const createEmptyInsumo = (): DailyProductionInsumoForm => ({ insumoId: '', cantidad: '' });
  const createEmptyDailyLot = (): DailyProductionLotForm => ({
    productoId: '',
    cantidadProducida: '',
    costoManoObra: '',
    insumos: [createEmptyInsumo()],
  });

  const [dailyLots, setDailyLots] = useState<DailyProductionLotForm[]>([createEmptyDailyLot()]);
  const [dailyFormErrors, setDailyFormErrors] = useState<string[]>([]);
  const [lastDailySummary, setLastDailySummary] = useState<DailyProductionResponse | null>(null);
  const [recentlyUpdatedProducts, setRecentlyUpdatedProducts] = useState<Set<string>>(new Set());

  const {
    data: productos,
    isLoading: isLoadingProductos,
    isError: isProductosError,
    refetch: refetchProductos,
  } = useQuery({
    queryKey: PRODUCTION_PRODUCTS_QUERY_KEY,
    queryFn: async () => {
      const { data } = await api.get<{ data: Producto[] }>('/production/products');
      return data.data;
    },
  });

  const { data: categorias } = useQuery({
    queryKey: INVENTORY_CATEGORIES_QUERY_KEY,
    queryFn: categoryService.getCategories,
  });

  const { data: insumos } = useQuery({
    queryKey: ['insumos'],
    queryFn: fetchInsumos,
  });

  const {
    data: productionHistory,
    isLoading: isHistoryLoading,
    isError: isHistoryError,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: PRODUCTION_HISTORY_QUERY_KEY,
    queryFn: productionService.fetchProductionHistory,
  });

  const insumoMap = useMemo(() => {
    if (!insumos) return new Map<string, Insumo>();
    return new Map(insumos.map((insumo) => [insumo.id, insumo]));
  }, [insumos]);

  const productMap = useMemo(() => {
    if (!productos) return new Map<string, Producto>();
    return new Map(productos.map((producto) => [producto.id, producto]));
  }, [productos]);

  const productCategoryMap = useMemo(() => {
    if (!productos) return new Map<string, string>();
    return new Map(productos.map((producto) => [producto.id, getProductCategory(producto)]));
  }, [productos]);

  const reventaCategoryIds = useMemo(() => {
    if (!categorias) return new Set<string>();
    return new Set(categorias.filter((categoria) => categoria.tipo === 'REVENTA').map((categoria) => categoria.id));
  }, [categorias]);

  const categoryFilters = useMemo(() => {
    const categories = getAvailableProductCategories(productos ?? []);
    return categories.length ? ['TODAS', ...categories] : ['TODAS'];
  }, [productos]);

  useEffect(() => {
    if (categoryFilter !== 'TODAS' && !categoryFilters.includes(categoryFilter)) {
      setCategoryFilter('TODAS');
    }
  }, [categoryFilter, categoryFilters]);

  const getCategoryForProductId = (productoId: string) =>
    productCategoryMap.get(productoId) ?? DEFAULT_PRODUCT_CATEGORY;

  const filteredProductos = useMemo(() => {
    if (!productos) return [];
    return productos.filter((producto) => {
      if (producto.categoriaId && reventaCategoryIds.has(producto.categoriaId)) {
        return false;
      }
      if (categoryFilter === 'TODAS') return true;
      return getCategoryForProductId(producto.id) === categoryFilter;
    });
  }, [productos, categoryFilter, productCategoryMap, reventaCategoryIds]);

  const todayRecords = useMemo(() => {
    if (!productionHistory) return [] as ProductionRecord[];
    const todayLabel = new Date().toDateString();
    return productionHistory.filter((record) => {
      try {
        return new Date(record.fecha).toDateString() === todayLabel;
      } catch {
        return false;
      }
    });
  }, [productionHistory]);

  const historyEntries = todayRecords.length > 0 ? todayRecords : productionHistory ?? [];
  const visibleHistoryEntries = historyEntries.slice(0, 15);
  const hasTodayRecords = todayRecords.length > 0;

  const formatQuantity = (value: number): string => {
    return new Intl.NumberFormat('es-NI', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatDateTime = (value: string): string => {
    try {
      return new Intl.DateTimeFormat('es-NI', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value));
    } catch {
      return value;
    }
  };

  const productionMutation = useMutation({
    mutationFn: productionService.submitDailyProduction,
    onSuccess: (response: DailyProductionResponse) => {
      queryClient.invalidateQueries({ queryKey: PRODUCTION_PRODUCTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['insumos'] });
      queryClient.invalidateQueries({ queryKey: PRODUCTION_HISTORY_QUERY_KEY });
      toast.success(
        response.lotes.length > 1
          ? `Se registraron ${response.lotes.length} lotes exitosamente`
          : 'Producción registrada exitosamente',
      );
      setLastDailySummary(response);
      const updatedIds = new Set(response.lotes.map((lot) => lot.productoId));
      setRecentlyUpdatedProducts(updatedIds);
      window.setTimeout(() => {
        setRecentlyUpdatedProducts(new Set());
      }, 8000);
      resetDailyFormState();
      setProductionDialog(false);
    },
    onError: (error: unknown) => {
      const axiosError = castAxiosError<ApiErrorPayload & { errors?: string[]; details?: string[] }>(error);
      if (axiosError?.response?.status === 400) {
        const backendErrors =
          (Array.isArray(axiosError.response.data?.errors)
            ? axiosError.response.data?.errors
            : null) ||
          (Array.isArray(axiosError.response.data?.details)
            ? axiosError.response.data?.details
            : null);
        if (backendErrors && backendErrors.length > 0) {
          setDailyFormErrors(backendErrors.map((msg) => String(msg)));
        } else if (axiosError.response.data?.message) {
          setDailyFormErrors([String(axiosError.response.data.message)]);
        }
      }
      toast.error(getApiErrorMessage(error, 'Error al registrar producción'));
    },
  });

  const resetProductForm = () => {
    setProductForm({ nombre: '', precioVenta: '', stockDisponible: '' });
    setEditingProduct(null);
  };

  const openProductDialog = (producto?: Producto) => {
    if (producto) {
      setEditingProduct(producto);
      setProductForm({
        nombre: producto.nombre,
        precioVenta: producto.precioVenta.toString(),
        stockDisponible: producto.stockDisponible.toString(),
      });
    } else {
      resetProductForm();
    }
    setProductDialogOpen(true);
  };

  const resetDailyFormState = () => {
    setDailyLots([createEmptyDailyLot()]);
    setDailyFormErrors([]);
  };

  const addDailyLot = () => {
    setDailyLots((prev) => [...prev, createEmptyDailyLot()]);
  };

  const removeDailyLot = (lotIndex: number) => {
    setDailyLots((prev) => {
      if (prev.length === 1) {
        return prev;
      }
      return prev.filter((_, idx) => idx !== lotIndex);
    });
  };

  const updateDailyLotField = (
    lotIndex: number,
    field: keyof Omit<DailyProductionLotForm, 'insumos'>,
    value: string,
  ) => {
    setDailyLots((prev) => {
      const next = [...prev];
      next[lotIndex] = {
        ...next[lotIndex],
        [field]: value,
      };
      return next;
    });
  };

  const addDailyInsumo = (lotIndex: number) => {
    setDailyLots((prev) => {
      const next = [...prev];
      next[lotIndex] = {
        ...next[lotIndex],
        insumos: [...next[lotIndex].insumos, createEmptyInsumo()],
      };
      return next;
    });
  };

  const updateDailyInsumo = (
    lotIndex: number,
    insumoIndex: number,
    field: keyof DailyProductionInsumoForm,
    value: string,
  ) => {
    setDailyLots((prev) => {
      const next = [...prev];
      const insumos = [...next[lotIndex].insumos];
      insumos[insumoIndex] = {
        ...insumos[insumoIndex],
        [field]: value,
      };
      next[lotIndex] = {
        ...next[lotIndex],
        insumos,
      };
      return next;
    });
  };

  const removeDailyInsumo = (lotIndex: number, insumoIndex: number) => {
    setDailyLots((prev) => {
      const next = [...prev];
      const insumos = next[lotIndex].insumos;
      if (insumos.length === 1) {
        return prev;
      }
      next[lotIndex] = {
        ...next[lotIndex],
        insumos: insumos.filter((_, idx) => idx !== insumoIndex),
      };
      return next;
    });
  };

  const buildDailyProductionPayload = (): DailyProductionRequest | null => {
    const aggregatedErrors: string[] = [];

    const payload = dailyLots.map((lot, lotIndex) => {
      const prefix = `Lote ${lotIndex + 1}`;
      if (!lot.productoId) {
        aggregatedErrors.push(`${prefix}: seleccione un producto.`);
      }

      const cantidad = parseFloat(lot.cantidadProducida);
      if (Number.isNaN(cantidad) || cantidad <= 0) {
        aggregatedErrors.push(`${prefix}: ingrese una cantidad producida válida.`);
      }

      let costoManoObra: number | undefined;
      if (lot.costoManoObra.trim()) {
        const parsedCosto = parseFloat(lot.costoManoObra);
        if (Number.isNaN(parsedCosto) || parsedCosto < 0) {
          aggregatedErrors.push(`${prefix}: el costo de mano de obra debe ser mayor o igual a 0.`);
        } else {
          costoManoObra = parsedCosto;
        }
      }

      const insumosPayload = lot.insumos
        .map((insumo, insumoIndex) => {
          const insumoLabel = `${prefix} · Insumo ${insumoIndex + 1}`;
          if (!insumo.insumoId) {
            aggregatedErrors.push(`${insumoLabel}: seleccione un insumo.`);
            return null;
          }
          const cantidadInsumo = parseFloat(insumo.cantidad);
          if (Number.isNaN(cantidadInsumo) || cantidadInsumo <= 0) {
            aggregatedErrors.push(`${insumoLabel}: ingrese una cantidad válida.`);
            return null;
          }
          return {
            insumoId: insumo.insumoId,
            cantidad: cantidadInsumo,
          };
        })
        .filter((item): item is { insumoId: string; cantidad: number } => Boolean(item));

      if (insumosPayload.length === 0) {
        aggregatedErrors.push(`${prefix}: registre al menos un insumo válido.`);
      }

      const lotPayload: DailyProductionRequest[number] = {
        productoId: lot.productoId,
        cantidadProducida: cantidad,
        insumos: insumosPayload,
      };

      if (typeof costoManoObra === 'number') {
        lotPayload.costoManoObra = costoManoObra;
      }

      return lotPayload;
    }) as DailyProductionRequest;

    if (aggregatedErrors.length > 0) {
      setDailyFormErrors(Array.from(new Set(aggregatedErrors)));
      return null;
    }

    setDailyFormErrors([]);
    return payload;
  };

  type ProductPayload = {
    nombre: string;
    precioVenta: number;
    stockDisponible: number;
  };

  const createProductMutation = useMutation({
    mutationFn: async (payload: ProductPayload) => {
      await api.post('/production/products', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTION_PRODUCTS_QUERY_KEY });
      toast.success('Producto creado correctamente');
      setProductDialogOpen(false);
      resetProductForm();
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Error al crear producto'));
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: ProductPayload }) => {
      await api.put(`/production/products/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTION_PRODUCTS_QUERY_KEY });
      toast.success('Producto actualizado correctamente');
      setProductDialogOpen(false);
      resetProductForm();
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Error al actualizar producto'));
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/production/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTION_PRODUCTS_QUERY_KEY });
      toast.success('Producto eliminado correctamente');
      setProductDeleteDialogOpen(false);
      setProductToDelete(null);
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Error al eliminar producto'));
    },
  });

  const handleDailyProductionSubmit = () => {
    const payload = buildDailyProductionPayload();
    if (!payload || payload.length === 0) {
      toast.error('Agregue al menos un lote válido antes de enviar');
      return;
    }
    productionMutation.mutate(payload);
  };

  const handleSaveProduct = () => {
    if (!productForm.nombre.trim()) {
      toast.error('El nombre del producto es obligatorio');
      return;
    }

    const priceValue = parseFloat(productForm.precioVenta);
    const stockValue = parseFloat(productForm.stockDisponible || '0');

    if (Number.isNaN(priceValue) || priceValue < 0) {
      toast.error('Ingrese un precio de venta válido');
      return;
    }

    if (Number.isNaN(stockValue) || stockValue < 0) {
      toast.error('Ingrese un stock válido');
      return;
    }

    const payload = {
      nombre: productForm.nombre.trim(),
      precioVenta: priceValue,
      stockDisponible: stockValue,
    };

    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, payload });
    } else {
      createProductMutation.mutate(payload);
    }
  };

  const handleDeleteProduct = () => {
    if (productToDelete) {
      deleteProductMutation.mutate(productToDelete.id);
    }
  };

  const isSavingProduct = createProductMutation.isPending || updateProductMutation.isPending;
  const isDeletingProduct = deleteProductMutation.isPending;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <PageHeading
          title="Producción"
          description="Gestiona recetas, lotes y costos de manera centralizada."
          actions={
            <Button 
              onClick={() => setProductionDialog(true)} 
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200"
            >
              <Factory className="mr-2 h-4 w-4" />
              Registrar Producción
            </Button>
          }
        />

        {isLoadingProductos && !isProductosError && (
          <Card className="border-slate-200 bg-slate-50/80 shadow-sm">
            <CardContent className="flex items-center gap-3 py-4 text-sm text-slate-600">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-500" />
              Cargando catálogo de productos...
            </CardContent>
          </Card>
        )}

        {isProductosError && (
          <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>No se pudieron cargar los productos</AlertTitle>
            <AlertDescription className="flex flex-col gap-3 text-sm">
              Intenta nuevamente. Sin catálogo no es posible registrar producción.
              <Button
                size="sm"
                variant="outline"
                className="border-red-200 text-red-700 hover:bg-red-100 w-fit"
                onClick={() => refetchProductos()}
              >
                Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {lastDailySummary ? (
          <Card className="border border-emerald-200 bg-emerald-50/60 shadow-sm">
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-emerald-800">
                  Producción registrada correctamente
                </CardTitle>
                <p className="text-sm text-emerald-700">
                  Se actualizaron {lastDailySummary.lotes.length} lotes y el costo unitario de los productos afectados.
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Ocultar resumen"
                onClick={() => setLastDailySummary(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-emerald-800">Total lotes</p>
                  <p className="text-2xl font-bold text-emerald-900">{lastDailySummary.resumen?.totalLotes ?? lastDailySummary.lotes.length}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-emerald-800">Unidades</p>
                  <p className="text-2xl font-bold text-emerald-900">
                    {lastDailySummary.resumen?.unidadesTotales ??
                      lastDailySummary.lotes.reduce((acc, lot) => acc + (lot.cantidadProducida ?? 0), 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-emerald-800">Costo total</p>
                  <p className="text-2xl font-bold text-emerald-900">
                    {formatCurrency(
                      lastDailySummary.resumen?.costoTotal ??
                        lastDailySummary.lotes.reduce((acc, lot) => acc + (lot.costoTotal ?? 0), 0),
                    )}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-emerald-200 bg-white">
                <Table>
                  <TableHeader className="bg-emerald-50">
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Costo unitario</TableHead>
                      <TableHead>Stock actualizado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lastDailySummary.lotes.map((lot, index) => {
                      const product = productMap.get(lot.productoId);
                      return (
                        <TableRow key={`summary-lot-${index}`}>
                          <TableCell className="font-medium text-slate-900">{product?.nombre ?? lot.productoId}</TableCell>
                          <TableCell>{lot.loteId ?? '—'}</TableCell>
                          <TableCell>{lot.cantidadProducida ?? '—'}</TableCell>
                          <TableCell>
                            {typeof lot.costoUnitario === 'number' ? formatCurrency(lot.costoUnitario) : '—'}
                          </TableCell>
                          <TableCell>{lot.stockActualizado ?? '—'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {categoryFilters.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {categoryFilters.map((category) => (
              <Button
                key={category}
                variant={categoryFilter === category ? 'default' : 'outline'}
                size="sm"
                className={categoryFilter === category ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'border-slate-200 text-slate-600'}
                onClick={() => setCategoryFilter(category)}
              >
                {category === 'TODAS' ? 'Todas las categorías' : category}
              </Button>
            ))}
          </div>
        )}

        <Card className="border-slate-200 shadow-sm overflow-hidden rounded-xl">
          <CardHeader className="border-b border-slate-100 bg-white px-6 py-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-slate-900">Registro de producción del día</CardTitle>
              <p className="text-sm text-slate-500">
                {hasTodayRecords
                  ? 'Mostrando la producción capturada hoy.'
                  : 'No hubo producción hoy, presentamos los últimos registros disponibles.'}
              </p>
            </div>
            <Button
              onClick={() => refetchHistory()}
              variant="outline"
              className="border-slate-200 hover:bg-slate-50 text-slate-700"
              disabled={isHistoryLoading}
            >
              {isHistoryLoading ? 'Actualizando...' : 'Actualizar'}
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {isHistoryLoading ? (
              <div className="p-6 space-y-3">
                {[0, 1, 2].map((skeleton) => (
                  <div key={`history-skeleton-${skeleton}`} className="h-16 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : isHistoryError ? (
              <div className="p-6">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>No se pudo cargar el historial</AlertTitle>
                  <AlertDescription className="flex flex-col gap-3 text-sm">
                    <span>Hubo un problema consultando la API. Intenta nuevamente.</span>
                    <Button size="sm" variant="outline" className="w-fit" onClick={() => refetchHistory()}>
                      Reintentar
                    </Button>
                  </AlertDescription>
                </Alert>
              </div>
            ) : visibleHistoryEntries.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">Aún no registras producción.</div>
            ) : (
              <Accordion type="single" collapsible className="divide-y divide-slate-100">
                {visibleHistoryEntries.map((record) => {
                  const productName = productMap.get(record.productoId)?.nombre ?? 'Producto sin nombre';
                  const unidades = formatQuantity(record.volumenSolicitado ?? 0);
                  const costoIngredientes = record.costoIngredientes ?? 0;
                  const costoManoObra = record.costoManoObra ?? 0;
                  const costoTotal = record.costoTotal ?? costoIngredientes + costoManoObra;
                  return (
                    <AccordionItem key={record.id} value={record.id} className="px-4">
                      <AccordionTrigger className="py-4 hover:no-underline">
                        <div className="flex w-full flex-col gap-2 text-left sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-base font-semibold text-slate-900">{productName}</p>
                            <p className="text-sm text-slate-500">{formatDateTime(record.fecha)}</p>
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                            <span>
                              Unidades: <span className="font-semibold text-slate-900">{unidades}</span>
                            </span>
                            <span>
                              Costo total: <span className="font-semibold text-slate-900">{formatCurrency(costoTotal)}</span>
                            </span>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 border-t border-slate-100 px-2 pt-4 pb-4 sm:px-4">
                          <div className="grid gap-3 sm:grid-cols-3">
                            <div>
                              <p className="text-xs uppercase tracking-wide text-slate-500">Costo ingredientes</p>
                              <p className="text-lg font-semibold text-slate-900">{formatCurrency(costoIngredientes)}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wide text-slate-500">Mano de obra</p>
                              <p className="text-lg font-semibold text-slate-900">{formatCurrency(costoManoObra)}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wide text-slate-500">Costo unitario</p>
                              <p className="text-lg font-semibold text-slate-900">
                                {typeof record.costoUnitario === 'number' ? formatCurrency(record.costoUnitario) : '—'}
                              </p>
                            </div>
                          </div>
                          {record.insumosConsumidos && record.insumosConsumidos.length > 0 ? (
                            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                              <Table>
                                <TableHeader className="bg-slate-50/60">
                                  <TableRow>
                                    <TableHead>Insumo</TableHead>
                                    <TableHead>Consumido</TableHead>
                                    <TableHead>Costo unitario</TableHead>
                                    <TableHead>Costo total</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {record.insumosConsumidos.map((insumo) => {
                                    const meta = insumoMap.get(insumo.insumoId);
                                    return (
                                      <TableRow key={`${record.id}-${insumo.insumoId}`}>
                                        <TableCell className="font-medium text-slate-900">{meta?.nombre ?? insumo.insumoId}</TableCell>
                                        <TableCell>{formatQuantity(insumo.cantidad)}</TableCell>
                                        <TableCell>{formatCurrency(insumo.costoUnitario)}</TableCell>
                                        <TableCell>{formatCurrency(insumo.costoTotal)}</TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500">No se reportaron insumos detallados para este lote.</p>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm overflow-hidden rounded-xl">
          <CardHeader className="border-b border-slate-100 bg-white px-6 py-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-lg font-semibold text-slate-900">Catálogo de Productos</CardTitle>
            <Button onClick={() => openProductDialog()} variant="outline" className="border-slate-200 hover:bg-slate-50 text-slate-700">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo producto
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="hidden md:block">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="hover:bg-transparent border-b border-slate-100">
                      <TableHead className="h-10 text-xs font-medium uppercase tracking-wider text-slate-500">Nombre</TableHead>
                      <TableHead className="h-10 text-xs font-medium uppercase tracking-wider text-slate-500">Categoría</TableHead>
                      <TableHead className="h-10 text-xs font-medium uppercase tracking-wider text-slate-500">Precio Venta</TableHead>
                      <TableHead className="h-10 text-xs font-medium uppercase tracking-wider text-slate-500">Costo Unitario</TableHead>
                      <TableHead className="h-10 text-xs font-medium uppercase tracking-wider text-slate-500">Stock Actual</TableHead>
                      <TableHead className="h-10 text-xs font-medium uppercase tracking-wider text-slate-500 text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProductos.map((producto) => {
                      const categoryLabel = getCategoryForProductId(producto.id);
                      const highlightRow = recentlyUpdatedProducts.has(producto.id);
                      return (
                        <TableRow
                          key={producto.id}
                          className={cn(
                            'border-b border-slate-50 transition-colors',
                            highlightRow ? 'bg-indigo-50/70 hover:bg-indigo-50' : 'hover:bg-slate-50/50',
                          )}
                        >
                          <TableCell className="font-medium text-slate-900">{producto.nombre}</TableCell>
                          <TableCell className="text-slate-500">{categoryLabel}</TableCell>
                          <TableCell className="font-medium text-slate-900">{formatCurrency(producto.precioVenta)}</TableCell>
                          <TableCell>
                            {typeof producto.costoUnitario === 'number' ? (
                              <Badge
                                variant="outline"
                                className={cn(
                                  'font-semibold',
                                  highlightRow
                                    ? 'border-indigo-200 bg-white text-indigo-700'
                                    : 'border-slate-200 text-slate-700',
                                )}
                              >
                                {formatCurrency(producto.costoUnitario)}
                              </Badge>
                            ) : (
                              <span className="text-slate-400 text-xs">Sin dato</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={producto.stockDisponible > 0 ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-700 border-red-100"}>
                              {producto.stockDisponible}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openProductDialog(producto)}
                                className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                              >
                                <PenSquare className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                onClick={() => {
                                  setProductToDelete(producto);
                                  setProductDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="space-y-3 p-4 md:hidden">
              {filteredProductos.length ? (
                filteredProductos.map((producto) => {
                  const categoryLabel = getCategoryForProductId(producto.id);
                  const highlightRow = recentlyUpdatedProducts.has(producto.id);
                  return (
                    <Card
                      key={producto.id}
                      className={cn(
                        'overflow-hidden border shadow-sm',
                        highlightRow ? 'border-indigo-200 bg-indigo-50/80' : 'border-slate-200',
                      )}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <p className="text-base font-semibold text-slate-900">{producto.nombre}</p>
                            <p className="text-xs text-slate-500">{categoryLabel}</p>
                          </div>
                          <p className="text-sm font-bold text-indigo-600">{formatCurrency(producto.precioVenta)}</p>
                        </div>
                        <p className="text-xs text-slate-500">
                          Costo unitario:{' '}
                          {typeof producto.costoUnitario === 'number'
                            ? formatCurrency(producto.costoUnitario)
                            : 'Sin dato'}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <Badge variant="outline" className={producto.stockDisponible > 0 ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-700 border-red-100"}>
                            Stock: {producto.stockDisponible}
                          </Badge>
                        </div>
                        <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
                          <Button size="sm" variant="outline" onClick={() => openProductDialog(producto)}>
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                            onClick={() => {
                              setProductToDelete(producto);
                              setProductDeleteDialogOpen(true);
                            }}
                          >
                            Eliminar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <p className="text-center text-sm text-slate-500">Sin productos registrados</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Dialog
          open={productDialogOpen}
          onOpenChange={(open) => {
            setProductDialogOpen(open);
            if (!open) {
              resetProductForm();
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingProduct ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
              <DialogDescription>
                Defina la información básica del producto.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="producto-nombre">Nombre</Label>
                <Input
                  id="producto-nombre"
                  value={productForm.nombre}
                  onChange={(e) => setProductForm((prev) => ({ ...prev, nombre: e.target.value }))}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="producto-precio">Precio de venta (C$)</Label>
                  <Input
                    id="producto-precio"
                    type="number"
                    step="0.01"
                    min="0"
                    value={productForm.precioVenta}
                    onChange={(e) => setProductForm((prev) => ({ ...prev, precioVenta: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="producto-stock">Stock disponible</Label>
                  <Input
                    id="producto-stock"
                    type="number"
                    step="1"
                    min="0"
                    value={productForm.stockDisponible}
                    onChange={(e) =>
                      setProductForm((prev) => ({ ...prev, stockDisponible: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setProductDialogOpen(false)} disabled={isSavingProduct}>
                Cancelar
              </Button>
              <Button onClick={handleSaveProduct} disabled={isSavingProduct}>
                {isSavingProduct ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={productDeleteDialogOpen}
          onOpenChange={(open) => {
            setProductDeleteDialogOpen(open);
            if (!open) {
              setProductToDelete(null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar producto</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará "{productToDelete?.nombre}" y no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeletingProduct}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteProduct} disabled={isDeletingProduct}>
                {isDeletingProduct ? 'Eliminando...' : 'Eliminar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog
          open={productionDialog}
          onOpenChange={(open) => {
            setProductionDialog(open);
            if (!open) {
              resetDailyFormState();
            }
          }}
        >
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Registrar producción diaria</DialogTitle>
              <DialogDescription>
                Detalla múltiples lotes (panadería o reventa) e indica los insumos realmente consumidos.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-1">
              {dailyFormErrors.length > 0 ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Revisa los datos ingresados</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc pl-4 space-y-1 text-xs">
                      {dailyFormErrors.map((error, idx) => (
                        <li key={`daily-error-${idx}`}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              ) : null}

              {dailyLots.map((lot, lotIndex) => (
                <div
                  key={`daily-lot-${lotIndex}`}
                  className="rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
                    <div>
                      <p className="text-base font-semibold text-slate-900">Lote {lotIndex + 1}</p>
                      <p className="text-xs text-slate-500">
                        Selecciona el producto, la cantidad producida y los insumos consumidos.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-slate-50 text-slate-500">
                        {lot.insumos.length} insumos
                      </Badge>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="text-slate-400 hover:text-red-600"
                        onClick={() => removeDailyLot(lotIndex)}
                        disabled={dailyLots.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-4 px-4 py-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Producto</Label>
                        <Select
                          value={lot.productoId}
                          onValueChange={(value) => updateDailyLotField(lotIndex, 'productoId', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione un producto" />
                          </SelectTrigger>
                          <SelectContent>
                            {productos?.map((producto) => (
                              <SelectItem key={producto.id} value={producto.id}>
                                {producto.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Cantidad producida</Label>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="0"
                          value={lot.cantidadProducida}
                          onChange={(e) => updateDailyLotField(lotIndex, 'cantidadProducida', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Costo de mano de obra (opcional)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0"
                          value={lot.costoManoObra}
                          onChange={(e) => updateDailyLotField(lotIndex, 'costoManoObra', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-slate-900">Insumos utilizados</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addDailyInsumo(lotIndex)}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Agregar insumo
                        </Button>
                      </div>
                      <div className="overflow-x-auto rounded-lg border border-slate-100">
                        <Table>
                          <TableHeader className="bg-slate-50/60">
                            <TableRow>
                              <TableHead>Insumo</TableHead>
                              <TableHead>Cantidad</TableHead>
                              <TableHead className="w-20 text-right">Acción</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {lot.insumos.map((insumo, insumoIndex) => {
                              const meta = insumoMap.get(insumo.insumoId);
                              return (
                                <TableRow key={`lot-${lotIndex}-insumo-${insumoIndex}`}>
                                  <TableCell className="align-top">
                                    <Select
                                      value={insumo.insumoId}
                                      onValueChange={(value) =>
                                        updateDailyInsumo(lotIndex, insumoIndex, 'insumoId', value)
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Seleccione" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {insumos?.map((insumoOption) => (
                                          <SelectItem key={insumoOption.id} value={insumoOption.id}>
                                            {insumoOption.nombre}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    {meta ? (
                                      <p className="mt-1 text-xs text-slate-500">
                                        Unidad base: {meta.unidad} · Stock: {formatQuantity(meta.stock)}
                                      </p>
                                    ) : null}
                                  </TableCell>
                                  <TableCell className="align-top">
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={insumo.cantidad}
                                      onChange={(e) =>
                                        updateDailyInsumo(lotIndex, insumoIndex, 'cantidad', e.target.value)
                                      }
                                    />
                                  </TableCell>
                                  <TableCell className="align-top text-right">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeDailyInsumo(lotIndex, insumoIndex)}
                                      disabled={lot.insumos.length === 1}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="secondary"
                className="w-full border-2 border-dashed border-slate-300"
                onClick={addDailyLot}
              >
                <Layers className="mr-2 h-4 w-4" /> Agregar otro lote
              </Button>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setProductionDialog(false)}
                disabled={productionMutation.isPending}
              >
                Cancelar
              </Button>
              <Button onClick={handleDailyProductionSubmit} disabled={productionMutation.isPending}>
                {productionMutation.isPending ? 'Registrando...' : 'Registrar lotes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

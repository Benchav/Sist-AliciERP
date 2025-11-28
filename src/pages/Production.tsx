import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, PenSquare, Trash2, Factory } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/format';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getApiErrorMessage } from '@/lib/errors';
import type { Producto, Receta, ProductionRequest, Insumo } from '@/types';
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

export default function Production() {
  const queryClient = useQueryClient();
  const [productionDialog, setProductionDialog] = useState(false);
  const [selectedRecetaId, setSelectedRecetaId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null);
  const [productForm, setProductForm] = useState({
    nombre: '',
    precioVenta: '',
    stockDisponible: '',
  });
  const [productDeleteDialogOpen, setProductDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Producto | null>(null);
  const [recipeDialogOpen, setRecipeDialogOpen] = useState(false);
  const [editingReceta, setEditingReceta] = useState<Receta | null>(null);
  const [recipeForm, setRecipeForm] = useState({
    productoId: '',
    costoManoObra: '',
    items: [{ insumoId: '', cantidad: '' }],
  });
  const createEmptyConverterState = () => ({ unit: '', value: '' });
  const [converterState, setConverterState] = useState<Array<{ unit: string; value: string }>>([
    createEmptyConverterState(),
  ]);
  const [recipeDeleteDialogOpen, setRecipeDeleteDialogOpen] = useState(false);
  const [recipeToDelete, setRecipeToDelete] = useState<Receta | null>(null);

  const { data: productos } = useQuery({
    queryKey: ['productos'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Producto[] }>('/production/products');
      return data.data;
    },
  });

  const { data: recetas } = useQuery({
    queryKey: ['recetas'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Receta[] }>('/production/recipes');
      return data.data;
    },
  });

  const { data: insumos } = useQuery({
    queryKey: ['insumos'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Insumo[] }>('/inventory');
      return data.data;
    },
  });

  const insumoMap = useMemo(() => {
    if (!insumos) return new Map<string, Insumo>();
    return new Map(insumos.map((insumo) => [insumo.id, insumo]));
  }, [insumos]);

  const productMap = useMemo(() => {
    if (!productos) return new Map<string, Producto>();
    return new Map(productos.map((producto) => [producto.id, producto]));
  }, [productos]);

  const getRecetaLabel = (receta: Receta): string => {
    const productName = productMap.get(receta.productoId)?.nombre ?? receta.producto?.nombre;
    return productName ?? 'Receta sin nombre';
  };

  const formatQuantity = (value: number): string => {
    return new Intl.NumberFormat('es-NI', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const UNIT_TIPS: Record<string, string> = {
    kg: '1 kg equivale a 1000 g. Use valores decimales para gramos (0.25 kg = 250 g).',
    g: '1000 g equivalen a 1 kg. Ingrese gramos directamente.',
    lb: '1 lb ≈ 0.45 kg (454 g). Utilice decimales para fracciones.',
    lt: '1 lt equivale a 1000 ml. 0.5 lt = 500 ml.',
    l: '1 L equivale a 1000 ml. 0.5 L = 500 ml.',
    ml: '1000 ml equivalen a 1 lt. Ingrese mililitros directamente.',
  };

  const UNIT_CONVERSIONS: Record<
    string,
    Array<{ unit: string; label: string; multiplier: number }>
  > = {
    kg: [
      { unit: 'g', label: 'Gramos (g)', multiplier: 0.001 },
      { unit: 'lb', label: 'Libras (lb)', multiplier: 0.453592 },
      { unit: 'oz', label: 'Onzas (oz)', multiplier: 0.0283495 },
    ],
    g: [
      { unit: 'kg', label: 'Kilogramos (kg)', multiplier: 1000 },
      { unit: 'lb', label: 'Libras (lb)', multiplier: 453.592 },
      { unit: 'oz', label: 'Onzas (oz)', multiplier: 28.3495 },
    ],
    lb: [
      { unit: 'kg', label: 'Kilogramos (kg)', multiplier: 2.20462 },
      { unit: 'g', label: 'Gramos (g)', multiplier: 0.00220462 },
      { unit: 'oz', label: 'Onzas (oz)', multiplier: 0.0625 },
    ],
    oz: [
      { unit: 'kg', label: 'Kilogramos (kg)', multiplier: 35.274 },
      { unit: 'g', label: 'Gramos (g)', multiplier: 0.035274 },
      { unit: 'lb', label: 'Libras (lb)', multiplier: 16 },
    ],
    lt: [
      { unit: 'ml', label: 'Mililitros (ml)', multiplier: 0.001 },
      { unit: 'l', label: 'Litros (L)', multiplier: 1 },
      { unit: 'oz', label: 'Onzas líquidas (oz fl)', multiplier: 0.0295735 },
    ],
    l: [
      { unit: 'ml', label: 'Mililitros (ml)', multiplier: 0.001 },
      { unit: 'lt', label: 'Litros (lt)', multiplier: 1 },
      { unit: 'oz', label: 'Onzas líquidas (oz fl)', multiplier: 0.0295735 },
    ],
    ml: [
      { unit: 'lt', label: 'Litros (lt)', multiplier: 1000 },
      { unit: 'l', label: 'Litros (L)', multiplier: 1000 },
    ],
  };

  const getUnitTip = (unidad?: string): string | undefined => {
    if (!unidad) return undefined;
    const normalized = unidad.toLowerCase();
    return UNIT_TIPS[normalized]
      ? `Unidad base: ${unidad}. ${UNIT_TIPS[normalized]}`
      : `Unidad base: ${unidad}. Ingrese la cantidad exactamente en esta unidad.`;
  };

  const getConversionOptions = (unidad?: string) => {
    if (!unidad) return [];
    return UNIT_CONVERSIONS[unidad.toLowerCase()] ?? [];
  };

  const updateConverterState = (index: number, field: 'unit' | 'value', value: string) => {
    setConverterState((prev) => {
      const next = [...prev];
      const base = next[index] ?? createEmptyConverterState();
      next[index] = { ...base, [field]: value };
      return next;
    });
  };

  const clearConverterState = (index: number) => {
    setConverterState((prev) => {
      const next = [...prev];
      next[index] = createEmptyConverterState();
      return next;
    });
  };

  const productionMutation = useMutation({
    mutationFn: async (request: ProductionRequest) => {
      await api.post('/production', request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      queryClient.invalidateQueries({ queryKey: ['insumos'] });
      toast.success('Producción registrada exitosamente');
      setProductionDialog(false);
      setSelectedRecetaId('');
      setQuantity('');
    },
    onError: (error: unknown) => {
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

  const resetRecipeForm = () => {
    setRecipeForm({ productoId: '', costoManoObra: '', items: [{ insumoId: '', cantidad: '' }] });
    setEditingReceta(null);
    setConverterState([createEmptyConverterState()]);
  };

  const openRecipeDialog = (receta?: Receta) => {
    if (receta) {
      setEditingReceta(receta);
      setRecipeForm({
        productoId: receta.productoId,
        costoManoObra: receta.costoManoObra !== undefined ? receta.costoManoObra.toString() : '',
        items: receta.items.map((item) => ({
          insumoId: item.insumoId,
          cantidad: item.cantidad.toString(),
        })),
      });
      setConverterState(receta.items.map(() => createEmptyConverterState()));
    } else {
      resetRecipeForm();
    }
    setRecipeDialogOpen(true);
  };

  const addRecipeItem = () => {
    setRecipeForm((prev) => ({
      ...prev,
      items: [...prev.items, { insumoId: '', cantidad: '' }],
    }));
    setConverterState((prev) => [...prev, createEmptyConverterState()]);
  };

  const updateRecipeItem = (index: number, field: 'insumoId' | 'cantidad', value: string) => {
    setRecipeForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
    if (field === 'insumoId') {
      clearConverterState(index);
    }
  };

  const removeRecipeItem = (index: number) => {
    setRecipeForm((prev) => {
      if (prev.items.length === 1) {
        return prev;
      }
      return {
        ...prev,
        items: prev.items.filter((_, idx) => idx !== index),
      };
    });
    setConverterState((prev) => {
      if (prev.length === 1) {
        return prev;
      }
      return prev.filter((_, idx) => idx !== index);
    });
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
      queryClient.invalidateQueries({ queryKey: ['productos'] });
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
      queryClient.invalidateQueries({ queryKey: ['productos'] });
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
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      toast.success('Producto eliminado correctamente');
      setProductDeleteDialogOpen(false);
      setProductToDelete(null);
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Error al eliminar producto'));
    },
  });

  type RecipePayload = {
    productoId: string;
    costoManoObra: number;
    items: Array<{ insumoId: string; cantidad: number }>;
  };

  const createRecipeMutation = useMutation({
    mutationFn: async (payload: RecipePayload) => {
      await api.post('/production/recipes', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recetas'] });
      toast.success('Receta creada correctamente');
      setRecipeDialogOpen(false);
      resetRecipeForm();
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Error al crear receta'));
    },
  });

  const updateRecipeMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: RecipePayload }) => {
      // API only exposes a POST-based upsert endpoint for recetas
      await api.post('/production/recipes', { ...payload, id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recetas'] });
      toast.success('Receta actualizada correctamente');
      setRecipeDialogOpen(false);
      resetRecipeForm();
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Error al actualizar receta'));
    },
  });

  const deleteRecipeMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/production/recipes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recetas'] });
      toast.success('Receta eliminada correctamente');
      setRecipeDeleteDialogOpen(false);
      setRecipeToDelete(null);
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Error al eliminar receta'));
    },
  });

  const handleProduction = () => {
    const quantityValue = parseInt(quantity, 10);

    if (!selectedRecetaId || Number.isNaN(quantityValue) || quantityValue <= 0) {
      toast.error('Complete todos los campos con valores válidos');
      return;
    }

    productionMutation.mutate({
      recetaId: selectedRecetaId,
      cantidad: quantityValue,
    });
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

  const handleSaveRecipe = () => {
    if (!recipeForm.productoId) {
      toast.error('Seleccione un producto');
      return;
    }

    const costoValue = parseFloat(recipeForm.costoManoObra || '0');
    if (Number.isNaN(costoValue) || costoValue < 0) {
      toast.error('Ingrese un costo operativo válido');
      return;
    }

    const formattedItems = recipeForm.items
      .map((item) => ({
        insumoId: item.insumoId,
        cantidad: parseFloat(item.cantidad),
      }))
      .filter((item) => item.insumoId && !Number.isNaN(item.cantidad) && item.cantidad > 0);

    if (formattedItems.length === 0) {
      toast.error('Agregue al menos un insumo válido');
      return;
    }

    const payload = {
      productoId: recipeForm.productoId,
      costoManoObra: costoValue,
      items: formattedItems,
    };

    if (editingReceta) {
      updateRecipeMutation.mutate({ id: editingReceta.id, payload });
    } else {
      createRecipeMutation.mutate(payload);
    }
  };

  const handleDeleteProduct = () => {
    if (productToDelete) {
      deleteProductMutation.mutate(productToDelete.id);
    }
  };

  const handleDeleteRecipe = () => {
    if (recipeToDelete) {
      deleteRecipeMutation.mutate(recipeToDelete.id);
    }
  };

  const isSavingProduct = createProductMutation.isPending || updateProductMutation.isPending;
  const isSavingRecipe = createRecipeMutation.isPending || updateRecipeMutation.isPending;
  const isDeletingProduct = deleteProductMutation.isPending;
  const isDeletingRecipe = deleteRecipeMutation.isPending;

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

        <Tabs defaultValue="recipes" className="space-y-6">
          <TabsList className="bg-slate-100 p-1 rounded-xl w-full sm:w-auto flex-wrap justify-start h-auto">
            <TabsTrigger 
              value="recipes" 
              className="flex-1 sm:flex-none rounded-lg data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm"
            >
              Recetas
            </TabsTrigger>
            <TabsTrigger 
              value="products" 
              className="flex-1 sm:flex-none rounded-lg data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm"
            >
              Productos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recipes" className="space-y-4">
            <Card className="border-slate-200 shadow-sm overflow-hidden rounded-xl">
              <CardHeader className="border-b border-slate-100 bg-white px-6 py-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <CardTitle className="text-lg font-semibold text-slate-900">Recetas de Productos</CardTitle>
                <Button onClick={() => openRecipeDialog()} variant="outline" className="border-slate-200 hover:bg-slate-50 text-slate-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva receta
                </Button>
              </CardHeader>
              <CardContent className="p-6">
                {recetas?.map((receta) => {
                  const product = productMap.get(receta.productoId);
                  const recipeProductName = product?.nombre ?? receta.producto?.nombre ?? 'Receta';
                  const manoObra = receta.costoManoObra || 0;

                  const costoInsumos = receta.items.reduce((total, item) => {
                    const insumo = insumoMap.get(item.insumoId);
                    return total + (item.cantidad * (insumo?.costoPromedio || 0));
                  }, 0);

                  const costoTotal = manoObra + costoInsumos;
                  const precioVenta = product?.precioVenta || 0;
                  const gananciaEstimada = precioVenta - costoTotal;
                  const margenPorcentaje = precioVenta > 0 ? (gananciaEstimada / precioVenta) * 100 : 0;

                  return (
                    <div key={receta.id} className="mb-6 rounded-xl border border-slate-200 bg-slate-50/30 p-4 last:mb-0">
                      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">{recipeProductName}</h3>
                          <div className="mt-1 space-y-1">
                            <p className="text-sm text-slate-600">
                              Costo Total: <span className="font-medium text-slate-900">{formatCurrency(costoTotal)}</span>
                              <span className="text-xs text-slate-400 ml-1">
                                ({formatCurrency(manoObra)} Costo Op. + {formatCurrency(costoInsumos)} Insumos)
                              </span>
                            </p>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-slate-500">Precio Venta: {formatCurrency(precioVenta)}</span>
                              <span className="text-slate-300">|</span>
                              <span className={`font-medium ${gananciaEstimada >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                Margen: {formatCurrency(gananciaEstimada)} ({Math.round(margenPorcentaje)}%)
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => openRecipeDialog(receta)} className="bg-white hover:bg-slate-50">
                            <PenSquare className="mr-2 h-4 w-4" />
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200 bg-white"
                            onClick={() => {
                              setRecipeToDelete(receta);
                              setRecipeDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </Button>
                        </div>
                      </div>
                      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                        <Table>
                          <TableHeader className="bg-slate-50/50">
                            <TableRow className="hover:bg-transparent border-b border-slate-100">
                              <TableHead className="h-9 text-xs font-medium uppercase tracking-wider text-slate-500">Insumo</TableHead>
                              <TableHead className="h-9 text-xs font-medium uppercase tracking-wider text-slate-500">Cantidad</TableHead>
                              <TableHead className="h-9 text-xs font-medium uppercase tracking-wider text-slate-500">Unidad</TableHead>
                              <TableHead className="h-9 text-xs font-medium uppercase tracking-wider text-slate-500">Stock actual</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {receta.items.map((item, idx) => {
                              const insumo = item.insumo ?? insumoMap.get(item.insumoId);
                              return (
                                <TableRow key={idx} className="hover:bg-slate-50/50 border-b border-slate-50 last:border-0">
                                  <TableCell className="font-medium text-slate-700">{insumo?.nombre ?? '—'}</TableCell>
                                  <TableCell>{formatQuantity(item.cantidad)}</TableCell>
                                  <TableCell className="text-slate-500">{insumo?.unidad ?? '—'}</TableCell>
                                  <TableCell>
                                    {typeof insumo?.stock === 'number' ? (
                                      <Badge variant="outline" className={insumo.stock < 10 ? "bg-red-50 text-red-700 border-red-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"}>
                                        {formatQuantity(insumo.stock)}
                                      </Badge>
                                    ) : '—'}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
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
                          <TableHead className="h-10 text-xs font-medium uppercase tracking-wider text-slate-500">Stock Actual</TableHead>
                          <TableHead className="h-10 text-xs font-medium uppercase tracking-wider text-slate-500 text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {productos?.map((producto) => (
                          <TableRow key={producto.id} className="hover:bg-slate-50/50 border-b border-slate-50 transition-colors">
                            <TableCell className="font-medium text-slate-900">{producto.nombre}</TableCell>
                            <TableCell className="text-slate-500">{producto.categoria ?? '—'}</TableCell>
                            <TableCell className="font-medium text-slate-900">{formatCurrency(producto.precioVenta)}</TableCell>
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
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="space-y-3 p-4 md:hidden">
                  {productos?.length ? (
                    productos.map((producto) => (
                      <Card key={producto.id} className="overflow-hidden border border-slate-200 shadow-sm">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                              <p className="text-base font-semibold text-slate-900">{producto.nombre}</p>
                              <p className="text-xs text-slate-500">
                                {producto.categoria ?? 'Sin categoría'}
                              </p>
                            </div>
                            <p className="text-sm font-bold text-indigo-600">
                              {formatCurrency(producto.precioVenta)}
                            </p>
                          </div>
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
                    ))
                  ) : (
                    <p className="text-center text-sm text-slate-500">Sin productos registrados</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

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

        <Dialog
          open={recipeDialogOpen}
          onOpenChange={(open) => {
            setRecipeDialogOpen(open);
            if (!open) {
              resetRecipeForm();
            }
          }}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingReceta ? 'Editar receta' : 'Nueva receta'}</DialogTitle>
              <DialogDescription>Configure los insumos y costos de la receta.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="receta-producto">Producto</Label>
                <Select
                  value={recipeForm.productoId}
                  onValueChange={(value) => setRecipeForm((prev) => ({ ...prev, productoId: value }))}
                >
                  <SelectTrigger id="receta-producto">
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
                <Label htmlFor="receta-costo">Costo Operativo (C$)</Label>
                <Input
                  id="receta-costo"
                  type="number"
                  step="0.01"
                  min="0"
                  value={recipeForm.costoManoObra}
                  onChange={(e) => setRecipeForm((prev) => ({ ...prev, costoManoObra: e.target.value }))}
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Ingredientes</p>
                  <Button size="sm" variant="outline" type="button" onClick={addRecipeItem}>
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar insumo
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ingrese las cantidades usando la misma unidad definida en Inventario. Utilice decimales para subunidades
                  (ej. 0.25 kg ≈ 250 g).
                </p>
                <div className="space-y-3">
                  {recipeForm.items.map((item, index) => {
                    const insumo = item.insumoId ? insumoMap.get(item.insumoId) : undefined;
                    const baseUnit = insumo?.unidad;
                    const conversionOptions = getConversionOptions(baseUnit);
                    const converter = converterState[index] ?? createEmptyConverterState();
                    const selectedConversion = conversionOptions.find((opt) => opt.unit === converter.unit);
                    const parsedValue = parseFloat(converter.value);
                    const convertedValue =
                      selectedConversion && !Number.isNaN(parsedValue)
                        ? parsedValue * selectedConversion.multiplier
                        : null;

                    return (
                      <div key={`ingredient-${index}`} className="grid gap-3 sm:grid-cols-[1fr,240px,auto]">
                        <div className="space-y-2">
                          <Label>Insumo</Label>
                          <Select
                            value={item.insumoId}
                            onValueChange={(value) => updateRecipeItem(index, 'insumoId', value)}
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
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label>Cantidad</Label>
                            {item.insumoId && conversionOptions.length > 0 ? (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="ghost" size="sm" type="button">
                                    Conversor
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent align="start" className="w-[260px] space-y-3">
                                  <div>
                                    <p className="text-sm font-medium">Conversor manual</p>
                                    <p className="text-xs text-muted-foreground">
                                      Convierte valores a {baseUnit} y aplica el resultado automáticamente.
                                    </p>
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-xs">Unidad de origen</Label>
                                    <Select
                                      value={converter.unit}
                                      onValueChange={(value) => updateConverterState(index, 'unit', value)}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Seleccione" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {conversionOptions.map((option) => (
                                          <SelectItem key={option.unit} value={option.unit}>
                                            {option.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-xs">Cantidad en la unidad elegida</Label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={converter.value}
                                      onChange={(e) => updateConverterState(index, 'value', e.target.value)}
                                    />
                                  </div>
                                  {convertedValue !== null ? (
                                    <p className="text-sm">
                                      Resultado: <span className="font-semibold">{formatQuantity(convertedValue)}</span>{' '}
                                      {baseUnit}
                                    </p>
                                  ) : (
                                    <p className="text-xs text-muted-foreground">
                                      Seleccione una unidad y escriba una cantidad para ver el resultado.
                                    </p>
                                  )}
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      className="flex-1"
                                      type="button"
                                      onClick={() => clearConverterState(index)}
                                    >
                                      Limpiar
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="flex-1"
                                      type="button"
                                      disabled={convertedValue === null || convertedValue <= 0}
                                      onClick={() => {
                                        if (convertedValue && convertedValue > 0) {
                                          updateRecipeItem(index, 'cantidad', convertedValue.toString());
                                          clearConverterState(index);
                                        }
                                      }}
                                    >
                                      Usar valor
                                    </Button>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            ) : null}
                          </div>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.cantidad}
                            onChange={(e) => updateRecipeItem(index, 'cantidad', e.target.value)}
                          />
                          {item.insumoId ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <p className="cursor-help text-xs text-muted-foreground">
                                  Unidad base: {baseUnit ?? '—'}
                                </p>
                              </TooltipTrigger>
                              <TooltipContent>
                                {getUnitTip(baseUnit) ??
                                  'Ingrese la cantidad exactamente en la unidad configurada en Inventario.'}
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <p className="text-xs text-muted-foreground">Seleccione un insumo para ver la unidad.</p>
                          )}
                        </div>
                        <div className="flex items-end justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeRecipeItem(index)}
                            disabled={recipeForm.items.length === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRecipeDialogOpen(false)} disabled={isSavingRecipe}>
                Cancelar
              </Button>
              <Button onClick={handleSaveRecipe} disabled={isSavingRecipe}>
                {isSavingRecipe ? 'Guardando...' : 'Guardar'}
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

        <AlertDialog
          open={recipeDeleteDialogOpen}
          onOpenChange={(open) => {
            setRecipeDeleteDialogOpen(open);
            if (!open) {
              setRecipeToDelete(null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar receta</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará la receta seleccionada y no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeletingRecipe}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteRecipe} disabled={isDeletingRecipe}>
                {isDeletingRecipe ? 'Eliminando...' : 'Eliminar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={productionDialog} onOpenChange={setProductionDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Producción</DialogTitle>
              <DialogDescription>
                Registre la producción de un lote de productos
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="receta">Receta</Label>
                <Select value={selectedRecetaId} onValueChange={setSelectedRecetaId}>
                  <SelectTrigger id="receta">
                    <SelectValue placeholder="Seleccione una receta" />
                  </SelectTrigger>
                  <SelectContent>
                    {recetas?.map((receta) => (
                      <SelectItem key={receta.id} value={receta.id}>
                        {getRecetaLabel(receta)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Cantidad</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  placeholder="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setProductionDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleProduction} disabled={productionMutation.isPending}>
                {productionMutation.isPending ? 'Registrando...' : 'Registrar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

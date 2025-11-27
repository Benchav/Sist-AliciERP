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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, PenSquare, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/format';
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
  };

  const updateRecipeItem = (index: number, field: 'insumoId' | 'cantidad', value: string) => {
    setRecipeForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
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
      await api.put(`/production/recipes/${id}`, payload);
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
      toast.error('Ingrese un costo de mano de obra válido');
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Producción</h1>
          <p className="text-muted-foreground">Gestión de recetas y producción</p>
        </div>
        <Button onClick={() => setProductionDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Producción
        </Button>
      </div>

      <Tabs defaultValue="recipes">
        <TabsList>
          <TabsTrigger value="recipes">Recetas</TabsTrigger>
          <TabsTrigger value="products">Productos</TabsTrigger>
        </TabsList>

        <TabsContent value="recipes" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <CardTitle>Recetas de Productos</CardTitle>
              <Button onClick={() => openRecipeDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Nueva receta
              </Button>
            </CardHeader>
            <CardContent>
              {recetas?.map((receta) => {
                const recipeProductName =
                  productMap.get(receta.productoId)?.nombre ?? receta.producto?.nombre ?? 'Receta';
                const manoObra = receta.costoManoObra ?? null;
                return (
                  <div key={receta.id} className="mb-6 rounded-lg border p-4 last:mb-0">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold">{recipeProductName}</h3>
                        {manoObra !== null ? (
                          <p className="text-sm text-muted-foreground">
                            Mano de obra: {formatCurrency(manoObra)}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => openRecipeDialog(receta)}>
                          <PenSquare className="mr-2 h-4 w-4" />
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
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
                    <div className="mt-4 overflow-x-auto rounded-lg border bg-card">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Insumo</TableHead>
                            <TableHead>Cantidad</TableHead>
                            <TableHead>Unidad</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {receta.items.map((item, idx) => {
                            const insumo = item.insumo ?? insumoMap.get(item.insumoId);
                            return (
                              <TableRow key={idx}>
                                <TableCell>{insumo?.nombre ?? '—'}</TableCell>
                                <TableCell>{item.cantidad.toFixed(2)}</TableCell>
                                <TableCell>{insumo?.unidad ?? '—'}</TableCell>
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
          <Card>
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <CardTitle>Productos</CardTitle>
              <Button onClick={() => openProductDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo producto
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Precio Venta</TableHead>
                      <TableHead>Stock Actual</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productos?.map((producto) => (
                      <TableRow key={producto.id}>
                        <TableCell className="font-medium">{producto.nombre}</TableCell>
                        <TableCell>{producto.categoria ?? '—'}</TableCell>
                        <TableCell>{formatCurrency(producto.precioVenta)}</TableCell>
                        <TableCell>{producto.stockDisponible}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openProductDialog(producto)}
                            >
                              <PenSquare className="mr-2 h-4 w-4" />
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setProductToDelete(producto);
                                setProductDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
              <Label htmlFor="receta-costo">Costo mano de obra (C$)</Label>
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
              <div className="space-y-3">
                {recipeForm.items.map((item, index) => (
                  <div key={`ingredient-${index}`} className="grid gap-3 sm:grid-cols-[1fr,160px,auto]">
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
                          {insumos?.map((insumo) => (
                            <SelectItem key={insumo.id} value={insumo.id}>
                              {insumo.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Cantidad</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.cantidad}
                        onChange={(e) => updateRecipeItem(index, 'cantidad', e.target.value)}
                      />
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
                ))}
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
                      {receta.producto?.nombre ?? receta.nombre}
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
  );
}

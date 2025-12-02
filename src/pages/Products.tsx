import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PageHeading } from '@/components/PageHeading';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/errors';
import { formatCurrency } from '@/lib/format';
import { productService } from '@/services/product.service';
import type { CreateProductDTO, Producto, UpdateProductDTO } from '@/types';
import { Plus, PenSquare, Trash2, PackageSearch } from 'lucide-react';
import { PRODUCTION_PRODUCTS_QUERY_KEY } from '@/lib/queryKeys';

interface ProductFormState {
  nombre: string;
  categoria: string;
  precioVenta: string;
  stockDisponible: string;
}

const DEFAULT_PRODUCT_FORM: ProductFormState = {
  nombre: '',
  categoria: '',
  precioVenta: '',
  stockDisponible: '',
};

const sanitizeProductPayload = (form: ProductFormState): CreateProductDTO | null => {
  const price = parseFloat(form.precioVenta);
  const stock = parseFloat(form.stockDisponible);

  if (Number.isNaN(price) || price <= 0) {
    toast.error('Ingrese un precio de venta válido');
    return null;
  }

  if (Number.isNaN(stock) || stock < 0) {
    toast.error('Ingrese un stock válido');
    return null;
  }

  if (!form.nombre.trim()) {
    toast.error('El nombre es obligatorio');
    return null;
  }

  const payload: CreateProductDTO = {
    nombre: form.nombre.trim(),
    precioVenta: price,
    stockDisponible: stock,
  };

  if (form.categoria.trim()) {
    payload.categoria = form.categoria.trim();
  }

  return payload;
};

export default function Products() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [productForm, setProductForm] = useState<ProductFormState>(DEFAULT_PRODUCT_FORM);
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Producto | null>(null);

  const { data: products, isLoading, isError, refetch } = useQuery({
    queryKey: ['products'],
    queryFn: productService.getProducts,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: CreateProductDTO) => productService.createProduct(payload),
    onSuccess: () => {
      toast.success('Producto creado correctamente');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: PRODUCTION_PRODUCTS_QUERY_KEY });
      closeDialog();
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'No se pudo crear el producto'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateProductDTO }) =>
      productService.updateProduct(id, payload),
    onSuccess: () => {
      toast.success('Producto actualizado correctamente');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: PRODUCTION_PRODUCTS_QUERY_KEY });
      closeDialog();
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'No se pudo actualizar el producto'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => productService.deleteProduct(id),
    onSuccess: () => {
      toast.success('Producto eliminado');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: PRODUCTION_PRODUCTS_QUERY_KEY });
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'No se pudo eliminar el producto'));
    },
  });

  const openCreateDialog = () => {
    setEditingProduct(null);
    setProductForm(DEFAULT_PRODUCT_FORM);
    setDialogOpen(true);
  };

  const openEditDialog = (product: Producto) => {
    setEditingProduct(product);
    setProductForm({
      nombre: product.nombre,
      categoria: product.categoria ?? '',
      precioVenta: product.precioVenta.toString(),
      stockDisponible: product.stockDisponible.toString(),
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingProduct(null);
    setProductForm(DEFAULT_PRODUCT_FORM);
  };

  const handleSubmit = () => {
    const payload = sanitizeProductPayload(productForm);
    if (!payload) return;

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, payload });
      return;
    }

    createMutation.mutate(payload);
  };

  const handleDelete = () => {
    if (productToDelete) {
      deleteMutation.mutate(productToDelete.id);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeading
          title="Productos"
          description="Administra el catálogo que se vende en el POS."
        />
        <Button onClick={openCreateDialog} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo producto
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-white px-6 py-4">
          <CardTitle className="text-lg font-semibold text-slate-900">Catálogo</CardTitle>
          <CardDescription>Controla precios, existencias y categorías.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-500" />
              Cargando productos...
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
              <p>Ocurrió un error al cargar los productos.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Reintentar
              </Button>
            </div>
          ) : products?.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="hover:bg-slate-50">
                    <TableHead className="pl-6">Nombre</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Precio Venta</TableHead>
                    <TableHead>Stock Disponible</TableHead>
                    <TableHead className="text-right pr-6">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id} className="hover:bg-slate-50/60">
                      <TableCell className="pl-6 font-medium text-slate-900">{product.nombre}</TableCell>
                      <TableCell>
                        {product.categoria ? (
                          <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                            {product.categoria}
                          </Badge>
                        ) : (
                          <span className="text-slate-400">Sin categoría</span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-700 font-medium">
                        {formatCurrency(product.precioVenta)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={product.stockDisponible > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}
                        >
                          {product.stockDisponible}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditDialog(product)}
                            className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                          >
                            <PenSquare className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setProductToDelete(product);
                              setDeleteDialogOpen(true);
                            }}
                            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
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
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
              <PackageSearch className="h-12 w-12 text-slate-200" />
              No hay productos registrados.
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            closeDialog();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
            <DialogDescription>
              Define la información básica del producto de venta.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="product-nombre">Nombre</Label>
              <Input
                id="product-nombre"
                value={productForm.nombre}
                onChange={(e) => setProductForm((prev) => ({ ...prev, nombre: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-categoria">Categoría</Label>
              <Input
                id="product-categoria"
                placeholder="Pan dulce, pasteles, etc."
                value={productForm.categoria}
                onChange={(e) => setProductForm((prev) => ({ ...prev, categoria: e.target.value }))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="product-precio">Precio de venta (C$)</Label>
                <Input
                  id="product-precio"
                  type="number"
                  step="0.01"
                  min="0"
                  value={productForm.precioVenta}
                  onChange={(e) => setProductForm((prev) => ({ ...prev, precioVenta: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-stock">Stock disponible</Label>
                <Input
                  id="product-stock"
                  type="number"
                  step="1"
                  min="0"
                  value={productForm.stockDisponible}
                  onChange={(e) => setProductForm((prev) => ({ ...prev, stockDisponible: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) {
            setProductToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar producto</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El producto "{productToDelete?.nombre}" será eliminado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

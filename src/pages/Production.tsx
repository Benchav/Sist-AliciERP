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
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/format';
import { getApiErrorMessage } from '@/lib/errors';
import type { Producto, Receta, ProductionRequest, Insumo } from '@/types';

export default function Production() {
  const queryClient = useQueryClient();
  const [productionDialog, setProductionDialog] = useState(false);
  const [selectedRecetaId, setSelectedRecetaId] = useState('');
  const [quantity, setQuantity] = useState('');

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
            <CardHeader>
              <CardTitle>Recetas de Productos</CardTitle>
            </CardHeader>
            <CardContent>
              {recetas?.map((receta) => (
                <div key={receta.id} className="mb-6 last:mb-0">
                  <h3 className="mb-2 text-lg font-semibold">
                    {receta.producto?.nombre ?? receta.nombre}
                  </h3>
                  <div className="overflow-x-auto rounded-lg border bg-card">
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
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Productos</CardTitle>
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productos?.map((producto) => (
                      <TableRow key={producto.id}>
                        <TableCell className="font-medium">{producto.nombre}</TableCell>
                        <TableCell>{producto.categoria}</TableCell>
                        <TableCell>{formatCurrency(producto.precioVenta)}</TableCell>
                        <TableCell>{producto.stock}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
              <Label htmlFor="product">Producto</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger id="product">
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

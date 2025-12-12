import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeading } from '@/components/PageHeading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { PRODUCTION_PRODUCTS_QUERY_KEY } from '@/lib/queryKeys';
import { productService } from '@/services/product.service';
import { wasteService } from '@/services/waste.service';
import { getApiErrorMessage } from '@/lib/errors';

export default function WastePage() {
  const queryClient = useQueryClient();
  const [productoId, setProductoId] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: productos, isLoading } = useQuery({
    queryKey: PRODUCTION_PRODUCTS_QUERY_KEY,
    queryFn: productService.getProducts,
  });

  const wasteMutation = useMutation({
    mutationFn: () => wasteService.registerWaste({ productoId, cantidad: Number(cantidad), motivo }),
    onSuccess: () => {
      toast.success('Descarte registrado');
      queryClient.invalidateQueries({ queryKey: PRODUCTION_PRODUCTS_QUERY_KEY });
      setProductoId('');
      setCantidad('');
      setMotivo('');
      setConfirmOpen(false);
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'No se pudo registrar el descarte'));
    },
  });

  const validate = () => {
    if (!productoId) {
      toast.error('Selecciona un producto');
      return false;
    }
    if (!cantidad || Number(cantidad) <= 0) {
      toast.error('Ingresa una cantidad válida');
      return false;
    }
    if (!motivo.trim()) {
      toast.error('Describe el motivo');
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    setConfirmOpen(true);
  };

  const confirmSubmit = () => {
    wasteMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <PageHeading title="Descartes" description="Registra mermas o productos dañados y descuéntalos del inventario" />

      <Card className="border-slate-200 shadow-sm max-w-3xl">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">Nuevo descarte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Producto</Label>
            <Select value={productoId} onValueChange={setProductoId} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un producto" />
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Cantidad</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Motivo</Label>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej. Producto dañado, vencido, error de producción"
              rows={4}
            />
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => { setProductoId(''); setCantidad(''); setMotivo(''); }}>
              Limpiar
            </Button>
            <Button onClick={handleSubmit} disabled={wasteMutation.isPending}>
              Registrar descarte
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar descarte</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción descontará stock inmediatamente. ¿Deseas continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={wasteMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSubmit} disabled={wasteMutation.isPending}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

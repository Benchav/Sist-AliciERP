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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, amountToCents } from '@/lib/format';
import type { Insumo, PurchaseRequest } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { hasRole } from '@/lib/auth';

export default function Inventory() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [purchaseDialog, setPurchaseDialog] = useState(false);
  const [selectedInsumo, setSelectedInsumo] = useState<Insumo | null>(null);
  const [quantity, setQuantity] = useState('');
  const [cost, setCost] = useState('');

  const { data: insumos, isLoading } = useQuery({
    queryKey: ['insumos'],
    queryFn: async () => {
      const { data } = await api.get<Insumo[]>('/inventory/insumos');
      return data;
    },
  });

  const purchaseMutation = useMutation({
    mutationFn: async (request: PurchaseRequest) => {
      await api.post('/inventory/purchase', request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insumos'] });
      toast.success('Compra registrada exitosamente');
      setPurchaseDialog(false);
      setQuantity('');
      setCost('');
      setSelectedInsumo(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al registrar compra');
    },
  });

  const handlePurchase = () => {
    if (!selectedInsumo || !quantity || !cost) return;

    const costInCents = displayToCents(parseFloat(cost));

    purchaseMutation.mutate({
      insumoId: selectedInsumo.id,
      cantidad: parseFloat(quantity),
      costo: costInCents,
    });
  };

  const openPurchaseDialog = (insumo: Insumo) => {
    setSelectedInsumo(insumo);
    setPurchaseDialog(true);
  };

  const isAdmin = user && hasRole(user, ['ADMIN']);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventario</h1>
          <p className="text-muted-foreground">Gestión de insumos</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Insumos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Unidad</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Costo Promedio</TableHead>
                <TableHead>Estado</TableHead>
                {isAdmin && <TableHead>Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : insumos?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    No hay insumos registrados
                  </TableCell>
                </TableRow>
              ) : (
                insumos?.map((insumo) => (
                  <TableRow key={insumo.id}>
                    <TableCell className="font-medium">{insumo.nombre}</TableCell>
                    <TableCell>{insumo.unidad}</TableCell>
                    <TableCell>{insumo.stock.toFixed(2)}</TableCell>
                    <TableCell>{formatCurrency(insumo.costoPromedio)}</TableCell>
                    <TableCell>
                      {insumo.stock < 10 ? (
                        <Badge variant="destructive">Stock Bajo</Badge>
                      ) : (
                        <Badge variant="default">Disponible</Badge>
                      )}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openPurchaseDialog(insumo)}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Compra
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={purchaseDialog} onOpenChange={setPurchaseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Compra</DialogTitle>
            <DialogDescription>
              Agregue stock al insumo: {selectedInsumo?.nombre}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Cantidad</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost">Costo Unitario (C$)</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPurchaseDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handlePurchase} disabled={purchaseMutation.isPending}>
              {purchaseMutation.isPending ? 'Registrando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

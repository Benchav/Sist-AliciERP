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
import { Plus, PenSquare, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/format';
import { getApiErrorMessage } from '@/lib/errors';
import type { Insumo, PurchaseRequest } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { hasRole } from '@/lib/auth';
import { PageHeading } from '@/components/PageHeading';

export default function Inventory() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [purchaseDialog, setPurchaseDialog] = useState(false);
  const [selectedInsumo, setSelectedInsumo] = useState<Insumo | null>(null);
  const [quantity, setQuantity] = useState('');
  const [cost, setCost] = useState('');
  const [insumoDialogOpen, setInsumoDialogOpen] = useState(false);
  const [editingInsumo, setEditingInsumo] = useState<Insumo | null>(null);
  const [insumoForm, setInsumoForm] = useState({
    nombre: '',
    unidad: '',
    stock: '',
    costoPromedio: '',
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [insumoToDelete, setInsumoToDelete] = useState<Insumo | null>(null);

  const { data: insumos, isLoading } = useQuery({
    queryKey: ['insumos'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Insumo[] }>('/inventory');
      return data.data;
    },
  });

  const resetInsumoForm = () => {
    setInsumoForm({ nombre: '', unidad: '', stock: '', costoPromedio: '' });
    setEditingInsumo(null);
  };

  const openNewInsumoDialog = () => {
    resetInsumoForm();
    setInsumoDialogOpen(true);
  };

  const openEditInsumoDialog = (insumo: Insumo) => {
    setEditingInsumo(insumo);
    setInsumoForm({
      nombre: insumo.nombre,
      unidad: insumo.unidad,
      stock: insumo.stock.toString(),
      costoPromedio: insumo.costoPromedio.toString(),
    });
    setInsumoDialogOpen(true);
  };

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
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Error al registrar compra'));
    },
  });

  type InsumoPayload = {
    nombre: string;
    unidad: string;
    stock: number;
    costoPromedio: number;
  };

  const createInsumoMutation = useMutation({
    mutationFn: async (payload: InsumoPayload) => {
      await api.post('/inventory', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insumos'] });
      toast.success('Insumo creado correctamente');
      setInsumoDialogOpen(false);
      resetInsumoForm();
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Error al crear insumo'));
    },
  });

  const updateInsumoMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: InsumoPayload }) => {
      await api.put(`/inventory/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insumos'] });
      toast.success('Insumo actualizado correctamente');
      setInsumoDialogOpen(false);
      resetInsumoForm();
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Error al actualizar insumo'));
    },
  });

  const deleteInsumoMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/inventory/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insumos'] });
      toast.success('Insumo eliminado correctamente');
      setDeleteDialogOpen(false);
      setInsumoToDelete(null);
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Error al eliminar insumo'));
    },
  });

  const handlePurchase = () => {
    if (!selectedInsumo) {
      toast.error('Seleccione un insumo válido');
      return;
    }

    const quantityValue = parseFloat(quantity);
    const costValue = parseFloat(cost);

    if (Number.isNaN(quantityValue) || quantityValue <= 0) {
      toast.error('Ingrese una cantidad válida');
      return;
    }

    if (Number.isNaN(costValue) || costValue <= 0) {
      toast.error('Ingrese un costo válido');
      return;
    }

    purchaseMutation.mutate({
      insumoId: selectedInsumo.id,
      cantidad: quantityValue,
      costoTotal: costValue,
    });
  };

  const openPurchaseDialog = (insumo: Insumo) => {
    setSelectedInsumo(insumo);
    setPurchaseDialog(true);
  };

  const handleSaveInsumo = () => {
    const stockValue = parseFloat(insumoForm.stock);
    const costValue = parseFloat(insumoForm.costoPromedio);

    if (!insumoForm.nombre.trim() || !insumoForm.unidad.trim()) {
      toast.error('Nombre y unidad son obligatorios');
      return;
    }

    if (Number.isNaN(stockValue) || stockValue < 0) {
      toast.error('Ingrese un stock válido');
      return;
    }

    if (Number.isNaN(costValue) || costValue < 0) {
      toast.error('Ingrese un costo válido');
      return;
    }

    const payload = {
      nombre: insumoForm.nombre.trim(),
      unidad: insumoForm.unidad.trim(),
      stock: stockValue,
      costoPromedio: costValue,
    };

    if (editingInsumo) {
      updateInsumoMutation.mutate({ id: editingInsumo.id, payload });
    } else {
      createInsumoMutation.mutate(payload);
    }
  };

  const openDeleteDialog = (insumo: Insumo) => {
    setInsumoToDelete(insumo);
    setDeleteDialogOpen(true);
  };

  const handleDeleteInsumo = () => {
    if (insumoToDelete) {
      deleteInsumoMutation.mutate(insumoToDelete.id);
    }
  };

  const isAdmin = hasRole(user, ['ADMIN']);
  const isSavingInsumo = createInsumoMutation.isPending || updateInsumoMutation.isPending;
  const isDeletingInsumo = deleteInsumoMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeading
        title="Inventario"
        description="Administra insumos, costos y compras en un solo lugar."
        actions={
          isAdmin ? (
            <Button onClick={openNewInsumoDialog} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo insumo
            </Button>
          ) : null
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Insumos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="hidden md:block">
            <div className="overflow-x-auto rounded-lg border bg-card">
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
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEditInsumoDialog(insumo)}
                              >
                                <PenSquare className="mr-2 h-4 w-4" />
                                Editar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openPurchaseDialog(insumo)}
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Compra
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => openDeleteDialog(insumo)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                              </Button>
                            </div>
                          </TableCell>
                        )}
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
            ) : insumos?.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">No hay insumos registrados</p>
            ) : (
              insumos?.map((insumo) => (
                <div key={insumo.id} className="space-y-2 rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold">{insumo.nombre}</p>
                      <p className="text-xs text-muted-foreground">Unidad: {insumo.unidad}</p>
                    </div>
                    <Badge variant={insumo.stock < 10 ? 'destructive' : 'default'}>
                      {insumo.stock < 10 ? 'Bajo' : 'Disponible'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Stock</p>
                      <p className="font-medium">{insumo.stock.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Costo Prom.</p>
                      <p className="font-medium">{formatCurrency(insumo.costoPromedio)}</p>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button size="sm" variant="outline" onClick={() => openEditInsumoDialog(insumo)}>
                        <PenSquare className="mr-2 h-4 w-4" /> Editar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openPurchaseDialog(insumo)}>
                        <Plus className="mr-2 h-4 w-4" /> Compra
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => openDeleteDialog(insumo)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={insumoDialogOpen}
        onOpenChange={(open) => {
          setInsumoDialogOpen(open);
          if (!open) {
            resetInsumoForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingInsumo ? 'Editar insumo' : 'Nuevo insumo'}</DialogTitle>
            <DialogDescription>
              Complete los campos para {editingInsumo ? 'actualizar' : 'registrar'} un insumo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="insumo-nombre">Nombre</Label>
              <Input
                id="insumo-nombre"
                value={insumoForm.nombre}
                onChange={(e) => setInsumoForm((prev) => ({ ...prev, nombre: e.target.value }))}
                placeholder="Harina, azúcar, ..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="insumo-unidad">Unidad</Label>
              <Input
                id="insumo-unidad"
                value={insumoForm.unidad}
                onChange={(e) => setInsumoForm((prev) => ({ ...prev, unidad: e.target.value }))}
                placeholder="kg, lt, caja..."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="insumo-stock">Stock inicial</Label>
                <Input
                  id="insumo-stock"
                  type="number"
                  step="0.01"
                  min="0"
                  value={insumoForm.stock}
                  onChange={(e) => setInsumoForm((prev) => ({ ...prev, stock: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="insumo-costo">Costo promedio (C$)</Label>
                <Input
                  id="insumo-costo"
                  type="number"
                  step="0.01"
                  min="0"
                  value={insumoForm.costoPromedio}
                  onChange={(e) =>
                    setInsumoForm((prev) => ({ ...prev, costoPromedio: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInsumoDialogOpen(false)} disabled={isSavingInsumo}>
              Cancelar
            </Button>
            <Button onClick={handleSaveInsumo} disabled={isSavingInsumo}>
              {isSavingInsumo ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) {
            setInsumoToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar insumo</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará "{insumoToDelete?.nombre}" y no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingInsumo}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteInsumo} disabled={isDeletingInsumo}>
              {isDeletingInsumo ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              <Label htmlFor="cost">Costo Total (C$)</Label>
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

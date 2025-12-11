import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, PenSquare, Trash2, Package, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/format';
import { getApiErrorMessage } from '@/lib/errors';
import type { Insumo, PurchaseRequest } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { hasRole } from '@/lib/auth';
import { PageHeading } from '@/components/PageHeading';
import { createInsumo, deleteInsumo, fetchInsumos, updateInsumo, type InsumoPayload } from '@/lib/inventoryApi';
import { inventoryService } from '@/services/inventory.service';
import { useConversions } from '@/services/conversion.service';

const NO_PROVIDER_VALUE = '__none__';

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
    proveedorPrincipalId: '',
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [insumoToDelete, setInsumoToDelete] = useState<Insumo | null>(null);

  const { data: insumos, isLoading } = useQuery({
    queryKey: ['insumos'],
    queryFn: fetchInsumos,
  });

  const { data: providers, isLoading: isLoadingProviders } = useQuery({
    queryKey: ['providers'],
    queryFn: inventoryService.getProviders,
  });

  const { data: conversions } = useConversions();

  const providerMap = useMemo(() => {
    if (!providers) return new Map<string, string>();
    return new Map(providers.map((provider) => [provider.id, provider.nombre]));
  }, [providers]);

  const unitOptions = useMemo(() => {
    const units = new Set<string>();
    conversions?.forEach((conv) => {
      units.add(conv.unidadOrigen.toUpperCase());
      units.add(conv.unidadDestino.toUpperCase());
    });
    insumos?.forEach((insumo) => {
      if (insumo.unidad) {
        units.add(insumo.unidad.toUpperCase());
      }
    });
    return Array.from(units).sort();
  }, [conversions, insumos]);

  const resetInsumoForm = () => {
    setInsumoForm({ nombre: '', unidad: '', stock: '', costoPromedio: '', proveedorPrincipalId: '' });
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
      proveedorPrincipalId: insumo.proveedorPrincipalId ?? '',
    });
    setInsumoDialogOpen(true);
  };

  const purchaseMutation = useMutation({
    mutationFn: async (request: PurchaseRequest) => {
      await inventoryService.registerPurchase(request);
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

  const createInsumoMutation = useMutation({
    mutationFn: async (payload: InsumoPayload) => {
      await createInsumo(payload);
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
      await updateInsumo(id, payload);
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
      await deleteInsumo(id);
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
    const proveedorValue = insumoForm.proveedorPrincipalId.trim();

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
      unidad: insumoForm.unidad.trim().toUpperCase(),
      stock: stockValue,
      costoPromedio: costValue,
      proveedorPrincipalId: proveedorValue || undefined,
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
            <Button 
              onClick={openNewInsumoDialog} 
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nuevo insumo
            </Button>
          ) : null
        }
      />

      <Card className="border-slate-200 shadow-sm overflow-hidden rounded-xl">
        <CardHeader className="border-b border-slate-100 bg-white px-6 py-4">
          <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Package className="h-5 w-5 text-indigo-600" />
            Listado de Insumos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="hidden md:block">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent border-b border-slate-100">
                    <TableHead className="h-10 text-xs font-medium uppercase tracking-wider text-slate-500 pl-6">Nombre</TableHead>
                    <TableHead className="h-10 text-xs font-medium uppercase tracking-wider text-slate-500">Unidad</TableHead>
                    <TableHead className="h-10 text-xs font-medium uppercase tracking-wider text-slate-500">Proveedor</TableHead>
                    <TableHead className="h-10 text-xs font-medium uppercase tracking-wider text-slate-500">Stock</TableHead>
                    <TableHead className="h-10 text-xs font-medium uppercase tracking-wider text-slate-500">Costo Promedio</TableHead>
                    <TableHead className="h-10 text-xs font-medium uppercase tracking-wider text-slate-500">Estado</TableHead>
                    {isAdmin && <TableHead className="h-10 text-xs font-medium uppercase tracking-wider text-slate-500 text-right pr-6">Acciones</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 7 : 6} className="text-center py-8 text-slate-500">
                        Cargando insumos...
                      </TableCell>
                    </TableRow>
                  ) : insumos?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 7 : 6} className="text-center py-8 text-slate-500">
                        No hay insumos registrados
                      </TableCell>
                    </TableRow>
                  ) : (
                    insumos?.map((insumo) => (
                      <TableRow key={insumo.id} className="hover:bg-slate-50/50 border-b border-slate-50 transition-colors">
                        <TableCell className="font-medium text-slate-900 pl-6">{insumo.nombre}</TableCell>
                        <TableCell className="text-slate-500">{insumo.unidad}</TableCell>
                        <TableCell className="text-slate-500">
                          {insumo.proveedorPrincipalId ? providerMap.get(insumo.proveedorPrincipalId) ?? '—' : '—'}
                        </TableCell>
                        <TableCell className="font-medium text-slate-700">{insumo.stock.toFixed(2)}</TableCell>
                        <TableCell className="text-slate-500">{formatCurrency(insumo.costoPromedio)}</TableCell>
                        <TableCell>
                          {insumo.stock < 10 ? (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-100">Stock Bajo</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100">Disponible</Badge>
                          )}
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right pr-6">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openEditInsumoDialog(insumo)}
                                className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                              >
                                <PenSquare className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openPurchaseDialog(insumo)}
                                className="h-8 gap-1 border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                              >
                                <ShoppingCart className="h-4 w-4" />
                                Reponer
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openDeleteDialog(insumo)}
                                className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
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

          <div className="space-y-3 p-4 md:hidden">
            {isLoading ? (
              <p className="text-center text-sm text-slate-500">Cargando...</p>
            ) : insumos?.length === 0 ? (
              <p className="text-center text-sm text-slate-500">No hay insumos registrados</p>
            ) : (
              insumos?.map((insumo) => (
                <Card key={insumo.id} className="overflow-hidden border border-slate-200 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="text-base font-semibold text-slate-900">{insumo.nombre}</p>
                        <p className="text-xs text-slate-500">Unidad: {insumo.unidad}</p>
                        {insumo.proveedorPrincipalId && (
                          <p className="text-xs text-slate-500">Proveedor: {providerMap.get(insumo.proveedorPrincipalId) ?? '—'}</p>
                        )}
                      </div>
                      <Badge variant="outline" className={insumo.stock < 10 ? "bg-red-50 text-red-700 border-red-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"}>
                        {insumo.stock < 10 ? 'Bajo' : 'Disponible'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                      <div className="bg-slate-50 p-2 rounded border border-slate-100">
                        <p className="text-xs text-slate-500 mb-1">Stock Actual</p>
                        <p className="font-semibold text-slate-900">{insumo.stock.toFixed(2)}</p>
                      </div>
                      <div className="bg-slate-50 p-2 rounded border border-slate-100">
                        <p className="text-xs text-slate-500 mb-1">Costo Prom.</p>
                        <p className="font-semibold text-slate-900">{formatCurrency(insumo.costoPromedio)}</p>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-2 pt-2 border-t border-slate-100">
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => openEditInsumoDialog(insumo)}>
                          Editar
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => openPurchaseDialog(insumo)}>
                          Reponer
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-50" onClick={() => openDeleteDialog(insumo)}>
                          Eliminar
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
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
              <Select
                value={insumoForm.unidad || undefined}
                onValueChange={(value) =>
                  setInsumoForm((prev) => ({ ...prev, unidad: value.toUpperCase() }))
                }
                disabled={unitOptions.length === 0}
              >
                <SelectTrigger id="insumo-unidad">
                  <SelectValue placeholder={unitOptions.length === 0 ? 'No hay unidades disponibles' : 'Seleccione una unidad'} />
                </SelectTrigger>
                <SelectContent>
                  {unitOptions.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {unitOptions.length === 0 ? (
                <p className="text-xs text-amber-600">Configura unidades en conversiones antes de crear insumos.</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="insumo-proveedor">Proveedor principal</Label>
              <Select
                value={insumoForm.proveedorPrincipalId || NO_PROVIDER_VALUE}
                onValueChange={(value) =>
                  setInsumoForm((prev) => ({
                    ...prev,
                    proveedorPrincipalId: value === NO_PROVIDER_VALUE ? '' : value,
                  }))
                }
                disabled={isLoadingProviders}
              >
                <SelectTrigger id="insumo-proveedor">
                  <SelectValue placeholder={isLoadingProviders ? 'Cargando proveedores...' : 'Seleccione un proveedor'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PROVIDER_VALUE}>Sin proveedor</SelectItem>
                  {(providers ?? []).map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

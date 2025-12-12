import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeading } from '@/components/PageHeading';
import { ORDERS_QUERY_KEY, ORDER_DETAIL_QUERY_KEY, PRODUCTION_PRODUCTS_QUERY_KEY } from '@/lib/queryKeys';
import { formatCurrency } from '@/lib/format';
import { getApiErrorMessage } from '@/lib/errors';
import { ordersService } from '@/services/orders.service';
import { productService } from '@/services/product.service';
import type { Order, OrderDeposit, OrderStatus, Producto } from '@/types';
import { Plus, CalendarClock, Wallet, PackagePlus, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS: Array<{ value: OrderStatus | 'TODOS'; label: string }> = [
  { value: 'PENDIENTE', label: 'Pendientes' },
  { value: 'ENTREGADO', label: 'Entregados' },
  { value: 'CANCELADO', label: 'Cancelados' },
  { value: 'TODOS', label: 'Todos' },
];

type OrderFormItem = { productoId: string; cantidad: string };

type CreateOrderForm = {
  cliente: string;
  fechaEntrega: string;
  items: OrderFormItem[];
};

type DepositForm = {
  monto: string;
  medioPago: 'EFECTIVO' | 'TRANSFERENCIA';
};

type FinalizeForm = {
  pagoNIO: string;
  pagoUSD: string;
  tasaUSD: string;
};

const createEmptyItem = (): OrderFormItem => ({ productoId: '', cantidad: '' });

const sumDeposits = (abonos?: OrderDeposit[]) =>
  (abonos ?? []).reduce((acc, deposit) => acc + (deposit.monto ?? 0), 0);

const getDueStatus = (order: Order) => {
  if (order.estado === 'ENTREGADO' || order.estado === 'CANCELADO') {
    return { label: order.estado === 'ENTREGADO' ? 'Entregado' : 'Cancelado', tone: 'muted' as const };
  }
  const today = new Date();
  const delivery = new Date(order.fechaEntrega);
  const diffMs = delivery.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: 'Vencido', tone: 'danger' as const };
  if (diffDays <= 2) return { label: 'Próximo', tone: 'warning' as const };
  return { label: 'En tiempo', tone: 'success' as const };
};

const statusBadge = (estado: OrderStatus) => {
  switch (estado) {
    case 'PENDIENTE':
      return 'bg-amber-50 text-amber-700 border-amber-100';
    case 'ENTREGADO':
      return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    case 'CANCELADO':
      return 'bg-slate-100 text-slate-600 border-slate-200';
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200';
  }
};

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'TODOS'>('PENDIENTE');
  const [detailDialog, setDetailDialog] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [createDialog, setCreateDialog] = useState(false);
  const [depositDialog, setDepositDialog] = useState(false);
  const [finalizeDialog, setFinalizeDialog] = useState(false);

  const [createForm, setCreateForm] = useState<CreateOrderForm>({
    cliente: '',
    fechaEntrega: '',
    items: [createEmptyItem()],
  });

  const [depositForm, setDepositForm] = useState<DepositForm>({ monto: '', medioPago: 'EFECTIVO' });
  const [finalizeForm, setFinalizeForm] = useState<FinalizeForm>({ pagoNIO: '', pagoUSD: '', tasaUSD: '' });

  const {
    data: productos,
    isLoading: isLoadingProductos,
    isError: isProductosError,
  } = useQuery({
    queryKey: PRODUCTION_PRODUCTS_QUERY_KEY,
    queryFn: productService.getProducts,
  });

  const ordersQuery = useQuery({
    queryKey: ORDERS_QUERY_KEY('all'),
    queryFn: () => ordersService.listOrders(),
  });

  const detailQuery = useQuery({
    queryKey: selectedOrderId ? ORDER_DETAIL_QUERY_KEY(selectedOrderId) : ['order-detail', 'idle'],
    queryFn: () => ordersService.getOrderDetail(selectedOrderId as string),
    enabled: Boolean(selectedOrderId),
  });

  const createMutation = useMutation({
    mutationFn: ordersService.createOrder,
    onSuccess: () => {
      toast.success('Encargo creado');
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY(statusFilter === 'TODOS' ? undefined : statusFilter) });
      setCreateDialog(false);
      setCreateForm({ cliente: '', fechaEntrega: '', items: [createEmptyItem()] });
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'No se pudo crear el encargo'));
    },
  });

  const depositMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: DepositForm }) =>
      ordersService.addDeposit(id, { monto: Number(payload.monto), medioPago: payload.medioPago }),
    onSuccess: (_, variables) => {
      toast.success('Abono registrado');
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY(statusFilter === 'TODOS' ? undefined : statusFilter) });
      if (variables.id) {
        queryClient.invalidateQueries({ queryKey: ORDER_DETAIL_QUERY_KEY(variables.id) });
      }
      setDepositDialog(false);
      setDepositForm({ monto: '', medioPago: 'EFECTIVO' });
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'No se pudo registrar el abono'));
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: FinalizeForm }) => {
      const pagos = [] as { moneda: 'NIO' | 'USD'; cantidad: number; tasa?: number }[];
      const nio = Number(payload.pagoNIO || 0);
      const usd = Number(payload.pagoUSD || 0);
      const tasa = Number(payload.tasaUSD || 0) || undefined;
      if (nio > 0) pagos.push({ moneda: 'NIO', cantidad: nio });
      if (usd > 0) pagos.push({ moneda: 'USD', cantidad: usd, tasa });
      return ordersService.finalizeOrder(id, { pagos, descuento: 0 });
    },
    onSuccess: (_, variables) => {
      toast.success('Encargo finalizado');
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY(statusFilter === 'TODOS' ? undefined : statusFilter) });
      if (variables.id) {
        queryClient.invalidateQueries({ queryKey: ORDER_DETAIL_QUERY_KEY(variables.id) });
      }
      setFinalizeDialog(false);
      setFinalizeForm({ pagoNIO: '', pagoUSD: '', tasaUSD: '' });
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'No se pudo finalizar el encargo'));
    },
  });

  const isLoading = ordersQuery.isLoading || isLoadingProductos;
  const isError = ordersQuery.isError || isProductosError;

  const visibleOrders = useMemo(() => {
    if (!ordersQuery.data) return [] as Order[];
    const sorted = [...ordersQuery.data].sort((a, b) => a.fechaEntrega.localeCompare(b.fechaEntrega));
    if (statusFilter === 'TODOS') return sorted;
    return sorted.filter((order) => order.estado === statusFilter);
  }, [ordersQuery.data, statusFilter]);

  const selectedOrder = detailQuery.data ?? null;
  const totalAbonos = selectedOrder ? sumDeposits(selectedOrder.abonos) : 0;
  const totalEstimado = selectedOrder?.totalEstimado ?? 0;
  const saldo = Math.max(totalEstimado - totalAbonos, 0);

  const updateItemField = (index: number, field: keyof OrderFormItem, value: string) => {
    setCreateForm((prev) => {
      const next = { ...prev, items: [...prev.items] };
      next.items[index] = { ...next.items[index], [field]: value };
      return next;
    });
  };

  const addItemRow = () => setCreateForm((prev) => ({ ...prev, items: [...prev.items, createEmptyItem()] }));
  const removeItemRow = (index: number) =>
    setCreateForm((prev) => ({ ...prev, items: prev.items.filter((_, idx) => idx !== index) }));

  const handleCreateSubmit = () => {
    const payload: CreateOrderForm = {
      ...createForm,
      items: createForm.items.filter((item) => item.productoId && Number(item.cantidad) > 0),
    };
    if (!payload.cliente || !payload.fechaEntrega || payload.items.length === 0) {
      toast.error('Completa cliente, fecha y al menos un producto con cantidad');
      return;
    }
    createMutation.mutate({
      cliente: payload.cliente,
      fechaEntrega: payload.fechaEntrega,
      items: payload.items.map((item) => ({ productoId: item.productoId, cantidad: Number(item.cantidad) })),
    });
  };

  const handleDepositSubmit = () => {
    if (!selectedOrderId) return;
    if (!depositForm.monto || Number(depositForm.monto) <= 0) {
      toast.error('Ingresa un monto válido');
      return;
    }
    depositMutation.mutate({ id: selectedOrderId, payload: depositForm });
  };

  const handleFinalizeSubmit = () => {
    if (!selectedOrderId) return;
    const nio = Number(finalizeForm.pagoNIO || 0);
    const usd = Number(finalizeForm.pagoUSD || 0);
    if (nio <= 0 && usd <= 0) {
      toast.error('Ingresa un pago para cerrar el encargo');
      return;
    }
    finalizeMutation.mutate({ id: selectedOrderId, payload: finalizeForm });
  };

  const openDetail = (orderId: string) => {
    setSelectedOrderId(orderId);
    setDetailDialog(true);
  };

  const resetDetailDialogs = () => {
    setDetailDialog(false);
    setDepositDialog(false);
    setFinalizeDialog(false);
    setSelectedOrderId(null);
    setDepositForm({ monto: '', medioPago: 'EFECTIVO' });
    setFinalizeForm({ pagoNIO: '', pagoUSD: '', tasaUSD: '' });
  };

  return (
    <div className="space-y-6">
      <PageHeading title="Encargos" description="Gestiona pedidos especiales, abonos y entregas" />

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex flex-col gap-4 border-b border-slate-100 bg-white sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg font-semibold text-slate-900">Encargos</CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as OrderStatus | 'TODOS')}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => setCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" /> Nuevo encargo
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isError ? (
            <div className="flex items-center gap-2 p-4 text-sm text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span>{getApiErrorMessage(ordersQuery.error, 'Error al cargar encargos')}</span>
            </div>
          ) : null}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow>
                  <TableHead className="w-14">Semáforo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Entrega</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Total estimado</TableHead>
                  <TableHead>Abonado</TableHead>
                  <TableHead>Saldo</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-6 text-center text-slate-500">
                      Cargando encargos...
                    </TableCell>
                  </TableRow>
                ) : null}
                {!isLoading && visibleOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-6 text-center text-slate-500">
                      No hay encargos en este estado
                    </TableCell>
                  </TableRow>
                ) : null}
                {visibleOrders.map((order) => {
                  const due = getDueStatus(order);
                  const abonos = sumDeposits(order.abonos);
                  const total = order.totalEstimado ?? 0;
                  const saldoPendiente = Math.max(total - abonos, 0);
                  return (
                    <TableRow key={order.id} className="hover:bg-slate-50/70">
                      <TableCell>
                        <span className={cn('inline-flex h-3 w-3 rounded-full', {
                          'bg-emerald-500': due.tone === 'success',
                          'bg-amber-500': due.tone === 'warning',
                          'bg-red-500': due.tone === 'danger',
                          'bg-slate-300': due.tone === 'muted',
                        })} />
                      </TableCell>
                      <TableCell className="font-semibold text-slate-900">{order.cliente}</TableCell>
                      <TableCell className="text-slate-600">{new Date(order.fechaEntrega).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusBadge(order.estado)}>
                          {order.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-slate-900">{total ? formatCurrency(total) : '—'}</TableCell>
                      <TableCell className="text-slate-600">{abonos ? formatCurrency(abonos) : '—'}</TableCell>
                      <TableCell className={cn('font-semibold', saldoPendiente > 0 ? 'text-amber-700' : 'text-emerald-700')}>
                        {saldoPendiente ? formatCurrency(saldoPendiente) : 'Pagado'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => openDetail(order.id)}>
                          Ver detalle
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Crear encargo */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Nuevo encargo</DialogTitle>
            <DialogDescription>Registra la entrega y los productos solicitados.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Input
                  value={createForm.cliente}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, cliente: e.target.value }))}
                  placeholder="Nombre del cliente"
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha de entrega</Label>
                <Input
                  type="date"
                  value={createForm.fechaEntrega}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, fechaEntrega: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-900">Productos</p>
              <Button type="button" variant="outline" size="sm" onClick={addItemRow}>
                <PackagePlus className="mr-2 h-4 w-4" /> Agregar producto
              </Button>
            </div>
            <div className="space-y-3">
              {createForm.items.map((item, idx) => (
                <div key={`item-${idx}`} className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3 sm:grid-cols-6">
                  <div className="sm:col-span-4 space-y-2">
                    <Label>Producto</Label>
                    <Select
                      value={item.productoId}
                      onValueChange={(value) => updateItemField(idx, 'productoId', value)}
                    >
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
                  <div className="sm:col-span-2 space-y-2">
                    <Label>Cantidad</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.cantidad}
                      onChange={(e) => updateItemField(idx, 'cantidad', e.target.value)}
                    />
                  </div>
                  {createForm.items.length > 1 ? (
                    <div className="sm:col-span-6 text-right">
                      <Button variant="ghost" size="sm" onClick={() => removeItemRow(idx)} className="text-red-600">
                        Eliminar
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setCreateDialog(false)} disabled={createMutation.isPending}>
              Cancelar
            </Button>
            <Button onClick={handleCreateSubmit} disabled={createMutation.isPending || isLoadingProductos}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detalle encargo */}
      <Dialog open={detailDialog} onOpenChange={(open) => (open ? setDetailDialog(true) : resetDetailDialogs())}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalle del encargo</DialogTitle>
            <DialogDescription>
              Total estimado, abonos y saldo. Gestiona abonos o entrega.
            </DialogDescription>
          </DialogHeader>

          {detailQuery.isLoading ? (
            <div className="py-6 text-center text-slate-500">Cargando detalle...</div>
          ) : null}

          {selectedOrder && !detailQuery.isLoading ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="border-slate-200">
                  <CardContent className="p-4 space-y-2">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Cliente</p>
                    <p className="text-lg font-semibold text-slate-900">{selectedOrder.cliente}</p>
                    <p className="text-sm text-slate-500">Entrega: {new Date(selectedOrder.fechaEntrega).toLocaleDateString()}</p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Estado</p>
                      <Badge variant="outline" className={statusBadge(selectedOrder.estado)}>
                        {selectedOrder.estado}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Total estimado</p>
                      <p className="text-lg font-semibold text-slate-900">{totalEstimado ? formatCurrency(totalEstimado) : '—'}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-slate-200">
                <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 py-3">
                  <CardTitle className="text-base">Abonos</CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDepositDialog(true)}
                    disabled={selectedOrder.estado !== 'PENDIENTE'}
                  >
                    <Wallet className="mr-2 h-4 w-4" /> Registrar abono
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {selectedOrder.abonos && selectedOrder.abonos.length > 0 ? (
                    <div className="space-y-3">
                      {selectedOrder.abonos.map((abono) => (
                        <div key={abono.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{formatCurrency(abono.monto)}</p>
                            <p className="text-xs text-slate-500">{abono.medioPago} • {new Date(abono.createdAt).toLocaleString()}</p>
                          </div>
                          <Badge variant="outline" className="bg-white text-slate-600 border-slate-200">
                            Abono
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">Sin abonos registrados</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-slate-200">
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Saldo pendiente</p>
                    <p className="text-2xl font-bold text-slate-900">{formatCurrency(saldo)}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setFinalizeDialog(true)}
                    disabled={selectedOrder.estado !== 'PENDIENTE'}
                  >
                    <CalendarClock className="mr-2 h-4 w-4" /> Entregar pedido
                  </Button>
                </CardContent>
              </Card>

              <div>
                <p className="text-sm font-semibold text-slate-900 mb-2">Productos</p>
                <div className="rounded-lg border border-slate-200">
                  <Table>
                    <TableHeader className="bg-slate-50/80">
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead>Cantidad</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrder.items.map((item, idx) => (
                        <TableRow key={`${selectedOrder.id}-item-${idx}`}>
                          <TableCell>{item.productoNombre ?? item.productoId}</TableCell>
                          <TableCell>{item.cantidad}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={resetDetailDialogs}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Registrar abono */}
      <Dialog open={depositDialog} onOpenChange={(open) => setDepositDialog(open)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar abono</DialogTitle>
            <DialogDescription>Ingresa el monto recibido y el medio de pago.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Monto</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={depositForm.monto}
                onChange={(e) => setDepositForm((prev) => ({ ...prev, monto: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Medio de pago</Label>
              <Select
                value={depositForm.medioPago}
                onValueChange={(value) => setDepositForm((prev) => ({ ...prev, medioPago: value as DepositForm['medioPago'] }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                  <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDepositDialog(false)} disabled={depositMutation.isPending}>
              Cancelar
            </Button>
            <Button onClick={handleDepositSubmit} disabled={depositMutation.isPending}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Finalizar */}
      <Dialog open={finalizeDialog} onOpenChange={(open) => setFinalizeDialog(open)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Entregar pedido</DialogTitle>
            <DialogDescription>Cobra el saldo pendiente para cerrar el encargo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Pago en córdobas (NIO)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={finalizeForm.pagoNIO}
                onChange={(e) => setFinalizeForm((prev) => ({ ...prev, pagoNIO: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Pago en dólares (USD)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={finalizeForm.pagoUSD}
                onChange={(e) => setFinalizeForm((prev) => ({ ...prev, pagoUSD: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Tasa USD (opcional)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={finalizeForm.tasaUSD}
                onChange={(e) => setFinalizeForm((prev) => ({ ...prev, tasaUSD: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFinalizeDialog(false)} disabled={finalizeMutation.isPending}>
              Cancelar
            </Button>
            <Button onClick={handleFinalizeSubmit} disabled={finalizeMutation.isPending}>
              Entregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

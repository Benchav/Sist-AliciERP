import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeading } from '@/components/PageHeading';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PAYROLL_QUERY_KEY } from '@/lib/queryKeys';
import { payrollService } from '@/services/payroll.service';
import { formatCurrency } from '@/lib/format';
import { getApiErrorMessage } from '@/lib/errors';
import type { AreaTrabajo, CreatePayrollDTO, PayrollEntry } from '@/types';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

const AREA_OPTIONS: { value: AreaTrabajo; label: string }[] = [
  { value: 'PRODUCCION', label: 'Producción' },
  { value: 'LIMPIEZA', label: 'Limpieza' },
  { value: 'CAJERO', label: 'Cajero' },
];

const QUINCENA_OPTIONS = [
  { value: '1', label: 'Primera quincena' },
  { value: '2', label: 'Segunda quincena' },
];

type PayrollFormState = {
  nombre: string;
  puesto: string;
  areaTrabajo: AreaTrabajo | '';
  salarioBase: string;
  pagoHorasExtra: string;
  quincena: '1' | '2' | '';
};

const emptyForm: PayrollFormState = {
  nombre: '',
  puesto: '',
  areaTrabajo: '',
  salarioBase: '',
  pagoHorasExtra: '',
  quincena: '',
};

const normalizeNumber = (value: string) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const computeTotal = (entry?: { salarioBase?: number; pagoHorasExtra?: number }) => {
  if (!entry) return 0;
  return (entry.salarioBase ?? 0) + (entry.pagoHorasExtra ?? 0);
};

export default function PayrollPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<{ area: AreaTrabajo | 'TODAS'; quincena: '1' | '2' | 'TODAS'; search: string }>(
    { area: 'TODAS', quincena: 'TODAS', search: '' }
  );
  const [formState, setFormState] = useState<PayrollFormState>(emptyForm);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PayrollEntry | null>(null);

  const payrollQuery = useQuery({
    queryKey: PAYROLL_QUERY_KEY,
    queryFn: payrollService.listPayroll,
    staleTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreatePayrollDTO) => payrollService.createPayroll(payload),
    onSuccess: () => {
      toast.success('Pago registrado');
      queryClient.invalidateQueries({ queryKey: PAYROLL_QUERY_KEY });
      setDialogOpen(false);
      setFormState(emptyForm);
      setEditingId(null);
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'No se pudo registrar el pago'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CreatePayrollDTO }) => payrollService.updatePayroll(id, payload),
    onSuccess: () => {
      toast.success('Pago actualizado');
      queryClient.invalidateQueries({ queryKey: PAYROLL_QUERY_KEY });
      setDialogOpen(false);
      setFormState(emptyForm);
      setEditingId(null);
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'No se pudo actualizar el pago'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => payrollService.deletePayroll(id),
    onSuccess: () => {
      toast.success('Pago eliminado');
      queryClient.invalidateQueries({ queryKey: PAYROLL_QUERY_KEY });
      setDeleteTarget(null);
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'No se pudo eliminar el pago'));
    },
  });

  const filteredData = useMemo(() => {
    if (!payrollQuery.data) return [] as PayrollEntry[];
    const search = filters.search.trim().toLowerCase();
    return payrollQuery.data.filter((item) => {
      const matchesArea = filters.area === 'TODAS' ? true : item.areaTrabajo === filters.area;
      const matchesQuincena = filters.quincena === 'TODAS' ? true : item.quincena === Number(filters.quincena);
      const matchesText = !search
        || item.nombre.toLowerCase().includes(search)
        || item.puesto.toLowerCase().includes(search)
        || item.areaTrabajo.toLowerCase().includes(search);
      return matchesArea && matchesQuincena && matchesText;
    });
  }, [payrollQuery.data, filters]);

  const openCreate = () => {
    setEditingId(null);
    setFormState(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (entry: PayrollEntry) => {
    setEditingId(entry.id);
    setFormState({
      nombre: entry.nombre,
      puesto: entry.puesto,
      areaTrabajo: entry.areaTrabajo,
      salarioBase: entry.salarioBase.toString(),
      pagoHorasExtra: entry.pagoHorasExtra.toString(),
      quincena: entry.quincena.toString() as '1' | '2',
    });
    setDialogOpen(true);
  };

  const validateForm = (): CreatePayrollDTO | null => {
    const nombre = formState.nombre.trim();
    const puesto = formState.puesto.trim();
    const areaTrabajo = formState.areaTrabajo;
    const quincena = formState.quincena;
    const salarioBase = normalizeNumber(formState.salarioBase);
    const pagoHorasExtra = normalizeNumber(formState.pagoHorasExtra);

    if (!nombre || !puesto || !areaTrabajo || !quincena) {
      toast.error('Completa nombre, puesto, área y quincena');
      return null;
    }
    if (!['1', '2'].includes(quincena)) {
      toast.error('Selecciona quincena 1 o 2');
      return null;
    }
    if (salarioBase < 0 || pagoHorasExtra < 0) {
      toast.error('Los montos deben ser mayores o iguales a 0');
      return null;
    }

    return {
      nombre,
      puesto,
      areaTrabajo,
      salarioBase,
      pagoHorasExtra,
      quincena: Number(quincena) as 1 | 2,
    };
  };

  const handleSubmit = () => {
    const payload = validateForm();
    if (!payload) return;
    if (editingId) {
      updateMutation.mutate({ id: editingId, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const totalPreview = computeTotal({ salarioBase: normalizeNumber(formState.salarioBase), pagoHorasExtra: normalizeNumber(formState.pagoHorasExtra) });

  return (
    <div className="space-y-6">
      <PageHeading title="Nómina" description="Gestiona pagos por quincena y áreas de trabajo" />

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex flex-col gap-3 border-b border-slate-100 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-slate-900">Pagos registrados</CardTitle>
            <CardDescription>Filtra por quincena o área para revisar la nómina.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select
              value={filters.quincena}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, quincena: value as '1' | '2' | 'TODAS' }))}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Quincena" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Todas</SelectItem>
                {QUINCENA_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.area}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, area: value as AreaTrabajo | 'TODAS' }))}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Todas</SelectItem>
                {AREA_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por nombre o puesto"
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                className="w-64"
              />
            </div>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> Nuevo pago
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {payrollQuery.isError ? (
            <Alert variant="destructive" className="m-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{getApiErrorMessage(payrollQuery.error, 'No se pudo cargar nómina')}</AlertDescription>
            </Alert>
          ) : null}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Puesto</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Quincena</TableHead>
                  <TableHead className="text-right">Salario base</TableHead>
                  <TableHead className="text-right">Horas extra</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrollQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-6 text-center text-slate-500">Cargando nómina...</TableCell>
                  </TableRow>
                ) : null}
                {!payrollQuery.isLoading && filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-6 text-center text-slate-500">Sin registros</TableCell>
                  </TableRow>
                ) : null}
                {filteredData.map((item) => {
                  const total = typeof item.totalPago === 'number' ? item.totalPago : computeTotal(item);
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-semibold text-slate-900">{item.nombre}</TableCell>
                      <TableCell className="text-slate-600">{item.puesto}</TableCell>
                      <TableCell>
                        <span className={cn('rounded-full px-2 py-1 text-xs font-semibold',
                          item.areaTrabajo === 'PRODUCCION' ? 'bg-indigo-50 text-indigo-700' :
                          item.areaTrabajo === 'LIMPIEZA' ? 'bg-emerald-50 text-emerald-700' :
                          'bg-amber-50 text-amber-700'
                        )}>
                          {item.areaTrabajo}
                        </span>
                      </TableCell>
                      <TableCell>{item.quincena}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.salarioBase)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.pagoHorasExtra)}</TableCell>
                      <TableCell className="text-right font-semibold text-slate-900">{formatCurrency(total)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500 hover:text-blue-600" onClick={() => openEdit(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500 hover:text-red-600" onClick={() => setDeleteTarget(item)}>
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
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setFormState(emptyForm); setEditingId(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar pago' : 'Nuevo pago'}</DialogTitle>
            <DialogDescription>Registra o actualiza un pago de nómina.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={formState.nombre} onChange={(e) => setFormState((prev) => ({ ...prev, nombre: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Puesto</Label>
                <Input value={formState.puesto} onChange={(e) => setFormState((prev) => ({ ...prev, puesto: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Área de trabajo</Label>
                <Select
                  value={formState.areaTrabajo || ''}
                  onValueChange={(value) => setFormState((prev) => ({ ...prev, areaTrabajo: value as AreaTrabajo }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un área" />
                  </SelectTrigger>
                  <SelectContent>
                    {AREA_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quincena</Label>
                <Select
                  value={formState.quincena || ''}
                  onValueChange={(value) => setFormState((prev) => ({ ...prev, quincena: value as '1' | '2' }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    {QUINCENA_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Salario base (C$)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formState.salarioBase}
                  onChange={(e) => setFormState((prev) => ({ ...prev, salarioBase: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Pago horas extra (C$)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formState.pagoHorasExtra}
                  onChange={(e) => setFormState((prev) => ({ ...prev, pagoHorasExtra: e.target.value }))}
                />
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600 flex items-center justify-between">
              <span>Total estimado (vista previa)</span>
              <span className="font-semibold text-slate-900">{formatCurrency(totalPreview)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); setEditingId(null); }} disabled={createMutation.isPending || updateMutation.isPending}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingId ? 'Guardar cambios' : 'Crear pago'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar pago</DialogTitle>
            <DialogDescription>Esta acción no se puede deshacer.</DialogDescription>
          </DialogHeader>
          <div className="py-4 text-sm text-slate-700">
            ¿Eliminar el pago de "{deleteTarget?.nombre}"?
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleteMutation.isPending}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} disabled={deleteMutation.isPending}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

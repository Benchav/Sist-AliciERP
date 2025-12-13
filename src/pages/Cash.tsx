import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { PageHeading } from '@/components/PageHeading';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Download, Filter, Plus, Loader2 } from 'lucide-react';
import { CASH_QUERY_KEY } from '@/lib/queryKeys';
import { cashService, type CashFilters } from '@/services/cash.service';
import { formatCurrency } from '@/lib/format';
import { getApiErrorMessage } from '@/lib/errors';
import type { CashTipo, CreateCashDTO, CashMovement } from '@/types';
import { cn } from '@/lib/utils';

const TIPO_OPTIONS: { value: CashTipo; label: string }[] = [
  { value: 'INGRESO', label: 'Ingreso' },
  { value: 'EGRESO', label: 'Egreso' },
];

const formatDate = (iso: string) => {
  try {
    return format(new Date(iso), 'yyyy-MM-dd HH:mm');
  } catch (_) {
    return iso;
  }
};

const toIsoDate = (value: string | null | undefined) => {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00`);
  return date.toISOString();
};

export default function CashPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<{ from: string; to: string; tipo: CashTipo | 'TODOS' }>({
    from: '',
    to: '',
    tipo: 'TODOS',
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formState, setFormState] = useState<{
    tipo: CashTipo | '';
    monto: string;
    descripcion: string;
    referenciaId: string;
    referenciaTipo: string;
    fecha: string;
  }>({
    tipo: '',
    monto: '',
    descripcion: '',
    referenciaId: '',
    referenciaTipo: '',
    fecha: new Date().toISOString().slice(0, 10),
  });

  const sanitizedFilters: CashFilters = useMemo(() => {
    const next: CashFilters = {};
    if (filters.from) next.from = toIsoDate(filters.from);
    if (filters.to) next.to = toIsoDate(filters.to);
    if (filters.tipo !== 'TODOS') next.tipo = filters.tipo;
    return next;
  }, [filters]);

  const cashQuery = useQuery({
    queryKey: CASH_QUERY_KEY(sanitizedFilters),
    queryFn: () => cashService.listCash(sanitizedFilters),
    staleTime: 3 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateCashDTO) => cashService.createCash(payload),
    onSuccess: () => {
      toast.success('Movimiento registrado');
      queryClient.invalidateQueries({ queryKey: CASH_QUERY_KEY(sanitizedFilters) });
      setDialogOpen(false);
      setFormState((prev) => ({ ...prev, monto: '', descripcion: '', referenciaId: '', referenciaTipo: '' }));
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'No se pudo registrar el movimiento'));
    },
  });

  const validateForm = (): CreateCashDTO | null => {
    const tipo = formState.tipo;
    const monto = Number(formState.monto);
    const descripcion = formState.descripcion.trim();
    const referenciaId = formState.referenciaId.trim();
    const referenciaTipo = formState.referenciaTipo.trim();
    const fecha = formState.fecha ? toIsoDate(formState.fecha) : undefined;

    if (!tipo) {
      toast.error('Selecciona tipo de movimiento');
      return null;
    }
    if (!Number.isFinite(monto) || monto <= 0) {
      toast.error('Ingresa un monto mayor a 0');
      return null;
    }

    return {
      tipo,
      monto,
      descripcion: descripcion || undefined,
      referenciaId: referenciaId || undefined,
      referenciaTipo: referenciaTipo || undefined,
      fecha,
    };
  };

  const handleSubmit = () => {
    const payload = validateForm();
    if (!payload) return;
    createMutation.mutate(payload);
  };

  const handleDownload = async () => {
    try {
      const blob = await cashService.downloadCashReport(sanitizedFilters);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'cash-report.csv';
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se pudo descargar el reporte'));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeading title="Caja" description="Movimientos manuales y automáticos de caja" />

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex flex-col gap-3 border-b border-slate-100 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-slate-900">Movimientos de caja</CardTitle>
            <CardDescription>Filtra por fecha, tipo y descarga reporte CSV.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <Input
                type="date"
                value={filters.from}
                onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value }))}
                className="w-40"
                aria-label="Desde"
              />
              <Input
                type="date"
                value={filters.to}
                onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value }))}
                className="w-40"
                aria-label="Hasta"
              />
              <Select
                value={filters.tipo}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, tipo: value as CashTipo | 'TODOS' }))}
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos</SelectItem>
                  {TIPO_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="secondary" onClick={handleDownload} disabled={cashQuery.isLoading}>
              <Download className="mr-2 h-4 w-4" /> CSV
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Registrar movimiento
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {cashQuery.isError ? (
            <Alert variant="destructive" className="m-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{getApiErrorMessage(cashQuery.error, 'No se pudieron cargar los movimientos')}</AlertDescription>
            </Alert>
          ) : null}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Referencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cashQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-slate-500">Cargando movimientos...</TableCell>
                  </TableRow>
                ) : null}
                {!cashQuery.isLoading && cashQuery.data && cashQuery.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-slate-500">Sin movimientos</TableCell>
                  </TableRow>
                ) : null}
                {cashQuery.data?.map((item: CashMovement) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-slate-700">{formatDate(item.fecha)}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'rounded-full px-2 py-1 text-xs font-semibold',
                          item.tipo === 'INGRESO'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        )}
                      >
                        {item.tipo}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-slate-900">{formatCurrency(item.monto)}</TableCell>
                    <TableCell className="text-slate-700">{item.descripcion || '—'}</TableCell>
                    <TableCell className="text-slate-600">
                      {item.referenciaTipo ? (
                        <span className="inline-flex flex-col text-xs font-medium text-slate-700">
                          <span>{item.referenciaTipo}</span>
                          {item.referenciaId ? <span className="text-slate-500">ID: {item.referenciaId}</span> : null}
                        </span>
                      ) : (
                        'Manual'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar movimiento manual</DialogTitle>
            <DialogDescription>Solo admins. Usa referencia para movimientos ligados a ventas, encargos o nómina.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={formState.tipo || ''}
                  onValueChange={(value) => setFormState((prev) => ({ ...prev, tipo: value as CashTipo }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPO_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Monto (C$)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formState.monto}
                  onChange={(e) => setFormState((prev) => ({ ...prev, monto: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input
                placeholder="Opcional"
                value={formState.descripcion}
                onChange={(e) => setFormState((prev) => ({ ...prev, descripcion: e.target.value }))}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Referencia tipo</Label>
                <Input
                  placeholder="Venta, Encargo, Nómina" 
                  value={formState.referenciaTipo}
                  onChange={(e) => setFormState((prev) => ({ ...prev, referenciaTipo: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Referencia ID</Label>
                <Input
                  placeholder="ID externo"
                  value={formState.referenciaId}
                  onChange={(e) => setFormState((prev) => ({ ...prev, referenciaId: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input
                type="date"
                value={formState.fecha}
                onChange={(e) => setFormState((prev) => ({ ...prev, fecha: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={createMutation.isPending}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar movimiento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

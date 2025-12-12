import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeading } from '@/components/PageHeading';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { PRODUCTION_PRODUCTS_QUERY_KEY, WASTE_QUERY_KEY } from '@/lib/queryKeys';
import { productService } from '@/services/product.service';
import { wasteService } from '@/services/waste.service';
import { getApiErrorMessage, getApiErrorStatus } from '@/lib/errors';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function WastePage() {
  const queryClient = useQueryClient();
  const [productoId, setProductoId] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: productos, isLoading } = useQuery({
    queryKey: PRODUCTION_PRODUCTS_QUERY_KEY,
    queryFn: productService.getProducts,
  });

  const wastesQuery = useQuery({
    queryKey: WASTE_QUERY_KEY,
    queryFn: wasteService.fetchWastes,
    staleTime: 5 * 60 * 1000,
  });

  const wasteMutation = useMutation({
    mutationFn: () => wasteService.registerWaste({ productoId, cantidad: Number(cantidad), motivo }),
    onSuccess: () => {
      toast.success('Descarte registrado');
      queryClient.invalidateQueries({ queryKey: PRODUCTION_PRODUCTS_QUERY_KEY });
       queryClient.invalidateQueries({ queryKey: WASTE_QUERY_KEY });
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

  const formatDateTime = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Sin fecha' : date.toLocaleString();
  };

  const filteredWastes = useMemo(() => {
    if (!wastesQuery.data) return [];
    return wastesQuery.data.filter((item) => {
      const text = search.trim().toLowerCase();
      const matchesText = !text
        || item.productoNombre?.toLowerCase().includes(text)
        || item.motivo?.toLowerCase().includes(text);

      const itemDate = new Date(item.fecha);
      const afterStart = startDate ? itemDate >= new Date(startDate) : true;
      const beforeEnd = endDate ? itemDate <= new Date(endDate + 'T23:59:59') : true;

      return matchesText && afterStart && beforeEnd;
    });
  }, [wastesQuery.data, search, startDate, endDate]);

  const wasteErrorStatus = getApiErrorStatus(wastesQuery.error);
  const wasteErrorMessage = wasteErrorStatus === 401 || wasteErrorStatus === 403
    ? 'No autorizado'
    : getApiErrorMessage(wastesQuery.error, 'No se pudieron cargar los descartes');

  return (
    <div className="space-y-6">
      <PageHeading title="Descartes" description="Registra mermas o productos dañados y descuéntalos del inventario" />

      <Card className="border-slate-200 shadow-sm max-w-4xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-slate-900">Registrar descarte</CardTitle>
          <CardDescription className="text-slate-500">Mermas, productos dañados o errores de producción.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
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
            <div className="hidden sm:block" />
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

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setProductoId('');
                setCantidad('');
                setMotivo('');
              }}
            >
              Limpiar
            </Button>
            <Button onClick={handleSubmit} disabled={wasteMutation.isPending} className="min-w-[180px]">
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

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="gap-3 border-b border-slate-100">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-slate-900">Descartes registrados</CardTitle>
              <CardDescription className="text-slate-500">Historial más reciente primero.</CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                placeholder="Buscar por producto o motivo"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-64"
              />
              <div className="flex gap-2">
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-36" />
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-36" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {wastesQuery.isError ? (
            <div className="p-4 text-sm text-red-700">{wasteErrorMessage}</div>
          ) : null}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wastesQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-6 text-center text-slate-500">
                      Cargando descartes...
                    </TableCell>
                  </TableRow>
                ) : null}
                {!wastesQuery.isLoading && filteredWastes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-6 text-center text-slate-500">
                      Aún no se registran descartes
                    </TableCell>
                  </TableRow>
                ) : null}
                {filteredWastes.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-slate-900">{item.productoNombre ?? item.productoId}</TableCell>
                    <TableCell>{item.cantidad}</TableCell>
                    <TableCell className="text-slate-600">{item.motivo || '—'}</TableCell>
                    <TableCell className="text-slate-600">{formatDateTime(item.fecha)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

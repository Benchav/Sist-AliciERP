import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageHeading } from '@/components/PageHeading';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useRecipeByProduct, useRecipeCost, useCreateRecipe } from '@/services/recipe.service';
import { fetchInsumos } from '@/lib/inventoryApi';
import { useAuthStore } from '@/store/authStore';
import { hasRole } from '@/lib/auth';
import type { Insumo } from '@/types';
import type { RecetaInsumo, CreateRecipeDTO } from '@/types/recipe';
import { conversionService } from '@/services/conversion.service';
import { getApiErrorMessage } from '@/lib/errors';
import { ArrowLeft, Beaker, Plus, UtensilsCrossed, AlertTriangle, Calculator } from 'lucide-react';

interface IngredientRow {
  insumoId: string;
  cantidad: string;
  unidad: string;
}

const DEFAULT_INGREDIENT: IngredientRow = { insumoId: '', cantidad: '', unidad: '' };

export default function ProductRecipe() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdminOrBaker = hasRole(user, ['ADMIN', 'PANADERO']);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [nombre, setNombre] = useState('');
  const [cantidadBase, setCantidadBase] = useState('');
  const [costoManoObraEstimado, setCostoManoObraEstimado] = useState('');
  const [gastosOperativosEstimados, setGastosOperativosEstimados] = useState('');
  const [ingredientes, setIngredientes] = useState<IngredientRow[]>([DEFAULT_INGREDIENT]);

  const { data: insumos } = useQuery({ queryKey: ['insumos'], queryFn: fetchInsumos });
  const { data: conversions } = conversionService.useConversions();

  const recetaQuery = useRecipeByProduct(productId ?? '');
  const receta = recetaQuery.data;
  const recetaCostQuery = useRecipeCost(receta?.id);

  const createRecipeMutation = useCreateRecipe();

  const insumoMap = useMemo(() => {
    if (!insumos) return new Map<string, Insumo>();
    return new Map(insumos.map((i) => [i.id, i]));
  }, [insumos]);

  const allowedUnits = useMemo(() => {
    const set = new Set<string>();
    (conversions ?? []).forEach((c) => {
      set.add(c.unidadOrigen.toUpperCase());
      set.add(c.unidadDestino.toUpperCase());
    });
    return set;
  }, [conversions]);

  const allowedUnitsList = useMemo(() => Array.from(allowedUnits).sort(), [allowedUnits]);

  const resetForm = () => {
    setNombre('');
    setCantidadBase('');
    setCostoManoObraEstimado('');
    setGastosOperativosEstimados('');
    setIngredientes([DEFAULT_INGREDIENT]);
  };

  const addIngredient = () => setIngredientes((prev) => [...prev, DEFAULT_INGREDIENT]);
  const updateIngredient = (index: number, patch: Partial<IngredientRow>) => {
    setIngredientes((prev) => prev.map((ing, i) => (i === index ? { ...ing, ...patch } : ing)));
  };
  const removeIngredient = (index: number) =>
    setIngredientes((prev) => prev.filter((_, i) => i !== index));

  const sanitizePayload = (): CreateRecipeDTO | null => {
    if (!productId) {
      toast.error('Producto no encontrado');
      return null;
    }

    const base = parseFloat(cantidadBase);
    const manoObra = parseFloat(costoManoObraEstimado || '0');
    const gastos = parseFloat(gastosOperativosEstimados || '0');

    if (!nombre.trim()) {
      toast.error('El nombre de la receta es obligatorio');
      return null;
    }
    if (Number.isNaN(base) || base <= 0) {
      toast.error('La cantidad base debe ser mayor a cero');
      return null;
    }

    const normalizedIngredients: RecetaInsumo[] = [];
    for (const ing of ingredientes) {
      const qty = parseFloat(ing.cantidad);
      if (!ing.insumoId.trim()) {
        toast.error('Selecciona un insumo en cada fila');
        return null;
      }
      if (Number.isNaN(qty) || qty <= 0) {
        toast.error('Las cantidades deben ser mayores a cero');
        return null;
      }
      const unit = ing.unidad.trim().toUpperCase();
      if (allowedUnits.size > 0 && !allowedUnits.has(unit)) {
        toast.error(`La unidad "${unit}" no está en la lista de conversiones soportadas.`);
        return null;
      }
      normalizedIngredients.push({
        id: crypto.randomUUID(),
        insumoId: ing.insumoId,
        cantidad: qty,
        unidad: unit,
      });
    }

    return {
      productoId: productId,
      nombre: nombre.trim(),
      cantidadBase: base,
      costoManoObraEstimado: Number.isNaN(manoObra) ? 0 : manoObra,
      gastosOperativosEstimados: Number.isNaN(gastos) ? 0 : gastos,
      insumos: normalizedIngredients,
    };
  };

  const handleCreateRecipe = () => {
    const payload = sanitizePayload();
    if (!payload) return;

    createRecipeMutation.mutate(payload, {
      onSuccess: (created) => {
        toast.success('Receta creada');
        setIsDialogOpen(false);
        resetForm();
        recetaQuery.refetch();
        recetaCostQuery.refetch();
      },
      onError: (error) => {
        toast.error(getApiErrorMessage(error, 'No se pudo crear la receta'));
      },
    });
  };

  const renderRecipeDetail = () => {
    if (!receta) return null;
    return (
      <div className="space-y-4">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 bg-white px-6 py-4">
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <UtensilsCrossed className="h-5 w-5 text-indigo-600" />
              Ingredientes de la receta
            </CardTitle>
            <CardDescription>Insumos y cantidades definidas para este producto.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/60">
                <TableRow>
                  <TableHead className="pl-6">Insumo</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Unidad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receta.insumos.map((ing) => {
                  const insumo = insumoMap.get(ing.insumoId);
                  return (
                    <TableRow key={ing.id}>
                      <TableCell className="pl-6 font-medium text-slate-900">{insumo?.nombre ?? ing.insumoId}</TableCell>
                      <TableCell>{ing.cantidad}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-slate-200 text-slate-700">
                          {ing.unidad}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 bg-white px-6 py-4">
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Calculator className="h-5 w-5 text-indigo-600" />
              Costos estimados
            </CardTitle>
            <CardDescription>Valores calculados en tiempo real por el backend.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recetaCostQuery.isLoading ? (
              <p className="text-sm text-slate-500">Calculando costos...</p>
            ) : recetaCostQuery.data ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Card className="border-slate-100 bg-slate-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-slate-500">Costo total del lote</CardTitle>
                      <CardDescription className="text-2xl font-bold text-slate-900">
                        C$ {recetaCostQuery.data.costoTotal.toFixed(2)}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                  <Card className="border-slate-100 bg-slate-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-slate-500">Costo unitario sugerido</CardTitle>
                      <CardDescription className="text-2xl font-bold text-slate-900">
                        C$ {recetaCostQuery.data.costoUnitario.toFixed(2)}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </div>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-700">Detalle</p>
                  <div className="rounded-lg border border-slate-100 bg-slate-50">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Insumo</TableHead>
                          <TableHead>Cant. Receta</TableHead>
                          <TableHead>Conversión</TableHead>
                          <TableHead>Costo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recetaCostQuery.data.detalles.map((detalle, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{detalle.insumo}</TableCell>
                            <TableCell>{detalle.cantidadReceta}</TableCell>
                            <TableCell>{detalle.conversion}</TableCell>
                            <TableCell>C$ {detalle.costo.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Sin datos de costos.</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderEmptyState = () => {
    const notFound = recetaQuery.isError && (recetaQuery.error as { response?: { status?: number } })?.response?.status === 404;
    const noData = !receta && !recetaQuery.isLoading;

    if (recetaQuery.isLoading) {
      return <p className="text-sm text-slate-500">Cargando ficha técnica...</p>;
    }

    if (notFound || noData) {
      return (
        <Alert className="border-amber-200 bg-amber-50 text-amber-800">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Sin ficha técnica</AlertTitle>
          <AlertDescription>
            Este producto no tiene receta. Crea una receta estándar para habilitar cálculos de costo.
          </AlertDescription>
          {isAdminOrBaker && (
            <div className="mt-3">
              <Button onClick={() => setIsDialogOpen(true)} className="bg-indigo-600 text-white hover:bg-indigo-700">
                Crear Receta Estándar
              </Button>
            </div>
          )}
        </Alert>
      );
    }

    return null;
  };

  const disableForm = createRecipeMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeading
          title="Ficha Técnica / Receta"
          description="Gestiona ingredientes y costos del producto"
        />
      </div>

      {receta ? renderRecipeDetail() : renderEmptyState()}

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva receta</DialogTitle>
            <DialogDescription>Define insumos, rendimientos y costos estimados.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nombre de la receta</Label>
                <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Receta estándar" />
              </div>
              <div className="space-y-2">
                <Label>Cantidad base (rendimiento)</Label>
                <Input value={cantidadBase} onChange={(e) => setCantidadBase(e.target.value)} type="number" min="0" step="0.01" />
              </div>
              <div className="space-y-2">
                <Label>Costo mano de obra</Label>
                <Input value={costoManoObraEstimado} onChange={(e) => setCostoManoObraEstimado(e.target.value)} type="number" min="0" step="0.01" />
              </div>
              <div className="space-y-2">
                <Label>Gastos operativos</Label>
                <Input value={gastosOperativosEstimados} onChange={(e) => setGastosOperativosEstimados(e.target.value)} type="number" min="0" step="0.01" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Ingredientes</Label>
                <Badge variant="secondary" className="bg-slate-100 text-slate-700">Usa insumos de inventario</Badge>
              </div>
              <div className="space-y-3 rounded-xl border border-slate-200 bg-white">
                <div className="hidden grid-cols-12 gap-3 border-b border-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:grid">
                  <span className="col-span-6">Insumo</span>
                  <span className="col-span-3">Cantidad</span>
                  <span className="col-span-3">Unidad</span>
                </div>
                <div className="space-y-2 p-2 sm:p-0">
                  {ingredientes.map((ing, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-1 gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-3 sm:grid-cols-12 sm:border-0 sm:bg-transparent sm:px-4 sm:py-3"
                    >
                      <div className="space-y-1 sm:col-span-6">
                        <Label className="sm:hidden">Insumo</Label>
                        <select
                          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          value={ing.insumoId}
                          onChange={(e) => updateIngredient(idx, { insumoId: e.target.value })}
                          disabled={disableForm}
                        >
                          <option value="">Selecciona un insumo</option>
                          {(insumos ?? []).map((insumo) => (
                            <option key={insumo.id} value={insumo.id}>
                              {insumo.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1 sm:col-span-3">
                        <Label className="sm:hidden">Cantidad</Label>
                        <Input
                          value={ing.cantidad}
                          onChange={(e) => updateIngredient(idx, { cantidad: e.target.value })}
                          type="number"
                          step="0.01"
                          min="0"
                          disabled={disableForm}
                          className="shadow-sm"
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-3">
                        <Label className="sm:hidden">Unidad</Label>
                        <Select
                          value={ing.unidad || undefined}
                          onValueChange={(value) => updateIngredient(idx, { unidad: value.toUpperCase() })}
                          disabled={disableForm || allowedUnitsList.length === 0}
                        >
                          <SelectTrigger className="shadow-sm">
                            <SelectValue placeholder={allowedUnitsList.length === 0 ? 'No hay unidades cargadas' : 'Selecciona unidad'} />
                          </SelectTrigger>
                          <SelectContent>
                            {allowedUnitsList.map((unit) => (
                              <SelectItem key={`${idx}-${unit}`} value={unit}>
                                {unit}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {allowedUnitsList.length === 0 ? (
                          <p className="text-[11px] text-amber-600">Carga conversiones de unidades antes de crear la receta.</p>
                        ) : null}
                      </div>
                      <div className="flex items-end justify-end gap-2 sm:col-span-12">
                        {ingredientes.length > 1 && (
                          <Button variant="outline" size="sm" onClick={() => removeIngredient(idx)} disabled={disableForm}>
                            Eliminar
                          </Button>
                        )}
                        {idx === ingredientes.length - 1 && (
                          <Button variant="secondary" size="sm" onClick={addIngredient} disabled={disableForm}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={disableForm}>
              Cancelar
            </Button>
            <Button onClick={handleCreateRecipe} disabled={disableForm}>
              {disableForm ? 'Guardando...' : 'Guardar receta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

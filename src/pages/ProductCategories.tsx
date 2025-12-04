import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { PageHeading } from '@/components/PageHeading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/errors';
import { categoryService } from '@/services/category.service';
import { INVENTORY_CATEGORIES_QUERY_KEY } from '@/lib/queryKeys';
import type { Categoria, CategoriaTipo, CreateCategoryDTO, UpdateCategoryDTO } from '@/types';
import { Loader2, Plus, Tags, Trash2, PenSquare, RefreshCcw } from 'lucide-react';

const CATEGORY_TYPES = ['PRODUCCION', 'REVENTA'] as const;

const categorySchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  tipo: z.enum(CATEGORY_TYPES, {
    required_error: 'Selecciona el tipo de categoría',
  }),
  descripcion: z
    .string()
    .max(200, 'Máximo 200 caracteres')
    .optional()
    .or(z.literal('')),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

const DEFAULT_VALUES: CategoryFormValues = {
  nombre: '',
  tipo: 'PRODUCCION',
  descripcion: '',
};

const sanitizePayload = (values: CategoryFormValues): CreateCategoryDTO => {
  const payload: CreateCategoryDTO = {
    nombre: values.nombre.trim(),
    tipo: values.tipo,
  };

  if (values.descripcion && values.descripcion.trim().length > 0) {
    payload.descripcion = values.descripcion.trim();
  }

  return payload;
};

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('es-NI', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
};

const getTypeBadgeVariant = (tipo: CategoriaTipo) => {
  if (tipo === 'PRODUCCION') {
    return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  }
  return 'bg-amber-100 text-amber-800 border-amber-200';
};

export default function ProductCategories() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Categoria | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Categoria | null>(null);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: DEFAULT_VALUES,
  });

  const {
    data: categories,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: INVENTORY_CATEGORIES_QUERY_KEY,
    queryFn: categoryService.getCategories,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateCategoryDTO) => categoryService.createCategory(payload),
    onSuccess: () => {
      toast.success('Categoría creada correctamente');
      queryClient.invalidateQueries({ queryKey: INVENTORY_CATEGORIES_QUERY_KEY });
      setIsDialogOpen(false);
      form.reset(DEFAULT_VALUES);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'No se pudo crear la categoría'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCategoryDTO }) =>
      categoryService.updateCategory(id, payload),
    onSuccess: () => {
      toast.success('Categoría actualizada');
      queryClient.invalidateQueries({ queryKey: INVENTORY_CATEGORIES_QUERY_KEY });
      setIsDialogOpen(false);
      setSelectedCategory(null);
      form.reset(DEFAULT_VALUES);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'No se pudo actualizar la categoría'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoryService.deleteCategory(id),
    onSuccess: () => {
      toast.success('Categoría eliminada');
      queryClient.invalidateQueries({ queryKey: INVENTORY_CATEGORIES_QUERY_KEY });
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'No se pudo eliminar la categoría'));
    },
  });

  const sortedCategories = useMemo(() => {
    if (!categories) return [];
    return [...categories].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [categories]);

  const openingCreateDialog = () => {
    setSelectedCategory(null);
    form.reset(DEFAULT_VALUES);
    setIsDialogOpen(true);
  };

  const openingEditDialog = (category: Categoria) => {
    setSelectedCategory(category);
    form.reset({
      nombre: category.nombre,
      tipo: category.tipo,
      descripcion: category.descripcion ?? '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (values: CategoryFormValues) => {
    const payload = sanitizePayload(values);
    if (selectedCategory) {
      updateMutation.mutate({ id: selectedCategory.id, payload });
      return;
    }
    createMutation.mutate(payload);
  };

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeading
          title="Categorías de productos"
          description="Organiza los grupos de productos para producción y reventa."
        />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
            title="Recargar"
            className="hidden sm:inline-flex"
          >
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          </Button>
          <Button
            onClick={openingCreateDialog}
            className="w-full sm:w-auto bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nueva categoría
          </Button>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-white px-6 py-4">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg font-semibold text-slate-900">Listado</CardTitle>
            <CardDescription>Consulta y administra las categorías disponibles.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="min-h-[200px]">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-500" />
                Cargando categorías...
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
                <p>Ocurrió un error al cargar las categorías.</p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  Reintentar
                </Button>
              </div>
            ) : sortedCategories.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
                <Tags className="h-12 w-12 text-slate-200" />
                No hay categorías registradas.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow className="hover:bg-slate-50">
                      <TableHead className="pl-6">Nombre</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Actualizado</TableHead>
                      <TableHead className="pr-6 text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedCategories.map((category) => (
                      <TableRow key={category.id} className="hover:bg-slate-50/60">
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                              <Tags className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{category.nombre}</p>
                              <p className="text-xs text-slate-500">ID: {category.id}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`${getTypeBadgeVariant(category.tipo)} capitalize`}
                          >
                            {category.tipo === 'PRODUCCION' ? 'Producción' : 'Reventa'}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-md">
                          {category.descripcion ? (
                            <p className="text-sm text-slate-600">{category.descripcion}</p>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-slate-500">{formatDate(category.updatedAt ?? category.createdAt)}</span>
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                              onClick={() => openingEditDialog(category)}
                              title="Editar"
                            >
                              <PenSquare className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-slate-400 hover:bg-red-50 hover:text-red-600"
                              onClick={() => {
                                setCategoryToDelete(category);
                                setDeleteDialogOpen(true);
                              }}
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setSelectedCategory(null);
            form.reset(DEFAULT_VALUES);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedCategory ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle>
            <DialogDescription>
              Define el nombre, tipo y descripción para clasificar tus productos.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-2">
            <div className="space-y-2">
              <label htmlFor="nombre" className="text-sm font-medium text-slate-700">
                Nombre *
              </label>
              <Input id="nombre" {...form.register('nombre')} />
              {form.formState.errors.nombre && (
                <p className="text-sm text-red-500">{form.formState.errors.nombre.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Tipo *</label>
              <Select
                value={form.watch('tipo')}
                onValueChange={(value) => form.setValue('tipo', value as CategoriaTipo)}
              >
                <SelectTrigger id="tipo">
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_TYPES.map((type) => (
                    <SelectItem key={type} value={type} className="capitalize">
                      {type === 'PRODUCCION' ? 'Producción' : 'Reventa'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.tipo && (
                <p className="text-sm text-red-500">{form.formState.errors.tipo.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="descripcion" className="text-sm font-medium text-slate-700">
                Descripción
              </label>
              <Textarea id="descripcion" rows={3} {...form.register('descripcion')} />
              {form.formState.errors.descripcion && (
                <p className="text-sm text-red-500">{form.formState.errors.descripcion.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isFormSubmitting}>
                {selectedCategory
                  ? updateMutation.isPending
                    ? 'Actualizando...'
                    : 'Actualizar'
                  : createMutation.isPending
                    ? 'Guardando...'
                    : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) {
            setCategoryToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar categoría</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. "{categoryToDelete?.nombre}" será eliminada y
              los productos deberán reasignarse manualmente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (categoryToDelete) {
                  deleteMutation.mutate(categoryToDelete.id);
                }
              }}
            >
              {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


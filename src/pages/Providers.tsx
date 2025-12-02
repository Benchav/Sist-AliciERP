import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PageHeading } from '@/components/PageHeading';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/errors';
import { providerService } from '@/services/provider.service';
import type { CreateProviderDTO, Provider, UpdateProviderDTO } from '@/types';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Building2, Phone, Mail, RefreshCcw, Trash2, PenSquare } from 'lucide-react';

const providerSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  contacto: z.string().optional(),
  telefono: z.string().optional(),
  email: z
    .string()
    .email('Correo inválido')
    .optional()
    .or(z.literal('')),
  frecuencia: z.string().optional(),
  notas: z.string().optional(),
});

type ProviderFormValues = z.infer<typeof providerSchema>;

const DEFAULT_FORM_VALUES: ProviderFormValues = {
  nombre: '',
  contacto: '',
  telefono: '',
  email: '',
  frecuencia: '',
  notas: '',
};

const sanitizePayload = (values: ProviderFormValues): CreateProviderDTO => {
  const payload: CreateProviderDTO = {
    nombre: values.nombre.trim(),
  };

  const optionalKeys: Array<keyof Omit<CreateProviderDTO, 'nombre'>> = [
    'contacto',
    'telefono',
    'email',
    'frecuencia',
    'notas',
  ];

  optionalKeys.forEach((key) => {
    const rawValue = values[key as keyof ProviderFormValues];
    if (rawValue && rawValue.trim().length > 0) {
      payload[key] = rawValue.trim();
    }
  });

  return payload;
};

export default function Providers() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [providerToDelete, setProviderToDelete] = useState<Provider | null>(null);

  const form = useForm<ProviderFormValues>({
    resolver: zodResolver(providerSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  });

  const { data: providers, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['providers'],
    queryFn: providerService.getProviders,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: CreateProviderDTO) => providerService.createProvider(payload),
    onSuccess: () => {
      toast.success('Proveedor creado correctamente');
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      setDialogOpen(false);
      form.reset(DEFAULT_FORM_VALUES);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'No se pudo crear el proveedor'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateProviderDTO }) =>
      providerService.updateProvider(id, payload),
    onSuccess: () => {
      toast.success('Proveedor actualizado correctamente');
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      setDialogOpen(false);
      setSelectedProvider(null);
      form.reset(DEFAULT_FORM_VALUES);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'No se pudo actualizar el proveedor'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => providerService.deleteProvider(id),
    onSuccess: () => {
      toast.success('Proveedor eliminado');
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      setDeleteDialogOpen(false);
      setProviderToDelete(null);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'No se pudo eliminar el proveedor'));
    },
  });

  const openingCreateDialog = () => {
    setSelectedProvider(null);
    form.reset(DEFAULT_FORM_VALUES);
    setDialogOpen(true);
  };

  const openingEditDialog = (provider: Provider) => {
    setSelectedProvider(provider);
    form.reset({
      nombre: provider.nombre,
      contacto: provider.contacto ?? '',
      telefono: provider.telefono ?? '',
      email: provider.email ?? '',
      frecuencia: provider.frecuencia ?? '',
      notas: provider.notas ?? '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = (values: ProviderFormValues) => {
    const payload = sanitizePayload(values);
    if (selectedProvider) {
      updateMutation.mutate({ id: selectedProvider.id, payload });
      return;
    }
    createMutation.mutate(payload);
  };

  const sortedProviders = useMemo(() => {
    if (!providers) return [];
    return [...providers].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [providers]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeading
          title="Proveedores"
          description="Gestiona a tus proveedores de materia prima y productos."
        />
        <Button
          onClick={openingCreateDialog}
          className="w-full sm:w-auto bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuevo proveedor
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-white px-6 py-4">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg font-semibold text-slate-900">Listado</CardTitle>
            <CardDescription>Monitorea y actualiza la red de proveedores.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="min-h-[200px]">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-500" />
                Cargando proveedores...
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
                <p>Ocurrió un error al cargar los proveedores.</p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  Reintentar
                </Button>
              </div>
            ) : sortedProviders.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
                <Building2 className="h-12 w-12 text-slate-200" />
                No hay proveedores registrados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow className="hover:bg-slate-50">
                      <TableHead className="pl-6">Nombre</TableHead>
                      <TableHead>Contacto</TableHead>
                      <TableHead>Frecuencia</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-right pr-6">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedProviders.map((provider) => (
                      <TableRow key={provider.id} className="hover:bg-slate-50/60">
                        <TableCell className="pl-6">
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-900">{provider.nombre}</span>
                            {provider.telefono && (
                              <span className="text-xs text-slate-500 flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {provider.telefono}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {provider.contacto ? (
                            <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                              {provider.contacto}
                            </Badge>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {provider.frecuencia ? (
                            <Badge variant="outline" className="capitalize border-slate-200 text-slate-600">
                              {provider.frecuencia}
                            </Badge>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {provider.email ? (
                            <div className="text-sm text-slate-600 flex items-center gap-1">
                              <Mail className="h-3.5 w-3.5 text-slate-400" />
                              {provider.email}
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                              onClick={() => openingEditDialog(provider)}
                              title="Editar"
                            >
                              <PenSquare className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                              onClick={() => {
                                setProviderToDelete(provider);
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
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setSelectedProvider(null);
            form.reset(DEFAULT_FORM_VALUES);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedProvider ? 'Editar proveedor' : 'Nuevo proveedor'}</DialogTitle>
            <DialogDescription>
              Completa la información para mantener la ficha del proveedor actualizada.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4 py-2"
          >
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input id="nombre" {...form.register('nombre')} />
              {form.formState.errors.nombre && (
                <p className="text-sm text-red-500">{form.formState.errors.nombre.message}</p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contacto">Contacto</Label>
                <Input id="contacto" {...form.register('contacto')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input id="telefono" {...form.register('telefono')} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Correo</Label>
                <Input id="email" type="email" {...form.register('email')} />
                {form.formState.errors.email && (
                  <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="frecuencia">Frecuencia</Label>
                <Input id="frecuencia" placeholder="Semanal, quincenal..." {...form.register('frecuencia')} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notas">Notas</Label>
              <Textarea id="notas" rows={3} {...form.register('notas')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {selectedProvider
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
            setProviderToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar proveedor</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El proveedor "{providerToDelete?.nombre}" será eliminado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (providerToDelete) {
                  deleteMutation.mutate(providerToDelete.id);
                }
              }}
            >
              {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isFetching && !isLoading && (
        <div className="fixed bottom-4 right-4 flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm text-slate-600 shadow-lg">
          <RefreshCcw className="h-4 w-4 animate-spin" /> Actualizando proveedores...
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { Config } from '@/types';
import { getApiErrorMessage } from '@/lib/errors';
import { PageHeading } from '@/components/PageHeading';

export default function Settings() {
  const queryClient = useQueryClient();
  const [exchangeRate, setExchangeRate] = useState('');

  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Config }>('/config');
      setExchangeRate(data.data.tasaCambio.toString());
      return data.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (tasaCambio: number) => {
      await api.put('/config', { tasaCambio });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
      toast.success('Configuración actualizada exitosamente');
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Error al actualizar configuración'));
    },
  });

  const handleUpdate = () => {
    const rate = parseFloat(exchangeRate);
    if (isNaN(rate) || rate <= 0) {
      toast.error('Ingrese una tasa de cambio válida');
      return;
    }
    updateMutation.mutate(rate);
  };

  return (
    <div className="space-y-6">
      <PageHeading title="Configuración" description="Actualiza parámetros clave como la tasa de cambio." />

      <Card>
        <CardHeader>
          <CardTitle>Tasa de Cambio</CardTitle>
          <CardDescription>
            Configure la tasa de cambio para conversión USD a NIO
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="exchange-rate">Tasa de Cambio (USD a NIO)</Label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <Input
                id="exchange-rate"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(e.target.value)}
                className="w-full sm:max-w-xs"
              />
              <Button
                onClick={handleUpdate}
                disabled={updateMutation.isPending}
                className="w-full sm:w-auto"
              >
                {updateMutation.isPending ? 'Actualizando...' : 'Actualizar'}
              </Button>
            </div>
            {config && (
              <p className="text-sm text-muted-foreground">
                Tasa actual: C${config.tasaCambio.toFixed(2)}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

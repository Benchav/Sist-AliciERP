import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/errors';
import { PageHeading } from '@/components/PageHeading';
import { Coins, Save } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { updateSystemConfig } from '@/lib/configApi';

export default function Settings() {
  const [exchangeRate, setExchangeRate] = useState('');
  const [overheadPercent, setOverheadPercent] = useState('');
  const { config, fetchConfig, setConfig, isConfigLoading } = useAuthStore();

  useEffect(() => {
    if (!config) {
      fetchConfig().catch((error) => {
        toast.error(getApiErrorMessage(error, 'No se pudo cargar la configuración del sistema'));
      });
    }
  }, [config, fetchConfig]);

  useEffect(() => {
    if (config) {
      setExchangeRate(config.tasaCambio.toString());
      const factor = typeof config.factorOverhead === 'number' && Number.isFinite(config.factorOverhead)
        ? config.factorOverhead
        : 0;
      setOverheadPercent((factor * 100).toString());
    }
  }, [config]);

  const updateMutation = useMutation({
    mutationFn: async ({ tasaCambio, factorOverhead }: { tasaCambio: number; factorOverhead: number }) => {
      await updateSystemConfig({ tasaCambio, factorOverhead });
    },
    onSuccess: () => {
      setConfig({
        tasaCambio: parseFloat(exchangeRate),
        factorOverhead: parseFloat(overheadPercent) / 100,
      });
      toast.success('Configuración actualizada exitosamente');
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Error al actualizar configuración'));
    },
  });

  const handleUpdate = () => {
    const rate = parseFloat(exchangeRate);
    const overhead = parseFloat(overheadPercent);
    if (isNaN(rate) || rate <= 0) {
      toast.error('Ingrese una tasa de cambio válida');
      return;
    }
    if (isNaN(overhead) || overhead < 0) {
      toast.error('Ingrese un porcentaje de overhead válido');
      return;
    }
    updateMutation.mutate({ tasaCambio: rate, factorOverhead: overhead / 100 });
  };

  return (
    <div className="space-y-6">
      <PageHeading title="Configuración" description="Actualiza parámetros clave como la tasa de cambio." />

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 bg-white px-6 py-4">
            <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Coins className="h-5 w-5 text-indigo-600" />
              Tasa de Cambio
            </CardTitle>
            <CardDescription className="text-slate-500">
              Configure la tasa de cambio para conversión USD a NIO
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-3">
              <Label htmlFor="exchange-rate" className="text-slate-700">Tasa de Cambio (USD a NIO)</Label>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">C$</span>
                    <Input
                      id="exchange-rate"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={exchangeRate}
                      onChange={(e) => setExchangeRate(e.target.value)}
                      className="pl-9 border-slate-200 focus-visible:ring-indigo-500"
                    />
                  </div>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">%</span>
                    <Input
                      id="overhead-percent"
                      type="number"
                      step="0.01"
                      placeholder="60"
                      value={overheadPercent}
                      onChange={(e) => setOverheadPercent(e.target.value)}
                      className="pl-9 border-slate-200 focus-visible:ring-indigo-500"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleUpdate}
                  disabled={updateMutation.isPending}
                  className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200"
                >
                  {updateMutation.isPending ? (
                    'Actualizando...'
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Actualizar
                    </>
                  )}
                </Button>
              </div>
              {config && (
                <p className="text-sm text-slate-500 bg-slate-50 p-3 rounded border border-slate-100 space-y-1">
                  <span className="block">Tasa actual: <span className="font-semibold text-slate-900">C${config.tasaCambio.toFixed(2)}</span></span>
                  <span className="block">
                    Overhead: <span className="font-semibold text-slate-900">
                      {typeof config.factorOverhead === 'number' && Number.isFinite(config.factorOverhead)
                        ? `${(config.factorOverhead * 100).toFixed(2)}%`
                        : '—'}
                    </span>
                  </span>
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

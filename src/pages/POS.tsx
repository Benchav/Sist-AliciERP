import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, ShoppingCart, Trash2, Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, amountToCents, calculateChange, calculateTotalPayment } from '@/lib/format';
import { getApiErrorMessage } from '@/lib/errors';
import type { Producto, Config, CheckoutRequest } from '@/types';
import { useAuthStore } from '@/store/authStore';

interface CartItem {
  producto: Producto;
  cantidad: number;
}

export default function POS() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkoutDialog, setCheckoutDialog] = useState(false);
  const [paymentNIO, setPaymentNIO] = useState('');
  const [paymentUSD, setPaymentUSD] = useState('');
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    setQuantityDrafts((prev) => {
      const next = { ...prev };
      const ids = new Set(cart.map((item) => item.producto.id));
      Object.keys(next).forEach((id) => {
        if (!ids.has(id)) {
          delete next[id];
        }
      });
      return next;
    });
  }, [cart]);

  const { data: productos } = useQuery({
    queryKey: ['productos'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Producto[] }>('/production/products');
      return data.data;
    },
  });

  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Config }>('/config');
      return data.data;
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async (request: CheckoutRequest) => {
      await api.post('/sales/checkout', request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      toast.success('Venta procesada exitosamente');
      setCart([]);
      setCheckoutDialog(false);
      setPaymentNIO('');
      setPaymentUSD('');
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Error al procesar venta'));
    },
  });

  const filteredProducts = useMemo(() => {
    if (!productos) return [];
    const needle = search.toLowerCase();
    return productos.filter((p) => {
      const haystack = `${p.nombre} ${p.categoria ?? ''}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [productos, search]);

  const addToCart = (producto: Producto) => {
    if (producto.stockDisponible === 0) {
      toast.error('Producto sin stock');
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.producto.id === producto.id);
      if (existing) {
        if (existing.cantidad >= producto.stockDisponible) {
          toast.error('No hay más stock disponible');
          return prev;
        }
        return prev.map((item) =>
          item.producto.id === producto.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      }
      return [...prev, { producto, cantidad: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.producto.id === productId) {
            const newCantidad = item.cantidad + delta;
            if (newCantidad <= 0) return null;
            if (newCantidad > item.producto.stockDisponible) {
              toast.error('No hay más stock disponible');
              return item;
            }
            return { ...item, cantidad: newCantidad };
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.producto.id !== productId));
  };

  const handleQuantityInputChange = (productId: string, value: string) => {
    const digitsOnly = value.replace(/[^0-9]/g, '');
    setQuantityDrafts((prev) => ({
      ...prev,
      [productId]: digitsOnly,
    }));
  };

  const commitQuantityInput = (productId: string) => {
    const draft = quantityDrafts[productId];
    if (!draft) {
      setQuantityDrafts((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
      return;
    }

    const parsed = parseInt(draft, 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
      toast.error('Ingrese una cantidad válida');
      setQuantityDrafts((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
      return;
    }

    setCart((prev) =>
      prev.map((item) => {
        if (item.producto.id !== productId) {
          return item;
        }

        if (parsed > item.producto.stockDisponible) {
          toast.error('No hay más stock disponible');
          return item;
        }

        return { ...item, cantidad: parsed };
      })
    );

    setQuantityDrafts((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  const totalNIO = useMemo(
    () => cart.reduce((sum, item) => sum + item.producto.precioVenta * item.cantidad, 0),
    [cart]
  );

  const change = useMemo(() => {
    if (!config) return 0;
    const nioPayment = parseFloat(paymentNIO) || 0;
    const usdPayment = parseFloat(paymentUSD) || 0;
    return calculateChange(totalNIO, nioPayment, usdPayment, config.tasaCambio);
  }, [totalNIO, paymentNIO, paymentUSD, config]);

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }

    if (!config) {
      toast.error('No se pudo obtener la configuración de pago');
      return;
    }

    if (!user) {
      toast.error('Sesión no disponible. Vuelva a iniciar sesión.');
      return;
    }

    const nioPayment = parseFloat(paymentNIO) || 0;
    const usdPayment = parseFloat(paymentUSD) || 0;
    const totalPayment = calculateTotalPayment(nioPayment, usdPayment, config.tasaCambio);

    if (totalPayment < totalNIO) {
      toast.error('El pago es insuficiente');
      return;
    }

    const pagos: CheckoutRequest['pagos'] = [];

    if (nioPayment > 0) {
      pagos.push({ moneda: 'NIO', cantidad: amountToCents(nioPayment) });
    }

    if (usdPayment > 0) {
      pagos.push({
        moneda: 'USD',
        cantidad: amountToCents(usdPayment),
        tasa: config.tasaCambio,
      });
    }

    const request: CheckoutRequest = {
      items: cart.map((item) => ({
        productoId: item.producto.id,
        cantidad: item.cantidad,
      })),
      pagos,
    };

    checkoutMutation.mutate(request);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Punto de Venta</h1>
        <p className="text-muted-foreground">Procesar ventas</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Products Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar productos..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((producto) => (
              <Card
                key={producto.id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => addToCart(producto)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{producto.nombre}</CardTitle>
                  {producto.categoria && (
                    <Badge variant="outline" className="w-fit">
                      {producto.categoria}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-primary">
                      {formatCurrency(producto.precioVenta)}
                    </span>
                    <Badge variant={producto.stockDisponible > 0 ? 'default' : 'destructive'}>
                      Stock: {producto.stockDisponible}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Cart */}
        <div className="lg:col-span-1">
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Carrito
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cart.length === 0 ? (
                <p className="text-center text-muted-foreground">Carrito vacío</p>
              ) : (
                <>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {cart.map((item) => (
                      <div
                        key={item.producto.id}
                        className="flex items-center gap-2 rounded-lg border p-3"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{item.producto.nombre}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(item.producto.precioVenta)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.producto.id, -1)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={quantityDrafts[item.producto.id] ?? item.cantidad.toString()}
                            onChange={(e) => handleQuantityInputChange(item.producto.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.currentTarget.blur();
                              }
                            }}
                            onBlur={() => commitQuantityInput(item.producto.id)}
                            className="h-8 w-16 text-center"
                          />
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.producto.id, 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => removeFromCart(item.producto.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span className="text-primary">{formatCurrency(totalNIO)}</span>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => setCheckoutDialog(true)}
                  >
                    Procesar Venta
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={checkoutDialog} onOpenChange={setCheckoutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Procesar Pago</DialogTitle>
            <DialogDescription>
              Total a pagar: {formatCurrency(totalNIO)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="payment-nio">Pago en Córdobas (C$)</Label>
              <Input
                id="payment-nio"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={paymentNIO}
                onChange={(e) => setPaymentNIO(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-usd">Pago en Dólares ($)</Label>
              <Input
                id="payment-usd"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={paymentUSD}
                onChange={(e) => setPaymentUSD(e.target.value)}
              />
              {config && (
                <p className="text-xs text-muted-foreground">
                  Tasa de cambio: C${config.tasaCambio.toFixed(2)}
                </p>
              )}
            </div>
            {change > 0 && (
              <div className="rounded-lg bg-success/10 p-3">
                <p className="text-sm font-medium">Cambio a devolver:</p>
                <p className="text-xl font-bold text-success">{formatCurrency(change)}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCheckout} disabled={checkoutMutation.isPending}>
              {checkoutMutation.isPending ? 'Procesando...' : 'Confirmar Pago'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

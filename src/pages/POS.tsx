import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, amountToCents, calculateChange, calculateTotalPayment } from '@/lib/format';
import { getApiErrorMessage } from '@/lib/errors';
import type { Producto, SaleRequest } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { PageHeading } from '@/components/PageHeading';
import { PRODUCTION_PRODUCTS_QUERY_KEY } from '@/lib/queryKeys';
import { productService } from '@/services/product.service';
import { salesService } from '@/services/sales.service';

interface CartItem {
  productId: string;
  cantidad: number;
}

export default function POS() {
  const queryClient = useQueryClient();
  const { user, config, fetchConfig } = useAuthStore();
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkoutDialog, setCheckoutDialog] = useState(false);
  const [paymentNIO, setPaymentNIO] = useState('');
  const [paymentUSD, setPaymentUSD] = useState('');
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>({});
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const getIsDesktop = () => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(min-width: 1024px)').matches;
  };
  const [isDesktop, setIsDesktop] = useState<boolean>(getIsDesktop);

  useEffect(() => {
    setQuantityDrafts((prev) => {
      const next = { ...prev };
      const ids = new Set(cart.map((item) => item.productId));
      Object.keys(next).forEach((id) => {
        if (!ids.has(id)) {
          delete next[id];
        }
      });
      return next;
    });
  }, [cart]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const handler = () => setIsDesktop(mediaQuery.matches);
    handler();
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (cart.length === 0) {
      setMobileCartOpen(false);
    }
  }, [cart.length]);

  const { data: productos } = useQuery({
    queryKey: PRODUCTION_PRODUCTS_QUERY_KEY,
    queryFn: productService.getProducts,
  });

  const productMap = useMemo(() => {
    if (!productos) return new Map<string, Producto>();
    return new Map(productos.map((producto) => [producto.id, producto]));
  }, [productos]);

  useEffect(() => {
    setCart((prev) =>
      prev.filter((item) => {
        const product = productMap.get(item.productId);
        return product && product.stockDisponible > 0;
      })
    );
  }, [productMap]);

  useEffect(() => {
    if (!config) {
      fetchConfig().catch((error) => {
        toast.error(getApiErrorMessage(error, 'No se pudo cargar la configuración del sistema'));
      });
    }
  }, [config, fetchConfig]);

  const checkoutMutation = useMutation({
    mutationFn: async (request: SaleRequest) => {
      await salesService.createSale(request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTION_PRODUCTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['products'] });
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
    const latestProduct = productMap.get(producto.id) ?? producto;

    if (latestProduct.stockDisponible === 0) {
      toast.error('Producto sin stock');
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === latestProduct.id);
      if (existing) {
        if (latestProduct && existing.cantidad >= latestProduct.stockDisponible) {
          toast.error('No hay más stock disponible');
          return prev;
        }
        return prev.map((item) =>
          item.productId === latestProduct.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      }
      return [...prev, { productId: latestProduct.id, cantidad: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    const product = productMap.get(productId);
    if (!product) {
      setCart((prev) => prev.filter((item) => item.productId !== productId));
      toast.error('Producto no disponible');
      return;
    }

    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId) {
            const newCantidad = item.cantidad + delta;
            if (newCantidad <= 0) return null;
            if (newCantidad > product.stockDisponible) {
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
    setCart((prev) => prev.filter((item) => item.productId !== productId));
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

    const product = productMap.get(productId);
    if (!product) {
      toast.error('Producto no disponible');
      removeFromCart(productId);
      return;
    }

    if (parsed > product.stockDisponible) {
      toast.error('No hay más stock disponible');
      setQuantityDrafts((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
      return;
    }

    setCart((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) {
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

  const totalNIO = useMemo(() => {
    return cart.reduce((sum, item) => {
      const product = productMap.get(item.productId);
      if (!product) return sum;
      return sum + product.precioVenta * item.cantidad;
    }, 0);
  }, [cart, productMap]);

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

    const pagos: SaleRequest['pagos'] = [];

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

    const unavailableItem = cart.find((item) => !productMap.get(item.productId));
    if (unavailableItem) {
      toast.error('Algunos productos ya no están disponibles, actualice el carrito.');
      setCart((prev) => prev.filter((item) => productMap.get(item.productId)));
      return;
    }

    const request: SaleRequest = {
      items: cart.map((item) => ({
        productoId: item.productId,
        cantidad: item.cantidad,
      })),
      pagos,
    };

    checkoutMutation.mutate(request);
  };

  const handleCheckoutButton = () => {
    setCheckoutDialog(true);
    if (!isDesktop) {
      setMobileCartOpen(false);
    }
  };

  const renderCartContent = (scrollAreaClasses = 'max-h-96 overflow-y-auto') => {
    if (cart.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <ShoppingCart className="h-12 w-12 mb-3 opacity-20" />
          <p className="text-sm font-medium">El carrito está vacío</p>
          <p className="text-xs">Agregue productos para comenzar</p>
        </div>
      );
    }

    return (
      <>
        <div className={`space-y-3 ${scrollAreaClasses} pr-2`}>
          {cart.map((item) => {
            const product = productMap.get(item.productId);
            if (!product) return null;
            return (
              <div key={item.productId} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3 transition-colors hover:bg-slate-50">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{product.nombre}</p>
                  <p className="text-sm text-slate-500">{formatCurrency(product.precioVenta)}</p>
                </div>
                <div className="flex items-center gap-1 bg-white rounded-md border border-slate-200 shadow-sm p-0.5">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                    onClick={() => updateQuantity(item.productId, -1)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={quantityDrafts[item.productId] ?? item.cantidad.toString()}
                    onChange={(e) => handleQuantityInputChange(item.productId, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur();
                      }
                    }}
                    onBlur={() => commitQuantityInput(item.productId)}
                    className="h-7 w-10 border-0 text-center p-0 focus-visible:ring-0 font-medium text-slate-900"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                    onClick={() => updateQuantity(item.productId, 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                  onClick={() => removeFromCart(item.productId)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>

        <Separator className="my-4" />

        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <span className="text-sm font-medium text-slate-500">Total a pagar</span>
            <span className="text-2xl font-bold text-slate-900">{formatCurrency(totalNIO)}</span>
          </div>
          
          <Button 
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200 h-11 text-base" 
            onClick={handleCheckoutButton} 
            disabled={checkoutMutation.isPending}
          >
            {checkoutMutation.isPending ? 'Procesando...' : 'Procesar Venta'}
          </Button>
        </div>
      </>
    );
  };

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <PageHeading
        title="Punto de Venta"
        description="Atiende más rápido con búsqueda inteligente y carrito en vivo."
      />

      <div className="grid gap-6 lg:grid-cols-3 items-start">
        {/* Products Grid */}
        <div className="order-2 space-y-4 lg:order-1 lg:col-span-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar productos por nombre o categoría..."
              className="pl-10 h-11 bg-white border-slate-200 shadow-sm focus-visible:ring-indigo-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((producto) => (
              <Card
                key={producto.id}
                className="cursor-pointer transition-all hover:shadow-md hover:border-indigo-200 group border-slate-200 shadow-sm overflow-hidden"
                onClick={() => addToCart(producto)}
              >
                <CardHeader className="pb-3 pt-4 px-4">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-base font-semibold text-slate-900 line-clamp-2 leading-tight group-hover:text-indigo-600 transition-colors">
                      {producto.nombre}
                    </CardTitle>
                    {producto.categoria && (
                      <Badge variant="secondary" className="shrink-0 bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200">
                        {producto.categoria}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="flex items-end justify-between">
                    <span className="text-lg font-bold text-slate-900">
                      {formatCurrency(producto.precioVenta)}
                    </span>
                    <Badge 
                      variant="outline" 
                      className={producto.stockDisponible > 0 
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                        : "bg-red-50 text-red-700 border-red-100"
                      }
                    >
                      Stock: {producto.stockDisponible}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Cart */}
        <div className="order-1 hidden lg:order-2 lg:block lg:col-span-1">
          <Card className="md:sticky md:top-6 border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <ShoppingCart className="h-5 w-5 text-indigo-600" />
                Carrito de compra
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">{renderCartContent()}</CardContent>
          </Card>
        </div>
      </div>

      {!isDesktop && (
        <>
          <div className="fixed inset-x-0 bottom-20 z-40 px-4 lg:hidden">
            <Button
              className="w-full shadow-xl bg-indigo-600 hover:bg-indigo-700 text-white h-14 rounded-xl transition-all active:scale-95"
              size="lg"
              onClick={() => setMobileCartOpen(true)}
            >
              <div className="flex w-full items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  <span className="font-semibold">
                    {cart.length === 0 ? 'Ver Carrito' : `Ver Carrito (${cart.length})`}
                  </span>
                </div>
                {cart.length > 0 && (
                  <span className="font-bold text-lg">{formatCurrency(totalNIO)}</span>
                )}
              </div>
            </Button>
          </div>

          <Sheet open={mobileCartOpen} onOpenChange={setMobileCartOpen}>
            <SheetContent side="bottom" className="h-[85vh] rounded-t-[2rem] border-t-0 shadow-2xl p-0 flex flex-col">
              <SheetHeader className="px-6 pt-6 pb-4 border-b border-slate-100 text-left">
                <SheetTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <ShoppingCart className="h-5 w-5 text-indigo-600" /> 
                  Carrito de compra
                </SheetTitle>
                <SheetDescription className="sr-only">
                  Revise los productos agregados al carrito antes de procesar la venta.
                </SheetDescription>
              </SheetHeader>
              <div className="flex-1 overflow-hidden p-6 flex flex-col">
                {renderCartContent('flex-1 overflow-y-auto min-h-0')}
              </div>
            </SheetContent>
          </Sheet>
        </>
      )}

      {/* Checkout Dialog */}
      <Dialog open={checkoutDialog} onOpenChange={setCheckoutDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <CreditCard className="h-5 w-5 text-indigo-600" />
              Procesar Pago
            </DialogTitle>
            <DialogDescription>
              Ingrese los montos recibidos para completar la venta.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-6">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex justify-between items-center">
              <span className="text-sm font-medium text-slate-500">Total a cobrar</span>
              <span className="text-2xl font-bold text-slate-900">{formatCurrency(totalNIO)}</span>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="payment-nio" className="text-slate-700">Pago en Córdobas (C$)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">C$</span>
                  <Input
                    id="payment-nio"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={paymentNIO}
                    onChange={(e) => setPaymentNIO(e.target.value)}
                    className="pl-9 text-lg font-medium"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="payment-usd" className="text-slate-700">Pago en Dólares ($)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
                  <Input
                    id="payment-usd"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={paymentUSD}
                    onChange={(e) => setPaymentUSD(e.target.value)}
                    className="pl-7 text-lg font-medium"
                  />
                </div>
                {config && (
                  <p className="text-xs text-slate-500 text-right">
                    Tasa de cambio: <span className="font-medium text-slate-700">C${config.tasaCambio.toFixed(2)}</span>
                  </p>
                )}
              </div>
            </div>

            {change > 0 && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-4 flex justify-between items-center animate-in fade-in slide-in-from-bottom-2">
                <span className="text-sm font-medium text-emerald-800">Cambio a devolver</span>
                <span className="text-xl font-bold text-emerald-700">{formatCurrency(change)}</span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCheckoutDialog(false)} className="border-slate-200">
              Cancelar
            </Button>
            <Button 
              onClick={handleCheckout} 
              disabled={checkoutMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200"
            >
              {checkoutMutation.isPending ? 'Procesando...' : 'Confirmar Pago'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
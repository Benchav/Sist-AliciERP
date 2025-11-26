export type UserRole = 'ADMIN' | 'PANADERO' | 'CAJERO';

export interface User {
  id: string;
  username: string;
  role: UserRole;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Insumo {
  id: string;
  nombre: string;
  unidad: string;
  stock: number;
  costoPromedio: number;
  createdAt: string;
  updatedAt: string;
}

export interface Producto {
  id: string;
  nombre: string;
  categoria: string;
  precioVenta: number;
  stock: number;
  createdAt: string;
  updatedAt: string;
}

export interface RecetaItem {
  insumo: Insumo;
  cantidad: number;
}

export interface Receta {
  id: string;
  producto: Producto;
  items: RecetaItem[];
}

export interface Venta {
  id: string;
  fecha: string;
  total: number;
  items: VentaItem[];
  pagos: Pago[];
  estado: 'ACTIVA' | 'ANULADA';
  createdAt: string;
}

export interface VentaItem {
  producto: Producto;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface Pago {
  moneda: 'NIO' | 'USD';
  monto: number;
}

export interface Config {
  tasaCambio: number;
}

export interface CheckoutRequest {
  items: Array<{
    productoId: string;
    cantidad: number;
  }>;
  pagos: Pago[];
}

export interface PurchaseRequest {
  insumoId: string;
  cantidad: number;
  costo: number;
}

export interface ProductionRequest {
  productoId: string;
  cantidad: number;
}

export interface DashboardStats {
  ventasHoy: number;
  insumosStockBajo: number;
  productosDisponibles: number;
}

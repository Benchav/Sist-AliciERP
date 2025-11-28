export type UserRole = 'ADMIN' | 'PANADERO' | 'CAJERO';

export interface User {
  id: string;
  username: string;
  role: UserRole;
}

export interface AuthUserPayload {
  id: string;
  username: string;
  role?: UserRole;
  rol?: UserRole;
  nombre?: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUserPayload;
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
  categoria?: string;
  precioVenta: number;
  stockDisponible: number;
  createdAt: string;
  updatedAt: string;
}

export interface RecetaItem {
  id: string;
  insumoId: string;
  cantidad: number;
  insumo?: Insumo;
}

export interface Receta {
  id: string;
  nombre: string;
  productoId: string;
  costoManoObra?: number;
  producto?: Producto;
  items: RecetaItem[];
}

export interface VentaItem {
  id: string;
  productoId: string;
  productoNombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface Pago {
  moneda: 'NIO' | 'USD';
  cantidad: number;
  tasa?: number;
}

export interface Venta {
  id: string;
  fecha: string;
  totalNIO: number;
  items: VentaItem[];
  pagos: Pago[];
  estado: 'COMPLETA' | 'ANULADA';
  createdAt: string;
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
  costoTotal: number;
}

export interface ProductionRequest {
  recetaId: string;
  cantidad: number;
}

export interface DashboardStats {
  ventasHoy: number;
  ventasMes: number;
  ventasMesAnterior: number;
  gastosMes: number;
  insumosStockBajo: number;
  productosDisponibles: number;
}

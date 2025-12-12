export type UserRole = 'ADMIN' | 'PANADERO' | 'CAJERO';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  nombre?: string;
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
  proveedorPrincipalId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Provider {
  id: string;
  nombre: string;
  contacto?: string;
  telefono?: string;
  email?: string;
  frecuencia?: string;
  notas?: string;
  createdAt: string;
  updatedAt: string;
}

export type CategoriaTipo = 'PRODUCCION' | 'REVENTA';

export interface Categoria {
  id: string;
  nombre: string;
  tipo: CategoriaTipo;
  descripcion?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCategoryDTO {
  nombre: string;
  tipo: CategoriaTipo;
  descripcion?: string | null;
}

export type UpdateCategoryDTO = Partial<CreateCategoryDTO>;

export interface Producto {
  id: string;
  nombre: string;
  categoria?: string;
  categoriaId?: string | null;
  precioUnitario?: number;
  precioVenta: number;
  stockDisponible: number;
  costoUnitario?: number;
  costoUnitarioActualizadoEn?: string;
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

export type OrderStatus = 'PENDIENTE' | 'ENTREGADO' | 'CANCELADO';

export interface OrderItem {
  productoId: string;
  productoNombre?: string;
  cantidad: number;
  precioUnitario?: number;
  subtotal?: number;
}

export interface OrderDeposit {
  id: string;
  monto: number;
  medioPago: 'EFECTIVO' | 'TRANSFERENCIA';
  createdAt: string;
}

export interface Order {
  id: string;
  cliente: string;
  fechaEntrega: string;
  estado: OrderStatus;
  totalEstimado?: number;
  abonos?: OrderDeposit[];
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderDTO {
  cliente: string;
  fechaEntrega: string; //Formato de la fecha: YYYY-MM-DD
  items: Array<{ productoId: string; cantidad: number }>;
}

export interface CreateOrderDepositDTO {
  monto: number;
  medioPago: 'EFECTIVO' | 'TRANSFERENCIA';
}

export interface FinalizeOrderDTO {
  pagos: Pago[];
  descuento: number;
}

export interface WasteRequest {
  productoId: string;
  cantidad: number;
  motivo: string;
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

export interface CreateProviderDTO {
  nombre: string;
  contacto?: string;
  telefono?: string;
  email?: string;
  frecuencia?: string;
  notas?: string;
}

export type UpdateProviderDTO = Partial<CreateProviderDTO>;

export interface CreateProductDTO {
  nombre: string;
  precioVenta: number;
  precioUnitario: number;
  stockDisponible: number;
  categoriaId?: string;
}

export type UpdateProductDTO = Partial<CreateProductDTO>;

export interface SaleItemInput {
  productoId: string;
  cantidad: number;
}

export interface SaleRequest {
  items: SaleItemInput[];
  pagos: Pago[];
}

export interface PurchaseRequest {
  insumoId: string;
  cantidad: number;
  costoTotal: number;
}

export interface ProductionIngredientInput {
  insumoId: string;
  cantidad: number;
}

export interface DailyProductionLotRequest {
  productoId: string;
  cantidadProducida: number;
  costoManoObra?: number;
  insumos: ProductionIngredientInput[];
}

export type DailyProductionRequest = DailyProductionLotRequest[];

export interface DailyProductionLotSummary {
  loteId?: string;
  productoId: string;
  cantidadProducida: number;
  costoUnitario?: number;
  costoTotal?: number;
  stockActualizado?: number;
}

export interface DailyProductionResponse {
  lotes: DailyProductionLotSummary[];
  resumen?: {
    totalLotes?: number;
    unidadesTotales?: number;
    costoTotal?: number;
    updatedAt?: string;
  };
}

export interface ProductionRecordInsumo {
  insumoId: string;
  cantidad: number;
  costoUnitario: number;
  costoTotal: number;
}

export interface ProductionRecord {
  id: string;
  productoId: string;
  volumenSolicitado: number;
  costoIngredientes: number;
  costoManoObra: number;
  costoTotal: number;
  costoUnitario?: number;
  insumosConsumidos?: ProductionRecordInsumo[];
  fecha: string;
}

export interface DashboardStats {
  ventasHoy: number;
  ventasMes: number;
  ventasMesAnterior: number;
  gastosMes: number;
  insumosStockBajo: number;
  productosDisponibles: number;
}

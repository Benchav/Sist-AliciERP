export interface RecetaInsumo {
  id: string;
  insumoId: string;
  cantidad: number;
  unidad: string; // Ej: "LB", "OZ"
}

export interface Receta {
  id: string;
  productoId: string;
  nombre: string;
  cantidadBase: number; // Rendimiento del lote
  costoManoObraEstimado: number;
  gastosOperativosEstimados: number;
  insumos: RecetaInsumo[];
}

export interface CostoReceta {
  costoTotal: number;
  costoUnitario: number;
  costoInsumos: number;
  costoOverhead: number;
  factorOverhead: number;
  detalles: Array<{
    insumo: string;
    cantidadReceta: string;
    conversion: string;
    costo: number;
  }>;
}

export interface UnidadConversion {
  id: string;
  unidadOrigen: string;
  unidadDestino: string;
  factor: number;
}

export interface CreateRecipeDTO {
  productoId: string;
  nombre: string;
  cantidadBase: number;
  costoManoObraEstimado: number;
  gastosOperativosEstimados: number;
  insumos: Array<{
    insumoId: string;
    cantidad: number;
    unidad: string;
  }>;
}

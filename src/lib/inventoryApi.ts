import { api } from './api';
import type { Insumo } from '@/types';

const INVENTORY_BASE = '/inventory';

export const fetchInsumos = async (): Promise<Insumo[]> => {
  const { data } = await api.get<{ data: Insumo[] }>(INVENTORY_BASE);
  return data.data;
};

export type InsumoPayload = {
  nombre: string;
  unidad: string;
  stock: number;
  costoPromedio: number;
  proveedorPrincipalId?: string;
};

export const createInsumo = async (payload: InsumoPayload): Promise<void> => {
  await api.post(INVENTORY_BASE, payload);
};

export const updateInsumo = async (id: string, payload: InsumoPayload): Promise<void> => {
  await api.put(`${INVENTORY_BASE}/${id}`, payload);
};

export const deleteInsumo = async (id: string): Promise<void> => {
  await api.delete(`${INVENTORY_BASE}/${id}`);
};

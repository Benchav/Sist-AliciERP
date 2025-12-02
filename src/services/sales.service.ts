import { api } from '@/lib/api';
import type { SaleRequest, Venta } from '@/types';

const SALES_PATH = '/sales';

type SalesResponse<T> = { data: T };

export const createSale = async (payload: SaleRequest): Promise<Venta> => {
  const { data } = await api.post<SalesResponse<Venta>>(SALES_PATH, payload);
  return data.data;
};

export const getSales = async (params?: { from?: string; to?: string }): Promise<Venta[]> => {
  const sanitizedParams = params && (params.from || params.to) ? params : undefined;
  const { data } = await api.get<SalesResponse<Venta[]>>(SALES_PATH, {
    params: sanitizedParams,
  });
  return data.data;
};

export const salesService = {
  createSale,
  getSales,
};

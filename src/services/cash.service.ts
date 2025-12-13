import { api } from '@/lib/api';
import type { CashMovement, CreateCashDTO, CashTipo } from '@/types';

export type CashFilters = {
  from?: string;
  to?: string;
  tipo?: CashTipo;
};

const listCash = async (filters?: CashFilters): Promise<CashMovement[]> => {
  const { data } = await api.get('/cash', { params: filters });
  return data;
};

const createCash = async (payload: CreateCashDTO): Promise<CashMovement> => {
  const { data } = await api.post('/cash', payload);
  return data;
};

const downloadCashReport = async (filters?: CashFilters): Promise<Blob> => {
  const response = await api.get('/cash/report.csv', {
    params: filters,
    responseType: 'blob',
  });
  return response.data;
};

export const cashService = {
  listCash,
  createCash,
  downloadCashReport,
};

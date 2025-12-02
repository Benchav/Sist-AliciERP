import { api } from '@/lib/api';
import type { CreateProviderDTO, Provider, UpdateProviderDTO } from '@/types';

const PROVIDERS_PATH = '/inventory/providers';

type ProviderResponse<T> = { data: T };

export const getProviders = async (): Promise<Provider[]> => {
  const { data } = await api.get<ProviderResponse<Provider[]>>(PROVIDERS_PATH);
  return data.data;
};

export const createProvider = async (payload: CreateProviderDTO): Promise<Provider> => {
  const { data } = await api.post<ProviderResponse<Provider>>(PROVIDERS_PATH, payload);
  return data.data;
};

export const updateProvider = async (id: string, payload: UpdateProviderDTO): Promise<Provider> => {
  const { data } = await api.put<ProviderResponse<Provider>>(`${PROVIDERS_PATH}/${id}`, payload);
  return data.data;
};

export const deleteProvider = async (id: string): Promise<void> => {
  await api.delete(`${PROVIDERS_PATH}/${id}`);
};

export const providerService = {
  getProviders,
  createProvider,
  updateProvider,
  deleteProvider,
};

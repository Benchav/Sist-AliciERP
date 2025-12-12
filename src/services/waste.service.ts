import { api } from '@/lib/api';
import type { WasteRequest } from '@/types';

const WASTE_PATH = '/waste';

type WasteResponse<T> = { data: T };

type WasteResult = {
  success?: boolean;
  message?: string;
};

export const registerWaste = async (payload: WasteRequest): Promise<WasteResult> => {
  const { data } = await api.post<WasteResponse<WasteResult>>(WASTE_PATH, payload);
  return data.data;
};

export const wasteService = {
  registerWaste,
};

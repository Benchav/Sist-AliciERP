import { api } from '@/lib/api';
import type { WasteItem, WasteRequest } from '@/types';

const WASTE_PATH = '/waste';

type WasteResponse<T> = { data: T };

export const fetchWastes = async (): Promise<WasteItem[]> => {
  const { data } = await api.get<WasteResponse<WasteItem[]>>(WASTE_PATH);
  return data.data;
};

export const registerWaste = async (payload: WasteRequest): Promise<WasteItem> => {
  const { data } = await api.post<WasteResponse<WasteItem>>(WASTE_PATH, payload);
  return data.data;
};

export const wasteService = {
  fetchWastes,
  registerWaste,
};

import { api } from './api';
import type { Config } from '@/types';

const CONFIG_PATH = '/config';

export const fetchSystemConfig = async (): Promise<Config> => {
  const { data } = await api.get<{ data: Config }>(CONFIG_PATH);
  return data.data;
};

export const updateSystemConfig = async (tasaCambio: number): Promise<void> => {
  await api.put(CONFIG_PATH, { tasaCambio });
};

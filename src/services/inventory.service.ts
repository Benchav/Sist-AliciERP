import { api } from '@/lib/api';
import type { Provider, PurchaseRequest } from '@/types';
import { providerService } from './provider.service';

const INVENTORY_PATH = '/inventory';
const PURCHASE_PATH = `${INVENTORY_PATH}/purchase`;

export const registerPurchase = async (payload: PurchaseRequest): Promise<void> => {
  await api.post(PURCHASE_PATH, payload);
};

export const getInventoryProviders = async (): Promise<Provider[]> => {
  return providerService.getProviders();
};

export const inventoryService = {
  registerPurchase,
  getProviders: getInventoryProviders,
};

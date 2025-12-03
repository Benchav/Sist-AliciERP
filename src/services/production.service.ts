import { api } from '@/lib/api';
import type {
  DailyProductionRequest,
  DailyProductionResponse,
  ProductionRecord,
} from '@/types';

const PRODUCTION_BASE_PATH = '/production';

type ApiEnvelope<T> = { data: T };

const unwrapResponse = <T>(payload: ApiEnvelope<T> | T): T => {
  if (payload && typeof payload === 'object' && 'data' in (payload as ApiEnvelope<T>)) {
    return (payload as ApiEnvelope<T>).data;
  }
  return payload as T;
};

export const submitDailyProduction = async (
  request: DailyProductionRequest,
): Promise<DailyProductionResponse> => {
  const { data } = await api.post<ApiEnvelope<DailyProductionResponse> | DailyProductionResponse>(
    `${PRODUCTION_BASE_PATH}/daily`,
    request,
  );
  return unwrapResponse(data);
};

export const fetchProductionHistory = async (): Promise<ProductionRecord[]> => {
  const { data } = await api.get<ApiEnvelope<ProductionRecord[]> | ProductionRecord[]>(
    `${PRODUCTION_BASE_PATH}/history`,
  );
  return unwrapResponse(data);
};

export const productionService = {
  submitDailyProduction,
  fetchProductionHistory,
};

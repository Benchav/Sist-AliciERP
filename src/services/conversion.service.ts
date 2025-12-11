import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { CONVERSIONS_QUERY_KEY } from '@/lib/queryKeys';
import type { UnidadConversion } from '@/types/recipe';

const CONVERSIONS_PATH = '/conversions';

export const getConversions = async (): Promise<UnidadConversion[]> => {
  // Endpoint returns direct array, NOT wrapped in { data: ... }
  const { data } = await api.get<UnidadConversion[]>(CONVERSIONS_PATH);
  return data;
};

export const useConversions = () =>
  useQuery({
    queryKey: CONVERSIONS_QUERY_KEY,
    queryFn: getConversions,
  });

export const conversionService = {
  getConversions,
  useConversions,
};

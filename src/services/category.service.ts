import { api } from '@/lib/api';
import type { Categoria } from '@/types';

const INVENTORY_CATEGORIES_PATH = '/inventory/categories';

type CategoryResponse<T> = { data: T };

export const getCategories = async (): Promise<Categoria[]> => {
  const { data } = await api.get<CategoryResponse<Categoria[]>>(INVENTORY_CATEGORIES_PATH);
  return data.data;
};

export const categoryService = {
  getCategories,
};

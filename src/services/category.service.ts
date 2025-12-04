import { api } from '@/lib/api';
import type { Categoria, CreateCategoryDTO, UpdateCategoryDTO } from '@/types';

const INVENTORY_CATEGORIES_PATH = '/inventory/categories';

type CategoryResponse<T> = { data: T };

export const getCategories = async (): Promise<Categoria[]> => {
  const { data } = await api.get<CategoryResponse<Categoria[]>>(INVENTORY_CATEGORIES_PATH);
  return data.data;
};

export const createCategory = async (payload: CreateCategoryDTO): Promise<Categoria> => {
  const { data } = await api.post<CategoryResponse<Categoria>>(INVENTORY_CATEGORIES_PATH, payload);
  return data.data;
};

export const updateCategory = async (id: string, payload: UpdateCategoryDTO): Promise<Categoria> => {
  const { data } = await api.put<CategoryResponse<Categoria>>(`${INVENTORY_CATEGORIES_PATH}/${id}`, payload);
  return data.data;
};

export const deleteCategory = async (id: string): Promise<void> => {
  await api.delete(`${INVENTORY_CATEGORIES_PATH}/${id}`);
};

export const categoryService = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};

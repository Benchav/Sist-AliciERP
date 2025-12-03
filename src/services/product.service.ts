import { api } from '@/lib/api';
import type { CreateProductDTO, Producto, UpdateProductDTO } from '@/types';

const PRODUCTS_PATH = '/production/products';

type ProductResponse<T> = { data: T };

export const getProducts = async (): Promise<Producto[]> => {
  const { data } = await api.get<ProductResponse<Producto[]>>(PRODUCTS_PATH);
  return data.data;
};

export const createProduct = async (payload: CreateProductDTO): Promise<Producto> => {
  const { data } = await api.post<ProductResponse<Producto>>(PRODUCTS_PATH, payload);
  return data.data;
};

export const updateProduct = async (id: string, payload: UpdateProductDTO): Promise<Producto> => {
  const { data } = await api.put<ProductResponse<Producto>>(`${PRODUCTS_PATH}/${id}`, payload);
  return data.data;
};

export const deleteProduct = async (id: string): Promise<void> => {
  await api.delete(`${PRODUCTS_PATH}/${id}`);
};

export const productService = {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
};

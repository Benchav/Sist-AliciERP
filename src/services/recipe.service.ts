import { api } from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RECIPE_BY_PRODUCT_QUERY_KEY, RECIPE_COST_QUERY_KEY } from '@/lib/queryKeys';
import type { Receta, CreateRecipeDTO, CostoReceta } from '@/types/recipe';

const RECIPES_PATH = '/recipes';

type RecipeResponse<T> = { data: T };

export const getRecipeByProduct = async (productoId: string): Promise<Receta> => {
  // Returns wrapped object { data: Receta }
  const { data } = await api.get<RecipeResponse<Receta>>(`${RECIPES_PATH}/product/${productoId}`);
  return data.data;
};

export const createRecipe = async (payload: CreateRecipeDTO): Promise<Receta> => {
  // Returns wrapped object { data: Receta }
  const { data } = await api.post<RecipeResponse<Receta>>(RECIPES_PATH, payload);
  return data.data;
};

export const getRecipeCost = async (id: string): Promise<CostoReceta> => {
  // Returns direct object { costoTotal, ... }, NOT wrapped
  const { data } = await api.get<CostoReceta>(`${RECIPES_PATH}/${id}/cost`);
  return data;
};

export const useRecipeByProduct = (productId: string) =>
  useQuery({
    queryKey: RECIPE_BY_PRODUCT_QUERY_KEY(productId),
    queryFn: () => getRecipeByProduct(productId),
    retry: (failureCount, error: { response?: { status?: number } }) => {
      // Allow surface of 404 as a controlled state (no receta yet)
      if (error?.response?.status === 404) return false;
      return failureCount < 3;
    },
  });

export const useRecipeCost = (recipeId?: string) =>
  useQuery({
    queryKey: recipeId ? RECIPE_COST_QUERY_KEY(recipeId) : ['recipe-cost', 'missing-id'],
    queryFn: () => getRecipeCost(recipeId!),
    enabled: Boolean(recipeId),
  });

export const useCreateRecipe = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRecipeDTO) => createRecipe(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: RECIPE_BY_PRODUCT_QUERY_KEY(data.productoId) });
      queryClient.invalidateQueries({ queryKey: RECIPE_COST_QUERY_KEY(data.id) });
    },
  });
};

export const recipeService = {
  getRecipeByProduct,
  createRecipe,
  getRecipeCost,
  useRecipeByProduct,
  useRecipeCost,
  useCreateRecipe,
};

export const PRODUCTION_PRODUCTS_QUERY_KEY = ['production-products'] as const;
export const PRODUCTION_HISTORY_QUERY_KEY = ['production-history'] as const;
export const INVENTORY_CATEGORIES_QUERY_KEY = ['inventory-categories'] as const;
export const CONVERSIONS_QUERY_KEY = ['conversions'] as const;
export const RECIPE_BY_PRODUCT_QUERY_KEY = (productId: string) => ['recipe-by-product', productId] as const;
export const RECIPE_COST_QUERY_KEY = (recipeId: string) => ['recipe-cost', recipeId] as const;
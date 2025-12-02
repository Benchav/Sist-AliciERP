import type { Producto } from '@/types';

export const DEFAULT_PRODUCT_CATEGORY = 'Sin categoría';

type CategoryRule = {
  label: string;
  keywords: string[];
};

const CATEGORY_RULES: CategoryRule[] = [
  {
    label: 'Pan simple',
    keywords: ['baguette', 'baguete', 'pan frances', 'pan simple', 'bolillo', 'telera'],
  },
  {
    label: 'Pan dulce',
    keywords: ['dulce', 'concha', 'cinnamon', 'role', 'danes', 'empanada', 'donut', 'donas'],
  },
  {
    label: 'Postres',
    keywords: ['postre', 'flan', 'gelatina', 'brownie', 'galleta', 'cupcake'],
  },
  {
    label: 'Pasteles',
    keywords: ['pastel', 'cake', 'torta', 'cheesecake'],
  },
];

const normalizeText = (value?: string | null) =>
  value?.toLowerCase().normalize('NFD').replace(/[^a-z0-9\s]/g, '').trim() ?? '';

const matchesKeywords = (value: string, keywords: string[]) =>
  keywords.some((keyword) => value.includes(keyword));

export const getProductCategory = (producto: Producto): string => {
  const explicitCategory = producto.categoria?.trim();
  if (explicitCategory) {
    return explicitCategory;
  }

  const normalizedName = normalizeText(producto.nombre);
  for (const rule of CATEGORY_RULES) {
    if (matchesKeywords(normalizedName, rule.keywords)) {
      return rule.label;
    }
  }

  return DEFAULT_PRODUCT_CATEGORY;
};

export const getAvailableProductCategories = (productos: Producto[]): string[] => {
  const categories = new Set<string>();
  productos.forEach((producto) => categories.add(getProductCategory(producto)));
  return Array.from(categories).sort((a, b) => a.localeCompare(b, 'es'));
};

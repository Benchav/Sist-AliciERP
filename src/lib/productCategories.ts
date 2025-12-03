import type { Producto } from '@/types';

export const DEFAULT_PRODUCT_CATEGORY = 'Sin categoría';

type CategoryRule = {
  label: 'Pan Simple' | 'Pan Dulce' | 'Postres' | 'Tortas';
  keywords: string[];
};

const CATEGORY_RULES: CategoryRule[] = [
  {
    label: 'Pan Simple',
    keywords: [
      'pan simple',
      'pan salado',
      'baguette',
      'baguete',
      'bagette',
      'pan frances',
      'bolillo',
      'telera',
      'pan campesino',
      'pan integral',
      'pan rustico',
    ],
  },
  {
    label: 'Pan Dulce',
    keywords: [
      'pan dulce',
      'concha',
      'cinnamon',
      'rol',
      'role',
      'danes',
      'empanada',
      'donut',
      'donas',
      'mantecada',
      'cachito',
      'bolleria',
      'croissant',
      'cuernito',
      'palmera',
      'hojaldre',
      'trenza',
      'ensaimada',
    ],
  },
  {
    label: 'Postres',
    keywords: ['postre', 'flan', 'gelatina', 'mousse', 'tres leches', 'pay', 'brownie', 'cupcake', 'galleta'],
  },
  {
    label: 'Tortas',
    keywords: ['torta', 'pastel', 'cake', 'cheesecake', 'tarta'],
  },
];

const normalizeText = (value?: string | null) =>
  value?.toLowerCase().normalize('NFD').replace(/[^a-z0-9\s]/g, '').trim() ?? '';

const matchesKeywords = (value: string, keywords: string[]) =>
  keywords.some((keyword) => value.includes(keyword));

const inferCategoryFromValue = (value: string): string | null => {
  if (!value) return null;
  for (const rule of CATEGORY_RULES) {
    if (matchesKeywords(value, rule.keywords)) {
      return rule.label;
    }
  }
  return null;
};

export const getProductCategory = (producto: Producto): string => {
  const normalizedSources = [producto.nombre, producto.categoria]
    .map((source) => normalizeText(source))
    .filter(Boolean);

  for (const value of normalizedSources) {
    const category = inferCategoryFromValue(value);
    if (category) {
      return category;
    }
  }

  return DEFAULT_PRODUCT_CATEGORY;
};

export const getAvailableProductCategories = (productos: Producto[]): string[] => {
  const categories = new Set<string>();
  productos.forEach((producto) => categories.add(getProductCategory(producto)));
  return Array.from(categories).sort((a, b) => a.localeCompare(b, 'es'));
};

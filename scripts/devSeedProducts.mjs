#!/usr/bin/env node
import { setTimeout as delay } from 'node:timers/promises';

const API_BASE_URL = process.env.API_BASE_URL?.replace(/\/$/, '') ?? 'https://sist-alici.vercel.app/api';
const API_TOKEN = process.env.API_TOKEN;
const DRY_RUN = process.env.DRY_RUN === '1';

if (!API_TOKEN) {
  console.error('❌  Missing API_TOKEN environment variable.');
  console.error('    Example: API_TOKEN="<jwt>" node scripts/devSeedProducts.mjs');
  process.exit(1);
}

const defaultHeaders = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${API_TOKEN}`,
};

const safeFetchJson = async (path, init = {}) => {
  const target = `${API_BASE_URL}${path}`;
  const mergedHeaders = { ...defaultHeaders, ...(init.headers ?? {}) };
  const response = await fetch(target, { ...init, headers: mergedHeaders });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Request to ${target} failed (${response.status}): ${text}`);
  }

  if (response.status === 204) {
    return undefined;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return undefined;
};

const CATEGORY_SEEDS = [
  {
    nombre: 'Panadería Tradicional',
    tipo: 'PRODUCCION',
    descripcion: 'Productos fabricados diariamente en el obrador.',
  },
  {
    nombre: 'Selectos de Góndola',
    tipo: 'REVENTA',
    descripcion: 'Artículos comprados a proveedores para reventa directa.',
  },
];

const PRODUCT_SEEDS = [
  {
    nombre: 'Baguette Artesanal',
    precioUnitario: 18,
    precioVenta: 25,
    stockDisponible: 48,
    categoryRef: 'Panadería Tradicional',
  },
  {
    nombre: 'Chocolate Chips',
    precioUnitario: 8,
    precioVenta: 15,
    stockDisponible: 80,
    categoryRef: 'Panadería Tradicional',
  },
  {
    nombre: 'Café Tostado Especial',
    precioUnitario: 180,
    precioVenta: 260,
    stockDisponible: 32,
    categoryRef: 'Selectos de Góndola',
  },
  {
    nombre: 'Mermelada Artesanal Frutos Rojos',
    precioUnitario: 70,
    precioVenta: 115,
    stockDisponible: 24,
    categoryRef: 'Selectos de Góndola',
  },
];

const pretty = (value) => JSON.stringify(value, null, 2);

const ensureCategories = async () => {
  const current = await safeFetchJson('/inventory/categories');
  const list = current?.data ?? [];
  const created = [];
  const resolved = new Map();

  for (const seed of CATEGORY_SEEDS) {
    const match = list.find((item) => item.nombre.toLowerCase() === seed.nombre.toLowerCase());
    if (match) {
      resolved.set(seed.nombre, match);
      continue;
    }

    if (DRY_RUN) {
      console.log(`ℹ️  Would create category: ${seed.nombre}`);
      resolved.set(seed.nombre, { ...seed, id: 'dry-run' });
      continue;
    }

    const response = await safeFetchJson('/inventory/categories', {
      method: 'POST',
      body: JSON.stringify(seed),
    });

    const category = response?.data ?? response;
    if (!category?.id) {
      throw new Error(`Unexpected response when creating category ${seed.nombre}: ${pretty(response)}`);
    }
    resolved.set(seed.nombre, category);
    created.push(category);
    await delay(150);
  }

  return { resolved, created };
};

const ensureProducts = async (categoryMap) => {
  const current = await safeFetchJson('/production/products');
  const list = current?.data ?? [];
  const created = [];

  for (const seed of PRODUCT_SEEDS) {
    const match = list.find((item) => item.nombre.toLowerCase() === seed.nombre.toLowerCase());
    if (match) {
      continue;
    }

    const category = categoryMap.get(seed.categoryRef);
    if (!category?.id) {
      throw new Error(`Missing category ${seed.categoryRef} for product ${seed.nombre}.`);
    }

    const payload = {
      nombre: seed.nombre,
      precioUnitario: seed.precioUnitario,
      precioVenta: seed.precioVenta,
      stockDisponible: seed.stockDisponible,
      categoriaId: category.id,
    };

    if (DRY_RUN) {
      console.log(`ℹ️  Would create product: ${payload.nombre}`);
      continue;
    }

    const response = await safeFetchJson('/production/products', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const product = response?.data ?? response;
    if (!product?.id) {
      throw new Error(`Unexpected response when creating product ${seed.nombre}: ${pretty(response)}`);
    }
    created.push(product);
    await delay(150);
  }

  return created;
};

async function main() {
  console.log('🚀  Starting dev seed for categories and products');
  console.log(`    API_BASE_URL: ${API_BASE_URL}`);
  console.log(`    DRY_RUN: ${DRY_RUN ? 'yes' : 'no'}`);

  const { resolved: categoryMap, created: newCategories } = await ensureCategories();
  console.log(`📦  Categories ready (${categoryMap.size}). Newly created: ${newCategories.length}`);

  const newProducts = await ensureProducts(categoryMap);
  console.log(`🛒  Products ready. Newly created: ${newProducts.length}`);

  if (DRY_RUN) {
    console.log('✅  Dry run completed. No changes were persisted.');
  } else {
    console.log('✅  Seed completed successfully.');
  }
}

main().catch((error) => {
  console.error('❌  Seed failed:', error.message);
  process.exit(1);
});

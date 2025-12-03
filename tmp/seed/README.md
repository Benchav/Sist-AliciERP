# Semillas rápidas para POS / Ventas

Este mini playbook explica cómo poblar la API con categorías y productos mixtos de producción/reventa para poder probar el POS y los reportes sin depender de datos en vivo.

## 1. Requisitos

1. **Token JWT** válido de un usuario ADMIN (se usa para las llamadas protegidas).
2. Node.js ≥ 18 (ya incluido en el flujo de trabajo actual).
3. Acceso a la API pública (`https://sist-alici.vercel.app/api`) o a tu backend local.

## 2. Script automatizado

```
API_TOKEN="<tu token>" \
API_BASE_URL="https://sist-alici.vercel.app/api" \
node scripts/devSeedProducts.mjs
```

Características:
- Asegura dos categorías ("Panadería Tradicional" = PRODUCCION, "Selectos de Góndola" = REVENTA).
- Inserta cuatro productos (dos por origen) con `precioUnitario`, `precioVenta` y `stockDisponible` listos para usar en el POS.
- Si ya existen productos/categorías con el mismo nombre, los reutiliza.
- Define `DRY_RUN=1` si quieres validar sin escribir datos.

## 3. Requests manuales (alternativa)

Si prefieres probar con `curl` o Thunder Client, aquí tienes ejemplos de payloads:

```http
### Crear categoría de producción
POST https://sist-alici.vercel.app/api/inventory/categories
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "nombre": "Panadería Tradicional",
  "tipo": "PRODUCCION",
  "descripcion": "Productos fabricados diariamente en el obrador"
}

### Crear categoría de reventa
POST https://sist-alici.vercel.app/api/inventory/categories
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "nombre": "Selectos de Góndola",
  "tipo": "REVENTA",
  "descripcion": "Artículos comprados a proveedores"
}

### Crear producto de producción
POST https://sist-alici.vercel.app/api/production/products
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "nombre": "Baguette Artesanal",
  "precioUnitario": 18,
  "precioVenta": 25,
  "stockDisponible": 48,
  "categoriaId": "<id de Panadería Tradicional>"
}

### Crear producto de reventa
POST https://sist-alici.vercel.app/api/production/products
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "nombre": "Café Tostado Especial",
  "precioUnitario": 180,
  "precioVenta": 260,
  "stockDisponible": 32,
  "categoriaId": "<id de Selectos de Góndola>"
}
```

Con al menos un producto por origen, el POS mostrará las insignias de Producción/Reventa y el módulo de Ventas podrá calcular los resúmenes mixtos.

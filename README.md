# Sist-Alici ERP Frontend

Interfaz web construida en React + Vite para operar el ERP de la panadería **SIST-ALICI**. El proyecto provee una experiencia completa para el control de inventarios, recetas, producción, ventas y configuración general, alineado con la API pública `https://sist-alici.vercel.app/api`.

## Características principales

- **Autenticación protegida** con roles JWT persistidos en localStorage y rutas privadas.
- **Inventario completo** con CRUD de insumos, registro de compras y estados visuales según stock.
- **Gestión de recetas y productos** con edición avanzada: listado que muestra el stock disponible por insumo y un asistente de conversión manual (kg ↔ g, lb ↔ kg, lt ↔ ml, etc.) dentro del modal de recetas.
- **Módulo de Producción** que registra lotes basados en recetas, valida cantidades y actualiza automáticamente productos e insumos.
- **Punto de Venta (POS)** con carrito dinámico, edición manual de cantidades altas, cobros multimoneda y cálculo de cambio en córdobas.
- **Módulo de Ventas** para historial y detalle sincronizado con el checkout.
- **Configuración** que consume `/config` para mantener la tasa de cambio oficial.
- **UX afinada**: toasts consistentes, tablas responsivas, estados vacíos claros y componentes shadcn-ui reutilizables.

## Stack tecnológico

- React 18 con TypeScript y Vite 5
- TanStack Query para cacheo y sincronización de datos
- Zustand para el estado de autenticación
- shadcn-ui + Tailwind CSS como librería de componentes
- Axios con interceptores para manejar tokens, errores y redireccionamientos

## Requisitos previos

- Node.js 18+ (se recomienda administrarlo con `nvm`)
- npm 9+

## Instalación y ejecución

```bash
git clone https://github.com/Benchav/Sist-AliciERP.git
cd Sist-AliciERP
npm install
npm run dev
```

### Scripts disponibles

- `npm run dev`: arranca Vite en modo desarrollo.
- `npm run build`: genera el bundle de producción (utilizado para validar cada cambio reciente).
- `npm run preview`: sirve el build generado para pruebas locales.

## Integración con la API

- Todas las llamadas usan el cliente `src/lib/api.ts`, que adjunta el header `Authorization` cuando existe token.
- Endpoints cubiertos:
	- `/inventory` para CRUD de insumos y `/inventory/purchase` para registrar compras de materia prima.
	- `/production/products`, `/production/recipes` y `/production` (POST) para catálogo, recetas y registro de lotes.
	- `/sales` para el historial, `/sales/checkout` para el POS y `/sales/report/excel` para exportes.
	- `/config` para leer y actualizar la tasa de cambio.
- El cliente apunta por defecto a `https://sist-alici.vercel.app/api`, incluso en desarrollo. Para usar otro backend (por ejemplo el local `http://localhost:3000`), crea un `.env` con `VITE_API_URL` apuntando al host deseado.
- El formulario de recetas incluye un popover de conversión manual que permite ingresar ingredientes en otras unidades y convertirlos a la unidad base almacenada en inventario.

## Estructura destacada

```
src/
	pages/
		Production.tsx     # CRUD de recetas/productos + conversor de unidades
		Inventory.tsx      # Inventario con compras y estados
		POS.tsx            # Punto de venta con pagos multimoneda
		Sales.tsx          # Historial de ventas
		Settings.tsx       # Configuraciones generales
	lib/
		api.ts            # Cliente Axios con interceptores
		format.ts         # Utilidades de formato monetario y de montos
	store/
		authStore.ts      # Persistencia de sesión con Zustand
```

## Buenas prácticas aplicadas

- Validaciones de formularios en cliente para evitar requests inválidos.
- Toasts de éxito/error consistentes vía `sonner`.
- Componentes desacoplados para navegación, layout y tablas reutilizables.
- Uso de React Query `invalidateQueries` después de mutaciones para mantener la UI sincronizada.
- Conversión de unidades interactiva que documenta equivalencias y reduce errores de captura.

## Autor

- **Joshua Chávez Lau** – [Portafolio](https://joshuachavl.vercel.app)
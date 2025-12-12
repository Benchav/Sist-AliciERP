import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const POS = lazy(() => import('./pages/POS'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Production = lazy(() => import('./pages/Production'));
const Sales = lazy(() => import('./pages/Sales'));
const Settings = lazy(() => import('./pages/Settings'));
const Users = lazy(() => import('./pages/Users'));
const Providers = lazy(() => import('./pages/Providers'));
const Products = lazy(() => import('./pages/Products'));
const ProductCategories = lazy(() => import('./pages/ProductCategories'));
const NotFound = lazy(() => import('./pages/NotFound'));
const ProductRecipe = lazy(() => import('./pages/ProductRecipe'));
const Orders = lazy(() => import('./pages/Orders'));
const Waste = lazy(() => import('./pages/Waste'));

const queryClient = new QueryClient();

const ScreenLoader = ({ message = 'Cargando...' }: { message?: string }) => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 text-slate-600">
    <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-500" />
    <p className="text-sm font-medium">{message}</p>
  </div>
);

const App = () => {
  const { initAuth, isAuthReady } = useAuthStore();

  useEffect(() => {
    void initAuth();
  }, [initAuth]);

  if (!isAuthReady) {
    return <ScreenLoader message="Preparando aplicación" />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<ScreenLoader message="Cargando módulo" />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Dashboard />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pos"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'CAJERO']}>
                    <AppLayout>
                      <POS />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inventory"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'PANADERO', 'CAJERO']}>
                    <AppLayout>
                      <Inventory />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/providers"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'PANADERO']}>
                    <AppLayout>
                      <Providers />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/products"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'PANADERO', 'CAJERO']}>
                    <AppLayout>
                      <Products />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
                <Route
                  path="/products/:productId"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'PANADERO']}>
                      <AppLayout>
                        <ProductRecipe />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
              <Route
                path="/product-categories"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'PANADERO']}>
                    <AppLayout>
                      <ProductCategories />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/production"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'PANADERO']}>
                    <AppLayout>
                      <Production />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/orders"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'PANADERO', 'CAJERO']}>
                    <AppLayout>
                      <Orders />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/waste"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'PANADERO']}>
                    <AppLayout>
                      <Waste />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sales"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'CAJERO']}>
                    <AppLayout>
                      <Sales />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AppLayout>
                      <Users />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AppLayout>
                      <Settings />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

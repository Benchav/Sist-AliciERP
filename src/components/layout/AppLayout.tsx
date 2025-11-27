import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useEffect, useState, type ReactNode } from 'react';

interface AppLayoutProps {
  children: ReactNode;
}

const routeNames: Record<string, string> = {
  '/': 'Dashboard',
  '/pos': 'Punto de Venta',
  '/inventory': 'Inventario',
  '/production': 'Producción',
  '/sales': 'Ventas',
  '/settings': 'Configuración',
};

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const { user } = useAuthStore();
  const currentRoute = routeNames[location.pathname] || 'Dashboard';

  const getIsDesktop = () => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(min-width: 1024px)').matches;
  };

  const [isDesktop, setIsDesktop] = useState<boolean>(getIsDesktop);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const handler = () => setIsDesktop(mediaQuery.matches);
    handler();
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return (
    <SidebarProvider defaultOpen={isDesktop} key={isDesktop ? 'desktop' : 'mobile'}>
      <div className="flex min-h-screen w-full bg-slate-50">
        <AppSidebar />
        <main className="flex min-h-screen flex-1 flex-col overflow-y-auto">
          {/* Enhanced Header */}
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur-md">
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap sm:gap-4 sm:px-6">
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1 shadow-sm sm:gap-3">
                <SidebarTrigger className="-ml-1 sm:-ml-2" />
                <Separator orientation="vertical" className="hidden h-6 sm:block" />
                <span className="hidden text-xs font-medium text-slate-500 sm:block">Menú</span>
              </div>
              <Breadcrumb className="min-w-0 flex-1">
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbPage className="truncate text-lg font-semibold text-slate-900">
                      {currentRoute}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              <div className="flex w-full items-center justify-between gap-3 text-xs sm:w-auto sm:justify-end sm:text-sm">
                <div className="flex flex-1 flex-col rounded-lg bg-white px-3 py-1 text-left shadow-sm ring-1 ring-slate-200 sm:hidden">
                  <p className="text-sm font-semibold text-slate-900">{user?.username}</p>
                  {user?.role ? (
                    <span className="text-[11px] uppercase tracking-wide text-slate-500">{user.role}</span>
                  ) : null}
                </div>
                <div className="hidden text-right sm:block">
                  <div className="text-sm font-semibold text-slate-900">{user?.username}</div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">{user?.role}</div>
                </div>
              </div>
            </div>
          </header>
          
          {/* Content Area */}
          <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

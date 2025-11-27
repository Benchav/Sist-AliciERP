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
      <div className="flex min-h-screen w-full bg-muted/30">
        <AppSidebar />
        <main className="flex min-h-screen flex-1 flex-col overflow-y-auto">
          {/* Enhanced Header */}
          <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap sm:gap-4 sm:px-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <SidebarTrigger className="-ml-1 sm:-ml-2" />
                <Separator orientation="vertical" className="hidden h-6 sm:block" />
              </div>
              <Breadcrumb className="min-w-0 flex-1">
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbPage className="truncate text-lg font-semibold">
                      {currentRoute}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              <div className="flex w-full items-center justify-between gap-3 text-xs sm:w-auto sm:justify-end sm:text-sm">
                <div className="flex flex-1 flex-col text-left sm:hidden">
                  <p className="text-sm font-medium text-foreground">{user?.username}</p>
                  {user?.role ? (
                    <span className="text-[11px] text-muted-foreground">{user.role}</span>
                  ) : null}
                </div>
                <div className="hidden text-right sm:block">
                  <div className="text-sm font-medium text-foreground">{user?.username}</div>
                  <div className="text-xs text-muted-foreground">{user?.role}</div>
                </div>
              </div>
            </div>
          </header>
          
          {/* Content Area */}
          <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8 animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

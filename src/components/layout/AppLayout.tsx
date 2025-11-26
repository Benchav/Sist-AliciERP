import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import type { ReactNode } from 'react';

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

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full bg-muted/30">
        <AppSidebar />
        <main className="flex-1 overflow-y-auto">
          {/* Enhanced Header */}
          <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-16 items-center gap-4 px-6">
              <SidebarTrigger className="-ml-2" />
              <Separator orientation="vertical" className="h-6" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbPage className="text-lg font-semibold">
                      {currentRoute}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              <div className="ml-auto flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-medium text-foreground">{user?.username}</div>
                  <div className="text-xs text-muted-foreground">{user?.role}</div>
                </div>
              </div>
            </div>
          </header>
          
          {/* Content Area */}
          <div className="container mx-auto p-6 lg:p-8 animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

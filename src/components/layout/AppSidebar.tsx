import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Factory,
  Receipt,
  Settings,
  LogOut,
  ChevronRight,
    Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuthStore } from '@/store/authStore';
import { hasRole } from '@/lib/auth';
import { useLocation } from 'react-router-dom';
import type { UserRole } from '@/types';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type MenuItem = {
  title: string;
  icon: LucideIcon;
  url: string;
  roles: UserRole[];
};

const menuItems: MenuItem[] = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    url: '/',
    roles: ['ADMIN', 'PANADERO', 'CAJERO'],
  },
  {
    title: 'Punto de Venta',
    icon: ShoppingCart,
    url: '/pos',
    roles: ['ADMIN', 'CAJERO'],
  },
  {
    title: 'Inventario',
    icon: Package,
    url: '/inventory',
    roles: ['ADMIN', 'PANADERO', 'CAJERO'],
  },
  {
    title: 'Producción',
    icon: Factory,
    url: '/production',
    roles: ['ADMIN', 'PANADERO'],
  },
  {
    title: 'Ventas',
    icon: Receipt,
    url: '/sales',
    roles: ['ADMIN', 'CAJERO'],
  },
  {
    title: 'Configuración',
    icon: Settings,
    url: '/settings',
    roles: ['ADMIN'],
  },
];

export function AppSidebar() {
  const { user, logout } = useAuthStore();
  const { open, openMobile, isMobile } = useSidebar();
  const location = useLocation();
  const isExpanded = isMobile ? openMobile : open;

  const visibleItems = menuItems.filter((item) => hasRole(user, item.roles));

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-primary text-primary-foreground';
      case 'PANADERO':
        return 'bg-success text-success-foreground';
      case 'CAJERO':
        return 'bg-accent text-accent-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Sidebar collapsible="icon" className="border-r bg-card">
      <SidebarContent className="gap-0">
        {/* Header */}
        <div className="border-b p-6">
          {isExpanded ? (
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold tracking-tight text-foreground">SIST-ALICI</h2>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">ERP Panadería</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <Factory className="h-6 w-6 text-primary" />
            </div>
          )}
        </div>

        {/* Navigation */}
        <SidebarGroup className="px-3 py-4">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {visibleItems.map((item) => {
                const isActive = location.pathname === item.url || 
                  (item.url !== '/' && location.pathname.startsWith(item.url));
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className="group relative overflow-hidden rounded-xl border border-transparent bg-transparent transition"
                    >
                      <NavLink 
                        to={item.url} 
                        end={item.url === '/'}
                        className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-primary/5 hover:text-foreground"
                        activeClassName="bg-primary/10 text-foreground shadow-sm"
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        {isExpanded && (
                          <>
                            <span className="flex-1 text-sm font-medium">{item.title}</span>
                            {isActive && <ChevronRight className="h-4 w-4 text-primary" />}
                          </>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        {isExpanded ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-foreground">{user?.username}</div>
              <Badge className={getRoleBadgeColor(user?.role || '')} variant="secondary">
                {user?.role}
              </Badge>
            </div>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={logout}
            >
              <LogOut className="h-4 w-4" />
              Cerrar Sesión
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            className="w-full"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

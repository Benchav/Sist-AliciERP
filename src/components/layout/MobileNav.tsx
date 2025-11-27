import { LayoutDashboard, ShoppingCart, Package, Factory, Receipt } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { hasRole } from '@/lib/auth';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types';

export function MobileNav() {
  const { user } = useAuthStore();

  const items: { title: string; icon: any; url: string; roles: UserRole[] }[] = [
    {
      title: 'Inicio',
      icon: LayoutDashboard,
      url: '/',
      roles: ['ADMIN', 'PANADERO', 'CAJERO'],
    },
    {
      title: 'Venta',
      icon: ShoppingCart,
      url: '/pos',
      roles: ['ADMIN', 'CAJERO'],
    },
    {
      title: 'Stock',
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
  ];

  const visibleItems = items.filter((item) => hasRole(user, item.roles));

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 block border-t border-slate-200 bg-white pb-safe pt-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] md:hidden">
      <nav className="flex h-16 items-center justify-around px-2">
        {visibleItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center gap-1 rounded-xl px-3 py-1 transition-all duration-300",
                isActive
                  ? "text-indigo-600"
                  : "text-slate-400 hover:text-slate-600"
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className={cn(
                  "relative flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300",
                  isActive ? "bg-indigo-50 translate-y-[-4px]" : ""
                )}>
                  <item.icon className={cn("h-5 w-5", isActive ? "fill-indigo-600/20" : "")} />
                  {isActive && (
                    <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-indigo-600" />
                  )}
                </div>
                <span className={cn(
                  "text-[10px] font-medium transition-all duration-300",
                  isActive ? "font-semibold" : ""
                )}>
                  {item.title}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

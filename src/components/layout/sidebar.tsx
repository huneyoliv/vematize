'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  LayoutDashboard,
  BarChart,
  Settings,
  LogOut,
  Building,
  Ticket,
  Menu,
} from 'lucide-react';
import { VematizeLogo } from '../icons/logo';

const sidebarNavItems = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Clientes', href: '/clients', icon: Building },
  { title: 'Cupons', href: '/coupons', icon: Ticket },
  { title: 'Relatórios', href: '/reports', icon: BarChart },
  { title: 'Administradores', href: '/admins', icon: 'shield', adminOnly: true },
  { title: 'Configurações', href: '/settings', icon: Settings },
];

const AdminIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="mr-2 h-4 w-4"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
  </svg>
);

function SidebarContent({ pathname, isMainAdmin, onLinkClick }: { pathname: string; isMainAdmin: boolean; onLinkClick?: () => void }) {
  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/krov/dashboard" className="flex items-center gap-2 font-semibold" onClick={onLinkClick}>
          <VematizeLogo className="h-6 w-6 text-primary" />
          <span>Painel Krov</span>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        <nav className="grid items-start gap-1 px-4 text-sm font-medium">
          {sidebarNavItems.map((item) => {
            if (item.adminOnly && !isMainAdmin) {
              return null;
            }
            const Icon = item.icon === 'shield' ? AdminIcon : item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onLinkClick}
                className={cn(
                  buttonVariants({ variant: isActive ? 'default' : 'ghost' }),
                  'justify-start'
                )}
              >
                <Icon className="mr-2 h-4 w-4" />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="mt-auto p-4 border-t">
        <Link href="/krov/logout" className={cn(buttonVariants({ variant: 'ghost' }), 'w-full justify-start')} onClick={onLinkClick}>
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </Link>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  // TODO: Replace with real session logic
  const isMainAdmin = true;

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="fixed top-4 left-4 z-50 lg:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <SidebarContent pathname={pathname} isMainAdmin={isMainAdmin} onLinkClick={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside className="relative hidden w-64 border-r bg-background lg:block">
        <SidebarContent pathname={pathname} isMainAdmin={isMainAdmin} />
      </aside>
    </>
  );
}

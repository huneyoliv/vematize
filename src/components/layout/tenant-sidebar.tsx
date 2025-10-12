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
  Settings,
  LogOut,
  Users,
  CreditCard,
  BotMessageSquare,
  Package,
  Menu,
} from 'lucide-react';
import { VematizeLogo } from '../icons/logo';

const sidebarNavItems = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Meus Bots', href: '/bots', icon: BotMessageSquare },
  { title: 'Produtos', href: '/products', icon: Package },
  { title: 'Usuários', href: '/users', icon: Users },
  { title: 'Meu Plano', href: '/plan', icon: CreditCard },
  { title: 'Configurações', href: '/settings', icon: Settings },
];

function SidebarContent({ pathname, onLinkClick }: { pathname: string; onLinkClick?: () => void }) {
  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold" onClick={onLinkClick}>
          <VematizeLogo className="h-6 w-6" />
          <span>Vematize</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {sidebarNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                buttonVariants({ variant: isActive ? 'secondary' : 'ghost' }),
                'w-full justify-start'
              )}
              onClick={onLinkClick}
            >
              <Icon className="mr-2 h-4 w-4" />
              {item.title}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t p-3">
        <Link
          href="/logout"
          className={cn(
            buttonVariants({ variant: 'ghost' }),
            'w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50'
          )}
          onClick={onLinkClick}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </Link>
      </div>
    </div>
  );
}

export default function TenantSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile Header */}
      <div className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 lg:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <SidebarContent pathname={pathname} onLinkClick={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside className="relative hidden w-64 border-r bg-background lg:block">
        <SidebarContent pathname={pathname} />
      </aside>
    </>
  );
}


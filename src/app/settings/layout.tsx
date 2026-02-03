import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/layout/sidebar';

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userType={session.type === 'admin' ? 'admin' : 'tenant'} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 pt-16 lg:pt-8">
        {children}
      </main>
    </div>
  );
}



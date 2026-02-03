import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';

export default async function SetupAccountLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getCurrentSession();

    if (!session) {
        redirect('/login');
    }

    // If user is already active (setup complete), redirect to dashboard
    if (session.subscriptionStatus !== 'pending_setup') {
        redirect('/dashboard');
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-background p-4">
            {children}
        </main>
    );
}

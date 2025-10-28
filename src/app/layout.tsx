import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
// Gateway desabilitado - usando HTTP Interactions
// import '@/lib/discord/init-bots';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Vematize',
  description: 'Painel administrativo Vematize.',
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark h-full">
      <body className={`${inter.className} h-full`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}

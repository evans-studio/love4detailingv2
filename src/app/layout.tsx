import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { BookingProvider } from '@/lib/context/BookingContext';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Love4Detailing - Professional Car Detailing Services',
  description: 'Transform your vehicle with our expert car detailing services in London. Book your appointment today.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} flex min-h-screen flex-col`}>
        <AuthProvider>
          <BookingProvider>
            <ErrorBoundary>
              <Header />
              <main className="flex-1">
                {children}
              </main>
              <Footer />
            </ErrorBoundary>
          </BookingProvider>
        </AuthProvider>
      </body>
    </html>
  );
} 
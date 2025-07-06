import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { AuthProvider } from '@/lib/context/AuthContext';
import { BookingProvider } from '@/lib/context/BookingContext';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

const inter = Inter({ subsets: ['latin'] });

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Love4Detailing - Professional Car Detailing Services',
  description: 'Transform your vehicle with our expert car detailing services in London. Book your appointment today.',
};

async function getInitialUser() {
  try {
    const cookieStore = cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    // Map user data to match our UserType
    return {
      id: user.id,
      email: user.email!,
      firstName: user.user_metadata?.first_name || '',
      lastName: user.user_metadata?.last_name || '',
      phone: user.user_metadata?.phone || null,
      createdAt: user.created_at,
      updatedAt: user.updated_at || user.created_at
    };
  } catch (error) {
    console.error('Error getting initial user:', error);
    return null;
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialUser = await getInitialUser();

  return (
    <html lang="en" className="dark bg-[#141414] h-full">
      <body className={`${inter.className} bg-[#141414] text-[#F2F2F2] min-h-screen flex flex-col`}>
        <ErrorBoundary>
          <AuthProvider initialUser={initialUser}>
            <BookingProvider>
              <Header />
              <main className="flex-1">
                {children}
              </main>
              <Footer />
            </BookingProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
} 
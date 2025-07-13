import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/auth/context'
import { AppProvider } from '@/components/providers/AppProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Love4Detailing - Professional Mobile Car Detailing',
  description: 'Premium mobile car detailing services with professional booking system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Suppress Cloudflare cookie warnings in development
              if (typeof console !== 'undefined') {
                const originalWarn = console.warn;
                console.warn = function(...args) {
                  if (args[0] && args[0].includes && args[0].includes('__cf_bm')) {
                    return; // Suppress Cloudflare cookie warnings
                  }
                  originalWarn.apply(console, args);
                };
              }
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <AppProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </AppProvider>
      </body>
    </html>
  )
}
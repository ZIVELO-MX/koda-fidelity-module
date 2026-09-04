import type { Metadata } from 'next'
import { JetBrains_Mono } from 'next/font/google'
import localFont from 'next/font/local'
import { Analytics } from '@vercel/analytics/next'
import { ServiceWorkerRegister } from '@/components/service-worker-register'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { siteConfig } from '@/lib/site-config'
import './globals.css'

// Switzer es la tipografía del ADN de KODA. Vive en Fontshare, no en Google
// Fonts, así que se sirve desde el propio proyecto.
const switzer = localFont({
  src: [
    { path: '../public/fonts/switzer-400.woff2', weight: '400', style: 'normal' },
    { path: '../public/fonts/switzer-500.woff2', weight: '500', style: 'normal' },
    { path: '../public/fonts/switzer-600.woff2', weight: '600', style: 'normal' },
    { path: '../public/fonts/switzer-700.woff2', weight: '700', style: 'normal' },
    { path: '../public/fonts/switzer-800.woff2', weight: '800', style: 'normal' },
  ],
  variable: '--font-switzer',
  display: 'swap',
  fallback: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'ui-sans-serif'],
})

// Para cifras que se alinean en columna.
const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} - Tarjetas de Fidelidad Digitales`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
  openGraph: {
    title: `${siteConfig.name} - Tarjetas de Fidelidad Digitales`,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    locale: siteConfig.locale,
    type: 'website',
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: siteConfig.name,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteConfig.name} - Tarjetas de Fidelidad Digitales`,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
    creator: siteConfig.creator,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  other: {
    'theme-color': siteConfig.defaultBrandColor,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="bg-background" suppressHydrationWarning>
      <body className={`${switzer.variable} ${jetbrains.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
          {children}
        </ThemeProvider>
        <Toaster richColors closeButton position="bottom-right" />
        <ServiceWorkerRegister />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}

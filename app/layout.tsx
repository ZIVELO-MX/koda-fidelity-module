import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ServiceWorkerRegister } from '@/components/service-worker-register'
import { ThemeProvider } from '@/components/theme-provider'
import { siteConfig } from '@/lib/site-config'
import './globals.css'

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
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
      <body className={`${geist.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
        <ServiceWorkerRegister />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}

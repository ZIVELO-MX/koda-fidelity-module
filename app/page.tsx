import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { Button } from "@/components/ui/button"
import { ArrowRight, Smartphone, QrCode, Wallet, CheckCircle2, Zap, Shield, BarChart3 } from "lucide-react"
import { LoyaltyCardPreview } from "@/components/loyalty-card-preview"
import { LandingMobileNav } from "@/components/landing-mobile-nav"
import { siteConfig } from "@/lib/site-config"

export const metadata: Metadata = {
  title: `${siteConfig.name} - Tarjetas de Fidelidad Digitales`,
  description: siteConfig.description,
  openGraph: {
    title: `${siteConfig.name} - Tarjetas de Fidelidad Digitales`,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    locale: siteConfig.locale,
    type: "website",
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
    card: "summary_large_image",
    title: `${siteConfig.name} - Tarjetas de Fidelidad Digitales`,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
  },
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Wallet, QrCode, Zap, Shield, BarChart3, Smartphone, CheckCircle2,
}

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const params = await searchParams
  if (params.code) {
    redirect(`/auth/callback?code=${encodeURIComponent(params.code)}&next=${encodeURIComponent(params.next || "/dashboard/my-cards")}`)
  }
  if (params.error || params.error_code) {
    const qs = new URLSearchParams()
    if (params.error) qs.set("error", params.error)
    if (params.error_code) qs.set("error_code", params.error_code)
    if (params.error_description) qs.set("error_description", params.error_description)
    redirect(`/auth/error?${qs.toString()}`)
  }
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/short-logo.svg"
                alt={siteConfig.shortName}
                width={36}
                height={36}
                className="size-9 shrink-0"
              />
              <span className="font-semibold text-lg text-foreground">Koda Fidelity</span>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Funciones
              </Link>
              <Link href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Cómo Funciona
              </Link>
              <Link href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Precios
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" className="hidden sm:inline-flex">
                  Iniciar Sesión
                </Button>
              </Link>
              <LandingMobileNav />
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Zap className="h-4 w-4" />
                {siteConfig.hero.tagline}
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight text-balance">
                {siteConfig.hero.title}
                <span className="text-primary">{siteConfig.hero.titleHighlight}</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
                {siteConfig.hero.subtitle}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="#how-it-works">
                  <Button size="lg" className="w-full sm:w-auto text-base px-8">
                    Ver Cómo Funciona
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto text-base px-8">
                    Iniciar Sesión
                  </Button>
                </Link>
              </div>
              <div className="flex items-center pt-4">
                <CheckCircle2 className="h-5 w-5 text-primary mr-2" />
                <span className="text-sm text-muted-foreground">Configuración en 2 minutos</span>
              </div>
            </div>
            <div className="relative lg:pl-8">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-primary/5 rounded-[40px] blur-3xl" />
                <LoyaltyCardPreview
                  businessName={siteConfig.hero.demoCard.businessName}
                  currentStamps={siteConfig.hero.demoCard.currentStamps}
                  maxStamps={siteConfig.hero.demoCard.maxStamps}
                  reward={siteConfig.hero.demoCard.reward}
                  expirationDate="31 dic 2026"
                  brandColor={siteConfig.hero.demoCard.brandColor}
                  className="relative"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-20 lg:py-28 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Simple para ti. Perfecto para tus clientes.
            </h2>
            <p className="text-lg text-muted-foreground">
              Tu programa de lealtad digital funcionando en minutos, no en días.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {siteConfig.howItWorks.map((item, index) => {
              const Icon = iconMap[item.icon]
              return (
                <div
                  key={index}
                  className="relative bg-card rounded-2xl p-8 border border-border shadow-sm hover:shadow-lg transition-shadow group"
                >
                  <div className="absolute -top-4 -left-4 w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-lg">
                    {item.step}
                  </div>
                  <div className="pt-4">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                      {Icon && <Icon className="h-7 w-7 text-primary" />}
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-3">{item.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Todo lo que necesitas para construir lealtad
            </h2>
            <p className="text-lg text-muted-foreground">
              Funciones diseñadas para pequeños negocios que quieren grandes resultados.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {siteConfig.features.map((feature, index) => {
              const Icon = iconMap[feature.icon]
              return (
                <div
                  key={index}
                  className="bg-card rounded-2xl p-6 border border-border hover:border-primary/30 transition-colors group"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                    {Icon && <Icon className="h-6 w-6 text-primary" />}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 lg:py-28 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Perfecto para negocios locales
            </h2>
            <p className="text-lg text-muted-foreground">
              Únete a cientos de pequeños negocios que ya usan Koda Fidelity.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {siteConfig.useCases.map((useCase, index) => (
              <div
                key={index}
                className="bg-card rounded-2xl p-6 border border-border text-center hover:shadow-md transition-shadow"
              >
                <div className="text-4xl mb-4">{useCase.emoji}</div>
                <h3 className="font-semibold text-foreground mb-2">{useCase.name}</h3>
                <p className="text-sm text-muted-foreground">{useCase.example}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-xl mx-auto text-center bg-card rounded-2xl p-12 border border-border">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              {siteConfig.pricing.title}
            </h2>
            <p className="text-lg text-muted-foreground">
              {siteConfig.pricing.description}
            </p>
          </div>
        </div>
      </section>

      {/* Customer CTA Section */}
      <section className="py-20 lg:py-28 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-card rounded-3xl p-12 lg:p-16 border border-border shadow-sm">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              ¿Ya tienes tu tarjeta de lealtad?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Accede a todas tus tarjetas, revisa tu progreso y canjea tus recompensas desde un solo lugar.
            </p>
            <Link href="/my-cards">
              <Button size="lg" className="text-base px-10">
                Ir a Mis Tarjetas
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-3xl p-12 lg:p-16 border border-primary/20">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              {siteConfig.cta.title}
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              {siteConfig.cta.description}
            </p>
            <Link href={siteConfig.cta.href}>
              <Button size="lg" className="text-base px-10">
                {siteConfig.cta.cta}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/short-logo.svg"
                alt={siteConfig.shortName}
                width={32}
                height={32}
                className="size-8 shrink-0"
              />
              <span className="font-semibold text-foreground">{siteConfig.name}</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              {siteConfig.footer.tagline}
            </p>
            <div className="flex items-center gap-6">
              {siteConfig.footer.links.map((link, index) => (
                <Link
                  key={index}
                  href={link.href}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

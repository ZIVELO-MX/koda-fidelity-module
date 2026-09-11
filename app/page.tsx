import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { Button } from "@/components/ui/button"
import { ArrowRight, Smartphone, QrCode, Wallet, CheckCircle2, Check, Zap, Shield, BarChart3 } from "lucide-react"
import { LoyaltyCardPreview } from "@/components/loyalty-card-preview"
import { LandingMobileNav } from "@/components/landing-mobile-nav"
import { SmoothNavLink } from "@/components/smooth-nav-link"
import { RevealGrid } from "@/components/reveal-grid"
import { MarqueeBand } from "@/components/marquee-band"
import { Precios } from "@/components/landing/precios"
import { ComparacionPapel } from "@/components/landing/comparacion-papel"
import { Testimonios } from "@/components/landing/testimonios"
import { Preguntas } from "@/components/landing/preguntas"
import { SolicitarDemo } from "@/components/landing/solicitar-demo"
import { siteConfig } from "@/lib/site-config"

export const metadata: Metadata = {
  title: `${siteConfig.name} - Tarjetas de Fidelidad Digitales`,
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  robots: { index: true, follow: true },
  alternates: { canonical: siteConfig.url },
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
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const code = typeof params.code === "string" ? params.code : params.code?.[0]
  const next = typeof params.next === "string" ? params.next : params.next?.[0]
  const error = typeof params.error === "string" ? params.error : params.error?.[0]
  const error_code = typeof params.error_code === "string" ? params.error_code : params.error_code?.[0]
  const error_description = typeof params.error_description === "string" ? params.error_description : params.error_description?.[0]

  if (code) {
    redirect(`/auth/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent(next || "/dashboard/my-cards")}`)
  }
  if (error || error_code) {
    const qs = new URLSearchParams()
    if (error) qs.set("error", error)
    if (error_code) qs.set("error_code", error_code)
    if (error_description) qs.set("error_description", error_description)
    redirect(`/auth/error?${qs.toString()}`)
  }
  return (
    <div className="min-h-screen bg-background forced-light">
      <a href="#main-content" className="skip-link">
        Saltar al contenido principal
      </a>
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="inline-flex min-h-11 items-center gap-2">
              <Image
                src="/short-logo.svg"
                alt={siteConfig.shortName}
                width={36}
                height={36}
                className="size-9 shrink-0"
              />
              <span className="whitespace-nowrap font-semibold text-lg text-foreground">Koda Fidelity</span>
            </Link>
            <div className="hidden lg:flex items-center gap-8">
              <SmoothNavLink href="#features" className="inline-flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
                Funciones
              </SmoothNavLink>
              <SmoothNavLink href="#how-it-works" className="inline-flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
                Cómo Funciona
              </SmoothNavLink>
              <SmoothNavLink href="#pricing" className="inline-flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
                Precios
              </SmoothNavLink>
              <SmoothNavLink href="#faq" className="inline-flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
                FAQ
              </SmoothNavLink>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <Button asChild variant="ghost" className="hidden min-h-11 md:inline-flex">
                <Link href="/login">
                  Iniciar Sesión
                </Link>
              </Button>
              <Button asChild size="sm" className="hidden min-h-11 md:inline-flex active:scale-[0.97] transition-transform">
                <Link href="/signup">
                  Empieza por solo $149 al mes
                </Link>
              </Button>
              <LandingMobileNav />
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="main-content" className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -right-24 w-[560px] h-[560px] rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-[380px] h-[380px] rounded-full bg-primary/[0.07] blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium">
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
                <Button asChild size="lg" className="min-h-11 group w-full sm:w-auto text-base px-8 active:scale-[0.97] transition-transform">
                  <Link href="/signup">
                    Empieza por solo $149 al mes
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-150 group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="min-h-11 w-full sm:w-auto text-base px-8 active:scale-[0.97] transition-transform">
                  <SmoothNavLink href="#how-it-works">
                    Ver Cómo Funciona
                  </SmoothNavLink>
                </Button>
              </div>
            </div>
            <div className="relative lg:pl-8">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-primary/5 rounded-[40px] blur-2xl pointer-events-none" />
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

      {/* Feature trust strip */}
      <div className="border-y border-border/60 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-3 md:gap-x-14">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Smartphone className="h-4 w-4 text-primary/70 shrink-0" />
              <span>Sin apps requeridas</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4 text-primary/70 shrink-0" />
              <span>Acceso seguro por email</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Zap className="h-4 w-4 text-primary/70 shrink-0" />
              <span>Lista en 2 minutos</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <QrCode className="h-4 w-4 text-primary/70 shrink-0" />
              <span>Flujo 100% con QR</span>
            </div>
          </div>
        </div>
      </div>

      <MarqueeBand />

      {/* How it Works */}
      <section id="how-it-works" className="scroll-mt-16 py-20 lg:py-28 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Simple para ti. Perfecto para tus clientes.
            </h2>
            <p className="text-lg text-muted-foreground">
              Tu programa de lealtad digital funcionando en minutos, no en días.
            </p>
          </div>
          {/* Lista secuencial, no tres columnas iguales. Y sin numerar: el verbo
              ya nombra el paso, "Crea tu tarjeta" se entiende sin un 01 delante. */}
          <RevealGrid className="mx-auto max-w-2xl">
            <ol className="divide-y divide-border">
              {siteConfig.howItWorks.map((item) => {
                const Icon = iconMap[item.icon]
                return (
                  <li key={item.title} className="flex gap-5 py-8 first:pt-0 last:pb-0">
                    <div className="h-12 w-12 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
                      {Icon && <Icon className="h-6 w-6 text-primary" />}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xl font-semibold text-foreground">{item.title}</h3>
                      <p className="mt-2 text-muted-foreground leading-relaxed">{item.description}</p>
                    </div>
                  </li>
                )
              })}
            </ol>
          </RevealGrid>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-16 py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Todo lo que necesitas para construir lealtad
            </h2>
            <p className="text-lg text-muted-foreground">
              Funciones diseñadas para pequeños negocios que quieren grandes resultados.
            </p>
          </div>
          {/* Sin cajas. Seis tarjetas idénticas en rejilla es de los patrones más
              templados que hay, y aquí no aportan nada: el mismo contenido
              separado por aire y una línea se lee igual y pesa menos. */}
          <RevealGrid className="grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {siteConfig.features.map((feature) => {
              const Icon = iconMap[feature.icon]
              return (
                <div key={feature.title} className="border-t border-border pt-6">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    {Icon && <Icon className="h-5 w-5 text-primary" />}
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-foreground">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
                </div>
              )
            })}
          </RevealGrid>
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
              El mismo programa sirve igual para un café, una barbería o una tienda de barrio.
            </p>
          </div>
          <RevealGrid className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {siteConfig.useCases.map((useCase) => (
              <div
                key={useCase.name}
                className="group bg-card rounded-2xl p-6 border border-border text-center hover:shadow-md hover:-translate-y-0.5 transition-[box-shadow,transform] duration-200"
              >
                <div className="text-4xl mb-4 transition-transform duration-150 [@media(hover:hover)]:group-hover:scale-110">{useCase.emoji}</div>
                <h3 className="font-semibold text-foreground mb-2">{useCase.name}</h3>
                <p className="text-sm text-muted-foreground">{useCase.example}</p>
              </div>
            ))}
          </RevealGrid>
        </div>
      </section>

      <Testimonios />

      {/* Comparación con la tarjeta de papel */}
      <section className="py-20 lg:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Lo mismo que ya haces, sin el papel
            </h2>
            <p className="text-lg text-muted-foreground">
              La tarjeta de cartón funciona. Solo que no te deja ver nada de lo que pasa con ella.
            </p>
          </div>
          <ComparacionPapel />
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-16 py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                {siteConfig.pricing.title}
              </h2>
              <p className="text-lg text-muted-foreground">
                {siteConfig.pricing.description}
              </p>
            </div>
            <Precios />
          </div>
        </div>
      </section>

      {/* Preguntas frecuentes */}
      <section id="faq" className="scroll-mt-16 py-20 lg:py-28 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="mb-12 text-center text-3xl sm:text-4xl font-bold text-foreground">
            Preguntas frecuentes
          </h2>
          <Preguntas />
        </div>
      </section>

      {/* Solicitud de demo. El panel oscuro y las tres promesas son del diseño
          aprobado; el formulario vive encima en blanco, que es donde el
          contraste de placeholder, error y foco se sostiene. */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 rounded-3xl bg-[#1C1B17] p-6 text-[#FAFAF7] sm:p-10 lg:grid-cols-2 lg:gap-14">
            <div>
              <h2 className="text-2xl font-bold sm:text-3xl">¿Quieres verlo en tu negocio?</h2>
              <p className="mt-3 text-[#FAFAF7]/75 leading-relaxed">
                Agenda una demo de 20 minutos. Te ayudamos a dejar tu programa de lealtad listo.
              </p>
              <ul className="mt-6 space-y-3">
                {["Demo en vivo, con tu giro", "Configuramos tu primera tarjeta", "Sin compromiso"].map((punto) => (
                  <li key={punto} className="flex items-center gap-3 text-sm">
                    <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    {punto}
                  </li>
                ))}
              </ul>
            </div>
            <SolicitarDemo />
          </div>
        </div>
      </section>

      {/* Customer CTA Section */}
      <section className="py-20 lg:py-28 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-card rounded-3xl p-6 sm:p-12 lg:p-16 border border-border shadow-sm">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              ¿Ya tienes tu tarjeta de lealtad?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Accede a todas tus tarjetas, revisa tu progreso y canjea tus recompensas desde un solo lugar.
            </p>
            <Button asChild size="lg" className="min-h-11 group text-base px-10 active:scale-[0.97] transition-transform">
              <Link href="/my-cards">
                Ir a Mis Tarjetas
                <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-150 group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-3xl p-6 sm:p-12 lg:p-16 border border-primary/20">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              {siteConfig.cta.title}
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              {siteConfig.cta.description}
            </p>
            <Button asChild size="lg" className="min-h-11 group text-base px-10 active:scale-[0.97] transition-transform">
              <Link href={siteConfig.cta.href}>
                {siteConfig.cta.cta}
                <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-150 group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Link href="/" className="inline-flex min-h-11 items-center gap-2">
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
              {siteConfig.footer.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
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

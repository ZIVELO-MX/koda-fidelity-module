import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { Button } from "@/components/ui/button"
import {
  ArrowRight, Smartphone, QrCode, Wallet, CheckCircle2, Check, Zap, Shield, BarChart3,
  Palette, LineChart, CreditCard, Workflow, Repeat, Tag, CircleQuestionMark,
} from "lucide-react"
import { LoyaltyCardPreview } from "@/components/loyalty-card-preview"
import { LandingMobileNav } from "@/components/landing-mobile-nav"
import { SmoothNavLink } from "@/components/smooth-nav-link"
import { RevealGrid } from "@/components/reveal-grid"
import { MarqueeBand } from "@/components/marquee-band"
import { Precios } from "@/components/landing/precios"
import { ComparacionPapel } from "@/components/landing/comparacion-papel"
import { Testimonios } from "@/components/landing/testimonios"
import { Preguntas } from "@/components/landing/preguntas"
import { Encabezado, Acento } from "@/components/landing/seccion"
import { DisenosPorGiro } from "@/components/landing/disenos-por-giro"
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
    <div className="landing min-h-screen bg-background forced-light">
      <a href="#main-content" className="skip-link">
        Saltar al contenido principal
      </a>
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-[#17130f]/95 backdrop-blur-md text-white">
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
              <span className="whitespace-nowrap font-semibold text-lg text-white">Koda Fidelity</span>
            </Link>
            <div className="hidden lg:flex items-center gap-8">
              <SmoothNavLink href="#disenos" className="inline-flex min-h-11 items-center text-sm text-white/70 hover:text-white transition-colors">
                Diseños
              </SmoothNavLink>
              <SmoothNavLink href="#how-it-works" className="inline-flex min-h-11 items-center text-sm text-white/70 hover:text-white transition-colors">
                Cómo Funciona
              </SmoothNavLink>
              <SmoothNavLink href="#pricing" className="inline-flex min-h-11 items-center text-sm text-white/70 hover:text-white transition-colors">
                Precios
              </SmoothNavLink>
              <SmoothNavLink href="#faq" className="inline-flex min-h-11 items-center text-sm text-white/70 hover:text-white transition-colors">
                FAQ
              </SmoothNavLink>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <Button asChild variant="ghost" className="hidden min-h-11 text-white hover:bg-white/10 hover:text-white md:inline-flex">
                <Link href="/login">
                  Iniciar Sesión
                </Link>
              </Button>
              <Button asChild size="sm" className="hidden min-h-11 bg-white text-[#17130f] hover:bg-primary hover:text-primary-foreground md:inline-flex active:scale-[0.97] transition-transform">
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
      <section
        id="main-content"
        className="relative overflow-hidden text-white"
        style={{
          background:
            "radial-gradient(130% 120% at 82% -10%, #241d16 0%, #17130f 46%, #0e0b08 100%)",
        }}
      >
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -right-24 w-[620px] h-[620px] rounded-full bg-primary/25 blur-3xl" />
          <div className="absolute -bottom-44 -left-28 w-[460px] h-[460px] rounded-full bg-primary/10 blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/85">
                <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />
                {siteConfig.hero.tagline}
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight text-balance">
                {siteConfig.hero.title}
                <span className="landing-acento text-primary">{siteConfig.hero.titleHighlight}</span>
              </h1>
              <p className="text-lg text-white/72 max-w-xl leading-relaxed">
                {siteConfig.hero.subtitle}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button asChild size="lg" className="min-h-11 group w-full sm:w-auto text-base px-8 active:scale-[0.97] transition-transform">
                  <Link href="/signup">
                    Empieza por solo $149 al mes
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-150 group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="min-h-11 w-full border-white/20 bg-white/5 text-white hover:bg-white/15 hover:text-white sm:w-auto text-base px-8 active:scale-[0.97] transition-transform">
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

      <MarqueeBand />

      {/* Las cuatro claves del diseño: sin cajas, centradas, separadas por aire.
          Sustituyen a la franja de sellos, a la rejilla de funciones y a la de
          casos de uso, que decían lo mismo tres veces seguidas en tres rejillas
          iguales. */}
      <section id="claves" className="scroll-mt-16 border-b border-border bg-card py-16">
        <div className="mx-auto grid max-w-5xl gap-10 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
          {[
            { icono: Palette, titulo: "Tu marca", texto: "Color, logo y premio a tu gusto" },
            { icono: Smartphone, titulo: "En su celular", texto: "Se abre con un enlace, sin apps" },
            { icono: QrCode, titulo: "Canje verificado", texto: "Sellos que nadie puede falsificar" },
            { icono: LineChart, titulo: "Sabes quién vuelve", texto: "Visitas y premios en tu panel" },
          ].map((clave) => (
            <div key={clave.titulo} className="flex flex-col items-center gap-2 text-center">
              <clave.icono className="h-6 w-6 text-primary" aria-hidden="true" />
              <p className="font-bold text-foreground">{clave.titulo}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">{clave.texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Diseños por giro. El marquee que se conserva, porque aquí el
          movimiento enseña el producto en vez de decorar. */}
      <section id="disenos" className="scroll-mt-16 py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Encabezado
            icono={CreditCard}
            etiqueta="Tarjetas de lealtad"
            bajada="Elige el patrón de tu rubro, cambia el color y listo. Se ve profesional sin diseñador."
          >
            Un tema para cada <Acento>giro</Acento> de negocio
          </Encabezado>
        </div>
        <DisenosPorGiro />
      </section>

      <section id="how-it-works" className="scroll-mt-16 border-y border-border bg-card py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Encabezado
            icono={Workflow}
            etiqueta="Cómo funciona"
            bajada="Simple para ti. Sin fricción para tus clientes."
          >
            Tu programa vivo en <Acento>tres pasos</Acento>
          </Encabezado>

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

      <Testimonios />

      {/* Comparación con la tarjeta de papel */}
      <section className="py-20 lg:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Encabezado
            icono={Repeat}
            etiqueta="Antes y ahora"
            bajada="La tarjeta de cartón funciona. Solo que no te deja ver nada de lo que pasa con ella."
          >
            Lo mismo que ya haces, sin el <Acento>papel</Acento>
          </Encabezado>
          <ComparacionPapel />
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-16 border-y border-border bg-card py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <Encabezado icono={Tag} etiqueta="Precios" bajada={siteConfig.pricing.description}>
              Precios claros para <Acento>negocios locales</Acento>
            </Encabezado>
            <Precios />
          </div>
        </div>
      </section>

      {/* Preguntas frecuentes. El encabezado va a un lado y la salida al otro:
          si todas las secciones centran lo mismo, la página se lee como
          diapositivas. */}
      <section id="faq" className="scroll-mt-16 py-20 lg:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
            <Encabezado
              icono={CircleQuestionMark}
              etiqueta="Dudas"
              alineado="izquierda"
              bajada="Todo lo que necesitas saber antes de empezar."
            >
              Preguntas <Acento>frecuentes</Acento>
            </Encabezado>
            <Button asChild variant="outline" className="min-h-11">
              <SmoothNavLink href="#demo">¿Otra duda? Escríbenos</SmoothNavLink>
            </Button>
          </div>
          <Preguntas />
        </div>
      </section>

      {/* Solicitud de demo. El panel oscuro y las tres promesas son del diseño
          aprobado; el formulario vive encima en blanco, que es donde el
          contraste de placeholder, error y foco se sostiene. */}
      <section id="demo" className="scroll-mt-16 py-20 lg:py-24">
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

      {/* La entrada del cliente, que es la otra mitad del público. Era un panel
          del mismo tamaño que el del negocio, y detrás venía un tercero
          repitiendo el mismo botón. Tres paneles iguales seguidos es lo que
          hacía que el final pareciera diapositivas: ahora es una franja. */}
      <section className="border-y border-border bg-card py-10">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-5 px-4 sm:px-6 lg:px-8">
          <div>
            <h2 className="text-xl font-bold text-foreground">¿Ya tienes tu tarjeta?</h2>
            <p className="mt-1 text-muted-foreground">
              Entra a tus tarjetas, mira tu progreso y canjea desde un solo lugar.
            </p>
          </div>
          <Button asChild size="lg" variant="outline" className="min-h-11 group px-8">
            <Link href="/my-cards">
              Ir a mis tarjetas
              <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-150 group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer de cuatro columnas, como el diseño. Solo lleva enlaces que
          existen: privacidad, términos y redes no tienen destino todavía, y un
          enlace muerto es peor que no ponerlo. */}
      <footer className="bg-[#17130f] px-4 py-14 text-[#9a9184] sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex min-h-11 items-center gap-2.5">
              <Image src="/short-logo.svg" alt={siteConfig.shortName} width={32} height={32} className="size-8 shrink-0" />
              <span className="font-semibold text-white">{siteConfig.name}</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed">{siteConfig.footer.tagline}</p>
          </div>
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white">Producto</h3>
            <ul className="space-y-1">
              {[
                { href: "#disenos", texto: "Diseños" },
                { href: "#how-it-works", texto: "Cómo funciona" },
                { href: "#pricing", texto: "Precios" },
                { href: "#faq", texto: "Preguntas frecuentes" },
              ].map((enlace) => (
                <li key={enlace.href}>
                  <SmoothNavLink href={enlace.href} className="inline-flex min-h-11 items-center text-sm hover:text-white transition-colors">
                    {enlace.texto}
                  </SmoothNavLink>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white">Empresa</h3>
            <ul className="space-y-1">
              <li>
                <SmoothNavLink href="#demo" className="inline-flex min-h-11 items-center text-sm hover:text-white transition-colors">
                  Solicitar demo
                </SmoothNavLink>
              </li>
              {siteConfig.footer.links.map((enlace) => (
                <li key={enlace.href}>
                  <Link href={enlace.href} className="inline-flex min-h-11 items-center text-sm hover:text-white transition-colors">
                    {enlace.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/login" className="inline-flex min-h-11 items-center text-sm hover:text-white transition-colors">
                  Iniciar sesión
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mx-auto mt-10 flex max-w-6xl flex-wrap justify-between gap-3 border-t border-white/10 pt-6 text-sm text-[#7c7367]">
          <span>© 2026 ZIVELO. Todos los derechos reservados.</span>
          <span>Hecho en México</span>
        </div>
      </footer>
    </div>
  )
}

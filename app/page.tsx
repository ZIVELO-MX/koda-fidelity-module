import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Smartphone, QrCode, Wallet, CheckCircle2, Zap, Shield, BarChart3 } from "lucide-react"
import { LoyaltyCardPreview } from "@/components/loyalty-card-preview"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">K</span>
              </div>
              <span className="font-semibold text-lg text-foreground">Koda Fidelity</span>
            </div>
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
            <div className="flex items-center gap-3">
              <Link href="/dashboard">
                <Button variant="ghost" className="hidden sm:inline-flex">
                  Iniciar Sesión
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button>
                  Comenzar
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
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
                Lealtad Digital Hecha Simple
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight text-balance">
                Convierte clientes recurrentes en{" "}
                <span className="text-primary">clientes leales</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
                Tarjetas de fidelidad digitales para Apple Wallet y Google Wallet. Sin apps que descargar. 
                Sin cuentas que crear. Solo escanea, guarda y recompensa.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/dashboard">
                  <Button size="lg" className="w-full sm:w-auto text-base px-8">
                    Prueba Gratis
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="#how-it-works">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto text-base px-8">
                    Ver Cómo Funciona
                  </Button>
                </Link>
              </div>
              <div className="flex flex-wrap items-center gap-6 pt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span className="text-sm text-muted-foreground">Gratis para empezar</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span className="text-sm text-muted-foreground">Sin tarjeta de crédito</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span className="text-sm text-muted-foreground">Configuración en 2 min</span>
                </div>
              </div>
            </div>
            <div className="relative lg:pl-8">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-primary/5 rounded-[40px] blur-3xl" />
                <LoyaltyCardPreview
                  businessName="The Daily Grind"
                  currentStamps={6}
                  maxStamps={10}
                  reward="Free Coffee"
                  expirationDate="Dec 31, 2026"
                  brandColor="#f97316"
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
            {[
              {
                icon: QrCode,
                step: "01",
                title: "Crea tu Tarjeta",
                description: "Diseña una tarjeta de lealtad con tus colores y logo. Define tu recompensa y la cantidad de sellos.",
              },
              {
                icon: Smartphone,
                step: "02",
                title: "Clientes Escanean y Guardan",
                description: "Imprime tu código QR. Los clientes lo escanean y guardan la tarjeta al instante en Apple o Google Wallet.",
              },
              {
                icon: Wallet,
                step: "03",
                title: "Recompensa la Lealtad",
                description: "Escanea las tarjetas de clientes para agregar sellos. Cuando alcanzan la meta, canjean su recompensa.",
              },
            ].map((item, index) => (
              <div
                key={index}
                className="relative bg-card rounded-2xl p-8 border border-border shadow-sm hover:shadow-lg transition-shadow group"
              >
                <div className="absolute -top-4 -left-4 w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-lg">
                  {item.step}
                </div>
                <div className="pt-4">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                    <item.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
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
            {[
              {
                icon: Wallet,
                title: "Integración con Wallet",
                description: "Soporte nativo para Apple Wallet y Google Wallet. Las tarjetas se actualizan en tiempo real.",
              },
              {
                icon: QrCode,
                title: "Flujo con QR",
                description: "Sin apps necesarias. Los clientes escanean un código QR y listo.",
              },
              {
                icon: Zap,
                title: "Configuración Instantánea",
                description: "Crea tu primera tarjeta de lealtad en menos de 2 minutos.",
              },
              {
                icon: Shield,
                title: "Seguro y Privado",
                description: "Los datos del cliente están protegidos. Sin cuenta requerida para clientes.",
              },
              {
                icon: BarChart3,
                title: "Analíticas Simples",
                description: "Monitorea sellos, canjes y la actividad de tus clientes.",
              },
              {
                icon: Smartphone,
                title: "Mobile-First",
                description: "Optimizado para la forma en que los clientes interactúan con los negocios.",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="bg-card rounded-2xl p-6 border border-border hover:border-primary/30 transition-colors group"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
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
            {[
              { emoji: "☕", name: "Cafeterías", example: "Compra 9, llévate 1 gratis" },
              { emoji: "🍕", name: "Restaurantes", example: "Postre gratis después de 5 visitas" },
              { emoji: "💇", name: "Barberías", example: "10mo corte gratis" },
              { emoji: "🛒", name: "Tiendas Locales", example: "Acumula puntos en tus compras" },
            ].map((useCase, index) => (
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

      {/* CTA Section */}
      <section className="py-20 lg:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-3xl p-12 lg:p-16 border border-primary/20">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              ¿Listo para construir lealtad?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              Comienza tu prueba gratis hoy. Sin tarjeta de crédito. 
              Crea tu primera tarjeta de lealtad en minutos.
            </p>
            <Link href="/dashboard">
              <Button size="lg" className="text-base px-10">
                Comenzar Gratis
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
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">K</span>
              </div>
              <span className="font-semibold text-foreground">Koda Fidelity</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Parte del ecosistema Koda POS. Hecho para pequeños negocios.
            </p>
            <div className="flex items-center gap-6">
              <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Privacidad
              </Link>
              <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Términos
              </Link>
              <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Soporte
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

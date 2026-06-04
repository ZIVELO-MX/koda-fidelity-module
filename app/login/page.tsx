import Image from "next/image"
import Link from "next/link"
import { CheckCircle2 } from "lucide-react"
import { LoginForm } from "@/components/auth/login-form"
import { LoyaltyCardPreview } from "@/components/loyalty-card-preview"
import { siteConfig } from "@/lib/site-config"

const brandingFeatures = [
  "Sin apps requeridas — solo escanea el QR",
  "Acceso seguro con enlace mágico por email",
  "Setup completo en menos de 2 minutos",
]

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="grid lg:grid-cols-2 min-h-screen">

        {/* Left branding panel */}
        <div className="hidden lg:flex flex-col relative bg-muted/30 border-r border-border overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-32 -left-16 w-[500px] h-[500px] rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -bottom-20 right-0 w-[350px] h-[350px] rounded-full bg-primary/[0.07] blur-3xl" />
          </div>
          <div className="relative z-10 flex flex-col justify-between h-full p-12">
            <Link href="/" className="flex items-center gap-2 w-fit">
              <Image src="/short-logo.svg" alt="Koda" width={36} height={36} className="size-9 shrink-0" />
              <span className="font-semibold text-lg text-foreground">Koda Fidelity</span>
            </Link>

            <div className="space-y-8">
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-foreground leading-snug">
                  {siteConfig.hero.title}
                  <span className="text-primary">{siteConfig.hero.titleHighlight}</span>
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {siteConfig.hero.subtitle}
                </p>
              </div>
              <div className="card-float">
              <LoyaltyCardPreview
                businessName={siteConfig.hero.demoCard.businessName}
                currentStamps={siteConfig.hero.demoCard.currentStamps}
                maxStamps={siteConfig.hero.demoCard.maxStamps}
                reward={siteConfig.hero.demoCard.reward}
                brandColor={siteConfig.hero.demoCard.brandColor}
                showQR={false}
                className="max-w-[280px]"
              />
              </div>
              <div className="space-y-2.5">
                {brandingFeatures.map((f) => (
                  <div key={f} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">{siteConfig.footer.tagline}</p>
          </div>
        </div>

        {/* Right form panel */}
        <div className="flex flex-col items-center justify-center p-6 sm:p-8">
          <div className="lg:hidden mb-8">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/short-logo.svg" alt="Koda" width={32} height={32} className="size-8 shrink-0" />
              <span className="font-semibold text-foreground">Koda Fidelity</span>
            </Link>
          </div>
          <LoginForm />
        </div>

      </div>
    </div>
  )
}

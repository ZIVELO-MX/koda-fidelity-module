import Image from "next/image"
import Link from "next/link"
import { CheckCircle2 } from "lucide-react"
import { config } from "@/lib/config"
import { SignupForm } from "@/components/auth/signup-form"
import { LoyaltyCardPreview } from "@/components/loyalty-card-preview"
import { siteConfig } from "@/lib/site-config"

const brandingFeatures = [
  "Tu primera tarjeta queda lista en menos de dos minutos",
  "Tus clientes no instalan nada: escanean el QR",
  "Ves quién vuelve y qué premios se canjean, al día",
]

export default function SignupPage() {
  return (
    <div className="landing min-h-screen bg-background forced-light">
      <div className="grid lg:grid-cols-2 min-h-screen">

        {/* Left branding panel */}
        <div
          className="relative hidden flex-col overflow-hidden text-white lg:flex"
          style={{ background: "radial-gradient(130% 120% at 82% -10%, #241d16 0%, #17130f 46%, #0e0b08 100%)" }}
        >
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="absolute -top-40 -left-24 h-[620px] w-[620px] rounded-full bg-primary/25 blur-3xl" />
            <div className="absolute -bottom-44 right-0 h-[460px] w-[460px] rounded-full bg-primary/10 blur-3xl" />
          </div>
          <div className="relative z-10 flex flex-col justify-between h-full p-12">
            <Link href="/" className="inline-flex min-h-11 w-fit items-center gap-2">
              <Image src="/short-logo.svg" alt="Koda" width={36} height={36} className="size-9 shrink-0" />
              <span className="text-lg font-semibold text-white">Koda Fidelity</span>
            </Link>

            <div className="space-y-8">
              <div className="space-y-3">
                <h2 className="text-2xl font-bold leading-snug text-white">
                  Tu programa de lealtad digital,{" "}
                  <span className="text-primary">listo en minutos</span>
                </h2>
                <p className="text-sm leading-relaxed text-white/72">
                  Únete a los negocios locales que ya fidelizan a sus clientes con Koda.
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
                  <div key={f} className="flex items-center gap-2.5 text-sm text-white/80">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-white/55">{siteConfig.footer.tagline}</p>
          </div>
        </div>

        {/* Right form panel */}
        <div className="flex flex-col items-center justify-center p-6 sm:p-8">
          <div className="lg:hidden mb-8">
            <Link href="/" className="inline-flex min-h-11 items-center gap-2">
              <Image src="/short-logo.svg" alt="Koda" width={32} height={32} className="size-8 shrink-0" />
              <span className="font-semibold text-foreground">Koda Fidelity</span>
            </Link>
          </div>
          <SignupForm isInviteOnly={config.isInviteOnly} />
        </div>

      </div>
    </div>
  )
}

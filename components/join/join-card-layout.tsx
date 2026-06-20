"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoyaltyCardPreview } from "@/components/loyalty-card-preview"
import { GoogleButton } from "@/components/auth/google-button"
import { ArrowLeft, ChevronDown, Loader2 } from "lucide-react"

export interface JoinCardData {
  name: string
  stampsRequired: number
  reward: string
  brandColor: string
  iconName: string | null
  expiresAt: string | null
  businessName: string
  businessBrandColor: string
  businessLogoUrl: string | null
  businessIconName: string | null
}

interface JoinCardLayoutProps {
  cardInfo: JoinCardData | null
  preview?: boolean
  previewBackHref?: string
  cardId?: string
  name?: string
  email?: string
  nameError?: boolean
  emailError?: boolean
  sendError?: string | null
  sending?: boolean
  onNameChange?: (value: string) => void
  onEmailChange?: (value: string) => void
  onSubmit?: (e: React.FormEvent) => void
  formRef?: React.RefObject<HTMLDivElement | null>
  onMemberClick?: () => void
}

export function JoinCardLayout({
  cardInfo,
  preview = false,
  previewBackHref,
  cardId,
  name = "",
  email = "",
  nameError = false,
  emailError = false,
  sendError = null,
  sending = false,
  onNameChange,
  onEmailChange,
  onSubmit,
  formRef,
  onMemberClick,
}: JoinCardLayoutProps) {
  return (
    <div className="min-h-screen bg-background forced-light flex flex-col">
      {preview && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-sm text-amber-800 font-medium">
          Vista previa — página de registro
        </div>
      )}

      <header className="border-b border-border bg-card">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-2">
          {preview && previewBackHref ? (
            <Link href={previewBackHref} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          ) : preview ? (
            <span className="text-muted-foreground">
              <ArrowLeft className="h-5 w-5" />
            </span>
          ) : (
            <Link href="/" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          )}
          <span className="font-semibold text-foreground">Obtén tu tarjeta de lealtad</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-md space-y-8">
          {cardInfo ? (
            <div className="scale-75 sm:scale-90 origin-top">
              <LoyaltyCardPreview
                businessName={cardInfo.businessName}
                businessLogo={cardInfo.businessLogoUrl ?? undefined}
                iconName={cardInfo.iconName ?? cardInfo.businessIconName}
                customerName={name || "Tu Nombre"}
                currentStamps={0}
                maxStamps={cardInfo.stampsRequired}
                reward={cardInfo.reward}
                expirationDate={
                  cardInfo.expiresAt
                    ? new Date(cardInfo.expiresAt).toLocaleDateString("es-MX")
                    : undefined
                }
                brandColor={cardInfo.brandColor}
                showQR={false}
                onMemberClick={preview ? undefined : onMemberClick}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          <div
            className={`flex flex-col items-center gap-2 text-muted-foreground ${preview ? "" : "animate-bounce"}`}
          >
            <ChevronDown className="h-6 w-6" />
            <span className="text-xs font-medium">Completa tus datos abajo</span>
            <ChevronDown className="h-6 w-6" />
          </div>

          <div ref={formRef} className="bg-card rounded-2xl p-6 border border-border">
            <h1 className="text-xl font-bold text-foreground text-center mb-1">
              Obtén tu tarjeta de lealtad
            </h1>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Un solo clic y tendrás tu tarjeta lista
            </p>

            {preview ? (
              <Button disabled className="w-full h-12 text-base" size="lg">
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continuar con Google
              </Button>
            ) : (
              <GoogleButton redirectTo={`/join/${cardId}`} />
            )}

            <p className="mt-3 text-center text-sm text-muted-foreground">
              Te recomendamos continuar con Google para guardar tu tarjeta de forma más rápida y segura.
            </p>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">o con correo electrónico</span>
              </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Tu Nombre</Label>
                <Input
                  id="name"
                  placeholder="Ej: Juan Pérez"
                  value={name}
                  onChange={(e) => onNameChange?.(e.target.value)}
                  className="text-base"
                  autoComplete="name"
                  aria-invalid={nameError}
                  disabled={preview}
                />
                {nameError && <p className="text-sm text-red-500">El nombre es obligatorio</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ejemplo@correo.com"
                  value={email}
                  onChange={(e) => onEmailChange?.(e.target.value)}
                  className="text-base"
                  autoComplete="email"
                  aria-invalid={emailError}
                  disabled={preview}
                />
                {emailError && <p className="text-sm text-red-500">Ingresa un correo electrónico válido</p>}
              </div>

              {sendError && !preview && <p className="text-sm text-red-500 text-center">{sendError}</p>}

              <Button type="submit" className="w-full" size="lg" disabled={sending || preview}>
                {sending ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  "Enviar enlace mágico"
                )}
              </Button>
            </form>

            <p className="text-xs text-muted-foreground text-center mt-4">
              Te enviaremos un enlace por correo para confirmar tu identidad.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

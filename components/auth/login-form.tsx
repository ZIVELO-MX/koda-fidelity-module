"use client"

import { useState, useActionState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { checkBusinessEmail, sendLoginMagicLink, login, type AuthResult } from "@/lib/actions/auth"
import { GoogleButton } from "@/components/auth/google-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, Loader2, ArrowLeft, MessageCircle, Eye, EyeOff } from "lucide-react"

const SUPPORT_WA = "5213921107274"

type LoginStep = "email" | "password" | "sent" | "recover"

const initialState: AuthResult = {}

export function LoginForm() {
  const searchParams = useSearchParams()
  const [step, setStep] = useState<LoginStep>(
    searchParams.get("recover") === "true" ? "recover" : "email"
  )
  const [email, setEmail] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [loginState, loginAction, loginPending] = useActionState(login, initialState)

  function waRecoverLink(address: string) {
    const text = address
      ? `Hola, quisiera restablecer mi contraseña en Koda Fidelity. Correo: ${address}`
      : "Hola, quisiera restablecer mi contraseña en Koda Fidelity."
    return `https://wa.me/${SUPPORT_WA}?text=${encodeURIComponent(text)}`
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email.trim() || !email.includes("@")) {
      setError("Ingresa un correo electrónico válido")
      return
    }
    setPending(true)
    try {
      const isBusiness = await checkBusinessEmail(email.trim())
      if (isBusiness) {
        setStep("password")
      } else {
        const result = await sendLoginMagicLink(email.trim())
        if (result.error) {
          setError(result.error)
        } else {
          setStep("sent")
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : ""
      if (message.includes("rate_limit") || message.includes("over_email_send_rate_limit")) {
        setError("Has solicitado demasiados enlaces. Espera un momento e intenta de nuevo.")
      } else {
        setError("Ocurrió un error. Intenta de nuevo.")
      }
    } finally {
      setPending(false)
    }
  }

  if (step === "sent") {
    return (
      <Card className="w-full max-w-md auth-card-enter shadow-lg border-border/50">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Image src="/short-logo.svg" alt="Koda" width={48} height={48} className="size-12" />
          </div>
          <CardTitle className="text-2xl">Revisa tu correo</CardTitle>
          <CardDescription>
            Te enviamos un enlace mágico a <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="mail-bounce w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Mail className="h-10 w-10 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            Haz clic en el enlace para ver tus tarjetas de lealtad.
          </p>
        </CardContent>
        <CardFooter className="flex-col gap-2 text-sm text-muted-foreground">
          <button
            onClick={() => { setStep("email"); setError(null) }}
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Usar otro correo
          </button>
        </CardFooter>
      </Card>
    )
  }

  if (step === "recover") {
    return (
      <Card className="w-full max-w-md auth-card-enter shadow-lg border-border/50">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Image src="/short-logo.svg" alt="Koda" width={48} height={48} className="size-12" />
          </div>
          <CardTitle className="text-2xl">Recuperar contraseña</CardTitle>
          <CardDescription>
            Confirma tu correo y escríbenos por WhatsApp para restablecer tu acceso
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recover-email">Correo electrónico</Label>
            <Input
              id="recover-email"
              type="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
              className="[&:user-invalid]:border-destructive [&:user-valid]:border-primary transition-colors"
            />
          </div>
          <Button
            asChild
            className="w-full active:scale-[0.97] transition-transform bg-[#25D366] hover:bg-[#1ebe5d] text-white"
          >
            <a href={waRecoverLink(email)} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-2 h-4 w-4" />
              Solicitar por WhatsApp
            </a>
          </Button>
        </CardContent>
        <CardFooter className="flex-col gap-2 text-sm text-muted-foreground">
          <button
            onClick={() => { setStep("email"); setError(null) }}
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio de sesión
          </button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md auth-card-enter shadow-lg border-border/50">
      <div key={step} className="auth-step-enter">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Image src="/short-logo.svg" alt="Koda" width={48} height={48} className="size-12" />
          </div>
          <CardTitle className="text-2xl">
            {step === "password" ? "Ingresa tu contraseña" : "Iniciar Sesión"}
          </CardTitle>
          <CardDescription className={step === "password" ? "mt-3" : undefined}>
            {step === "password"
              ? `Bienvenido de vuelta, ${email.split("@")[0]}`
              : "Accede a tu panel o a tus tarjetas de lealtad"}
          </CardDescription>
        </CardHeader>

        <CardContent className={step === "password" ? "pt-4" : undefined}>
          {(error || loginState?.error) && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive mb-4">
              {error || loginState.error}
            </div>
          )}

          {step === "email" ? (
            <div className="space-y-4">
              <GoogleButton redirectTo="/dashboard/my-cards" />
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">o correo electrónico</span>
                </div>
              </div>
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@correo.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(null) }}
                    required
                    autoComplete="email"
                    autoFocus
                    className="[&:user-invalid]:border-destructive [&:user-valid]:border-primary transition-colors"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full active:scale-[0.97] transition-transform"
                  disabled={pending}
                >
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continuar"}
                </Button>
              </form>
            </div>
          ) : (
            <form action={loginAction} className="space-y-4">
              <input type="hidden" name="email" value={email} />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Contraseña</Label>
                  <button
                    type="button"
                    onClick={() => { setStep("recover"); setError(null) }}
                    className="text-xs text-primary hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Tu contraseña"
                    required
                    autoComplete="current-password"
                    autoFocus
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full active:scale-[0.97] transition-transform"
                disabled={loginPending}
              >
                {loginPending ? "Iniciando sesión..." : "Iniciar Sesión"}
              </Button>
              <button
                type="button"
                onClick={() => { setStep("email"); setError(null) }}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Usar otro correo
              </button>
            </form>
          )}
        </CardContent>

        <CardFooter className="flex-col gap-2 text-sm text-muted-foreground">
          {step !== "password" && (
            <span>
              ¿Sin acceso?{" "}
              <Link href="/signup" className="text-primary hover:underline font-medium">
                Más información
              </Link>
            </span>
          )}
        </CardFooter>
      </div>
    </Card>
  )
}

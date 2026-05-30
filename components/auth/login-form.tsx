"use client"

import { useState, useActionState } from "react"
import Image from "next/image"
import Link from "next/link"
import { checkBusinessEmail, sendLoginMagicLink, login, type AuthResult } from "@/lib/actions/auth"
import { GoogleButton } from "@/components/auth/google-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, Loader2, ArrowLeft } from "lucide-react"

type LoginStep = "email" | "password" | "sent"

const initialState: AuthResult = {}

export function LoginForm() {
  const [step, setStep] = useState<LoginStep>("email")
  const [email, setEmail] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loginState, loginAction, loginPending] = useActionState(login, initialState)

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
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Image
              src="/short-logo.svg"
              alt="Koda"
              width={48}
              height={48}
              className="size-12"
            />
          </div>
          <CardTitle className="text-2xl">Revisa tu correo</CardTitle>
          <CardDescription>
            Te enviamos un enlace mágico a <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
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

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <Image
            src="/short-logo.svg"
            alt="Koda"
            width={48}
            height={48}
            className="size-12"
          />
        </div>
        <CardTitle className="text-2xl">
          {step === "password" ? "Ingresa tu contraseña" : "Iniciar Sesión"}
        </CardTitle>
        <CardDescription>
          {step === "password"
            ? `Bienvenido de vuelta, ${email.split("@")[0]}`
            : "Accede a tu panel o a tus tarjetas de lealtad"}
        </CardDescription>
      </CardHeader>
      <CardContent>
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
                <span className="bg-card px-2 text-muted-foreground">
                  o correo electrónico
                </span>
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
              />
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Continuar"
              )}
            </Button>
          </form>
          </div>
        ) : (
          <form action={loginAction} className="space-y-4">
            <input type="hidden" name="email" value={email} />
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                autoComplete="current-password"
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full" disabled={loginPending}>
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
    </Card>
  )
}

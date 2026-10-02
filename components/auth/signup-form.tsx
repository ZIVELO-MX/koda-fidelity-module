"use client"

import { useState, useActionState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { signup, type AuthResult } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Lock, Mail } from "lucide-react"
import { PasswordRequirements } from "@/components/auth/password-requirements"
import { cumpleLasReglas } from "@/lib/reglas-de-contrasena"
import { cn } from "@/lib/utils"

const initialState: AuthResult = {}

export function SignupForm({ isInviteOnly }: { isInviteOnly: boolean }) {
  const [state, formAction, pending] = useActionState(signup, initialState)
  const searchParams = useSearchParams()
  const [password, setPassword] = useState("")
  const [email, setEmail] = useState(searchParams.get("email") ?? "")
  const [step, setStep] = useState<1 | 2>(1)
  const [accountType, setAccountType] = useState<"BUSINESS" | "CUSTOMER" | null>(searchParams.get("accountType") === "CUSTOMER" ? "CUSTOMER" : null)

  const allRequirementsMet = password.length > 0 && cumpleLasReglas(password)

  if (isInviteOnly) {
    return (
      <Card className="w-full max-w-md auth-card-enter rounded-[14px] border-border/60 shadow-[0_12px_32px_rgba(28,27,23,0.12),0_2px_4px_rgba(28,27,23,0.04)]">
        <CardHeader className="text-center">
          <CardTitle asChild>
            <h1 className="text-2xl">Beta Privado</h1>
          </CardTitle>
          <CardDescription>Koda Fidelity está en desarrollo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl bg-muted p-6 text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              El registro público no está disponible por ahora.
              <br />
              Koda Fidelity está en beta privado mientras terminamos el desarrollo.
            </p>
            <p className="text-xs text-muted-foreground">
              ¿Te interesa? Escríbenos para conseguir acceso anticipado.
            </p>
          </div>
          <Button asChild variant="outline" className="min-h-11 w-full active:scale-[0.97] transition-transform">
            <a href="mailto:contacto@zivelo.dev" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Solicitar acceso
            </a>
          </Button>
        </CardContent>
        <CardFooter className="justify-center text-sm text-muted-foreground">
          ¿Ya tienes acceso?{" "}
          <Link href="/login" className="ml-1 inline-flex min-h-11 items-center font-medium text-primary hover:underline">
            Iniciar sesión
          </Link>
        </CardFooter>
      </Card>
    )
  }

  if (state.success) {
    return (
      <Card className="w-full max-w-md auth-card-enter rounded-[14px] border-border/60 shadow-[0_12px_32px_rgba(28,27,23,0.12),0_2px_4px_rgba(28,27,23,0.04)]">
        <CardHeader className="text-center">
          <CardTitle asChild>
            <h1 className="text-2xl">¡Cuenta creada!</h1>
          </CardTitle>
          <CardDescription>Revisa tu correo para confirmar tu cuenta</CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="mail-bounce w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Mail className="h-10 w-10 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            Te enviamos un correo de confirmación. Haz clic en el enlace para activar tu cuenta.
          </p>
        </CardContent>
        <CardFooter className="justify-center text-sm text-muted-foreground">
          <Link href="/login" className="inline-flex min-h-11 items-center font-medium text-primary hover:underline">
            Ir a iniciar sesión
          </Link>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md auth-card-enter rounded-[14px] border-border/60 shadow-[0_12px_32px_rgba(28,27,23,0.12),0_2px_4px_rgba(28,27,23,0.04)]">
      <CardHeader className="text-center">
        <CardTitle asChild>
            <h1 className="text-2xl">Crear cuenta</h1>
          </CardTitle>
        <CardDescription>{step === 1 ? "Crea tu cuenta para empezar" : "¿Cómo usarás Koda Fidelity?"}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state.error && (
            <div
              role="alert"
              className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive"
            >
              {state.error}
            </div>
          )}

          {step === 1 && <>
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              name="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              placeholder="tu@correo.com"
              required
              autoComplete="email"
              className="[&:user-invalid]:border-destructive [&:user-valid]:border-primary transition-colors"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={cn(
                "transition-colors",
                password.length > 0 && allRequirementsMet && "border-primary",
                password.length > 0 && !allRequirementsMet && "border-destructive/50",
              )}
            />
            <div className={cn("pw-req-container", password.length > 0 && "is-open")}>
              <div className="pw-req-inner pt-1">
                <PasswordRequirements password={password} />
              </div>
            </div>
          </div>
          <Button type="button" className="min-h-11 w-full" disabled={!allRequirementsMet} onClick={() => setStep(2)}>
            Continuar
          </Button>
          </>}
          {step === 2 && <>
            <input type="hidden" name="email" value={email} />
            <input type="hidden" name="password" value={password} />
            <input type="hidden" name="next" value={searchParams.get("next") ?? ""} />
            {accountType === "CUSTOMER" && <div className="space-y-2"><Label htmlFor="name">Tu nombre</Label><Input id="name" name="name" autoComplete="name" defaultValue={searchParams.get("name") ?? ""} required maxLength={120} /></div>}
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium">Elige una opción</legend>
              {[{type:"BUSINESS" as const,title:"Soy un negocio",description:"Crea una tarjeta de sellos para tus clientes."},{type:"CUSTOMER" as const,title:"Soy un cliente",description:"Guarda y consulta tus tarjetas de lealtad."}].map((option) => (
                <label key={option.type} className={cn("block w-full cursor-pointer rounded-xl border p-4 text-left transition-colors focus-within:ring-2 focus-within:ring-ring", accountType === option.type ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
                  <input type="radio" name="accountType" value={option.type} required checked={accountType === option.type} onChange={() => setAccountType(option.type)} className="sr-only" />
                  <span className="block font-semibold">{option.title}</span><span className="mt-1 block text-sm text-muted-foreground">{option.description}</span>
                </label>
              ))}
            </fieldset>
            <Button type="button" variant="outline" className="min-h-11 w-full" onClick={() => setStep(1)}>Atrás</Button>
            <Button type="submit" className="min-h-11 w-full" disabled={pending || !accountType}>{pending ? "Creando cuenta..." : "Crear cuenta"}</Button>
          </>}
        </form>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm text-muted-foreground">
        <span>
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="inline-flex min-h-11 items-center font-medium text-primary hover:underline">
            Iniciar sesión
          </Link>
        </span>
      </CardFooter>
    </Card>
  )
}

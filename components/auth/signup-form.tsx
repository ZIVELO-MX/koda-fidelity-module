"use client"

import { useState, useActionState } from "react"
import Image from "next/image"
import Link from "next/link"
import { signup, type AuthResult } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Lock, CheckCircle2, Circle, Mail } from "lucide-react"
import { cn } from "@/lib/utils"

const initialState: AuthResult = {}

const passwordRequirements = [
  { label: "Mínimo 8 caracteres", test: (p: string) => p.length >= 8 },
  { label: "Una letra mayúscula (A–Z)", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Un carácter especial (!@#$%...)", test: (p: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p) },
]

function PasswordRequirements({ password }: { password: string }) {
  return (
    <div className="space-y-1.5 pt-1">
      {passwordRequirements.map(({ label, test }, i) => {
        const met = test(password)
        return (
          <div
            key={label}
            className="pw-req flex items-center gap-2"
            style={{ transitionDelay: `${i * 40}ms` }}
          >
            {met ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 transition-colors duration-200" />
            ) : (
              <Circle className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 transition-colors duration-200" />
            )}
            <span className={cn(
              "text-xs transition-colors duration-200",
              met ? "text-foreground" : "text-muted-foreground"
            )}>
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function SignupForm({ isInviteOnly }: { isInviteOnly: boolean }) {
  const [state, formAction, pending] = useActionState(signup, initialState)
  const [password, setPassword] = useState("")

  const allRequirementsMet = password.length > 0 && passwordRequirements.every(({ test }) => test(password))

  if (isInviteOnly) {
    return (
      <Card className="w-full max-w-md auth-card-enter shadow-lg border-border/50">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Image src="/short-logo.svg" alt="Koda" width={48} height={48} className="size-12" />
          </div>
          <CardTitle className="text-2xl">Beta Privado</CardTitle>
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
          <Button asChild variant="outline" className="w-full active:scale-[0.97] transition-transform">
            <a href="mailto:soporte@koda.app" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Solicitar acceso
            </a>
          </Button>
        </CardContent>
        <CardFooter className="justify-center text-sm text-muted-foreground">
          ¿Ya tienes acceso?{" "}
          <Link href="/login" className="ml-1 text-primary hover:underline font-medium">
            Iniciar Sesión
          </Link>
        </CardFooter>
      </Card>
    )
  }

  if (state.success) {
    return (
      <Card className="w-full max-w-md auth-card-enter shadow-lg border-border/50">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Image src="/short-logo.svg" alt="Koda" width={48} height={48} className="size-12" />
          </div>
          <CardTitle className="text-2xl">¡Cuenta creada!</CardTitle>
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
          <Link href="/login" className="text-primary hover:underline font-medium">
            Ir a Iniciar Sesión
          </Link>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md auth-card-enter shadow-lg border-border/50">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <Image src="/short-logo.svg" alt="Koda" width={48} height={48} className="size-12" />
        </div>
        <CardTitle className="text-2xl">Crear Cuenta</CardTitle>
        <CardDescription>Registra tu negocio en Koda Fidelity</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state.error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {state.error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Nombre del negocio</Label>
            <Input
              id="name"
              name="name"
              placeholder="Mi Cafetería"
              required
              autoComplete="organization"
              className="[&:user-invalid]:border-destructive [&:user-valid]:border-primary transition-colors"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              name="email"
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
              placeholder="••••••••"
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

          <Button
            type="submit"
            className="w-full active:scale-[0.97] transition-transform"
            disabled={pending || (password.length > 0 && !allRequirementsMet)}
          >
            {pending ? "Creando cuenta..." : "Crear Cuenta"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm text-muted-foreground">
        <span>
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="text-primary hover:underline font-medium">
            Iniciar Sesión
          </Link>
        </span>
      </CardFooter>
    </Card>
  )
}

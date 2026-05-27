"use client"

import { useActionState } from "react"
import Image from "next/image"
import Link from "next/link"
import { signup, type AuthResult } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Lock } from "lucide-react"

const initialState: AuthResult = {}

export function SignupForm({ isInviteOnly }: { isInviteOnly: boolean }) {
  const [state, formAction, pending] = useActionState(signup, initialState)

  if (isInviteOnly) {
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
        <CardTitle className="text-2xl">Beta Privado</CardTitle>
          <CardDescription>Koda Fidelity está en desarrollo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl bg-muted p-6 text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted-foreground/10 flex items-center justify-center">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              El registro público no está disponible por ahora.
              <br />
              Koda Fidelity está en beta privado mientras terminamos el desarrollo.
            </p>
            <p className="text-xs text-muted-foreground">
              ¿Te interesa? Escríbenos para conseguir acceso.
            </p>
          </div>
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
          {state.success && (
            <div className="rounded-lg bg-primary/10 border border-primary/20 px-4 py-3 text-sm text-primary">
              Cuenta creada correctamente. Revisa tu correo para confirmar.
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del negocio</Label>
            <Input id="name" name="name" placeholder="Mi Cafetería" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input id="email" name="email" type="email" placeholder="tu@correo.com" required autoComplete="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" name="password" type="password" placeholder="••••••••" required autoComplete="new-password" />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
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
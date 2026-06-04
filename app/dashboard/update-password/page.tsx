"use client"

import { useActionState } from "react"
import Image from "next/image"
import { updatePassword, type AuthResult } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, KeyRound } from "lucide-react"

const initialState: AuthResult = {}

export default function UpdatePasswordPage() {
  const [state, action, pending] = useActionState(updatePassword, initialState)

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Image src="/short-logo.svg" alt="Koda" width={48} height={48} className="size-12" />
          </div>
          <div className="flex justify-center mb-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <KeyRound className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Actualiza tu contraseña</CardTitle>
          <CardDescription>
            Por seguridad, elige una contraseña personal antes de continuar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {state?.error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive mb-4">
              {state.error}
            </div>
          )}
          <form action={action} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nueva contraseña</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Mínimo 8 caracteres"
                required
                autoComplete="new-password"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirmar contraseña</Label>
              <Input
                id="confirm"
                name="confirm"
                type="password"
                placeholder="Repite tu contraseña"
                required
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Guardar contraseña"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

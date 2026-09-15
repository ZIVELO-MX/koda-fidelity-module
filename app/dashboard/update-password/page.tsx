"use client"

import { Suspense, useActionState, useState } from "react"
import { useSearchParams } from "next/navigation"
import { updatePassword, type AuthResult } from "@/lib/actions/auth"
import { PasswordRequirements } from "@/components/auth/password-requirements"
import { cumpleLasReglas } from "@/lib/reglas-de-contrasena"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const initialState: AuthResult = {}

/**
 * A esta pantalla se llega por dos puertas distintas, y hasta ahora solo
 * hablaba de una:
 *
 *   - La invitación, donde alguien estrena su cuenta y de paso puede ponerse un
 *     apodo para el panel.
 *   - La recuperación, donde ya tiene cuenta y solo va a cambiar la contraseña.
 *     Pedirle ahí un apodo es preguntarle algo que no vino a hacer.
 *
 * El enlace de recuperación trae `?motivo=recuperacion`, así que la pantalla
 * sabe por cuál entró.
 */
function CambiarContrasena() {
  const esRecuperacion = useSearchParams().get("motivo") === "recuperacion"
  const [state, action, pending] = useActionState(updatePassword, initialState)
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")

  const reglasOk = password.length > 0 && cumpleLasReglas(password)
  const coinciden = confirm.length > 0 && password === confirm
  const noCoinciden = confirm.length > 0 && password !== confirm

  return (
    <div className="landing flex min-h-screen items-center justify-center bg-background p-4 forced-light">
      <Card className="w-full max-w-md auth-card-enter rounded-[14px] border-border/60 shadow-[0_12px_32px_rgba(28,27,23,0.12),0_2px_4px_rgba(28,27,23,0.04)]">
        <CardHeader className="text-center">
          <CardTitle asChild>
            <h1 className="text-2xl">
              {esRecuperacion ? "Crea una contraseña nueva" : "Configura tu cuenta"}
            </h1>
          </CardTitle>
          <CardDescription>
            {esRecuperacion
              ? "La anterior deja de servir en cuanto guardes esta."
              : "Elige una contraseña personal. El apodo es opcional y lo puedes cambiar después."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {state?.error && (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                autoFocus
                className={cn(password.length > 0 && !reglasOk && "border-destructive/50")}
              />
              {/* Las reglas a la vista mientras se escribe. Antes solo se
                  conocían al ser rechazado, y encima eran más flojas que las
                  del registro. */}
              <PasswordRequirements password={password} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm">Confirmar contraseña</Label>
              <Input
                id="confirm"
                name="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
                aria-invalid={noCoinciden || undefined}
                className={cn(noCoinciden && "border-destructive", coinciden && "border-primary")}
              />
              {noCoinciden && (
                <p className="text-xs text-destructive">Las dos contraseñas no son iguales.</p>
              )}
            </div>

            {!esRecuperacion && (
              <div className="space-y-2">
                <Label htmlFor="nickname">
                  Apodo <span className="font-normal text-muted-foreground">(opcional)</span>
                </Label>
                <p className="text-xs text-muted-foreground">
                  Se muestra en el panel en lugar de tu correo. Puedes cambiarlo en Configuración.
                </p>
                <Input
                  id="nickname"
                  name="nickname"
                  type="text"
                  placeholder="Ej. Juan, El Jefe, Administrador"
                  autoComplete="off"
                  maxLength={40}
                />
              </div>
            )}

            <Button
              type="submit"
              className="min-h-11 w-full active:scale-[0.97] transition-transform"
              disabled={pending || !reglasOk || !coinciden}
            >
              {pending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : esRecuperacion ? (
                "Guardar contraseña"
              ) : (
                "Guardar y continuar"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function UpdatePasswordPage() {
  return (
    <Suspense>
      <CambiarContrasena />
    </Suspense>
  )
}

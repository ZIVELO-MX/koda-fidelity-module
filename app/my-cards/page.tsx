"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { GoogleButton } from "@/components/auth/google-button"
import { Mail, Loader2, ArrowLeft } from "lucide-react"
import { createBrowserSupabase } from "@/lib/supabase-browser"
import { getFriendlySendError } from "@/lib/auth-errors"

type Estado = "comprobando" | "correo" | "enviado"

const TARJETA =
  "w-full max-w-md auth-card-enter rounded-[14px] border-border/60 shadow-[0_12px_32px_rgba(28,27,23,0.12),0_2px_4px_rgba(28,27,23,0.04)]"

/**
 * La puerta pública del portal del cliente.
 *
 * El contrato quedó fijado en FID-0019: se entra con Google o con enlace
 * mágico, siempre hacia `/dashboard/my-cards`, y un cliente sin tarjetas es una
 * lista vacía, no un error.
 *
 * Quien llega aquí no es el dueño de un negocio: es alguien que juntó sellos en
 * una cafetería y quiere ver cuántos lleva. Por eso la pantalla no habla de
 * cuentas ni de paneles.
 */
export default function PuertaDelPortal() {
  const router = useRouter()
  const [estado, setEstado] = useState<Estado>("comprobando")
  const [correo, setCorreo] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [fallo, setFallo] = useState<string | null>(null)

  useEffect(() => {
    let vigente = true
    createBrowserSupabase()
      .auth.getSession()
      .then(({ data: { session } }) => {
        if (!vigente) return
        // Con sesión no hay nada que preguntar. Antes esto llamaba a `redirect()`
        // dentro de un efecto asíncrono, que es una API de servidor: lanza y
        // nadie la atrapa de forma fiable desde el cliente.
        if (session?.user?.email) router.replace("/dashboard/my-cards")
        else setEstado("correo")
      })
      .catch(() => {
        if (vigente) setEstado("correo")
      })
    return () => {
      vigente = false
    }
  }, [router])

  const pedirEnlace = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setFallo(null)

      if (!correo.trim() || !correo.includes("@")) {
        setFallo("Escribe un correo electrónico válido.")
        return
      }
      setEnviando(true)

      try {
        const supabase = createBrowserSupabase()
        const { error } = await supabase.auth.signInWithOtp({
          email: correo.trim(),
          options: {
            shouldCreateUser: true,
            emailRedirectTo: `${window.location.origin}/dashboard/my-cards`,
          },
        })
        if (error) throw error
        setEstado("enviado")
      } catch (err) {
        setFallo(getFriendlySendError(err))
      } finally {
        setEnviando(false)
      }
    },
    [correo],
  )

  if (estado === "comprobando") {
    return (
      <div className="landing flex min-h-screen items-center justify-center bg-background p-4 forced-light">
        <p className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          Viendo si ya habías entrado…
        </p>
      </div>
    )
  }

  if (estado === "enviado") {
    return (
      <div className="landing flex min-h-screen items-center justify-center bg-background p-4 forced-light">
        <Card className={TARJETA}>
          <CardHeader className="text-center">
            <CardTitle asChild>
              <h1 className="text-2xl">Revisa tu correo</h1>
            </CardTitle>
            <CardDescription>
              Te mandamos un enlace a <strong>{correo}</strong>. Ábrelo desde este teléfono y
              entras directo a tus tarjetas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 text-center">
            <div className="mail-bounce mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-10 w-10 text-primary" aria-hidden="true" />
            </div>
            <p className="text-sm text-muted-foreground">
              El enlace sirve una sola vez. Si no llega en unos minutos, revisa el correo no
              deseado.
            </p>
            {/* Volvía a /dashboard/my-cards, que sin sesión rebota aquí otra vez.
                Ahora vuelve a donde se puede hacer algo: el formulario. */}
            <Button
              variant="ghost"
              className="min-h-11"
              onClick={() => {
                setEstado("correo")
                setFallo(null)
              }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              Usar otro correo
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="landing flex min-h-screen items-center justify-center bg-background p-4 forced-light">
      <Card className={TARJETA}>
        <CardHeader className="text-center">
          <CardTitle asChild>
            <h1 className="text-2xl">Tus tarjetas de lealtad</h1>
          </CardTitle>
          <CardDescription>
            Entra con tu correo y mira cuántos sellos llevas en cada negocio.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {fallo && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {fallo}
            </div>
          )}

          <GoogleButton redirectTo="/dashboard/my-cards" />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">o con tu correo</span>
            </div>
          </div>

          <form onSubmit={pedirEnlace} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@correo.com"
                value={correo}
                onChange={(e) => {
                  setCorreo(e.target.value)
                  setFallo(null)
                }}
                autoComplete="email"
                className="text-base"
                aria-invalid={Boolean(fallo) || undefined}
              />
            </div>

            <Button type="submit" className="min-h-11 w-full" disabled={enviando}>
              {enviando ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                "Enviar enlace mágico"
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            No necesitas contraseña ni instalar nada.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

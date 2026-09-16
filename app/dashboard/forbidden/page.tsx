import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Smartphone, LogOut } from "lucide-react"
import { logout } from "@/lib/actions/auth"

/**
 * Quien entra aquí es un cliente que llegó al panel del negocio: su cuenta
 * existe, pero no pertenece a ningún negocio. No es un error suyo ni una
 * puerta cerrada en la cara, así que la pantalla dice qué pasó y a dónde ir.
 *
 * Lo que se va es la cuenta atrás de cuatro segundos que redirigía sola. Daba
 * el tiempo justo para empezar a leer y que la página cambiara debajo, y le
 * quitaba la decisión a quien está delante. La salida sigue estando: ahora se
 * pulsa.
 *
 * También se va "si el error persiste, cerrar sesión e iniciar de nuevo suele
 * resolverlo", que no era un consejo sino una disculpa por el bug de
 * resolución de identidad que mandaba aquí a usuarios legítimos. Ese bug se
 * arregla en el backend resolviendo por el id de la cuenta y no por el correo.
 */
export default function ForbiddenPage() {
  return (
    <div className="landing flex min-h-screen items-center justify-center bg-background p-6 forced-light">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="space-y-4">
          <div className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Smartphone className="h-9 w-9 text-primary" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Tus tarjetas están en otra parte</h1>
          <p className="leading-relaxed text-muted-foreground">
            Esta parte es el panel de los negocios y tu cuenta no pertenece a ninguno. Tus
            tarjetas de lealtad, tus sellos y tus premios viven en <strong>Mis tarjetas</strong>.
          </p>
        </div>

        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="min-h-11 w-full sm:w-auto">
            <Link href="/dashboard/my-cards">Ir a mis tarjetas</Link>
          </Button>
          <form action={logout} className="w-full sm:w-auto">
            <Button type="submit" size="lg" variant="outline" className="min-h-11 w-full">
              <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
              Cerrar sesión
            </Button>
          </form>
        </div>

        <p className="text-sm text-muted-foreground">
          ¿Tu negocio sí tiene cuenta y aun así llegaste aquí? Escríbenos a{" "}
          <a
            href="mailto:contacto@zivelo.dev"
            className="font-medium text-foreground underline underline-offset-4"
          >
            contacto@zivelo.dev
          </a>
        </p>
      </div>
    </div>
  )
}

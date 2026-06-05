import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ShieldAlert, ArrowRight, LogOut } from "lucide-react"
import { logout } from "@/lib/actions/auth"

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="space-y-4">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-destructive/10 mx-auto">
            <ShieldAlert className="h-12 w-12 text-destructive" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            Acceso denegado
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            No tienes permisos para acceder al panel de administración.
          </p>
          <p className="text-sm text-muted-foreground">
            Si eres cliente, puedes ver tus tarjetas de lealtad desde <strong>Mis Tarjetas</strong>.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/dashboard/my-cards">
            <Button className="w-full sm:w-auto">
              Ir a Mis Tarjetas
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <form action={logout}>
            <Button type="submit" variant="outline" className="w-full sm:w-auto">
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesión
            </Button>
          </form>
        </div>

        <p className="text-sm text-muted-foreground">
          ¿Olvidaste tu contraseña?{" "}
          <Link href="/login?recover=true" className="text-primary hover:underline font-medium">
            Recupérala aquí
          </Link>
        </p>

        <p className="text-xs text-muted-foreground">
          Código: 403 Forbidden
        </p>
      </div>
    </div>
  )
}

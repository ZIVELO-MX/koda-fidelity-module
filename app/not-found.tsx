import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home, Coffee } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="space-y-4">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-muted relative">
            <span className="text-5xl font-bold text-muted-foreground/40">404</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            Esta página no existe
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            Tal vez alguien ya canjeó esta URL y se llevó la recompensa.
            <br />
            O nunca existió. Como los 10,000 sellos que nadie ha completado.
          </p>
        </div>

        <div className="bg-muted/50 rounded-2xl p-6 border border-border space-y-3">
          <p className="text-sm text-muted-foreground font-medium">
            Cosas que SÍ existen y funcionan:
          </p>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-center gap-2">
              <span className="text-primary">☕</span>
              El café de la mañana
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary">✅</span>
              Tu programa de lealtad (sin bugs... por ahora)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary">🔗</span>
              Los links del menú de abajo
            </li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/">
            <Button className="w-full sm:w-auto">
              <Home className="mr-2 h-4 w-4" />
              Volver al inicio
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" className="w-full sm:w-auto">
              <Coffee className="mr-2 h-4 w-4" />
              Ir al dashboard
            </Button>
          </Link>
        </div>

        <p className="text-xs text-muted-foreground">
          Si crees que esto es un error,
          {" "}
          <a href="mailto:contacto@zivelo.dev" className="underline hover:text-primary transition-colors">
            contáctanos
          </a>
          .
        </p>
      </div>
    </div>
  )
}

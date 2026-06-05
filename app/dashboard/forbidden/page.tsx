"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Smartphone, ArrowRight, LogOut } from "lucide-react"
import { logout } from "@/lib/actions/auth"

const REDIRECT_DELAY = 4

export default function ForbiddenPage() {
  const router = useRouter()
  const [countdown, setCountdown] = useState(REDIRECT_DELAY)

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          router.replace("/dashboard/my-cards")
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [router])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="space-y-4">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 mx-auto">
            <Smartphone className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            Tus tarjetas te esperan
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            Esta sección es para negocios. Como cliente, puedes ver tus tarjetas de lealtad en <strong>Mis Tarjetas</strong>.
          </p>
          <p className="text-sm text-muted-foreground">
            Redirigiendo en{" "}
            <span className="font-semibold text-primary tabular-nums">{countdown}</span>
            {" "}segundo{countdown !== 1 ? "s" : ""}...
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/dashboard/my-cards">
            <Button className="w-full sm:w-auto">
              Ir a Mis Tarjetas ahora
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
      </div>
    </div>
  )
}

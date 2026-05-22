"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Lock } from "lucide-react"

export function SignupForm() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xl">K</span>
          </div>
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

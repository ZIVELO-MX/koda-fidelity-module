"use client"

import { CheckCircle2, Circle } from "lucide-react"
import { cn } from "@/lib/utils"
import { REGLAS_DE_CONTRASENA } from "@/lib/reglas-de-contrasena"

/**
 * Las reglas a la vista mientras se escribe, en vez de un rechazo después de
 * enviar. Vivía dentro del registro, y la pantalla de cambio de contraseña
 * -- la que usan la invitación y la recuperación -- no las enseñaba.
 */
export function PasswordRequirements({ password }: { password: string }) {
  return (
    <div className="space-y-1.5 pt-1">
      {REGLAS_DE_CONTRASENA.map(({ etiqueta, cumple }, i) => {
        const ok = cumple(password)
        return (
          <div key={etiqueta} className="pw-req flex items-center gap-2" style={{ transitionDelay: `${i * 40}ms` }}>
            {ok ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary transition-colors duration-200" />
            ) : (
              <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-colors duration-200" />
            )}
            <span className={cn("text-xs transition-colors duration-200", ok ? "text-foreground" : "text-muted-foreground")}>
              {etiqueta}
            </span>
          </div>
        )
      })}
    </div>
  )
}

"use client"

import { cn } from "@/lib/utils"
import { esAcabadoPro, nombreDeTema } from "@/lib/temas-de-tarjeta"
import type { Tema } from "@/lib/onboarding"

/**
 * El selector de tema de la tarjeta. Lo comparten el alta, la creación y la
 * edición, que antes solo tenían el alta: crear o editar una tarjeta ofrecía los
 * seis colores y nada más, aunque el backend ya aceptaba `themeId` en los dos.
 *
 * Los acabados Pro se pueden elegir con cualquier plan: se marcan, no se
 * bloquean. Con Lite la selección se guarda y la tarjeta se publica con el color
 * del negocio hasta que haya Pro, que es lo mismo que decide `resolveTheme`.
 *
 * `conSoloColor` añade la opción de quitar el tema. El alta no la lleva porque
 * su borrador no admite borrarlo; crear y editar sí, y `resolveTheme` lo limpia
 * cuando recibe `null`.
 */
export function SelectorDeTema({
  temas,
  elegido,
  plan,
  onElegir,
  conSoloColor = false,
}: {
  temas: Tema[]
  elegido: string | null | undefined
  plan: "LITE" | "PRO"
  onElegir: (id: string | null) => void
  conSoloColor?: boolean
}) {
  if (temas.length === 0) return null

  const tema = temas.find((t) => t.id === elegido)
  const proSinPlan = Boolean(tema && tema.plan === "PRO" && plan !== "PRO")

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-foreground">Tema de la tarjeta</legend>
      <p className="text-xs text-muted-foreground">
        Los acabados Pro se pueden elegir desde ahora. Se marcan, pero no se bloquean.
      </p>
      <div className="flex flex-wrap gap-2">
        {conSoloColor && (
          <Opcion activa={!tema} onClick={() => onElegir(null)}>
            Solo color
          </Opcion>
        )}
        {temas.map((t) => {
          const activa = t.id === elegido
          return (
            <Opcion key={t.id} activa={activa} onClick={() => onElegir(t.id)}>
              {nombreDeTema(t.code)}
              {esAcabadoPro(t.code) && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]",
                    activa ? "bg-white/20" : "bg-primary/15 text-primary",
                  )}
                >
                  Pro
                </span>
              )}
            </Opcion>
          )
        })}
      </div>
      {proSinPlan && (
        <p className="text-xs text-muted-foreground">
          Tu plan es Lite, así que la tarjeta se publica con tu color. El acabado queda
          guardado y se aplica en cuanto pases a Pro.
        </p>
      )}
    </fieldset>
  )
}

function Opcion({ activa, onClick, children }: { activa: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={activa}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm transition-colors",
        activa
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}

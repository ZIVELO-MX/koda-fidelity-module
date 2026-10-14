"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { LoyaltyCardPreview } from "@/components/loyalty-card-preview"
import { siteConfig } from "@/lib/site-config"

/**
 * La tarjeta del hero, con el único momento de movimiento de la página.
 *
 * Al cargar cae un sello: la tarjeta pasa de seis a siete. Es lo más
 * característico de este producto y es lo que una tarjeta quieta no cuenta.
 *
 * Un solo gesto orquestado, no un fundido por sección: si todo entra
 * deslizándose, nada llama la atención. Y si la persona pidió menos
 * movimiento, la tarjeta aparece ya sellada.
 */
const reducedMotionQuery = "(prefers-reduced-motion: reduce)"
function subscribeMotion(onChange: () => void) {
  const media = window.matchMedia(reducedMotionQuery)
  media.addEventListener("change", onChange)
  return () => media.removeEventListener("change", onChange)
}
const readMotion = () => window.matchMedia(reducedMotionQuery).matches
const serverMotion = () => false

export function TarjetaDelHero() {
  const demo = siteConfig.hero.demoCard
  const [sellos, setSellos] = useState(demo.currentStamps)

  const menosMovimiento = useSyncExternalStore(subscribeMotion, readMotion, serverMotion)

  useEffect(() => {
    if (menosMovimiento) return
    const reloj = setTimeout(() => setSellos(demo.currentStamps + 1), 1100)
    return () => clearTimeout(reloj)
  }, [demo.currentStamps, menosMovimiento])

  return (
    <LoyaltyCardPreview
      businessName={demo.businessName}
      iconName="coffee"
      currentStamps={menosMovimiento ? demo.currentStamps + 1 : sellos}
      maxStamps={demo.maxStamps}
      reward={demo.reward}
      expirationDate="31 dic 2026"
      brandColor={demo.brandColor}
      className="relative"
    />
  )
}

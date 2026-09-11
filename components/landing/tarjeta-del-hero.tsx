"use client"

import { useEffect, useState } from "react"
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
export function TarjetaDelHero() {
  const demo = siteConfig.hero.demoCard
  const [sellos, setSellos] = useState(demo.currentStamps)

  useEffect(() => {
    const menosMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (menosMovimiento) {
      setSellos(demo.currentStamps + 1)
      return
    }
    const reloj = setTimeout(() => setSellos(demo.currentStamps + 1), 1100)
    return () => clearTimeout(reloj)
  }, [demo.currentStamps])

  return (
    <LoyaltyCardPreview
      businessName={demo.businessName}
      iconName="coffee"
      currentStamps={sellos}
      maxStamps={demo.maxStamps}
      reward={demo.reward}
      expirationDate="31 dic 2026"
      brandColor={demo.brandColor}
      className="relative"
    />
  )
}

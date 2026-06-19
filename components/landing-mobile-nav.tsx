"use client"

import Image from "next/image"
import Link from "next/link"
import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { siteConfig } from "@/lib/site-config"

const links = [
  { href: "#features", label: "Funciones" },
  { href: "#how-it-works", label: "Cómo Funciona" },
  { href: "#pricing", label: "Precios" },
]

function smoothScroll(href: string) {
  const id = href.replace("#", "")
  const el = document.getElementById(id)
  if (!el) return
  const navHeight = 64
  const top = el.getBoundingClientRect().top + window.scrollY - navHeight
  window.scrollTo({ top, behavior: "smooth" })
}

// SVG lines morph into an X. Each rect animates independently so the
// transition feels mechanical and intentional rather than a simple icon swap.
function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="2" y="4.5" width="16" height="1.75" rx="0.875"
        fill="currentColor"
        style={{
          transformOrigin: "10px 5.375px",
          transform: open ? "translateY(4.625px) rotate(45deg)" : "none",
          transition: "transform 320ms cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      />
      <rect
        x="2" y="9.125" width="16" height="1.75" rx="0.875"
        fill="currentColor"
        style={{
          transformOrigin: "10px 10px",
          opacity: open ? 0 : 1,
          transform: open ? "scaleX(0.3)" : "scaleX(1)",
          transition: "opacity 160ms ease-out, transform 160ms ease-out",
        }}
      />
      <rect
        x="2" y="13.75" width="16" height="1.75" rx="0.875"
        fill="currentColor"
        style={{
          transformOrigin: "10px 14.625px",
          transform: open ? "translateY(-4.625px) rotate(-45deg)" : "none",
          transition: "transform 320ms cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      />
    </svg>
  )
}

export function LandingMobileNav() {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false)
      closeTimerRef.current = setTimeout(() => buttonRef.current?.focus(), 100)
    }
  }, [])

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      clearTimeout(closeTimerRef.current)
    }
  }, [handleKeyDown])

  const handleNavClick = useCallback((href: string) => {
    setOpen(false)
    closeTimerRef.current = setTimeout(() => buttonRef.current?.focus(), 100)
    if (href.startsWith("#")) {
      setTimeout(() => smoothScroll(href), 150)
    }
  }, [])

  return (
    <div className="relative md:hidden" data-mobile-menu="">
      <Drawer open={open} onOpenChange={setOpen} shouldScaleBackground={false}>
        <DrawerTrigger asChild>
          <button
            ref={buttonRef}
            type="button"
            className="p-3 -mr-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-150 active:scale-[0.93]"
            aria-label={open ? "Cerrar menú" : "Abrir menú de navegación"}
          >
            <HamburgerIcon open={open} />
          </button>
        </DrawerTrigger>

        <DrawerContent
          className="focus:outline-none forced-light"
          aria-label="Navegación móvil"
        >
          {/* Brand header */}
          <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
            <Image
              src="/short-logo.svg"
              alt={siteConfig.shortName}
              width={28}
              height={28}
              className="size-7 shrink-0"
            />
            <span className="font-semibold text-base text-foreground">
              {siteConfig.name}
            </span>
          </div>

          <nav
            className="flex flex-col px-3 pb-2 gap-0.5"
            aria-label="Navegación principal"
          >
            {links.map((link, i) => (
              <DrawerClose asChild key={link.href}>
                <Link
                  href={link.href}
                  onClick={(e) => {
                    e.preventDefault()
                    handleNavClick(link.href)
                  }}
                  className="flex items-center px-3 py-3.5 rounded-xl text-base font-medium text-muted-foreground hover:text-foreground hover:bg-muted active:bg-muted active:text-foreground transition-colors duration-150"
                  style={{
                    animation: `nav-item-in 240ms cubic-bezier(0.23, 1, 0.32, 1) ${i * 35}ms both`,
                  }}
                >
                  {link.label}
                </Link>
              </DrawerClose>
            ))}
          </nav>

          {/* CTA buttons */}
          <div
            className="flex flex-col gap-2 mx-3 mb-8 mt-2 pt-4 border-t border-border"
            style={{
              animation: `nav-item-in 240ms cubic-bezier(0.23, 1, 0.32, 1) ${links.length * 35 + 30}ms both`,
            }}
          >
            <DrawerClose asChild>
              <Link
                href="/login"
                onClick={() => handleNavClick("/login")}
                className="w-full"
              >
                <Button variant="outline" className="w-full h-10">
                  Iniciar Sesión
                </Button>
              </Link>
            </DrawerClose>
            <DrawerClose asChild>
              <Link
                href="/signup"
                onClick={() => handleNavClick("/signup")}
                className="w-full"
              >
                <Button className="w-full h-10 active:scale-[0.97] transition-transform">
                  Empezar Gratis
                </Button>
              </Link>
            </DrawerClose>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}

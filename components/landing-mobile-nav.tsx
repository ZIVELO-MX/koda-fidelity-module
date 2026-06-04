"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"

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

export function LandingMobileNav() {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
      const timer = setTimeout(() => {
        const first = menuRef.current?.querySelector<HTMLElement>(
          'a, button, [tabindex]:not([tabindex="-1"])'
        )
        first?.focus()
      }, 100)
      return () => {
        clearTimeout(timer)
        document.body.style.overflow = ""
      }
    } else {
      document.body.style.overflow = ""
    }
  }, [open])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false)
      buttonRef.current?.focus()
    }
  }, [])

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  const trapFocus = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return
    const focusable = menuRef.current?.querySelectorAll<HTMLElement>(
      'a, button, [tabindex]:not([tabindex="-1"])'
    )
    if (!focusable || focusable.length === 0) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }, [])

  const handleNavClick = useCallback((href: string) => {
    setOpen(false)
    buttonRef.current?.focus()
    if (href.startsWith("#")) {
      smoothScroll(href)
    }
  }, [])

  const closeAndFocus = useCallback(() => {
    setOpen(false)
    buttonRef.current?.focus()
  }, [])

  return (
    <div className="relative md:hidden">
      <button
        ref={buttonRef}
        type="button"
        className="p-3 text-muted-foreground hover:text-foreground"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Cerrar menú de navegación" : "Abrir menú de navegación"}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <div
          id="mobile-menu"
          ref={menuRef}
          role="dialog"
          aria-modal="true"
          aria-label="Navegación móvil"
          data-mobile-menu=""
          onKeyDown={trapFocus}
          className="fixed inset-0 z-40"
        >
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={closeAndFocus}
          />
          <div className="fixed left-0 right-0 top-16 z-50 bg-card border-b border-border shadow-xl data-[mobile-menu]:animate-in data-[mobile-menu]:slide-in-from-top-2 data-[mobile-menu]:fade-in data-[mobile-menu]:duration-200 rounded-b-2xl">
            <nav className="flex flex-col p-4 space-y-2">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={(e) => {
                    e.preventDefault()
                    handleNavClick(link.href)
                  }}
                  className="px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="block"
              >
                <Button variant="outline" className="w-full h-10">Iniciar Sesión</Button>
              </Link>
              <Link
                href="/signup"
                onClick={() => setOpen(false)}
                className="block"
              >
                <Button className="w-full h-10 active:scale-[0.97] transition-transform">Empezar Gratis</Button>
              </Link>
            </nav>
          </div>
        </div>
      )}
    </div>
  )
}

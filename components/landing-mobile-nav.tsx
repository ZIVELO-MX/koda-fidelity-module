"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"

const links = [
  { href: "#features", label: "Funciones" },
  { href: "#how-it-works", label: "Cómo Funciona" },
  { href: "#pricing", label: "Precios" },
]

export function LandingMobileNav() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        className="md:hidden p-2 text-muted-foreground hover:text-foreground"
        onClick={() => setOpen(!open)}
        aria-label="Menú de navegación"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
          onKeyDown={(e) => { if (e.key === "Escape") setOpen(false) }}
          role="dialog"
          aria-modal="true"
          aria-label="Navegación móvil"
        />
      )}

      <div
        className={`fixed top-16 left-0 right-0 z-50 bg-card border-b border-border md:hidden transition-transform duration-200 ${
          open ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <nav className="flex flex-col p-4 space-y-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <hr className="my-2 border-border" />
          <Link href="/login" onClick={() => setOpen(false)}>
            <Button variant="ghost" className="w-full justify-start">
              Iniciar Sesión
            </Button>
          </Link>
          <Link href="/signup" onClick={() => setOpen(false)}>
            <Button className="w-full">Comenzar</Button>
          </Link>
        </nav>
      </div>
    </>
  )
}

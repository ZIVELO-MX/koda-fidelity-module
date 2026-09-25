"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

/**
 * "Tu perfil": lo único de Configuración que es de la persona y no del negocio,
 * así que va primero y no depende del rol. El nombre crea el perfil; la foto y
 * el marco cuelgan de que exista, igual que en el servidor.
 */

const coloresDeMarco = ["#f97316", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899", "#f59e0b"]

const MARCO_POR_DEFECTO = "#ff6b35"

/**
 * El servidor ya no manda `avatarPath`: la ruta de almacenamiento es un dato
 * interno y cada lectura autenticada devuelve una URL firmada fresca, válida
 * una hora. La pantalla pinta `avatarUrl` y vuelve a pedir el perfil al
 * recargar, que es justo lo que hace este componente al montarse.
 */
type Perfil = { id: string; name: string; avatarUrl: string | null; avatarRingColor: string }

async function leer(url: string, init?: RequestInit) {
  const respuesta = await fetch(url, init)
  const cuerpo = await respuesta.json().catch(() => null)
  if (!respuesta.ok) throw new Error(cuerpo?.error || "No fue posible guardar tu perfil")
  return cuerpo
}

function Avatar({
  tamano,
  color,
  inicial,
  foto,
}: {
  tamano: number
  color: string
  inicial: string
  foto: string | null
}) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted font-semibold text-foreground"
      style={{
        width: tamano,
        height: tamano,
        fontSize: Math.round(tamano * 0.4),
        boxShadow: `0 0 0 2px ${color}`,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {foto ? <img src={foto} alt="" className="h-full w-full object-cover" /> : inicial}
    </span>
  )
}

export function PerfilPersonal() {
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [nombre, setNombre] = useState("")
  const [marco, setMarco] = useState(MARCO_POR_DEFECTO)
  const [foto, setFoto] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const archivo = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let vivo = true
    leer("/api/customer/profile")
      .then((cuerpo) => {
        if (!vivo) return
        const encontrado: Perfil | null = cuerpo?.profile ?? null
        setPerfil(encontrado)
        if (encontrado) {
          setNombre(encontrado.name)
          setMarco(encontrado.avatarRingColor || MARCO_POR_DEFECTO)
          setFoto(encontrado.avatarUrl)
        }
      })
      .catch(() => {
        if (vivo) setError("No pudimos cargar tu perfil.")
      })
      .finally(() => {
        if (vivo) setCargando(false)
      })
    return () => {
      vivo = false
    }
  }, [])

  const aplicar = (cuerpo: { profile?: Perfil }) => {
    if (cuerpo?.profile) {
      setPerfil(cuerpo.profile)
      setMarco(cuerpo.profile.avatarRingColor || MARCO_POR_DEFECTO)
      setFoto(cuerpo.profile.avatarUrl ?? null)
    }
  }

  const guardar = async () => {
    setGuardando(true)
    setError(null)
    setAviso(null)
    try {
      if (!perfil) {
        // El servidor crea con PUT y solo actualiza con PATCH, así que el primer
        // guardado son dos pasos y los siguientes uno.
        aplicar(await leer("/api/customer/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: nombre }),
        }))
      }
      aplicar(await leer("/api/customer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nombre, avatarRingColor: marco }),
      }))
      setAviso("Perfil guardado")
    } catch (razon) {
      setError(razon instanceof Error ? razon.message : "No fue posible guardar tu perfil")
    } finally {
      setGuardando(false)
    }
  }

  const subir = async (elegido: File) => {
    setSubiendo(true)
    setError(null)
    setAviso(null)
    try {
      const cuerpo = new FormData()
      cuerpo.append("file", elegido)
      aplicar(await leer("/api/customer/profile/avatar", { method: "PUT", body: cuerpo }))
      setAviso("Foto guardada")
    } catch (razon) {
      setError(razon instanceof Error ? razon.message : "No fue posible subir la foto")
    } finally {
      setSubiendo(false)
      if (archivo.current) archivo.current.value = ""
    }
  }

  const quitar = async () => {
    setSubiendo(true)
    setError(null)
    setAviso(null)
    try {
      aplicar(await leer("/api/customer/profile/avatar", { method: "DELETE" }))
    } catch (razon) {
      setError(razon instanceof Error ? razon.message : "No fue posible quitar la foto")
    } finally {
      setSubiendo(false)
    }
  }

  if (cargando) {
    return (
      <section className="rounded-2xl border border-border bg-card p-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Cargando tu perfil" />
      </section>
    )
  }

  const inicial = (nombre.trim() || "?").charAt(0).toUpperCase()
  const hayFoto = Boolean(foto)

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <UserRound className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground">Tu perfil</h2>
          <p className="text-sm text-muted-foreground">Tuyo, no del negocio. Solo tú lo ves y lo cambias.</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="perfil-nombre">Tu nombre</Label>
        <Input
          id="perfil-nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej. Raúl Méndez"
          maxLength={80}
        />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Avatar tamano={56} color={marco} inicial={inicial} foto={foto} />
        <div className="space-y-1">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              disabled={!perfil || subiendo}
              onClick={() => archivo.current?.click()}
            >
              {subiendo && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {hayFoto ? "Cambiar foto" : "Subir foto"}
            </Button>
            {hayFoto && (
              <Button type="button" variant="ghost" className="min-h-11" disabled={subiendo} onClick={() => void quitar()}>
                Quitar foto
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {perfil ? "JPG, PNG o WEBP, hasta 2 MB." : "Guarda tu nombre para poder subir una foto."}
          </p>
        </div>
        <input
          ref={archivo}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          aria-label="Elegir una foto de perfil"
          onChange={(e) => {
            const elegido = e.target.files?.[0]
            if (elegido) void subir(elegido)
          }}
        />
      </div>

      <fieldset className="space-y-2" disabled={!perfil}>
        <legend className="text-sm font-medium text-foreground">Color del marco</legend>
        <div className="flex flex-wrap items-center gap-2">
          {coloresDeMarco.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setMarco(color)}
              aria-label={`Usar color ${color}`}
              aria-pressed={marco === color}
              className={cn(
                "h-10 w-10 rounded-xl transition-transform focus-visible:ring-[3px] focus-visible:ring-ring/50",
                marco === color ? "scale-110 ring-2 ring-foreground ring-offset-2" : "hover:scale-105",
              )}
              style={{ backgroundColor: color }}
            />
          ))}
          <input
            type="color"
            aria-label="Color personalizado"
            value={marco}
            onChange={(e) => setMarco(e.target.value)}
            className="h-10 w-10 cursor-pointer rounded-xl border border-border"
          />
        </div>
      </fieldset>

      {/* Los dos tamaños en que el avatar aparece de verdad: un marco que se ve
          bien en grande puede desaparecer en la barra. */}
      <div className="flex items-center gap-4 border-t border-border pt-4">
        <span className="text-xs text-muted-foreground">Vista previa</span>
        <span className="flex items-center gap-2">
          <Avatar tamano={36} color={marco} inicial={inicial} foto={foto} />
          <span className="text-xs text-muted-foreground">En la barra</span>
        </span>
        <span className="flex items-center gap-2">
          <Avatar tamano={40} color={marco} inicial={inicial} foto={foto} />
          <span className="text-xs text-muted-foreground">En el menú</span>
        </span>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {aviso && <p className="text-sm text-muted-foreground">{aviso}</p>}

      <div className="flex justify-end">
        <Button type="button" className="min-h-11 px-8" disabled={guardando || !nombre.trim()} onClick={() => void guardar()}>
          {guardando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar perfil
        </Button>
      </div>
    </section>
  )
}

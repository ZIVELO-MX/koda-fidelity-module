"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  UserPlus, UserMinus, UsersRound, Shield, Stamp,
  Check, X, Share2, ChevronRight, Loader2, Lock, Clock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { Role } from "@prisma/client"

type TeamUser = {
  id: string
  email: string
  name: string
  role: Role
  createdAt: Date
  hasLoggedIn?: boolean
}

type InviteStep = "form" | "credentials"

interface TeamClientProps {
  currentUserId: string
  currentUserName: string
  businessName: string
  initialUsers: TeamUser[]
  memberLimit: number
}

const ROLE_CONFIG: Record<Role, {
  label: string
  icon: React.ElementType
  description: string
  permissions: string[]
  restrictions: string[]
  badgeClass: string
}> = {
  admin: {
    label: "Admin",
    icon: Shield,
    description: "Control total del negocio",
    permissions: ["Ver y editar tarjetas", "Gestionar clientes", "Configuración y marca", "Gestionar el equipo", "Sellar y canjear"],
    restrictions: [],
    badgeClass: "bg-primary/10 text-primary border-primary/20",
  },
  sellador: {
    label: "Sellador",
    icon: Stamp,
    description: "Operaciones del día a día",
    permissions: ["Ver tarjetas y clientes", "Sellar y canjear", "Escanear QR"],
    restrictions: ["No puede editar tarjetas ni marca", "No puede eliminar clientes", "No puede gestionar el equipo"],
    badgeClass: "bg-muted text-muted-foreground border-border",
  },
}

/**
 * La comparacion de roles vivia dos veces en la pantalla: dentro de cada
 * tarjeta del selector y otra vez al pie. Ahora existe una sola, detras de un
 * boton, y el selector solo dice que rol esta elegido.
 */
function ComparacionDeRoles() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {(["admin", "sellador"] as Role[]).map((role) => {
        const config = ROLE_CONFIG[role]
        const Icon = config.icon
        return (
          <div key={role} className="space-y-2 rounded-xl border border-border bg-muted/20 p-4">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">{config.label}</span>
            </div>
            <p className="text-xs text-muted-foreground">{config.description}</p>
            <ul className="space-y-1">
              {config.permissions.map((permiso) => (
                <li key={permiso} className="flex items-start gap-1.5 text-xs text-foreground/80">
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-primary" aria-hidden="true" />
                  {permiso}
                </li>
              ))}
              {config.restrictions.map((limite) => (
                <li key={limite} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <X className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                  {limite}
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}

export function TeamClient({ currentUserId, currentUserName, businessName, initialUsers, memberLimit }: TeamClientProps) {
  const router = useRouter()
  const [users, setUsers] = useState<TeamUser[]>(initialUsers)

  // Invite modal state
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteStep, setInviteStep] = useState<InviteStep>("form")
  const [inviteName, setInviteName] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<Role>("sellador")
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [invitedUser, setInvitedUser] = useState<{ name: string; email: string; password: string } | null>(null)
  const [copiado, setCopiado] = useState(false)

  // Comparacion de permisos, a peticion
  const [permisosOpen, setPermisosOpen] = useState(false)

  // Remove modal state
  const [removeTarget, setRemoveTarget] = useState<TeamUser | null>(null)
  const [removeLoading, setRemoveLoading] = useState(false)

  // Role change state
  const [roleChangeId, setRoleChangeId] = useState<string | null>(null)

  const isAtLimit = users.length >= memberLimit

  const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
  const loginUrl = invitedUser
    ? `${baseUrl}/invite?email=${encodeURIComponent(invitedUser.email)}&business=${encodeURIComponent(businessName)}&name=${encodeURIComponent(invitedUser.name)}`
    : ""

  const mensajeInvitacion = invitedUser
    ? `Hola ${invitedUser.name}, te invitamos a unirte al equipo de ${businessName} en Koda Fidelity.\n\n` +
      `Correo: ${invitedUser.email}\n` +
      `Contraseña temporal: ${invitedUser.password}\n\n` +
      `Entra aquí: ${loginUrl}`
    : ""

  /**
   * Una sola accion. En el telefono abre la hoja del sistema (WhatsApp, correo,
   * lo que tenga instalado); donde no exista, deja el mensaje en el portapapeles
   * para pegarlo donde sea. Antes eran tres botones de copiar mas un campo de
   * telefono que solo servia para WhatsApp.
   */
  const compartirInvitacion = async () => {
    if (!mensajeInvitacion) return
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: `Acceso a ${businessName}`, text: mensajeInvitacion })
      } catch {
        // El usuario cerro la hoja de compartir. No es un error que reportar.
      }
      return
    }
    await navigator.clipboard.writeText(mensajeInvitacion)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  const resetInviteModal = () => {
    setInviteStep("form")
    setInviteName("")
    setInviteEmail("")
    setInviteRole("sellador")
    setInviteError(null)
    setInvitedUser(null)
    setCopiado(false)
  }

  const handleInvite = async () => {
    setInviteLoading(true)
    setInviteError(null)
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, name: inviteName, role: inviteRole }),
      })
      const data = await res.json()
      if (!res.ok) {
        setInviteError(data.error ?? "No fue posible invitar al usuario")
        return
      }
      setUsers((prev) => [...prev, data.user])
      setInvitedUser({ name: inviteName, email: inviteEmail, password: data.temporaryPassword })
      setInviteStep("credentials")
    } catch {
      setInviteError("Error de red. Intenta de nuevo.")
    } finally {
      setInviteLoading(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: Role) => {
    setRoleChangeId(userId)
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      })
      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)))
        router.refresh()
      }
    } finally {
      setRoleChangeId(null)
    }
  }

  const handleRemove = async () => {
    if (!removeTarget) return
    setRemoveLoading(true)
    try {
      const res = await fetch(`/api/users/${removeTarget.id}`, { method: "DELETE" })
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== removeTarget.id))
        setRemoveTarget(null)
        router.refresh()
      }
    } finally {
      setRemoveLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Equipo</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {users.length === 1
              ? `1 / ${memberLimit} — solo tú tienes acceso al negocio`
              : `${users.length} / ${memberLimit} personas con acceso`}
          </p>
        </div>
        {isAtLimit ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground border border-border rounded-lg px-3 py-2">
            <Lock className="h-3.5 w-3.5" />
            Límite alcanzado
          </div>
        ) : (
          <Button onClick={() => { resetInviteModal(); setInviteOpen(true) }} className="min-h-11 gap-2">
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Invitar colaborador</span>
            <span className="sm:hidden">Invitar</span>
          </Button>
        )}
      </div>

      {/* Team list */}
      <div className="rounded-xl border border-border overflow-hidden bg-card">
        {users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 px-6 text-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <UsersRound className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Tu equipo está vacío</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                Invita a un colaborador para que pueda sellar tarjetas y atender clientes desde su propio acceso.
              </p>
            </div>
            <Button onClick={() => { resetInviteModal(); setInviteOpen(true) }} variant="outline" className="mt-2 min-h-11 gap-2">
              <UserPlus className="h-4 w-4" />
              Invitar primer colaborador
            </Button>
          </div>
        ) : (
          <>
            <div className="hidden sm:grid sm:grid-cols-[1fr_1fr_auto_auto] gap-4 px-5 py-3 border-b border-border bg-muted/30">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nombre</span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Correo</span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Rol</span>
              <span />
            </div>
            <ul className="divide-y divide-border">
              {users.map((member) => {
                const isSelf = member.id === currentUserId
                return (
                  <li key={member.id} className="px-4 py-4 sm:px-5 sm:grid sm:grid-cols-[1fr_1fr_auto_auto] sm:items-center sm:gap-4">
                    {/* Row 1 on mobile: avatar + name/badges + delete button */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold text-primary bg-primary/10 shrink-0"
                      >
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-foreground truncate">{member.name}</span>
                          {isSelf && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                              tú
                            </span>
                          )}
                          {!member.hasLoggedIn && (
                            <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              <Clock className="h-2.5 w-2.5" />
                              Pendiente
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground sm:hidden truncate">{member.email}</p>
                      </div>
                      {/* Delete — visible only on mobile, end of row 1 */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="sm:hidden min-h-10 min-w-10 ml-auto shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        disabled={isSelf}
                        onClick={() => setRemoveTarget(member)}
                        aria-label={`Eliminar a ${member.name}`}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Email — sm+ only */}
                    <p className="hidden sm:block text-sm text-muted-foreground truncate">{member.email}</p>

                    {/* Role selector: full-width on mobile, compact on sm+ */}
                    <div className="mt-3 sm:mt-0">
                      <Select
                        value={member.role}
                        onValueChange={(val) => handleRoleChange(member.id, val as Role)}
                        disabled={isSelf || roleChangeId === member.id}
                      >
                        <SelectTrigger className="h-10 w-full sm:w-36 text-xs gap-1.5">
                          {roleChangeId === member.id
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <SelectValue />
                          }
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">
                            <span className="flex items-center gap-1.5">
                              <Shield className="h-3.5 w-3.5" />
                              Admin
                            </span>
                          </SelectItem>
                          <SelectItem value="sellador">
                            <span className="flex items-center gap-1.5">
                              <Stamp className="h-3.5 w-3.5" />
                              Sellador
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Delete — sm+ column (hidden on mobile) */}
                    <div className="hidden sm:flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="min-h-10 min-w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        disabled={isSelf}
                        onClick={() => setRemoveTarget(member)}
                        aria-label={`Eliminar a ${member.name}`}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>

      {/* La comparacion completa, solo cuando se pide */}
      <Button
        variant="outline"
        onClick={() => setPermisosOpen(true)}
        className="min-h-11 w-full gap-2 sm:w-auto"
      >
        <Shield className="h-4 w-4" aria-hidden="true" />
        Ver permisos por rol
      </Button>

      <Dialog open={permisosOpen} onOpenChange={setPermisosOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90svh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Permisos por rol</DialogTitle>
            <DialogDescription>
              Que puede hacer cada persona segun el rol que le asignes.
            </DialogDescription>
          </DialogHeader>
          <ComparacionDeRoles />
        </DialogContent>
      </Dialog>

      {/* ── Invite modal ── */}
      <Dialog
        open={inviteOpen}
        onOpenChange={(open) => { if (!open) { setInviteOpen(false); resetInviteModal() } else setInviteOpen(true) }}
      >
        <DialogContent
          className="sm:max-w-md max-h-[90svh] flex flex-col overflow-hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          {inviteStep === "form" ? (
            <>
              <DialogHeader>
                <DialogTitle>Invitar colaborador</DialogTitle>
                <DialogDescription>
                  Se creará una cuenta con acceso limitado. El colaborador recibirá una contraseña temporal que deberá cambiar en su primer inicio de sesión.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 py-2 overflow-y-auto flex-1 min-h-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="invite-name">Nombre</Label>
                    <Input
                      id="invite-name"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      placeholder="María García"
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="invite-email">Correo electrónico</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="maria@ejemplo.com"
                      autoComplete="off"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="invite-role">Nivel de acceso</Label>
                  <Select value={inviteRole} onValueChange={(val) => setInviteRole(val as Role)}>
                    <SelectTrigger id="invite-role" className="h-11 w-full gap-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sellador">
                        <span className="flex items-center gap-1.5">
                          <Stamp className="h-3.5 w-3.5" aria-hidden="true" />
                          Sellador
                        </span>
                      </SelectItem>
                      <SelectItem value="admin">
                        <span className="flex items-center gap-1.5">
                          <Shield className="h-3.5 w-3.5" aria-hidden="true" />
                          Admin
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{ROLE_CONFIG[inviteRole].description}</p>
                </div>

                {inviteError && (
                  <p className="text-sm text-destructive">{inviteError}</p>
                )}
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" className="min-h-11" onClick={() => { setInviteOpen(false); resetInviteModal() }}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleInvite}
                  disabled={inviteLoading || !inviteName.trim() || !inviteEmail.trim()}
                  className="min-h-11 gap-2"
                >
                  {inviteLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Creando cuenta...</>
                  ) : (
                    <><ChevronRight className="h-4 w-4" />Crear cuenta</>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-4 min-h-0">
              <DialogHeader>
                <DialogTitle>Cuenta creada ✓</DialogTitle>
                <DialogDescription className="break-words">
                  Comparte las credenciales con{" "}
                  <strong className="text-foreground">{invitedUser?.name}</strong>{" "}
                  para que pueda acceder.
                </DialogDescription>
              </DialogHeader>

              {/* Cuerpo con scroll: el encabezado y los botones no se mueven */}
              <div className="space-y-4 overflow-y-auto">
                <div className="rounded-xl bg-muted/50 border border-border p-4 space-y-3">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground mb-0.5">Correo</p>
                    <p className="text-sm font-mono font-medium text-foreground truncate">{invitedUser?.email}</p>
                  </div>
                  <Separator />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground mb-0.5">Contraseña temporal</p>
                    <p className="text-sm font-mono font-medium text-foreground">{invitedUser?.password}</p>
                  </div>
                  <Separator />
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground">Link de acceso</p>
                    <div className="overflow-x-auto rounded-md bg-background border border-border px-2.5 py-1.5">
                      <p className="text-xs font-mono text-muted-foreground whitespace-nowrap">{loginUrl}</p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  La contraseña solo se muestra ahora. Compartela antes de cerrar.
                </p>
              </div>

              <Button onClick={compartirInvitacion} className="min-h-11 w-full gap-2">
                {copiado ? (
                  <><Check className="h-4 w-4" aria-hidden="true" />Copiado</>
                ) : (
                  <><Share2 className="h-4 w-4" aria-hidden="true" />Compartir invitación</>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={() => { setInviteOpen(false); resetInviteModal() }}
                className="min-h-11 w-full"
              >
                Listo
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Remove confirmation */}
      <AlertDialog open={!!removeTarget} onOpenChange={(open) => { if (!open) setRemoveTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar colaborador</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar a <strong>{removeTarget?.name}</strong> del equipo?
              Perderá acceso inmediatamente y no podrá iniciar sesión.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={removeLoading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {removeLoading ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

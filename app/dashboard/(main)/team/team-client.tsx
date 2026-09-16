"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  UserPlus, UserMinus, UsersRound, Shield, Stamp,
  Check, X, ChevronRight, Loader2, Lock, Clock, Mail,
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

type InviteStep = "form" | "resultado"

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
/** "16 de septiembre", sin la hora, que a quien invita no le dice nada. */
function formatearCaducidad(iso: string): string {
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return "pronto"
  return fecha.toLocaleDateString("es-MX", { day: "numeric", month: "long" })
}

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
  // El backend ya no crea la cuenta al invitar: manda un enlace de un uso por
  // correo y nunca devuelve una contraseña. Por eso aquí no hay credenciales
  // que enseñar ni nada que compartir a mano; solo a quién se le mandó y hasta
  // cuándo sirve el enlace.
  const [invitedUser, setInvitedUser] = useState<{
    name: string
    email: string
    expiraEn?: string
  } | null>(null)

  // Comparacion de permisos, a peticion
  const [permisosOpen, setPermisosOpen] = useState(false)

  // Remove modal state
  const [removeTarget, setRemoveTarget] = useState<TeamUser | null>(null)
  const [removeLoading, setRemoveLoading] = useState(false)

  // Role change state
  const [roleChangeId, setRoleChangeId] = useState<string | null>(null)
  const [equipoError, setEquipoError] = useState<string | null>(null)

  const isAtLimit = users.length >= memberLimit

  const resetInviteModal = () => {
    setInviteStep("form")
    setInviteName("")
    setInviteEmail("")
    setInviteRole("sellador")
    setInviteError(null)
    setInvitedUser(null)
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
      // Un 2xx no basta: si el cuerpo no trae ni la invitación ni el alta, no
      // sabemos si se mandó nada, y anunciar "invitación enviada" sería
      // inventarlo. Tampoco se enseña una contraseña temporal aunque llegue:
      // ese contrato se retiró y mostrarla sería filtrar una credencial.
      const invitacionValida = typeof data?.invitation?.email === "string"
      const altaValida = typeof data?.user?.id === "string"
      if (!invitacionValida && !altaValida) {
        setInviteError("El servidor respondió algo que no reconocemos. No podemos confirmar el envío.")
        return
      }

      // Con el flujo de invitación por correo la fila todavía no existe: la
      // persona entra al equipo cuando acepta el enlace.
      if (altaValida) setUsers((prev) => [...prev, data.user])
      setInvitedUser({
        name: inviteName,
        email: inviteEmail,
        expiraEn: data.invitation?.expiresAt,
      })
      setInviteStep("resultado")
    } catch {
      setInviteError("Error de red. Intenta de nuevo.")
    } finally {
      setInviteLoading(false)
    }
  }

  /**
   * El servidor rechaza por permisos y protege al último administrador. Antes
   * esos rechazos no se veían: el rol se quedaba como estaba, sin una palabra,
   * y la pantalla parecía rota en vez de estar defendiendo una regla.
   */
  const motivoDelRechazo = async (res: Response, porDefecto: string) => {
    const sobre = (await res.json().catch(() => null)) as { error?: string; action?: string } | null
    return [sobre?.error || porDefecto, sobre?.action].filter(Boolean).join(" ")
  }

  const handleRoleChange = async (userId: string, newRole: Role) => {
    setRoleChangeId(userId)
    setEquipoError(null)
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      })
      if (!res.ok) {
        setEquipoError(await motivoDelRechazo(res, "No fue posible cambiar el rol."))
        return
      }
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)))
      router.refresh()
    } catch {
      setEquipoError("Error de red. El rol no cambió.")
    } finally {
      setRoleChangeId(null)
    }
  }

  const handleRemove = async () => {
    if (!removeTarget) return
    setRemoveLoading(true)
    setEquipoError(null)
    try {
      const res = await fetch(`/api/users/${removeTarget.id}`, { method: "DELETE" })
      if (!res.ok) {
        // El diálogo se queda abierto: cerrarlo sin decir nada se lee como que
        // la persona se eliminó.
        setEquipoError(await motivoDelRechazo(res, "No fue posible eliminar a esta persona."))
        return
      }
      setUsers((prev) => prev.filter((u) => u.id !== removeTarget.id))
      setRemoveTarget(null)
      router.refresh()
    } catch {
      setEquipoError("Error de red. No se eliminó a nadie.")
    } finally {
      setRemoveLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {equipoError && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-foreground"
        >
          {equipoError}
        </p>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Equipo</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {users.length === 1
              ? `1 / ${memberLimit}, solo tú tienes acceso al negocio`
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
                <DialogTitle>Invitación enviada</DialogTitle>
                <DialogDescription className="break-words">
                  Le mandamos un enlace de un uso a{" "}
                  <strong className="text-foreground">{invitedUser?.email}</strong>.
                  Aparecerá en la lista cuando lo acepte.
                </DialogDescription>
              </DialogHeader>

              {/* Cuerpo con scroll: el encabezado y los botones no se mueven */}
              <div className="space-y-4 overflow-y-auto">
                <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/50 p-4">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-sm font-medium text-foreground">{invitedUser?.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {invitedUser?.expiraEn
                        ? `El enlace caduca el ${formatearCaducidad(invitedUser.expiraEn)}.`
                        : "El enlace sirve una sola vez."}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  No hay contraseña que compartir: el enlace va en el correo y solo funciona una
                  vez. Si no llega, invítalo de nuevo y el anterior deja de servir.
                </p>
              </div>

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

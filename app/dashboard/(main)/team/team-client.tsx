"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  UserPlus, UserMinus, UsersRound, Shield, Stamp,
  Copy, Check, MessageCircle, ChevronRight, Loader2, Lock, Clock,
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
import { Badge } from "@/components/ui/badge"
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

function RoleBadge({ role }: { role: Role }) {
  const config = ROLE_CONFIG[role]
  const Icon = config.icon
  return (
    <Badge variant="outline" className={cn("gap-1.5 text-xs font-medium", config.badgeClass)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}

function RoleCard({ role, selected, onSelect }: { role: Role; selected: boolean; onSelect: () => void }) {
  const config = ROLE_CONFIG[role]
  const Icon = config.icon
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full text-left rounded-xl border-2 p-4 transition-all",
        selected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-border/80 hover:bg-muted/40",
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
          selected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
        )}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{config.label}</span>
            {selected && <Check className="h-3.5 w-3.5 text-primary" />}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{config.description}</p>
          <ul className="mt-2 space-y-1">
            {config.permissions.map((p) => (
              <li key={p} className="flex items-center gap-1.5 text-xs text-foreground/70">
                <Check className="h-3 w-3 text-primary shrink-0" />
                {p}
              </li>
            ))}
            {config.restrictions.map((r) => (
              <li key={r} className="flex items-center gap-1.5 text-xs text-muted-foreground line-through">
                <div className="h-3 w-3 shrink-0" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </button>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      aria-label="Copiar"
    >
      {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
    </button>
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
  const [whatsappPhone, setWhatsappPhone] = useState("")

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

  const whatsappMessage = invitedUser
    ? `Hola ${invitedUser.name} 👋, te invitamos a unirte al equipo de *${businessName}* en Koda Fidelity.\n\n` +
      `Accede con tu correo: *${invitedUser.email}*\n` +
      `Contraseña temporal: *${invitedUser.password}*\n\n` +
      `Entra aquí: ${loginUrl}`
    : ""

  const whatsappUrl = whatsappPhone && invitedUser
    ? `https://wa.me/${whatsappPhone.replace(/\D/g, "")}?text=${encodeURIComponent(whatsappMessage)}`
    : null

  const resetInviteModal = () => {
    setInviteStep("form")
    setInviteName("")
    setInviteEmail("")
    setInviteRole("sellador")
    setInviteError(null)
    setInvitedUser(null)
    setWhatsappPhone("")
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
          <Button onClick={() => { resetInviteModal(); setInviteOpen(true) }} className="gap-2">
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
            <Button onClick={() => { resetInviteModal(); setInviteOpen(true) }} variant="outline" className="gap-2 mt-2">
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
                        className="sm:hidden h-8 w-8 ml-auto shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
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
                        <SelectTrigger className="h-9 w-full sm:h-8 sm:w-36 text-xs gap-1.5">
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
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
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

      {/* Permissions reference */}
      <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Permisos por rol</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {(["admin", "sellador"] as Role[]).map((role) => {
            const config = ROLE_CONFIG[role]
            const Icon = config.icon
            return (
              <div key={role} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-foreground">{config.label}</span>
                  <span className="text-xs text-muted-foreground">— {config.description}</span>
                </div>
                <ul className="space-y-1 pl-5">
                  {config.permissions.map((p) => (
                    <li key={p} className="flex items-center gap-1.5 text-xs text-foreground/70">
                      <Check className="h-3 w-3 text-primary shrink-0" />
                      {p}
                    </li>
                  ))}
                  {config.restrictions.map((r) => (
                    <li key={r} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <div className="h-3 w-3 rounded-full border border-border shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </div>

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

                <div className="space-y-2">
                  <Label>Nivel de acceso</Label>
                  <div className="grid grid-cols-1 gap-2">
                    <RoleCard role="sellador" selected={inviteRole === "sellador"} onSelect={() => setInviteRole("sellador")} />
                    <RoleCard role="admin" selected={inviteRole === "admin"} onSelect={() => setInviteRole("admin")} />
                  </div>
                </div>

                {inviteError && (
                  <p className="text-sm text-destructive">{inviteError}</p>
                )}
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { setInviteOpen(false); resetInviteModal() }}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleInvite}
                  disabled={inviteLoading || !inviteName.trim() || !inviteEmail.trim()}
                  className="gap-2"
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

              {/* Scrollable body — header and button stay fixed */}
              <div className="space-y-4 overflow-y-auto">
                {/* Credentials box */}
                <div className="rounded-xl bg-muted/50 border border-border p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground mb-0.5">Correo</p>
                      <p className="text-sm font-mono font-medium text-foreground truncate">{invitedUser?.email}</p>
                    </div>
                    <CopyButton text={invitedUser?.email ?? ""} />
                  </div>
                  <Separator />
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground mb-0.5">Contraseña temporal</p>
                      <p className="text-sm font-mono font-medium text-foreground">{invitedUser?.password}</p>
                    </div>
                    <CopyButton text={invitedUser?.password ?? ""} />
                  </div>
                  <Separator />
                  {/* Link row: label + copy en la misma línea, URL con scroll horizontal abajo */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">Link de acceso</p>
                      <CopyButton text={loginUrl} />
                    </div>
                    <div className="overflow-x-auto rounded-md bg-background border border-border px-2.5 py-1.5">
                      <p className="text-xs font-mono text-muted-foreground whitespace-nowrap">{loginUrl}</p>
                    </div>
                  </div>
                </div>

                {/* WhatsApp section */}
                <div className="space-y-2">
                  <Label htmlFor="whatsapp-phone" className="flex items-center gap-1.5">
                    <MessageCircle className="h-3.5 w-3.5 text-[#25D366]" />
                    Enviar por WhatsApp
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="whatsapp-phone"
                      value={whatsappPhone}
                      onChange={(e) => setWhatsappPhone(e.target.value)}
                      placeholder="+52 55 1234 5678"
                      type="tel"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      disabled={!whatsappPhone.trim()}
                      className="bg-[#25D366] hover:bg-[#1ebe5d] text-white shrink-0 gap-1.5"
                      onClick={() => {
                        if (whatsappUrl) window.open(whatsappUrl, "_blank", "noopener,noreferrer")
                      }}
                    >
                      <MessageCircle className="h-4 w-4" />
                      Enviar
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    El número solo se usa para abrir WhatsApp — no se guarda en ningún lado.
                  </p>
                </div>
              </div>

              <Button onClick={() => { setInviteOpen(false); resetInviteModal() }} className="w-full">
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

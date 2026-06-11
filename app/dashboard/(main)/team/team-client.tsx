"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { UserPlus, UserMinus, UserCog, UsersRound, Shield, Stamp } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import type { Role } from "@prisma/client"

type TeamUser = {
  id: string
  email: string
  name: string
  role: Role
  createdAt: Date
}

interface TeamClientProps {
  currentUserId: string
  initialUsers: TeamUser[]
}

function RoleBadge({ role }: { role: Role }) {
  if (role === "admin") {
    return (
      <Badge variant="secondary" className="gap-1 text-xs">
        <Shield className="h-3 w-3" />
        Admin
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
      <Stamp className="h-3 w-3" />
      Sellador
    </Badge>
  )
}

export function TeamClient({ currentUserId, initialUsers }: TeamClientProps) {
  const router = useRouter()
  const [users, setUsers] = useState<TeamUser[]>(initialUsers)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteName, setInviteName] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<Role>("sellador")
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)

  const [removeTarget, setRemoveTarget] = useState<TeamUser | null>(null)
  const [removeLoading, setRemoveLoading] = useState(false)

  const [roleChangeId, setRoleChangeId] = useState<string | null>(null)
  const [roleChangeLoading, setRoleChangeLoading] = useState(false)

  const handleInvite = async () => {
    setInviteLoading(true)
    setInviteError(null)
    setInviteSuccess(null)
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
      setInviteSuccess(
        `${data.user.name} fue invitado. Contraseña temporal: ${data.temporaryPassword}`
      )
      setInviteName("")
      setInviteEmail("")
      setInviteRole("sellador")
    } catch {
      setInviteError("Error de red. Intenta de nuevo.")
    } finally {
      setInviteLoading(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: Role) => {
    setRoleChangeId(userId)
    setRoleChangeLoading(true)
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
      setRoleChangeLoading(false)
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Equipo</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestiona los colaboradores de tu negocio
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Invitar miembro
        </Button>
      </div>

      {/* User table */}
      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <div className="hidden sm:grid sm:grid-cols-[1fr_1fr_auto_auto] gap-4 px-4 py-3 border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          <span>Nombre</span>
          <span>Correo</span>
          <span>Rol</span>
          <span />
        </div>

        {users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <UsersRound className="h-10 w-10 opacity-30" />
            <p className="text-sm">No hay colaboradores aún</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {users.map((member) => {
              const isSelf = member.id === currentUserId
              return (
                <li
                  key={member.id}
                  className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto] items-center gap-2 sm:gap-4 px-4 py-3"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {member.name}
                        {isSelf && (
                          <span className="ml-2 text-xs text-muted-foreground font-normal">(tú)</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground sm:hidden truncate">{member.email}</p>
                    </div>
                  </div>

                  <p className="hidden sm:block text-sm text-muted-foreground truncate">{member.email}</p>

                  <div>
                    <Select
                      value={member.role}
                      onValueChange={(val) => handleRoleChange(member.id, val as Role)}
                      disabled={isSelf || (roleChangeId === member.id && roleChangeLoading)}
                    >
                      <SelectTrigger className="h-7 w-32 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">
                          <span className="flex items-center gap-1.5">
                            <Shield className="h-3 w-3" />
                            Admin
                          </span>
                        </SelectItem>
                        <SelectItem value="sellador">
                          <span className="flex items-center gap-1.5">
                            <Stamp className="h-3 w-3" />
                            Sellador
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
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
        )}
      </div>

      {/* Invite modal */}
      <Dialog open={inviteOpen} onOpenChange={(open) => { setInviteOpen(open); if (!open) { setInviteError(null); setInviteSuccess(null) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invitar miembro</DialogTitle>
            <DialogDescription>
              Se creará una cuenta con contraseña temporal. El colaborador deberá cambiarla al iniciar sesión.
            </DialogDescription>
          </DialogHeader>

          {inviteSuccess ? (
            <div className="rounded-lg bg-muted p-4 text-sm text-foreground space-y-1">
              <p className="font-medium">✅ Invitación enviada</p>
              <p>{inviteSuccess}</p>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="invite-name">Nombre</Label>
                <Input
                  id="invite-name"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="María García"
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
                />
              </div>
              <div className="space-y-1.5">
                <Label>Rol</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as Role)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sellador">
                      <span className="flex items-center gap-2">
                        <Stamp className="h-4 w-4" />
                        Sellador — solo puede sellar y ver clientes
                      </span>
                    </SelectItem>
                    <SelectItem value="admin">
                      <span className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Admin — acceso completo al negocio
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {inviteError && (
                <p className="text-sm text-destructive">{inviteError}</p>
              )}
            </div>
          )}

          <DialogFooter>
            {inviteSuccess ? (
              <Button onClick={() => { setInviteOpen(false); setInviteSuccess(null) }}>
                Cerrar
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setInviteOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleInvite}
                  disabled={inviteLoading || !inviteName.trim() || !inviteEmail.trim()}
                >
                  {inviteLoading ? "Invitando..." : "Invitar"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove confirmation */}
      <AlertDialog open={!!removeTarget} onOpenChange={(open) => { if (!open) setRemoveTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar colaborador</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar a <strong>{removeTarget?.name}</strong> del equipo? Se revocará su acceso inmediatamente.
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

import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="flex items-center justify-end px-6 py-4">
        <Avatar className="h-9 w-9 border-2 border-border">
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium" />
        </Avatar>
      </div>
    </header>
  )
}

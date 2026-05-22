"use client"

import { Bell, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Search */}
        <div className="relative hidden md:block w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search cards, customers..."
            className="pl-10 bg-muted/50 border-0 focus-visible:ring-1"
          />
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3 ml-auto">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-primary rounded-full" />
          </Button>
          <Avatar className="h-9 w-9 border-2 border-border">
            <AvatarImage src="" />
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
              JD
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}

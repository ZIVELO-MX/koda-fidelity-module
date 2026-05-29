import Link from "next/link"
import Image from "next/image"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/header"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { Smartphone, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) redirect("/login")

  const business = await prisma.business.findUnique({
    where: { email: user.email },
    select: { name: true, brandColor: true },
  })

  if (!business) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border bg-card">
          <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-2">
            <Image
              src="/short-logo.svg"
              alt="Koda"
              width={28}
              height={28}
              className="size-7 shrink-0"
            />
            <span className="font-semibold text-foreground">Koda</span>
          </div>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          <div className="w-full max-w-md text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Smartphone className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Bienvenido, {user.email?.split("@")[0] ?? "Usuario"}
              </h1>
              <p className="text-muted-foreground">
                Aquí puedes ver tus tarjetas de lealtad y acumular sellos en tus negocios favoritos.
              </p>
            </div>
            <Link href="/my-cards">
              <Button size="lg" className="gap-2">
                Ver mis tarjetas
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </main>
      </div>
    )
  }

  const userEmail = user.email
  const businessName = business.name
  const brandColor = business.brandColor

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar
        userEmail={userEmail}
        businessName={businessName}
        brandColor={brandColor}
      />
      <div className="lg:pl-64">
        <DashboardHeader
          userEmail={userEmail}
          businessName={businessName}
          brandColor={brandColor}
        />
        <main className="p-4 sm:p-6 pt-4 lg:pt-6 pb-20 lg:pb-6">{children}</main>
      </div>
    </div>
  )
}

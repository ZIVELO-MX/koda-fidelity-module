import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Smartphone, QrCode, Wallet, CheckCircle2, Zap, Shield, BarChart3 } from "lucide-react"
import { LoyaltyCardPreview } from "@/components/loyalty-card-preview"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">K</span>
              </div>
              <span className="font-semibold text-lg text-foreground">Koda Fidelity</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Features
              </Link>
              <Link href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                How it Works
              </Link>
              <Link href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/dashboard">
                <Button variant="ghost" className="hidden sm:inline-flex">
                  Sign in
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button>
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Zap className="h-4 w-4" />
                Digital Loyalty Made Simple
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight text-balance">
                Turn returning customers into{" "}
                <span className="text-primary">loyal customers</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
                Digital loyalty cards for Apple Wallet and Google Wallet. No apps to download. 
                No accounts to create. Just scan, save, and reward.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/dashboard">
                  <Button size="lg" className="w-full sm:w-auto text-base px-8">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="#how-it-works">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto text-base px-8">
                    See How it Works
                  </Button>
                </Link>
              </div>
              <div className="flex flex-wrap items-center gap-6 pt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span className="text-sm text-muted-foreground">Free to start</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span className="text-sm text-muted-foreground">No credit card</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span className="text-sm text-muted-foreground">Setup in 2 min</span>
                </div>
              </div>
            </div>
            <div className="relative lg:pl-8">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-primary/5 rounded-[40px] blur-3xl" />
                <LoyaltyCardPreview
                  businessName="The Daily Grind"
                  currentStamps={6}
                  maxStamps={10}
                  reward="Free Coffee"
                  expirationDate="Dec 31, 2026"
                  brandColor="#f97316"
                  className="relative"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-20 lg:py-28 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Simple for you. Seamless for customers.
            </h2>
            <p className="text-lg text-muted-foreground">
              Get your digital loyalty program up and running in minutes, not days.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: QrCode,
                step: "01",
                title: "Create Your Card",
                description: "Design a beautiful loyalty card with your brand colors and logo. Set your reward and stamp count.",
              },
              {
                icon: Smartphone,
                step: "02",
                title: "Customers Scan & Save",
                description: "Print your QR code. Customers scan it and instantly save the card to Apple or Google Wallet.",
              },
              {
                icon: Wallet,
                step: "03",
                title: "Reward Loyalty",
                description: "Scan customer cards to add stamps. When they reach the goal, they redeem their reward.",
              },
            ].map((item, index) => (
              <div
                key={index}
                className="relative bg-card rounded-2xl p-8 border border-border shadow-sm hover:shadow-lg transition-shadow group"
              >
                <div className="absolute -top-4 -left-4 w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-lg">
                  {item.step}
                </div>
                <div className="pt-4">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                    <item.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Everything you need to build loyalty
            </h2>
            <p className="text-lg text-muted-foreground">
              Powerful features designed for small businesses that want big results.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Wallet,
                title: "Wallet Integration",
                description: "Native Apple Wallet and Google Wallet support. Cards update in real-time.",
              },
              {
                icon: QrCode,
                title: "QR-Based Flow",
                description: "No apps needed. Customers scan a QR code and they're done.",
              },
              {
                icon: Zap,
                title: "Instant Setup",
                description: "Create your first loyalty card in under 2 minutes.",
              },
              {
                icon: Shield,
                title: "Secure & Private",
                description: "Customer data is protected. No account required for customers.",
              },
              {
                icon: BarChart3,
                title: "Simple Analytics",
                description: "Track stamps, redemptions, and customer engagement.",
              },
              {
                icon: Smartphone,
                title: "Mobile-First",
                description: "Optimized for the way customers actually interact with businesses.",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="bg-card rounded-2xl p-6 border border-border hover:border-primary/30 transition-colors group"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 lg:py-28 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Perfect for local businesses
            </h2>
            <p className="text-lg text-muted-foreground">
              Join thousands of small businesses already using Koda Fidelity.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { emoji: "☕", name: "Coffee Shops", example: "Buy 9, get 1 free" },
              { emoji: "🍕", name: "Restaurants", example: "Free dessert after 5 visits" },
              { emoji: "💇", name: "Barber Shops", example: "10th haircut free" },
              { emoji: "🛒", name: "Local Stores", example: "Earn points on purchases" },
            ].map((useCase, index) => (
              <div
                key={index}
                className="bg-card rounded-2xl p-6 border border-border text-center hover:shadow-md transition-shadow"
              >
                <div className="text-4xl mb-4">{useCase.emoji}</div>
                <h3 className="font-semibold text-foreground mb-2">{useCase.name}</h3>
                <p className="text-sm text-muted-foreground">{useCase.example}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-3xl p-12 lg:p-16 border border-primary/20">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Ready to build customer loyalty?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              Start your free trial today. No credit card required. 
              Create your first loyalty card in minutes.
            </p>
            <Link href="/dashboard">
              <Button size="lg" className="text-base px-10">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">K</span>
              </div>
              <span className="font-semibold text-foreground">Koda Fidelity</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Part of the Koda POS ecosystem. Built for small businesses.
            </p>
            <div className="flex items-center gap-6">
              <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Privacy
              </Link>
              <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Terms
              </Link>
              <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Support
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

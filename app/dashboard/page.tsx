import Link from "next/link"
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/dashboard/stat-card"
import { LoyaltyCardPreview } from "@/components/loyalty-card-preview"
import { CreditCard, Users, Stamp, TrendingUp, Plus, ArrowRight } from "lucide-react"

const recentActivity = [
  { type: "stamp", customer: "Sarah M.", card: "Coffee Rewards", time: "2 min ago" },
  { type: "redeem", customer: "John D.", card: "Coffee Rewards", time: "15 min ago" },
  { type: "new", customer: "Emma W.", card: "Lunch Special", time: "1 hour ago" },
  { type: "stamp", customer: "Mike R.", card: "Haircut Club", time: "2 hours ago" },
]

const campaigns = [
  {
    name: "Coffee Rewards",
    customers: 142,
    stampsGiven: 856,
    color: "#f97316",
    maxStamps: 10,
    reward: "Free Coffee",
  },
  {
    name: "Lunch Special",
    customers: 67,
    stampsGiven: 234,
    color: "#3b82f6",
    maxStamps: 8,
    reward: "Free Dessert",
  },
]

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here&apos;s what&apos;s happening.</p>
        </div>
        <Link href="/dashboard/cards/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Card
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Cards"
          value={2}
          change="+1 this month"
          changeType="positive"
          icon={CreditCard}
        />
        <StatCard
          title="Total Customers"
          value={209}
          change="+23 this week"
          changeType="positive"
          icon={Users}
        />
        <StatCard
          title="Stamps Given"
          value="1,090"
          change="+156 this week"
          changeType="positive"
          icon={Stamp}
        />
        <StatCard
          title="Redemptions"
          value={47}
          change="+8 this week"
          changeType="positive"
          icon={TrendingUp}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Campaigns */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Your Loyalty Cards</h2>
            <Link href="/dashboard/cards" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {campaigns.map((campaign) => (
              <div
                key={campaign.name}
                className="bg-card rounded-2xl p-5 border border-border hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: campaign.color }}
                  >
                    {campaign.name.charAt(0)}
                  </div>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                    Active
                  </span>
                </div>
                <h3 className="font-semibold text-foreground mb-1">{campaign.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {campaign.maxStamps} stamps for {campaign.reward}
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    <span className="font-medium text-foreground">{campaign.customers}</span> customers
                  </span>
                  <span className="text-muted-foreground">
                    <span className="font-medium text-foreground">{campaign.stampsGiven}</span> stamps
                  </span>
                </div>
              </div>
            ))}
            <Link
              href="/dashboard/cards/new"
              className="bg-muted/50 rounded-2xl p-5 border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted transition-colors flex flex-col items-center justify-center text-center min-h-[180px]"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                <Plus className="h-6 w-6 text-primary" />
              </div>
              <p className="font-medium text-foreground">Create New Card</p>
              <p className="text-sm text-muted-foreground">Start a new loyalty campaign</p>
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="divide-y divide-border">
              {recentActivity.map((activity, index) => (
                <div key={index} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        activity.type === "stamp"
                          ? "bg-primary/10 text-primary"
                          : activity.type === "redeem"
                          ? "bg-green-100 text-green-600"
                          : "bg-blue-100 text-blue-600"
                      }`}
                    >
                      {activity.type === "stamp" ? (
                        <Stamp className="h-4 w-4" />
                      ) : activity.type === "redeem" ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <Users className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {activity.customer}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity.type === "stamp"
                          ? "Earned a stamp"
                          : activity.type === "redeem"
                          ? "Redeemed reward"
                          : "Joined"}{" "}
                        - {activity.card}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {activity.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 bg-muted/30 border-t border-border">
              <Link
                href="/dashboard/customers"
                className="text-sm text-primary hover:underline flex items-center justify-center gap-1"
              >
                View all activity
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Card Preview Section */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="max-w-md">
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Your card, in their wallet
            </h2>
            <p className="text-muted-foreground mb-4">
              This is how your customers see their loyalty card in Apple Wallet or Google Wallet.
              Beautiful, accessible, always with them.
            </p>
            <Link href="/dashboard/cards/new">
              <Button variant="outline">
                Customize Card Design
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
          <div className="w-full max-w-xs">
            <LoyaltyCardPreview
              businessName="Your Business"
              customerName="Happy Customer"
              currentStamps={7}
              maxStamps={10}
              reward="Free Reward"
              expirationDate="Dec 31, 2026"
              brandColor="#f97316"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

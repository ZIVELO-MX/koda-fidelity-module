import { Loader2 } from "lucide-react"

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="h-8 w-48 bg-muted rounded-lg animate-pulse mb-2" />
          <div className="h-4 w-72 bg-muted rounded-lg animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-24 bg-muted rounded-xl animate-pulse" />
          <div className="h-10 w-32 bg-muted rounded-xl animate-pulse" />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-card rounded-xl p-4 border border-border space-y-3">
            <div className="h-5 w-5 bg-muted rounded-lg animate-pulse" />
            <div className="h-8 w-16 bg-muted rounded-lg animate-pulse" />
            <div className="h-4 w-24 bg-muted rounded-lg animate-pulse" />
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-6 w-40 bg-muted rounded-lg animate-pulse" />
          <div className="grid sm:grid-cols-2 gap-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-card rounded-2xl p-5 border border-border">
                <div className="h-3 bg-muted rounded-t-2xl -mx-5 -mt-5 mb-4" />
                <div className="space-y-3">
                  <div className="h-5 w-32 bg-muted rounded-lg animate-pulse" />
                  <div className="h-4 w-48 bg-muted rounded-lg animate-pulse" />
                  <div className="flex justify-between">
                    <div className="h-4 w-16 bg-muted rounded-lg animate-pulse" />
                    <div className="h-4 w-16 bg-muted rounded-lg animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="h-6 w-36 bg-muted rounded-lg animate-pulse" />
          <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

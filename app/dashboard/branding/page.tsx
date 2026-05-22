"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, Check } from "lucide-react"

const colorPresets = [
  "#f97316", // Orange
  "#3b82f6", // Blue
  "#10b981", // Green
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#f59e0b", // Amber
]

export default function BrandingPage() {
  const [brandColor, setBrandColor] = useState("#f97316")
  const [businessName, setBusinessName] = useState("Your Business")
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Branding</h1>
        <p className="text-muted-foreground">Customize how your loyalty cards look to customers</p>
      </div>

      {/* Logo Upload */}
      <div className="bg-card rounded-2xl p-6 border border-border">
        <h2 className="font-semibold text-foreground mb-4">Business Logo</h2>
        <div className="flex items-start gap-6">
          <div
            className="w-24 h-24 rounded-2xl flex items-center justify-center text-white text-3xl font-bold flex-shrink-0"
            style={{ backgroundColor: brandColor }}
          >
            {businessName.charAt(0)}
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-4">
              Upload a square logo (recommended: 512x512px). This will appear on your loyalty cards and customer-facing pages.
            </p>
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Upload Logo
            </Button>
          </div>
        </div>
      </div>

      {/* Business Name */}
      <div className="bg-card rounded-2xl p-6 border border-border">
        <h2 className="font-semibold text-foreground mb-4">Business Name</h2>
        <div className="space-y-2">
          <Label htmlFor="businessName">Display Name</Label>
          <Input
            id="businessName"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Enter your business name"
          />
          <p className="text-xs text-muted-foreground">
            This name appears on loyalty cards and customer communications
          </p>
        </div>
      </div>

      {/* Brand Color */}
      <div className="bg-card rounded-2xl p-6 border border-border">
        <h2 className="font-semibold text-foreground mb-4">Brand Color</h2>
        <div className="space-y-4">
          <div>
            <Label className="text-sm text-muted-foreground mb-3 block">Quick presets</Label>
            <div className="flex flex-wrap gap-3">
              {colorPresets.map((color) => (
                <button
                  key={color}
                  onClick={() => setBrandColor(color)}
                  className={`w-10 h-10 rounded-xl transition-all ${
                    brandColor === color
                      ? "ring-2 ring-offset-2 ring-foreground scale-110"
                      : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div>
              <Label htmlFor="customColor" className="text-sm text-muted-foreground mb-2 block">
                Custom color
              </Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="customColor"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border-0"
                />
                <Input
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="w-28 font-mono text-sm"
                  placeholder="#f97316"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-card rounded-2xl p-6 border border-border">
        <h2 className="font-semibold text-foreground mb-4">Preview</h2>
        <div className="bg-muted/30 rounded-xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl font-bold"
              style={{ backgroundColor: brandColor }}
            >
              {businessName.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-foreground text-lg">{businessName || "Your Business"}</p>
              <p className="text-sm text-muted-foreground">Loyalty Card</p>
            </div>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded-lg ${i <= 3 ? "" : "border-2 border-dashed border-border"}`}
                style={i <= 3 ? { backgroundColor: brandColor } : {}}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} className="px-8">
          {saved ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Saved!
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </div>
  )
}

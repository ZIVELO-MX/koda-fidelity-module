"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { LoyaltyCardPreview } from "@/components/loyalty-card-preview"
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react"

const steps = [
  { id: 1, name: "Basics", description: "Card name and reward" },
  { id: 2, name: "Design", description: "Colors and branding" },
  { id: 3, name: "Review", description: "Preview and launch" },
]

const colorPresets = [
  { name: "Orange", value: "#f97316" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#10b981" },
  { name: "Purple", value: "#8b5cf6" },
  { name: "Pink", value: "#ec4899" },
  { name: "Amber", value: "#f59e0b" },
]

export default function CreateCardPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    cardName: "",
    reward: "",
    maxStamps: 10,
    expirationDate: "",
    description: "",
    brandColor: "#f97316",
    businessName: "Your Business",
  })

  const updateFormData = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const nextStep = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1)
  }

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  const handleCreate = () => {
    // In a real app, this would save to a database
    router.push("/dashboard/cards")
  }

  return (
    <div className="min-h-[calc(100vh-100px)]">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/cards"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Cards
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Create Loyalty Card</h1>
        <p className="text-muted-foreground">Set up a new loyalty card campaign in just a few steps</p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between max-w-md">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                    currentStep > step.id
                      ? "bg-primary text-primary-foreground"
                      : currentStep === step.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {currentStep > step.id ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    step.id
                  )}
                </div>
                <div className="mt-2 text-center">
                  <p className={`text-sm font-medium ${currentStep >= step.id ? "text-foreground" : "text-muted-foreground"}`}>
                    {step.name}
                  </p>
                  <p className="text-xs text-muted-foreground hidden sm:block">{step.description}</p>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`h-0.5 w-16 sm:w-24 mx-2 mt-[-24px] ${
                    currentStep > step.id ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Form */}
        <div className="bg-card rounded-2xl p-6 border border-border">
          {/* Step 1: Basics */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-1">Card Basics</h2>
                <p className="text-sm text-muted-foreground">
                  What will customers earn with this card?
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cardName">Card Name</Label>
                  <Input
                    id="cardName"
                    placeholder="e.g., Coffee Rewards"
                    value={formData.cardName}
                    onChange={(e) => updateFormData("cardName", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    This is the name customers will see on their card
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reward">Reward</Label>
                  <Input
                    id="reward"
                    placeholder="e.g., Free Coffee"
                    value={formData.reward}
                    onChange={(e) => updateFormData("reward", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    What do customers get when they complete the card?
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxStamps">Stamps Required</Label>
                  <div className="flex items-center gap-3">
                    {[5, 8, 10, 12, 15].map((num) => (
                      <button
                        key={num}
                        onClick={() => updateFormData("maxStamps", num)}
                        className={`w-12 h-12 rounded-xl font-semibold transition-all ${
                          formData.maxStamps === num
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground hover:bg-muted/80"
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    How many stamps to earn the reward?
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expirationDate">Expiration Date (optional)</Label>
                  <Input
                    id="expirationDate"
                    type="date"
                    value={formData.expirationDate}
                    onChange={(e) => updateFormData("expirationDate", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Add any extra details about your loyalty program..."
                    value={formData.description}
                    onChange={(e) => updateFormData("description", e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Design */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-1">Card Design</h2>
                <p className="text-sm text-muted-foreground">
                  Customize the look of your loyalty card
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input
                    id="businessName"
                    placeholder="Your Business Name"
                    value={formData.businessName}
                    onChange={(e) => updateFormData("businessName", e.target.value)}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Brand Color</Label>
                  <div className="grid grid-cols-6 gap-3">
                    {colorPresets.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => updateFormData("brandColor", color.value)}
                        className={`w-full aspect-square rounded-xl transition-all ${
                          formData.brandColor === color.value
                            ? "ring-2 ring-offset-2 ring-foreground scale-110"
                            : "hover:scale-105"
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-3 mt-4">
                    <Label htmlFor="customColor" className="text-sm text-muted-foreground">
                      Custom:
                    </Label>
                    <input
                      type="color"
                      id="customColor"
                      value={formData.brandColor}
                      onChange={(e) => updateFormData("brandColor", e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border-0"
                    />
                    <Input
                      value={formData.brandColor}
                      onChange={(e) => updateFormData("brandColor", e.target.value)}
                      className="w-28 font-mono text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-1">Review & Launch</h2>
                <p className="text-sm text-muted-foreground">
                  Make sure everything looks good before creating your card
                </p>
              </div>

              <div className="space-y-4">
                <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Card Name</span>
                    <span className="text-sm font-medium text-foreground">
                      {formData.cardName || "Not set"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Reward</span>
                    <span className="text-sm font-medium text-foreground">
                      {formData.reward || "Not set"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Stamps Required</span>
                    <span className="text-sm font-medium text-foreground">{formData.maxStamps}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Business Name</span>
                    <span className="text-sm font-medium text-foreground">{formData.businessName}</span>
                  </div>
                  {formData.expirationDate && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Expires</span>
                      <span className="text-sm font-medium text-foreground">{formData.expirationDate}</span>
                    </div>
                  )}
                </div>

                <div className="bg-primary/10 rounded-xl p-4 flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Ready to go!</p>
                    <p className="text-xs text-muted-foreground">
                      After creating, you&apos;ll get a QR code that customers can scan to join your loyalty program.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            {currentStep < 3 ? (
              <Button onClick={nextStep}>
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleCreate}>
                <Check className="h-4 w-4 mr-2" />
                Create Card
              </Button>
            )}
          </div>
        </div>

        {/* Preview */}
        <div className="lg:sticky lg:top-24 h-fit">
          <div className="bg-muted/30 rounded-2xl p-8 border border-border">
            <h3 className="text-sm font-medium text-muted-foreground mb-6 text-center">
              Live Preview
            </h3>
            <LoyaltyCardPreview
              businessName={formData.businessName || "Your Business"}
              customerName="Happy Customer"
              currentStamps={Math.floor(formData.maxStamps * 0.6)}
              maxStamps={formData.maxStamps}
              reward={formData.reward || "Your Reward"}
              expirationDate={formData.expirationDate ? new Date(formData.expirationDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : undefined}
              brandColor={formData.brandColor}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

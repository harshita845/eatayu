import React, { useState, useEffect } from "react"
import { adminAPI } from "@/services/api"
import { Button } from "@food/components/ui/button"
import { Input } from "@food/components/ui/input"
import { Label } from "@food/components/ui/label"
import { toast } from "sonner"
import { Loader2, Save, Wallet } from "lucide-react"

const THEME = "#EB590E"
const GST_RATE = 0.18

const formatMoney = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

const MoneyInput = ({ id, value, onChange, className = "" }) => (
  <div className={`relative ${className}`}>
    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400">
      ₹
    </span>
    <Input
      id={id}
      type="number"
      min="0"
      className="h-11 rounded-xl border-gray-200 bg-white pl-8 shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-orange-200"
      value={value}
      onChange={onChange}
    />
  </div>
)

const OnboardingFeeSettings = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [onboardingFee, setOnboardingFee] = useState(0)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const res = await adminAPI.getRestaurantSubscriptionSettings()
      if (res.data?.success && res.data.data) {
        setOnboardingFee(Number(res.data.data?.onboardingFee ?? 0))
      }
    } catch (error) {
      console.error("Error fetching settings:", error)
      toast.error("Failed to load onboarding fee settings.")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const res = await adminAPI.updateRestaurantSubscriptionSettings({ onboardingFee })
      if (res.data?.success) {
        toast.success("Onboarding fee updated successfully.")
      }
    } catch (error) {
      console.error("Error saving settings:", error)
      toast.error("Failed to update onboarding fee.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[420px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: THEME }} />
      </div>
    )
  }

  const feeBase = Math.max(0, Number(onboardingFee) || 0)
  const feeGst = feeBase > 0 ? Math.round(feeBase * GST_RATE * 100) / 100 : 0
  const feeTotal = feeBase + feeGst

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Onboarding Fee Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure the one-time onboarding fee charged to new restaurants. Set to ₹0 to waive the fee entirely.
        </p>
      </div>

      {/* Fee card */}
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div
          className="border-b px-6 py-5"
          style={{ background: `linear-gradient(135deg, rgba(235,89,14,0.08) 0%, rgba(235,89,14,0.02) 100%)` }}
        >
          <div className="flex items-start gap-4">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
              style={{ backgroundColor: THEME }}
            >
              <Wallet className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900">One-time Onboarding Fee</h2>
              <p className="mt-1 text-sm text-gray-500">
                Charged once during restaurant registration. Restaurants pay base + 18% GST on the final onboarding step.
                Set to ₹0 to skip payment and allow free onboarding.
              </p>
            </div>
            {feeBase > 0 ? (
              <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: "#FFF0EB", color: THEME }}>
                Active
              </span>
            ) : (
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-500">
                Disabled
              </span>
            )}
          </div>
        </div>

        <div className="grid gap-6 p-6 sm:grid-cols-[1fr_auto] sm:items-end">
          {/* Input */}
          <div className="max-w-sm space-y-2">
            <Label htmlFor="onboardingFee" className="text-sm font-medium text-gray-700">
              Fee amount (base, before GST)
            </Label>
            <MoneyInput
              id="onboardingFee"
              value={onboardingFee}
              onChange={(e) => setOnboardingFee(Math.max(0, Number(e.target.value) || 0))}
            />
            <p className="text-xs text-gray-400">
              Set to 0 to disable the onboarding fee entirely — restaurants can submit for free.
            </p>
          </div>

          {/* Breakdown */}
          <div className="rounded-xl border border-dashed border-orange-200 bg-orange-50/50 px-5 py-4 sm:min-w-[220px]">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              {feeBase > 0 ? "Fee breakdown" : "No fee"}
            </p>
            {feeBase > 0 ? (
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Onboarding fee</span>
                  <span className="font-medium text-gray-800">{formatMoney(feeBase)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>GST ({(GST_RATE * 100).toFixed(0)}%)</span>
                  <span className="font-medium text-gray-800">{formatMoney(feeGst)}</span>
                </div>
                <div className="flex justify-between border-t border-dashed border-orange-200 pt-2 font-bold" style={{ color: THEME }}>
                  <span>Total collected</span>
                  <span className="text-lg">{formatMoney(feeTotal)}</span>
                </div>
              </div>
            ) : (
              <p className="mt-1 text-2xl font-bold text-gray-400">{formatMoney(0)}</p>
            )}
          </div>
        </div>
      </section>

      {/* Save */}
      <div className="flex justify-end border-t border-gray-100 pt-6">
        <Button
          onClick={handleSave}
          disabled={saving}
          variant="ghost"
          className="h-11 min-w-[160px] cursor-pointer rounded-xl border-0 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90"
          style={{ backgroundColor: THEME }}
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save changes
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

export default OnboardingFeeSettings

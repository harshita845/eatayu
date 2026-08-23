import { useState, useEffect, useRef } from "react"
import { useNavigate, Link } from "react-router-dom"
import { motion, useReducedMotion } from "framer-motion"
import { Phone, User, AlertCircle, Loader2, Shield } from "lucide-react"
import { restaurantAPI } from "@food/api"
import { Button } from "@food/components/ui/button"
import { Label } from "@food/components/ui/label"
import { useCompanyName } from "@food/hooks/useCompanyName"
import { loadBusinessSettings, getModuleLogoUrl } from "@food/utils/businessSettings"
import RestaurantPartnerHero from "@food/components/restaurant/auth/RestaurantPartnerHero"
import quickSpicyLogo from "@food/assets/EatAyu-logo.png"

const DEFAULT_COUNTRY_CODE = "+91"
const THEME = "#EB590E"

export default function RestaurantSignup() {
  const companyName = useCompanyName()
  const navigate = useNavigate()
  const prefersReducedMotion = useReducedMotion()
  const [logoUrl, setLogoUrl] = useState(() => getModuleLogoUrl("restaurant") || quickSpicyLogo)
  
  const [formData, setFormData] = useState({
    phone: "",
    countryCode: DEFAULT_COUNTRY_CODE,
    name: "",
  })
  const [errors, setErrors] = useState({
    phone: "",
    name: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState("")

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        await loadBusinessSettings()
        const logo = getModuleLogoUrl("restaurant")
        if (logo) setLogoUrl(logo)
      } catch {
        // keep fallback
      }
    }
    fetchSettings()

    const handleSettingsUpdate = async () => {
      await loadBusinessSettings()
      const logo = getModuleLogoUrl("restaurant")
      if (logo) setLogoUrl(logo)
    }
    window.addEventListener("businessSettingsUpdated", handleSettingsUpdate)
    return () => window.removeEventListener("businessSettingsUpdated", handleSettingsUpdate)
  }, [])

  const validatePhone = (phone) => {
    if (!phone || phone.trim() === "") return "Phone number required"
    const digitsOnly = phone.replace(/\D/g, "")
    if (digitsOnly.length !== 10) return "Must be 10 digits"
    if (!["6", "7", "8", "9"].includes(digitsOnly[0])) return "Invalid number"
    return ""
  }

  const validateName = (name) => {
    if (!name.trim()) {
      return "Restaurant name is required"
    }
    if (name.trim().length < 2) {
      return "Restaurant name must be at least 2 characters"
    }
    if (name.trim().length > 50) {
      return "Restaurant name must be less than 50 characters"
    }
    return ""
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))

    if (name === "name") {
      setErrors((prev) => ({ ...prev, name: validateName(value) }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setApiError("")

    // Validate
    let hasErrors = false
    const newErrors = { phone: "", name: "" }

    const phoneError = validatePhone(formData.phone)
    newErrors.phone = phoneError
    if (phoneError) hasErrors = true

    const nameError = validateName(formData.name)
    newErrors.name = nameError
    if (nameError) hasErrors = true

    setErrors(newErrors)

    if (hasErrors) {
      setIsLoading(false)
      return
    }

    const fullPhone = `${formData.countryCode} ${formData.phone}`.trim()

    try {
      await restaurantAPI.sendOTP(fullPhone, "register")

      const authData = {
        method: "phone",
        phone: fullPhone,
        name: formData.name,
        isSignUp: true,
        module: "restaurant",
      }
      sessionStorage.setItem("restaurantAuthData", JSON.stringify(authData))
      navigate("/food/restaurant/otp")
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Failed to send OTP. Please try again."
      setApiError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const formMotion = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.35, ease: "easeOut" },
      }

  const isValidForm = formData.name.trim().length >= 2 && !validatePhone(formData.phone)

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-white">
      {/* Left hero panel */}
      <div className="hidden h-full lg:block lg:w-1/2">
        <RestaurantPartnerHero themeColor={THEME} />
      </div>

      {/* Right form panel */}
      <div className="flex h-full w-full flex-col bg-[#F0F2F5] lg:w-1/2">
        {/* Mobile top bar */}
        <div className="relative shrink-0 overflow-hidden px-6 py-5 lg:hidden" style={{ backgroundColor: "#141018" }}>
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full blur-2xl"
            style={{ backgroundColor: `${THEME}35` }}
          />
          <div className="relative flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${THEME}20` }}
            >
              <Shield className="h-3.5 w-3.5" style={{ color: THEME }} aria-hidden="true" />
            </div>
            <div>
              <p className="text-[10px] font-medium text-white/50">Partner Portal</p>
              <p className="text-sm font-semibold text-white">{companyName}</p>
            </div>
          </div>
        </div>

        {/* Signup form body */}
        <div className="flex flex-1 items-center justify-center overflow-y-auto px-5 py-8 sm:px-10">
          <motion.div {...formMotion} className="my-auto w-full max-w-[380px]">
            <div className="mb-7 text-center lg:text-left">
              <div className="mb-5 flex justify-center lg:justify-start">
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
                  <img
                    src={logoUrl}
                    alt={`${companyName} logo`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      if (e.target.src !== quickSpicyLogo) e.target.src = quickSpicyLogo
                    }}
                  />
                </div>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">Register Your Restaurant</h2>
              <p className="mt-1 text-sm text-gray-500">
                Enter your details to get started
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.08)] sm:p-7">
              <form onSubmit={handleSubmit} className="space-y-4">
                {apiError && (
                  <div role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {apiError}
                  </div>
                )}

                {/* Restaurant Name input */}
                <div className="space-y-1.5">
                  <Label htmlFor="restaurant-name" className="text-sm font-medium text-gray-700">
                    Restaurant Name
                  </Label>
                  <div className="flex overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all focus-within:ring-2 focus-within:ring-[#EB590E]/30">
                    <input
                      id="restaurant-name"
                      name="name"
                      type="text"
                      placeholder="Enter restaurant name"
                      value={formData.name}
                      onChange={handleChange}
                      className="h-12 w-full border-0 bg-transparent px-4 text-base font-medium text-gray-900 outline-none placeholder:text-gray-400"
                      style={{ caretColor: THEME }}
                      required
                    />
                  </div>
                  {errors.name && (
                    <p className="text-xs text-red-600 mt-1">{errors.name}</p>
                  )}
                </div>

                {/* Phone number input */}
                <div className="space-y-1.5">
                  <Label htmlFor="restaurant-phone" className="text-sm font-medium text-gray-700">
                    Mobile number
                  </Label>
                  <div className="flex overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all focus-within:ring-2 focus-within:ring-[#EB590E]/30">
                    <div className="flex items-center border-r border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-700">
                      +91
                    </div>
                    <input
                      id="restaurant-phone"
                      name="phone"
                      type="tel"
                      maxLength={10}
                      inputMode="numeric"
                      autoComplete="tel-national"
                      placeholder="00000 00000"
                      value={formData.phone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                        setFormData((prev) => ({ ...prev, phone: val }));
                        if (errors.phone) setErrors((prev) => ({ ...prev, phone: validatePhone(val) }));
                      }}
                      className="h-12 w-full border-0 bg-transparent px-4 text-base font-medium text-gray-900 outline-none placeholder:text-gray-400"
                      style={{ caretColor: THEME }}
                      required
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-xs text-red-600 mt-1">{errors.phone}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={!isValidForm || isLoading}
                  variant="ghost"
                  className="h-12 w-full cursor-pointer rounded-xl border-0 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: THEME }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Sending OTP...
                    </>
                  ) : (
                    "Send OTP"
                  )}
                </Button>
              </form>
            </div>

            {/* Login Link */}
            <div className="mt-5 text-center text-sm">
              <span className="text-gray-600">Already have an account? </span>
              <button
                type="button"
                onClick={() => navigate("/food/restaurant/login")}
                className="text-[#EB590E] hover:underline font-semibold"
              >
                Login
              </button>
            </div>

            {/* Footer links */}
            <footer className="mt-7 space-y-2 text-center">
              <p className="text-xs text-gray-400">
                Secure partner registration &middot; {companyName}
              </p>
              <p className="text-[11px] text-gray-400">
                <Link to="/food/restaurant/terms" className="transition-colors hover:text-[#EB590E]">
                  Terms
                </Link>
                {" · "}
                <Link to="/food/restaurant/privacy" className="transition-colors hover:text-[#EB590E]">
                  Privacy
                </Link>
                {" · "}
                <Link to="/food/restaurant/help-content" className="transition-colors hover:text-[#EB590E]">
                  Support
                </Link>
              </p>
            </footer>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

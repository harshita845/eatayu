import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Loader2, AlertCircle, Smartphone, ShieldCheck, CheckCircle2, Edit2 } from "lucide-react"
import AnimatedPage from "@food/components/user/AnimatedPage"
import { Input } from "@food/components/ui/input"
import { Button } from "@food/components/ui/button"
import apiClient, { authAPI } from "@food/api"
import { setAuthData as setUserAuthData } from "@food/utils/auth"
import { resolveDeviceFcmToken, registerWebPushForCurrentModule } from "@food/utils/firebaseMessaging"
import { motion, AnimatePresence } from "framer-motion"

const FULL_NAME_REGEX = /^[A-Za-z ]+$/

export default function OTP() {
  const navigate = useNavigate()
  const [otp, setOtp] = useState(["", "", "", ""]) // exactly 4 digits
  const [devOtp, setDevOtp] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)
  const [authData, setAuthData] = useState(null)
  const [showNameInput, setShowNameInput] = useState(false)
  const [name, setName] = useState("")
  const [nameError, setNameError] = useState("")
  const [verifiedData, setVerifiedData] = useState(null)
  const [infoNotice, setInfoNotice] = useState("")
  const [contactInfo, setContactInfo] = useState("")
  const [contactType, setContactType] = useState("phone")
  const [deviceToken, setDeviceToken] = useState(null)
  const [activePlatform, setActivePlatform] = useState("web")
  const inputRefs = useRef([])
  const submittingRef = useRef(false)

  useEffect(() => {
    // Redirect to home if already authenticated
    const isAuthenticated = localStorage.getItem("user_authenticated") === "true"
    if (isAuthenticated) {
      navigate("/food/user", { replace: true })
      return
    }

    // Get auth data from sessionStorage
    const stored = sessionStorage.getItem("userAuthData")
    if (!stored) {
      navigate("/food/user/auth/login", { replace: true })
      return
    }
    const data = JSON.parse(stored)
    setAuthData(data)

    if (data.devOtp) {
      setDevOtp(String(data.devOtp))
    }
    if (data.phone) {
      const rawPhone = data.phone.replace(/\D/g, "").slice(-10)
      if (rawPhone) {
        apiClient
          .get(`/food/auth/user/latest-otp?phone=${rawPhone}`)
          .then((res) => {
            const fetched = res?.data?.otp
            if (fetched) setDevOtp(String(fetched))
          })
          .catch(() => {})
      }
    }

    if (data.method === "email" && data.email) {
      setContactType("email")
      setContactInfo(data.email)
    } else if (data.phone) {
      setContactType("phone")
      const phoneMatch = data.phone?.match(/(\+\d+)\s*(.+)/)
      if (phoneMatch) {
        setContactInfo(`${phoneMatch[1]}-${phoneMatch[2].replace(/\D/g, "")}`)
      } else {
        setContactInfo(data.phone || "")
      }
    }

    setResendTimer(60)
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [navigate])

  // Native WebOTP API for Android Chrome 1-tap SMS autofill
  useEffect(() => {
    if (typeof window === "undefined" || !("OTPCredential" in window)) return
    const ac = new AbortController()

    navigator.credentials
      ?.get({
        otp: { transport: ["sms"] },
        signal: ac.signal,
      })
      .then((otpCredential) => {
        if (otpCredential?.code) {
          const digits = otpCredential.code.replace(/\D/g, "").slice(0, 4).split("")
          if (digits.length === 4) {
            const newOtp = ["", "", "", ""]
            digits.forEach((d, i) => { newOtp[i] = d })
            setOtp(newOtp)
            handleVerify(newOtp.join(""))
          }
        }
      })
      .catch(() => {})

    return () => {
      try {
        ac.abort()
      } catch {}
    }
  }, [])

  useEffect(() => {
    if (inputRefs.current[0] && !showNameInput) {
      inputRefs.current[0].focus()
    }
  }, [showNameInput])

  // Warm notification permission on first OTP interaction (needs a user gesture).
  const ensureNotificationPermission = async () => {
    try {
      if (typeof Notification === "undefined") return
      if (Notification.permission === "default") {
        await Notification.requestPermission()
      }
    } catch {
      // ignore
    }
  }

  const handleChange = (index, value) => {
    const clean = String(value || "").replace(/\D/g, "")

    // Handle mobile keyboard SMS autofill (e.g. "4422" inserted into first input by iOS QuickType / Android Gboard)
    if (clean.length > 1) {
      const digits = clean.slice(0, 4).split("")
      const newOtp = ["", "", "", ""]
      digits.forEach((d, i) => {
        newOtp[i] = d
      })
      setOtp(newOtp)
      setError("")
      if (digits.length === 4) {
        handleVerify(newOtp.join(""))
      } else {
        inputRefs.current[Math.min(digits.length, 3)]?.focus()
      }
      return
    }

    // Single digit entry
    const newOtp = [...otp]
    newOtp[index] = clean
    setOtp(newOtp)
    setError("")

    if (clean && index < 3) {
      inputRefs.current[index + 1]?.focus()
    }

    if (!showNameInput && newOtp.slice(0, 4).every((digit) => digit !== "")) {
      handleVerify(newOtp.slice(0, 4).join(""))
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      if (otp[index]) {
        const newOtp = [...otp]
        newOtp[index] = ""
        setOtp(newOtp)
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus()
        const newOtp = [...otp]
        newOtp[index - 1] = ""
        setOtp(newOtp)
      }
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text")
    const digits = pastedData.replace(/\D/g, "").slice(0, 4).split("")
    const newOtp = [...otp]
    digits.forEach((digit, i) => {
      if (i < 4) newOtp[i] = digit
    })
    setOtp(newOtp)
    if (!showNameInput && digits.length === 4) {
      handleVerify(newOtp.slice(0, 4).join(""))
    } else {
      inputRefs.current[Math.min(digits.length, 3)]?.focus()
    }
  }

  const handleVerify = async (otpValue = null) => {
    if (showNameInput) return
    if (submittingRef.current) return

    const code = (otpValue || otp.join("")).replace(/\D/g, "")
    const code4 = code.slice(0, 4)
    if (code4.length !== 4) {
      setError("OTP must be exactly 4 digits")
      return
    }

    submittingRef.current = true
    setIsLoading(true)
    setError("")

    try {
      const phone = authData?.method === "phone" ? authData.phone : null
      const email = authData?.method === "email" ? authData.email : null
      const purpose = authData?.isSignUp ? "register" : "login"
      const providedName = authData?.isSignUp ? authData?.name || null : null
      const referralCode = authData?.referralCode || null

      let fcmToken = null;
      let platform = "web";
      try {
        const resolved = await Promise.race([
          resolveDeviceFcmToken("user", { allowPrompt: false }),
          new Promise((r) => setTimeout(() => r(null), 500)),
        ]);
        fcmToken = resolved?.token || null;
        platform = resolved?.platform || "web";
      } catch (e) {
        console.warn("Failed to get FCM token during login", e);
      }

      if (!fcmToken && typeof Notification !== "undefined" && Notification.permission === "denied") {
        console.warn(
          "[FCM] Browser notification permission is BLOCKED. Token cannot be created. " +
            "Chrome → site settings → Notifications → Allow for this site, then login again.",
        );
      }

      setDeviceToken(fcmToken);
      setActivePlatform(platform);

      const response = await authAPI.verifyOTP(
        phone, code4, purpose, providedName, email, "user", null, referralCode, fcmToken, platform
      )
      const data = response?.data?.data || response?.data || {}
      const accessToken = data.accessToken
      const refreshToken = data.refreshToken ?? null
      const user = data.user

      if (!accessToken || !user || !refreshToken) {
        throw new Error("Invalid response from server")
      }

      const hasName = user.name && String(user.name).trim().length > 0 && String(user.name).toLowerCase() !== "null";
      const needsName = data.isNewUser === true || !hasName;

      if (needsName) {
        setVerifiedData(data)
        setShowNameInput(true)
        setIsLoading(false)
        submittingRef.current = false
        return
      }

      sessionStorage.removeItem("userAuthData")
      setUserAuthData("user", accessToken, user, refreshToken)
      window.dispatchEvent(new Event("userAuthChanged"))
      setSuccess(true)
      // Sync push notifications in the background so login is instant
      registerWebPushForCurrentModule("/food/user", { force: true }).catch(() => {})
      navigate("/food/user", { replace: true })
    } catch (err) {
      const status = err?.response?.status
      let message = err?.response?.data?.message || err?.response?.data?.error || err?.message || "Verification failed."
      if (status === 401) message = "Invalid or expired code."
      setError(message)
    } finally {
      setIsLoading(false)
      submittingRef.current = false
    }
  }

  const handleSubmitName = async () => {
    const normalizedName = String(name || "").replace(/\s+/g, " ").trim()
    if (!normalizedName || normalizedName.length < 2) {
      setNameError("Please enter a valid name")
      return
    }
    if (!FULL_NAME_REGEX.test(normalizedName)) {
      setNameError("Name can contain only letters and spaces")
      return
    }

    setIsLoading(true)
    setError("")
    setNameError("")

    try {
      const { accessToken, refreshToken, user } = verifiedData

      // Update name via profile API
      try {
        await apiClient.patch("/food/user/profile", 
          { name: normalizedName },
          { headers: { Authorization: `Bearer ${accessToken}` } }
        )
      } catch (e) {
        console.error("Failed to update name on backend, but proceeding with login", e)
      }

      sessionStorage.removeItem("userAuthData")
      setUserAuthData("user", accessToken, { ...user, name: normalizedName }, refreshToken)
      window.dispatchEvent(new Event("userAuthChanged"))
      setSuccess(true)
      registerWebPushForCurrentModule("/food/user", { force: true }).catch(() => {})
      navigate("/food/user", { replace: true })
    } catch (err) {
      setError("Failed to complete registration. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendTimer > 0 || isLoading) return
    setIsLoading(true)
    setError("")
    try {
      const phone = authData?.method === "phone" ? authData.phone : null
      const email = authData?.method === "email" ? authData.email : null
      const purpose = authData?.isSignUp ? "register" : "login"
      const res = await authAPI.sendOTP(phone, purpose, email)
      const newOtp = res?.data?.data?.otp || res?.data?.otp || res?.otp
      if (newOtp) {
        setDevOtp(String(newOtp))
      }
      setInfoNotice("New OTP sent successfully via SMS!")
      setResendTimer(60)
    } catch (err) {
      setError("Failed to resend OTP. Please try again.")
    } finally {
      setIsLoading(false)
    }
    setOtp(["", "", "", ""])
  }

  const handleAutoFill = (code = devOtp) => {
    if (!code) return
    const digits = String(code).replace(/\D/g, "").slice(0, 4).split("")
    if (digits.length === 4) {
      setOtp(digits)
      setError("")
      handleVerify(digits.join(""))
    }
  }

  if (!authData) return null

  return (
    <AnimatedPage className="min-h-[100dvh] bg-zinc-50 dark:bg-[#0A0A0B] flex flex-col font-sans selection:bg-[#FA0272]/20">
      {/* Top App Bar */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-[#0A0A0B]/80 backdrop-blur-md border-b border-zinc-200/60 dark:border-zinc-800/60 px-4 sm:px-6 h-16 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate("/food/user/auth/login")}
          className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          aria-label="Back to login"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="font-black text-lg tracking-tight bg-gradient-to-r from-[#FA0272] to-[#FF4B8B] bg-clip-text text-transparent">
            EatAyu
          </span>
        </div>

        <div className="w-10" />
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col justify-center items-center px-4 sm:px-6 py-8 sm:py-12">
        <div className="w-full max-w-md bg-white dark:bg-zinc-900/90 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 p-6 sm:p-8 shadow-xl shadow-zinc-200/50 dark:shadow-none">
          <AnimatePresence mode="wait">
            {!showNameInput ? (
              <motion.div
                key="otp-view"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                {/* Header info */}
                <div className="space-y-2 text-center">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-[#FA0272]/15 to-[#FA0272]/5 dark:from-[#FA0272]/25 dark:to-[#FA0272]/10 flex items-center justify-center text-[#FA0272] shadow-inner mb-4">
                    <Smartphone className="w-7 h-7" />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
                    OTP Verification
                  </h1>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
                    We've sent a 4-digit code via SMS to
                  </p>
                  <div className="inline-flex items-center justify-center gap-2 bg-zinc-100 dark:bg-zinc-800/80 px-3 py-1.5 rounded-full text-sm font-bold text-zinc-800 dark:text-zinc-200">
                    <span>{contactInfo}</span>
                    <button
                      type="button"
                      onClick={() => navigate("/food/user/auth/login")}
                      className="text-xs font-semibold text-[#FA0272] hover:underline flex items-center gap-0.5 cursor-pointer ml-1"
                    >
                      <Edit2 className="w-3 h-3" /> Edit
                    </button>
                  </div>
                </div>

                {/* 4 Digit Boxes */}
                <div className="py-2">
                  <div className="flex justify-center gap-3 sm:gap-4">
                    {otp.map((digit, index) => (
                      <motion.div
                        key={index}
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.05 * index }}
                        className="relative"
                      >
                        <input
                          ref={(el) => (inputRefs.current[index] = el)}
                          type="text"
                          inputMode="numeric"
                          autoComplete={index === 0 ? "one-time-code" : "off"}
                          maxLength={index === 0 ? 4 : 1}
                          value={digit}
                          onFocus={() => { void ensureNotificationPermission() }}
                          onChange={(e) => handleChange(index, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(index, e)}
                          onPaste={index === 0 ? handlePaste : undefined}
                          disabled={isLoading}
                          aria-label={`Digit ${index + 1}`}
                          className={`w-14 h-16 sm:w-16 sm:h-20 text-center text-3xl font-black rounded-2xl outline-none transition-all shadow-sm ${
                            digit
                              ? "border-2 border-[#FA0272] bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white shadow-[#FA0272]/10"
                              : "border-2 border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-white focus:border-[#FA0272] focus:bg-white dark:focus:bg-zinc-950 focus:ring-4 focus:ring-[#FA0272]/10"
                          }`}
                        />
                        {digit && (
                          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#FA0272] rounded-full" />
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Info Notice (e.g. Resent) */}
                {infoNotice && !error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 py-2.5 px-4 rounded-xl border border-emerald-200 dark:border-emerald-800/40 text-center"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>{infoNotice}</span>
                  </motion.div>
                )}

                {/* Error Banner */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 py-3 px-4 rounded-xl border border-rose-200 dark:border-rose-900/50 text-center"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                    <span>{error}</span>
                  </motion.div>
                )}

                {/* Main Action Button */}
                <Button
                  type="button"
                  onClick={() => handleVerify()}
                  disabled={isLoading || otp.join("").length !== 4}
                  className={`w-full h-13 sm:h-14 rounded-2xl font-bold text-sm sm:text-base transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                    otp.join("").length === 4 && !isLoading
                      ? "bg-[#FA0272] hover:bg-[#E00266] text-white shadow-lg shadow-[#FA0272]/25 active:scale-[0.99]"
                      : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed shadow-none"
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    "Verify & Continue"
                  )}
                </Button>

                {/* Resend Section */}
                <div className="pt-2 text-center text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Didn't receive the OTP?{" "}
                  {resendTimer > 0 ? (
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      Resend SMS in <span className="font-bold text-[#FA0272]">{resendTimer}s</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={isLoading}
                      className="font-bold text-[#FA0272] hover:underline hover:opacity-85 transition-opacity cursor-pointer ml-1"
                    >
                      Resend OTP
                    </button>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="name-view"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div className="space-y-2 text-center">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-[#FA0272]/10 dark:bg-[#FA0272]/20 flex items-center justify-center text-[#FA0272] mb-4">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                    Almost Done!
                  </h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Tell us your name to personalize your orders
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block">
                    Full Name
                  </label>
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      const sanitized = e.target.value.replace(/[^A-Za-z ]/g, "")
                      setName(sanitized)
                      if (nameError) setNameError("")
                    }}
                    disabled={isLoading}
                    placeholder="e.g. Aman Sharma"
                    className="h-14 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border-2 border-zinc-200 dark:border-zinc-800 focus:border-[#FA0272] text-base font-bold px-4"
                  />
                  {nameError && (
                    <p className="text-xs font-semibold text-rose-500 pl-1">
                      {nameError}
                    </p>
                  )}
                </div>

                <Button
                  type="button"
                  onClick={handleSubmitName}
                  disabled={isLoading || name.trim().length < 2}
                  className="w-full h-14 rounded-2xl bg-[#FA0272] hover:bg-[#E00266] text-white font-bold text-base shadow-lg shadow-[#FA0272]/25 transition-all duration-200 active:scale-[0.99] cursor-pointer"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Saving Profile...</span>
                    </div>
                  ) : (
                    "Complete & Start Ordering"
                  )}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Security / Terms Footnote */}
        <p className="mt-8 text-center text-xs text-zinc-400 dark:text-zinc-600 max-w-xs leading-relaxed">
          By continuing, you agree to EatAyu's{" "}
          <span className="text-zinc-600 dark:text-zinc-400 font-medium">Terms of Service</span> &{" "}
          <span className="text-zinc-600 dark:text-zinc-400 font-medium">Privacy Policy</span>
        </p>
      </main>
    </AnimatedPage>
  )
}

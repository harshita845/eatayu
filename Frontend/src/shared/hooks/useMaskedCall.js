import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { callAPI } from "@food/api"

const CONNECTING_MESSAGE =
  "Connecting your call... you will receive a call from our number shortly. Please pick up."

// Masking on/off is server config; fetch once per page load and share it.
let enabledPromise = null
const loadCallMaskingEnabled = (contextModule) => {
  if (!enabledPromise) {
    enabledPromise = callAPI
      .getConfig(contextModule)
      .then((res) => Boolean(res?.data?.data?.enabled))
      .catch(() => {
        enabledPromise = null
        return false
      })
  }
  return enabledPromise
}

const errorMessage = (err) => {
  const data = err?.response?.data
  if (data?.code === "CALL_MASKING_DISABLED") return "Calling is not available right now"
  if (err?.response?.status === 429) return data?.message || "Too many call attempts. Please wait a few minutes."
  return data?.message || "Couldn't start the call. Please try again."
}

/**
 * Starts masked calls for one order from one app.
 * @param {"user"|"delivery"|"restaurant"} contextModule which app's login token to use
 * @returns {{ enabled: boolean, callingRole: string|null, startCall: (orderId: string, targetRole: string) => Promise<void> }}
 */
export function useMaskedCall(contextModule) {
  const [enabled, setEnabled] = useState(false)
  const [callingRole, setCallingRole] = useState(null)

  useEffect(() => {
    let active = true
    loadCallMaskingEnabled(contextModule).then((value) => {
      if (active) setEnabled(value)
    })
    return () => {
      active = false
    }
  }, [contextModule])

  const startCall = useCallback(
    async (orderId, targetRole) => {
      if (!orderId || callingRole) return
      setCallingRole(targetRole)
      try {
        const res = await callAPI.requestMaskedCall(orderId, targetRole, contextModule)
        toast.success(res?.data?.message || CONNECTING_MESSAGE, { duration: 7000 })
      } catch (err) {
        toast.error(errorMessage(err))
      } finally {
        setCallingRole(null)
      }
    },
    [callingRole, contextModule],
  )

  return { enabled, callingRole, startCall }
}

// Mirrors the server's rules so buttons are hidden when a call would be refused.
// The server stays authoritative.
const CALLABLE_STATUSES = new Set([
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "reached_pickup",
  "picked_up",
  "reached_drop",
])
const POST_DELIVERY_CALL_WINDOW_MS = 30 * 60 * 1000

/**
 * Whether parties of this order may call each other right now.
 * @param {string} status raw order status (e.g. "preparing")
 * @param {string|Date|null} deliveredAt delivery time, used for the short post-delivery window
 */
export function isOrderCallable(status, deliveredAt = null) {
  const s = String(status || "").toLowerCase()
  if (CALLABLE_STATUSES.has(s)) return true
  if (s === "delivered" && deliveredAt) {
    return Date.now() - new Date(deliveredAt).getTime() <= POST_DELIVERY_CALL_WINDOW_MS
  }
  return false
}

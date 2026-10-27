import { Loader2, Phone } from "lucide-react"
import { useMaskedCall } from "@/shared/hooks/useMaskedCall"

/**
 * Phone button that starts a masked call to another party of the order.
 * Renders nothing when masking is off, the order id is missing, or `disabled` is set
 * (e.g. the rider is not assigned yet). Styling is passed in so each app keeps its look.
 */
export default function MaskedCallButton({
  orderId,
  targetRole,
  contextModule,
  disabled = false,
  className = "",
  iconClassName = "w-5 h-5",
  label = null,
  title,
}) {
  const { enabled, callingRole, startCall } = useMaskedCall(contextModule)
  if (!enabled || !orderId || disabled) return null

  const busy = callingRole === targetRole
  const Icon = busy ? Loader2 : Phone
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        startCall(orderId, targetRole)
      }}
      disabled={busy}
      aria-busy={busy}
      title={title || `Call ${targetRole}`}
      aria-label={title || `Call ${targetRole}`}
      className={`${className} ${busy ? "opacity-70 cursor-wait" : ""}`}
    >
      <Icon className={`${iconClassName} ${busy ? "animate-spin" : ""}`} />
      {label}
    </button>
  )
}

import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

const HANDLE_SIZE = 56; // w-14
const TRACK_PADDING = 6; // p-1.5
const CONFIRM_AT = 0.75; // share of the track the handle must pass to confirm

/**
 * ActionSlider - Professional "Swipe to Confirm" UI Component.
 * The handle position lives in a motion value, so it follows the finger without
 * re-rendering on every move, and the fill is derived from the same value.
 */
export const ActionSlider = ({
  label = "Slide to Confirm",
  onConfirm,
  disabled = false,
  color = "bg-green-600",
  successLabel = "Confirmed ✓"
}) => {
  const [isSuccess, setIsSuccess] = useState(false);
  const [maxX, setMaxX] = useState(0);
  const containerRef = useRef(null);
  const x = useMotionValue(0);

  // Measure the track after layout and whenever its width changes.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const measure = () => setMaxX(Math.max(0, el.offsetWidth - HANDLE_SIZE - TRACK_PADDING * 2));
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Reset when disabled state changes
  useEffect(() => {
    if (disabled) {
      setIsSuccess(false);
      x.set(0);
    }
  }, [disabled, x]);

  const fillWidth = useTransform(x, (v) => `${v + HANDLE_SIZE + TRACK_PADDING * 2}px`);
  const labelOpacity = useTransform(x, (v) => (maxX > 0 ? Math.max(0, 1 - v / (maxX * 0.6)) : 1));

  const snapBack = () => animate(x, 0, { type: 'spring', stiffness: 500, damping: 35 });

  const handleDragEnd = async () => {
    if (disabled || isSuccess) return;

    if (maxX > 0 && x.get() >= maxX * CONFIRM_AT) {
      setIsSuccess(true);
      animate(x, maxX, { type: 'spring', stiffness: 500, damping: 40 });
      if (onConfirm) {
        try {
          await onConfirm();
        } catch (error) {
          setIsSuccess(false);
          snapBack();
        }
      }
    } else {
      snapBack();
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-[68px] rounded-full p-1.5 overflow-hidden transition-all duration-300 ${
        'bg-gray-950 shadow-lg shadow-black/10'
      }`}
    >
      {/* Background Track */}
      <motion.div
        style={{ opacity: isSuccess ? 0 : labelOpacity }}
        className={`absolute inset-y-0 left-[76px] right-5 flex items-center justify-center text-center font-bold text-[11px] uppercase tracking-[0.14em] leading-none whitespace-nowrap ${
          disabled ? 'text-white/70' : 'text-white/88'
        }`}
      >
        {disabled ? 'Action Locked' : label}
      </motion.div>

      {/* Dynamic Progress Fill (tracks the handle exactly) */}
      <motion.div
        className={`absolute inset-y-0 left-0 ${color} rounded-full`}
        style={{ width: isSuccess ? '100%' : fillWidth, opacity: disabled ? 0 : 1 }}
      />

      {/* Success View */}
      <AnimatePresence>
        {isSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-y-0 left-[76px] right-5 flex items-center justify-center text-center text-white font-bold text-sm uppercase tracking-[0.14em] leading-none z-30"
          >
            {successLabel}
          </motion.div>
        )}
      </AnimatePresence>

      {/* The Handle */}
      <motion.div
        drag={disabled || isSuccess ? false : "x"}
        dragConstraints={{ left: 0, right: maxX }}
        dragElastic={0}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        // touch-action: none stops the browser from first treating the touch as a
        // page scroll, which is what made the handle lag behind the finger.
        style={{ x, touchAction: 'none' }}
        className={`relative w-14 h-14 rounded-full flex items-center justify-center z-20 cursor-grab active:cursor-grabbing shadow-xl select-none transition-colors ${
          disabled ? 'bg-gray-200 text-gray-400' :
          isSuccess ? 'bg-white text-green-600' : 'bg-white text-gray-950'
        }`}
      >
        <ChevronRight className={`w-8 h-8 transition-transform duration-300 ${isSuccess ? 'scale-110' : ''}`} />
      </motion.div>
    </div>
  );
};

export default ActionSlider;

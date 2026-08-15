import React, { useRef } from "react"
import { motion, useInView } from "framer-motion"
import { cn } from "@food/utils/utils"

export function SmokyText({
  text = "Smoky Text",
  className = "",
  appearTrigger = "default", // "default" (on load), "hover", "scroll"
  intensity = 10, // blur intensity in px
  position = "bottomLeft", // "bottomLeft", "topLeft"
  color = "whitesmoke",
  duration = 1.2,
  delay = 0,
  stagger = 0.05,
  isGradient = false,
  gradientClass = "from-slate-200 via-slate-400 to-[#FF6F3C]"
}) {
  const containerRef = useRef(null)
  
  // Use scroll trigger check if trigger mode is "scroll"
  const inView = useInView(containerRef, {
    once: true,
    amount: 0.25
  })

  // Determine if the animation should play
  const shouldPlay = appearTrigger === "scroll" ? inView : true

  // Set translation offsets based on position
  const getTranslation = () => {
    switch (position) {
      case "topLeft":
        return { x: -30, y: -30 }
      case "bottomLeft":
      default:
        return { x: -30, y: 30 }
    }
  }

  const offset = getTranslation()

  // Framer Motion variants for characters
  const charVariants = {
    hidden: {
      opacity: 0,
      x: offset.x,
      y: offset.y,
      filter: `blur(${intensity}px)`,
      scale: 1.5,
      textShadow: `0 0 ${intensity * 1.5}px ${color}`
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      filter: "blur(0px)",
      scale: 1,
      textShadow: "0 0 0px rgba(0,0,0,0)",
      transition: {
        type: "spring",
        damping: 15,
        stiffness: 70
      }
    }
  }

  // Hover animations config
  const hoverTransition = {
    type: "spring",
    damping: 10,
    stiffness: 100
  }

  const words = text.split(" ")

  return (
    <span
      ref={containerRef}
      className={cn("inline-flex flex-wrap select-none", className)}
      style={{ color: isGradient ? "transparent" : color }}
    >
      {words.map((word, wordIndex) => (
        <span key={wordIndex} className="inline-block whitespace-nowrap mr-[0.3em]">
          {word.split("").map((char, charIndex) => {
            // Absolute index for staggering delay calculation
            const absoluteIndex = text.indexOf(word) + charIndex

            return (
              <motion.span
                key={charIndex}
                className={cn(
                  "inline-block origin-center transform-gpu",
                  isGradient && "bg-clip-text bg-gradient-to-r text-transparent",
                  isGradient && gradientClass
                )}
                variants={charVariants}
                initial="hidden"
                animate={shouldPlay ? "visible" : "hidden"}
                whileHover={
                  appearTrigger === "hover"
                    ? {
                        opacity: [1, 0.4, 1],
                        filter: [`blur(0px)`, `blur(${intensity / 2}px)`, `blur(0px)`],
                        x: [0, offset.x / 2, 0],
                        y: [0, offset.y / 2, 0],
                        textShadow: [
                          "0 0 0px rgba(0,0,0,0)",
                          `0 0 ${intensity}px ${color}`,
                          "0 0 0px rgba(0,0,0,0)"
                        ],
                        transition: hoverTransition
                      }
                    : undefined
                }
                transition={{
                  duration: duration,
                  delay: delay + absoluteIndex * stagger,
                  ease: [0.16, 1, 0.3, 1]
                }}
              >
                {char}
              </motion.span>
            )
          })}
        </span>
      ))}
    </span>
  )
}

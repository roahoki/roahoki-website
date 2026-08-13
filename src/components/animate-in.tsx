"use client"

import { useEffect, useRef, useState } from "react"

interface AnimateInProps {
  children: React.ReactNode
  className?: string
  delay?: number
  from?: "bottom" | "left" | "right"
}

export function AnimateIn({
  children,
  className = "",
  delay = 0,
  from = "bottom",
}: AnimateInProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.08 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const initialTransform =
    from === "bottom"
      ? "translateY(22px)"
      : from === "left"
      ? "translateX(-22px)"
      : "translateX(22px)"

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : initialTransform,
        transition: `opacity 0.55s ease ${delay}ms, transform 0.55s ease ${delay}ms`,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  )
}

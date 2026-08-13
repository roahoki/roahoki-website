import Image from "next/image"

interface BukIconProps {
  size?: number
  className?: string
}

export function BukIcon({ size = 20, className }: BukIconProps) {
  return (
    <Image
      src="/buk-logo.webp"
      alt="Buk"
      width={size}
      height={size}
      className={className}
    />
  )
}

import Image from "next/image"

interface BiomechanicsIconProps {
  size?: number
  className?: string
}

export function BiomechanicsIcon({ size = 20, className }: BiomechanicsIconProps) {
  return (
    <Image
      src="/icons/biomechanics.png"
      alt="Biomechanics"
      width={size}
      height={size}
      className={className}
    />
  )
}

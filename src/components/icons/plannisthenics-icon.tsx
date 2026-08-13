export function PlannisthenicsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="40" height="40" rx="8" fill="currentColor" fillOpacity="0.08" />
      {/* Barbell icon */}
      <rect x="12" y="18.5" width="16" height="3" rx="1.5" fill="currentColor" fillOpacity="0.8" />
      <rect x="8" y="14" width="3" height="12" rx="1.5" fill="currentColor" />
      <rect x="29" y="14" width="3" height="12" rx="1.5" fill="currentColor" />
    </svg>
  )
}

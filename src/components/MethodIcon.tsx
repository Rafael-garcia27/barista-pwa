interface IconProps {
  size?: number
  className?: string
}

export function EspressoIcon({ size = 24, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* Saucer */}
      <ellipse cx="12" cy="20" rx="8" ry="2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Cup body */}
      <path d="M7 10h10l-1.5 7H8.5L7 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      {/* Handle */}
      <path d="M17 12.5c2 0 3 .8 3 2s-1 2-3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Steam */}
      <path d="M10 7c0-1 1-1 1-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M13 7c0-1 1-1 1-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export function V60Icon({ size = 24, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* Cone / filter */}
      <path d="M4 4h16L12 18Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      {/* Ribs inside cone */}
      <path d="M12 18V9" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.4"/>
      {/* Stand / drip tip */}
      <path d="M12 18v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Server / cup below */}
      <path d="M7 22h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export function AeroPressIcon({ size = 24, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* Chamber */}
      <rect x="7" y="8" width="10" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      {/* Plunger pad */}
      <rect x="8" y="10" width="8" height="3" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      {/* Plunger rod */}
      <line x1="12" y1="10" x2="12" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Handle bar */}
      <line x1="9" y1="4" x2="15" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Cap / filter bottom */}
      <path d="M7 20h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Drip */}
      <line x1="12" y1="20" x2="12" y2="22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

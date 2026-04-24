import type { BrewMethod } from '../types'

interface BrewAnimationProps {
  method: BrewMethod
  timerSeconds: number
  targetSeconds: number
}

export function BrewAnimation({ method, timerSeconds, targetSeconds }: BrewAnimationProps) {
  const fillRatio = Math.min(1, timerSeconds / targetSeconds)
  const isPast = timerSeconds > targetSeconds * 1.1

  const coffeeColor = isPast ? '#7c2d12' : '#6b3a2a'
  const cremaColor = '#d97706'
  const outlineColor = '#1c1917'

  if (method === 'espresso') {
    return <EspressoAnim fillRatio={fillRatio} coffeeColor={coffeeColor} cremaColor={cremaColor} outlineColor={outlineColor} />
  }
  if (method === 'v60') {
    return <V60Anim fillRatio={fillRatio} coffeeColor={coffeeColor} outlineColor={outlineColor} />
  }
  return <AeroPressAnim fillRatio={fillRatio} coffeeColor={coffeeColor} outlineColor={outlineColor} />
}

function EspressoAnim({ fillRatio, coffeeColor, cremaColor, outlineColor }: {
  fillRatio: number; coffeeColor: string; cremaColor: string; outlineColor: string
}) {
  const cupX = 18, cupY = 22, cupW = 54, cupH = 52
  const cupBottom = cupY + cupH
  const fillH = fillRatio * cupH
  const fillY = cupBottom - fillH
  const cremaH = fillRatio > 0.08 ? Math.min(7, fillH * 0.12) : 0

  return (
    <svg viewBox="0 0 90 110" className="w-full h-full" style={{ maxHeight: 180 }}>
      <defs>
        <clipPath id="esp-cup">
          <rect x={cupX} y={cupY} width={cupW} height={cupH} rx="5" />
        </clipPath>
      </defs>
      {/* Coffee fill */}
      {fillH > cremaH && (
        <rect
          x={cupX} y={fillY + cremaH} width={cupW} height={fillH - cremaH}
          fill={coffeeColor} clipPath="url(#esp-cup)"
        />
      )}
      {/* Crema */}
      {cremaH > 0 && (
        <rect
          x={cupX} y={fillY} width={cupW} height={cremaH}
          fill={cremaColor} clipPath="url(#esp-cup)" opacity="0.9"
        />
      )}
      {/* Cup outline */}
      <rect x={cupX} y={cupY} width={cupW} height={cupH} rx="5"
        fill="none" stroke={outlineColor} strokeWidth="2.5" />
      {/* Handle */}
      <path
        d={`M${cupX + cupW} ${cupY + 14} Q${cupX + cupW + 18} ${cupY + 14} ${cupX + cupW + 18} ${cupY + 26} Q${cupX + cupW + 18} ${cupY + 38} ${cupX + cupW} ${cupY + 38}`}
        fill="none" stroke={outlineColor} strokeWidth="2.5" strokeLinecap="round"
      />
      {/* Saucer */}
      <ellipse cx={cupX + cupW / 2} cy={cupBottom + 9} rx="36" ry="5"
        fill="none" stroke={outlineColor} strokeWidth="2" />
    </svg>
  )
}

function V60Anim({ fillRatio, coffeeColor, outlineColor }: {
  fillRatio: number; coffeeColor: string; outlineColor: string
}) {
  // Filter cone — top half
  const tipX = 50, tipY = 62
  const coneTopY = 8, coneHalfW = 36

  // Water in filter drains as fillRatio increases
  const drainRatio = Math.max(0, 1 - fillRatio)
  const waterSurfaceY = coneTopY + (1 - drainRatio) * (tipY - coneTopY)
  const halfWAtSurface = coneHalfW * drainRatio

  // Cup — bottom half
  const cupX = 16, cupY = 72, cupW = 58, cupH = 38
  const cupBottom = cupY + cupH
  const cupFillH = fillRatio * cupH
  const cupFillY = cupBottom - cupFillH

  return (
    <svg viewBox="0 0 100 120" className="w-full h-full" style={{ maxHeight: 200 }}>
      <defs>
        <clipPath id="v60-cone">
          <polygon points={`${tipX - coneHalfW},${coneTopY} ${tipX + coneHalfW},${coneTopY} ${tipX},${tipY}`} />
        </clipPath>
        <clipPath id="v60-cup">
          <rect x={cupX} y={cupY} width={cupW} height={cupH} rx="4" />
        </clipPath>
      </defs>

      {/* Water in filter */}
      {drainRatio > 0.02 && (
        <polygon
          points={`${tipX - halfWAtSurface},${waterSurfaceY} ${tipX + halfWAtSurface},${waterSurfaceY} ${tipX},${tipY}`}
          fill={coffeeColor} clipPath="url(#v60-cone)" opacity="0.85"
        />
      )}
      {/* Filter cone outline */}
      <polygon
        points={`${tipX - coneHalfW},${coneTopY} ${tipX + coneHalfW},${coneTopY} ${tipX},${tipY}`}
        fill="none" stroke={outlineColor} strokeWidth="2.5" strokeLinejoin="round"
      />
      {/* Center rib */}
      <line x1={tipX} y1={coneTopY + 6} x2={tipX} y2={tipY - 4}
        stroke={outlineColor} strokeWidth="1" opacity="0.3" />

      {/* Drip */}
      {fillRatio > 0.05 && fillRatio < 0.95 && (
        <circle cx={tipX} cy={tipY + 5} r="2" fill={coffeeColor} opacity="0.7" />
      )}

      {/* Cup fill */}
      <rect x={cupX} y={cupFillY} width={cupW} height={cupFillH}
        fill={coffeeColor} clipPath="url(#v60-cup)" />
      {/* Cup outline */}
      <rect x={cupX} y={cupY} width={cupW} height={cupH} rx="4"
        fill="none" stroke={outlineColor} strokeWidth="2.5" />
      {/* Cup handle */}
      <path
        d={`M${cupX + cupW} ${cupY + 10} Q${cupX + cupW + 14} ${cupY + 10} ${cupX + cupW + 14} ${cupY + 19} Q${cupX + cupW + 14} ${cupY + 28} ${cupX + cupW} ${cupY + 28}`}
        fill="none" stroke={outlineColor} strokeWidth="2.5" strokeLinecap="round"
      />
    </svg>
  )
}

function AeroPressAnim({ fillRatio, coffeeColor, outlineColor }: {
  fillRatio: number; coffeeColor: string; outlineColor: string
}) {
  // Chamber
  const chamberX = 28, chamberY = 5, chamberW = 44, chamberH = 60
  const chamberBottom = chamberY + chamberH

  // Plunger moves from top to bottom
  const plungerH = 8
  const plungerTravel = chamberH - plungerH
  const plungerY = chamberY + fillRatio * plungerTravel

  // Coffee in chamber (below plunger)
  const coffeeInChamberY = plungerY + plungerH
  const coffeeInChamberH = chamberBottom - coffeeInChamberY

  // Cup below
  const cupX = 18, cupY = 75, cupW = 64, cupH = 36
  const cupBottom = cupY + cupH
  const cupFillH = fillRatio * cupH
  const cupFillY = cupBottom - cupFillH

  return (
    <svg viewBox="0 0 100 120" className="w-full h-full" style={{ maxHeight: 200 }}>
      <defs>
        <clipPath id="ap-chamber">
          <rect x={chamberX} y={chamberY} width={chamberW} height={chamberH} rx="6" />
        </clipPath>
        <clipPath id="ap-cup">
          <rect x={cupX} y={cupY} width={cupW} height={cupH} rx="4" />
        </clipPath>
      </defs>

      {/* Coffee in chamber */}
      {coffeeInChamberH > 0 && (
        <rect
          x={chamberX + 1} y={coffeeInChamberY} width={chamberW - 2} height={coffeeInChamberH}
          fill={coffeeColor} clipPath="url(#ap-chamber)" opacity="0.9"
        />
      )}
      {/* Chamber outline */}
      <rect x={chamberX} y={chamberY} width={chamberW} height={chamberH} rx="6"
        fill="none" stroke={outlineColor} strokeWidth="2.5" />

      {/* Plunger rod */}
      <rect x={47} y={Math.max(0, plungerY - 16)} width={6} height={Math.min(16, plungerY)}
        rx="2" fill={outlineColor} />
      {/* Handle bar */}
      {plungerY > 10 && (
        <rect x={40} y={Math.max(0, plungerY - 18)} width={20} height={4} rx="2" fill={outlineColor} />
      )}
      {/* Plunger disc */}
      <rect x={chamberX + 2} y={plungerY} width={chamberW - 4} height={plungerH} rx="3"
        fill="#44403c" />

      {/* Drip */}
      {fillRatio > 0.05 && fillRatio < 0.95 && (
        <circle cx={50} cy={cupY - 4} r="2" fill={coffeeColor} opacity="0.7" />
      )}

      {/* Cup fill */}
      <rect x={cupX} y={cupFillY} width={cupW} height={cupFillH}
        fill={coffeeColor} clipPath="url(#ap-cup)" />
      {/* Cup outline */}
      <rect x={cupX} y={cupY} width={cupW} height={cupH} rx="4"
        fill="none" stroke={outlineColor} strokeWidth="2.5" />
      {/* Cup handle */}
      <path
        d={`M${cupX + cupW} ${cupY + 8} Q${cupX + cupW + 15} ${cupY + 8} ${cupX + cupW + 15} ${cupY + 18} Q${cupX + cupW + 15} ${cupY + 28} ${cupX + cupW} ${cupY + 28}`}
        fill="none" stroke={outlineColor} strokeWidth="2.5" strokeLinecap="round"
      />
    </svg>
  )
}

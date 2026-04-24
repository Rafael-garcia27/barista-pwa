import type { BrewMethod } from '../types'

const COFFEE  = '#6b3a2a'
const CREMA   = '#d97706'
const GHOST   = '#ead7c5'   // light brown placeholder fill
const WATER   = '#bfdbfe'   // soft blue water
const WATER_G = '#dbeafe'   // ghost blue (empty part of filter/cylinder)
const OUTLINE = '#1c1917'

interface Props { method: BrewMethod; timerSeconds: number; targetSeconds: number }

export function BrewAnimation({ method, timerSeconds, targetSeconds }: Props) {
  const fillRatio = Math.min(1, timerSeconds / targetSeconds)
  if (method === 'espresso') return <EspressoAnim r={fillRatio} />
  if (method === 'v60')      return <V60Anim r={fillRatio} />
  return <AeroPressAnim r={fillRatio} />
}

// ─── ESPRESSO ────────────────────────────────────────────────────────────────
function EspressoAnim({ r }: { r: number }) {
  // Tapered cup: wider at top, narrower at bottom — gives a real cup silhouette
  const cx = 43
  const topY = 22,  topHW = 29   // top rim
  const botY = 80,  botHW = 22   // bottom
  const cupH = botY - topY       // 58

  const cupPath = `M ${cx - topHW},${topY} L ${cx + topHW},${topY} L ${cx + botHW},${botY} L ${cx - botHW},${botY} Z`

  const fillH  = r * cupH
  const fillY  = botY - fillH
  const cremaH = r > 0.08 ? Math.min(6, fillH * 0.1) : 0

  return (
    <svg viewBox="0 0 92 112" className="w-full h-full" style={{ maxHeight: 180 }}>
      <defs>
        <clipPath id="esp-clip">
          <path d={cupPath} />
        </clipPath>
      </defs>

      {/* Ghost fill — full cup interior in light brown */}
      <rect x={cx - topHW} y={topY} width={topHW * 2} height={cupH}
        fill={GHOST} clipPath="url(#esp-clip)" />

      {/* Coffee fill rising from bottom */}
      {fillH > cremaH && (
        <rect x={cx - topHW} y={fillY + cremaH} width={topHW * 2} height={fillH - cremaH}
          fill={COFFEE} clipPath="url(#esp-clip)" />
      )}

      {/* Crema layer on top of coffee */}
      {cremaH > 0 && (
        <rect x={cx - topHW} y={fillY} width={topHW * 2} height={cremaH}
          fill={CREMA} clipPath="url(#esp-clip)" opacity="0.9" />
      )}

      {/* Cup outline */}
      <path d={cupPath} fill="none" stroke={OUTLINE} strokeWidth="2.5" strokeLinejoin="round" />

      {/* Top rim line */}
      <line x1={cx - topHW - 2} y1={topY} x2={cx + topHW + 2} y2={topY}
        stroke={OUTLINE} strokeWidth="3" strokeLinecap="round" />

      {/* Handle */}
      <path
        d={`M ${cx + botHW + 1},${topY + 16} Q ${cx + botHW + 19},${topY + 16} ${cx + botHW + 19},${topY + 28} Q ${cx + botHW + 19},${topY + 40} ${cx + botHW + 1},${topY + 40}`}
        fill="none" stroke={OUTLINE} strokeWidth="2.5" strokeLinecap="round"
      />

      {/* Saucer */}
      <ellipse cx={cx} cy={botY + 9} rx="35" ry="5"
        fill="none" stroke={OUTLINE} strokeWidth="2" />
    </svg>
  )
}

// ─── V60 ─────────────────────────────────────────────────────────────────────
function V60Anim({ r }: { r: number }) {
  const cx = 50

  // Filter cone — centered
  const coneTopY = 6, tipY = 60, coneHW = 37

  // Water in filter drains as r increases (starts full, ends empty)
  const waterSurfaceY  = coneTopY + r * (tipY - coneTopY)
  const waterHW        = coneHW * (1 - r)

  // Cup — centered below cone
  const cupHW = 30, cupY = 72, cupH = 42
  const cupX  = cx - cupHW, cupW = cupHW * 2
  const cupFillH = r * cupH
  const cupFillY = cupY + cupH - cupFillH

  return (
    <svg viewBox="0 0 100 124" className="w-full h-full" style={{ maxHeight: 200 }}>
      <defs>
        <clipPath id="v60-cone-clip">
          <polygon points={`${cx - coneHW},${coneTopY} ${cx + coneHW},${coneTopY} ${cx},${tipY}`} />
        </clipPath>
        <clipPath id="v60-cup-clip">
          <rect x={cupX} y={cupY} width={cupW} height={cupH} rx="4" />
        </clipPath>
      </defs>

      {/* Ghost water in filter — full cone, very pale blue */}
      <polygon
        points={`${cx - coneHW},${coneTopY} ${cx + coneHW},${coneTopY} ${cx},${tipY}`}
        fill={WATER_G} clipPath="url(#v60-cone-clip)"
      />

      {/* Actual water — stronger blue, shrinks from the top as it drains */}
      {waterHW > 0.5 && (
        <polygon
          points={`${cx - waterHW},${waterSurfaceY} ${cx + waterHW},${waterSurfaceY} ${cx},${tipY}`}
          fill={WATER} clipPath="url(#v60-cone-clip)"
        />
      )}

      {/* Filter cone outline */}
      <polygon
        points={`${cx - coneHW},${coneTopY} ${cx + coneHW},${coneTopY} ${cx},${tipY}`}
        fill="none" stroke={OUTLINE} strokeWidth="2.5" strokeLinejoin="round"
      />
      {/* Center rib */}
      <line x1={cx} y1={coneTopY + 8} x2={cx} y2={tipY - 5}
        stroke={OUTLINE} strokeWidth="1" opacity="0.25" />

      {/* Drip line between filter and cup */}
      {r > 0.04 && r < 0.97 && (
        <line x1={cx} y1={tipY + 2} x2={cx} y2={cupY - 2}
          stroke={COFFEE} strokeWidth="1.5" strokeDasharray="2 3" opacity="0.5" />
      )}

      {/* Ghost fill in cup — light brown */}
      <rect x={cupX} y={cupY} width={cupW} height={cupH}
        fill={GHOST} clipPath="url(#v60-cup-clip)" />

      {/* Coffee rising in cup */}
      {cupFillH > 0 && (
        <rect x={cupX} y={cupFillY} width={cupW} height={cupFillH}
          fill={COFFEE} clipPath="url(#v60-cup-clip)" />
      )}

      {/* Cup outline */}
      <rect x={cupX} y={cupY} width={cupW} height={cupH} rx="4"
        fill="none" stroke={OUTLINE} strokeWidth="2.5" />

      {/* Cup handle */}
      <path
        d={`M ${cupX + cupW} ${cupY + 10} Q ${cupX + cupW + 14} ${cupY + 10} ${cupX + cupW + 14} ${cupY + 21} Q ${cupX + cupW + 14} ${cupY + 31} ${cupX + cupW} ${cupY + 31}`}
        fill="none" stroke={OUTLINE} strokeWidth="2.5" strokeLinecap="round"
      />
    </svg>
  )
}

// ─── AEROPRESS ───────────────────────────────────────────────────────────────
function AeroPressAnim({ r }: { r: number }) {
  const cx = 50

  // Cylinder — centered
  const cylHW = 22, cylY = 6, cylH = 54
  const cylX  = cx - cylHW, cylW = cylHW * 2

  // Water level in cylinder drops as r increases (starts full at top, drains to bottom)
  const waterH        = (1 - r) * cylH
  const waterY        = cylY + cylH - waterH   // bottom-anchored, surface drops

  // Cup — centered below cylinder, slightly wider
  const cupHW = 28, cupY = 72, cupH = 42
  const cupX  = cx - cupHW, cupW = cupHW * 2
  const cupFillH = r * cupH
  const cupFillY = cupY + cupH - cupFillH

  return (
    <svg viewBox="0 0 100 124" className="w-full h-full" style={{ maxHeight: 200 }}>
      <defs>
        <clipPath id="ap-cyl-clip">
          <rect x={cylX} y={cylY} width={cylW} height={cylH} rx="5" />
        </clipPath>
        <clipPath id="ap-cup-clip">
          <rect x={cupX} y={cupY} width={cupW} height={cupH} rx="4" />
        </clipPath>
      </defs>

      {/* Ghost water — full cylinder in pale blue */}
      <rect x={cylX} y={cylY} width={cylW} height={cylH}
        fill={WATER_G} clipPath="url(#ap-cyl-clip)" />

      {/* Actual water — stronger blue, level drops from bottom anchor */}
      {waterH > 0.5 && (
        <rect x={cylX} y={waterY} width={cylW} height={waterH}
          fill={WATER} clipPath="url(#ap-cyl-clip)" />
      )}

      {/* Cylinder outline */}
      <rect x={cylX} y={cylY} width={cylW} height={cylH} rx="5"
        fill="none" stroke={OUTLINE} strokeWidth="2.5" />

      {/* Cap / filter plate at cylinder bottom */}
      <rect x={cylX - 3} y={cylY + cylH - 5} width={cylW + 6} height={7} rx="3"
        fill={OUTLINE} />

      {/* Drip from cylinder to cup */}
      {r > 0.04 && r < 0.97 && (
        <line x1={cx} y1={cylY + cylH + 2} x2={cx} y2={cupY - 2}
          stroke={COFFEE} strokeWidth="1.5" strokeDasharray="2 3" opacity="0.5" />
      )}

      {/* Ghost fill in cup — light brown */}
      <rect x={cupX} y={cupY} width={cupW} height={cupH}
        fill={GHOST} clipPath="url(#ap-cup-clip)" />

      {/* Coffee rising in cup */}
      {cupFillH > 0 && (
        <rect x={cupX} y={cupFillY} width={cupW} height={cupFillH}
          fill={COFFEE} clipPath="url(#ap-cup-clip)" />
      )}

      {/* Cup outline */}
      <rect x={cupX} y={cupY} width={cupW} height={cupH} rx="4"
        fill="none" stroke={OUTLINE} strokeWidth="2.5" />

      {/* Cup handle */}
      <path
        d={`M ${cupX + cupW} ${cupY + 10} Q ${cupX + cupW + 15} ${cupY + 10} ${cupX + cupW + 15} ${cupY + 21} Q ${cupX + cupW + 15} ${cupY + 31} ${cupX + cupW} ${cupY + 31}`}
        fill="none" stroke={OUTLINE} strokeWidth="2.5" strokeLinecap="round"
      />
    </svg>
  )
}

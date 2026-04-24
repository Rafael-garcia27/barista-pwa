import type { BrewMethod } from '../types'

const COFFEE  = '#6b3a2a'
const CREMA   = '#d97706'
const GHOST   = '#ead7c5'   // light brown — placeholder fill for cup
const WATER   = '#3b82f6'   // blue-500 — actual water (strong)
const WATER_G = '#eff6ff'   // blue-50  — ghost water (very pale)
const OUTLINE = '#1c1917'
const METAL   = '#57534e'   // stone-600 — portafilter / plunger metal

interface Props { method: BrewMethod; timerSeconds: number; targetSeconds: number }

export function BrewAnimation({ method, timerSeconds, targetSeconds }: Props) {
  const fillRatio = Math.min(1, timerSeconds / targetSeconds)
  if (method === 'espresso') return <EspressoAnim r={fillRatio} />
  if (method === 'v60')      return <V60Anim r={fillRatio} />
  return <AeroPressAnim r={fillRatio} />
}

// ─── ESPRESSO ────────────────────────────────────────────────────────────────
function EspressoAnim({ r }: { r: number }) {
  const cx = 43

  // Cup — shifted down to make room for portafilter above
  const topY = 46, topHW = 28
  const botY = 100, botHW = 21
  const cupH = botY - topY  // 54

  const cupPath = `M ${cx - topHW},${topY} L ${cx + topHW},${topY} L ${cx + botHW},${botY} L ${cx - botHW},${botY} Z`

  const fillH  = r * cupH
  const fillY  = botY - fillH
  const cremaH = r > 0.08 ? Math.min(6, fillH * 0.1) : 0

  // Portafilter geometry
  const pfY = 8, pfH = 13, pfHW = 24, pfX = cx - pfHW
  // Spout tips
  const spoutLX = cx - 9, spoutRX = cx + 9, spoutY = pfY + pfH + 8
  // Stream target (just inside cup top rim)
  const streamLX = cx - 7, streamRX = cx + 7

  return (
    <svg viewBox="0 0 92 122" className="w-full h-full" style={{ maxHeight: 200 }}>
      <defs>
        <clipPath id="esp-clip">
          <path d={cupPath} />
        </clipPath>
      </defs>

      {/* ── Portafilter ── */}
      {/* Handle (left side) */}
      <rect x={pfX - 18} y={pfY + 3} width={20} height={7} rx="3.5" fill={METAL} />
      {/* Body */}
      <rect x={pfX} y={pfY} width={pfHW * 2} height={pfH} rx="5"
        fill={METAL} stroke={OUTLINE} strokeWidth="1.5" />
      {/* Rim detail */}
      <rect x={pfX + 3} y={pfY + pfH - 4} width={(pfHW * 2) - 6} height={4} rx="2"
        fill="#44403c" />
      {/* Left spout */}
      <line x1={cx - 5} y1={pfY + pfH} x2={spoutLX} y2={spoutY}
        stroke={METAL} strokeWidth="4" strokeLinecap="round" />
      {/* Right spout */}
      <line x1={cx + 5} y1={pfY + pfH} x2={spoutRX} y2={spoutY}
        stroke={METAL} strokeWidth="4" strokeLinecap="round" />

      {/* ── Coffee streams (only while brewing) ── */}
      {r > 0 && r < 1 && (
        <>
          <line x1={spoutLX} y1={spoutY} x2={streamLX} y2={topY + 2}
            stroke={COFFEE} strokeWidth="2" strokeLinecap="round" opacity="0.85" />
          <line x1={spoutRX} y1={spoutY} x2={streamRX} y2={topY + 2}
            stroke={COFFEE} strokeWidth="2" strokeLinecap="round" opacity="0.85" />
        </>
      )}
      {/* Drops at spout tips when done */}
      {r >= 1 && (
        <>
          <circle cx={spoutLX} cy={spoutY + 3} r="2" fill={COFFEE} opacity="0.5" />
          <circle cx={spoutRX} cy={spoutY + 3} r="2" fill={COFFEE} opacity="0.5" />
        </>
      )}

      {/* ── Cup ── */}
      {/* Ghost fill */}
      <rect x={cx - topHW} y={topY} width={topHW * 2} height={cupH}
        fill={GHOST} clipPath="url(#esp-clip)" />
      {/* Coffee fill */}
      {fillH > cremaH && (
        <rect x={cx - topHW} y={fillY + cremaH} width={topHW * 2} height={fillH - cremaH}
          fill={COFFEE} clipPath="url(#esp-clip)" />
      )}
      {/* Crema */}
      {cremaH > 0 && (
        <rect x={cx - topHW} y={fillY} width={topHW * 2} height={cremaH}
          fill={CREMA} clipPath="url(#esp-clip)" opacity="0.9" />
      )}
      {/* Cup outline */}
      <path d={cupPath} fill="none" stroke={OUTLINE} strokeWidth="2.5" strokeLinejoin="round" />
      {/* Top rim */}
      <line x1={cx - topHW - 2} y1={topY} x2={cx + topHW + 2} y2={topY}
        stroke={OUTLINE} strokeWidth="3" strokeLinecap="round" />
      {/* Handle */}
      <path
        d={`M ${cx + botHW + 1},${topY + 16} Q ${cx + botHW + 18},${topY + 16} ${cx + botHW + 18},${topY + 27} Q ${cx + botHW + 18},${topY + 38} ${cx + botHW + 1},${topY + 38}`}
        fill="none" stroke={OUTLINE} strokeWidth="2.5" strokeLinecap="round"
      />
      {/* Saucer */}
      <ellipse cx={cx} cy={botY + 9} rx="34" ry="5"
        fill="none" stroke={OUTLINE} strokeWidth="2" />
    </svg>
  )
}

// ─── V60 ─────────────────────────────────────────────────────────────────────
function V60Anim({ r }: { r: number }) {
  const cx = 50

  const coneTopY = 6, tipY = 60, coneHW = 37
  const waterSurfaceY = coneTopY + r * (tipY - coneTopY)
  const waterHW       = coneHW * (1 - r)

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

      {/* Ghost water — full cone, very pale blue */}
      <polygon points={`${cx - coneHW},${coneTopY} ${cx + coneHW},${coneTopY} ${cx},${tipY}`}
        fill={WATER_G} clipPath="url(#v60-cone-clip)" />
      {/* Actual water — strong blue, shrinks upward */}
      {waterHW > 0.5 && (
        <polygon
          points={`${cx - waterHW},${waterSurfaceY} ${cx + waterHW},${waterSurfaceY} ${cx},${tipY}`}
          fill={WATER} clipPath="url(#v60-cone-clip)"
        />
      )}
      {/* Filter cone outline */}
      <polygon points={`${cx - coneHW},${coneTopY} ${cx + coneHW},${coneTopY} ${cx},${tipY}`}
        fill="none" stroke={OUTLINE} strokeWidth="2.5" strokeLinejoin="round" />
      <line x1={cx} y1={coneTopY + 8} x2={cx} y2={tipY - 5}
        stroke={OUTLINE} strokeWidth="1" opacity="0.2" />

      {/* Drip line */}
      {r > 0.04 && r < 0.97 && (
        <line x1={cx} y1={tipY + 2} x2={cx} y2={cupY - 2}
          stroke={COFFEE} strokeWidth="1.5" strokeDasharray="2 3" opacity="0.6" />
      )}

      {/* Ghost cup fill */}
      <rect x={cupX} y={cupY} width={cupW} height={cupH}
        fill={GHOST} clipPath="url(#v60-cup-clip)" />
      {/* Coffee fill rising */}
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

  // Cup — positioned first so we can sit the cylinder on top
  const cupHW = 28, cupH = 40
  const cupX  = cx - cupHW, cupW = cupHW * 2
  const cupY  = 80  // cup top

  // Cylinder sits just above the cup (4px gap for drip visibility)
  const cylHW  = 20, cylH = 50
  const cylX   = cx - cylHW, cylW = cylHW * 2
  const cylY   = cupY - cylH - 5   // = 25
  const cylBot = cylY + cylH        // = 75

  // Plunger moves from top of cylinder to bottom
  const plungerH = 6
  const plungerY = cylY + r * (cylH - plungerH)  // 25 → 69

  // Water: fills space BELOW plunger down to cylinder bottom
  const waterTop = plungerY + plungerH
  const waterH   = Math.max(0, cylBot - waterTop)

  // T-bar + rod (move with plunger)
  const rodH   = 18
  const tBarY  = plungerY - rodH
  const tBarX  = cx - 13, tBarW = 26

  const cupFillH = r * cupH
  const cupFillY = cupY + cupH - cupFillH

  return (
    <svg viewBox="0 0 100 132" className="w-full h-full" style={{ maxHeight: 200 }}>
      <defs>
        <clipPath id="ap-cyl-clip">
          <rect x={cylX} y={cylY} width={cylW} height={cylH} rx="5" />
        </clipPath>
        <clipPath id="ap-cup-clip">
          <rect x={cupX} y={cupY} width={cupW} height={cupH} rx="4" />
        </clipPath>
      </defs>

      {/* ── Cylinder interior ── */}
      {/* Ghost water (full cylinder pale blue) */}
      <rect x={cylX} y={cylY} width={cylW} height={cylH}
        fill={WATER_G} clipPath="url(#ap-cyl-clip)" />
      {/* Actual water below plunger (strong blue, shrinks) */}
      {waterH > 0.5 && (
        <rect x={cylX} y={waterTop} width={cylW} height={waterH}
          fill={WATER} clipPath="url(#ap-cyl-clip)" />
      )}

      {/* ── Plunger disc (drawn inside before outline) ── */}
      <rect x={cylX + 2} y={plungerY} width={cylW - 4} height={plungerH} rx="3"
        fill={METAL} />

      {/* ── Cylinder outline (on top of fills) ── */}
      <rect x={cylX} y={cylY} width={cylW} height={cylH} rx="5"
        fill="none" stroke={OUTLINE} strokeWidth="2.5" />

      {/* ── T-bar + rod (drawn after outline so they overlay correctly) ── */}
      {/* Rod */}
      <rect x={cx - 3} y={Math.max(0, tBarY + 5)} width={6}
        height={Math.max(0, plungerY - Math.max(0, tBarY + 5))}
        rx="2" fill={METAL} />
      {/* T-bar handle (only show when above or near cylinder top) */}
      {tBarY < cylY + 8 && (
        <rect x={tBarX} y={Math.max(0, tBarY)} width={tBarW} height={5} rx="2.5"
          fill={METAL} />
      )}

      {/* ── Filter cap at cylinder bottom ── */}
      <rect x={cylX - 2} y={cylBot - 4} width={cylW + 4} height={6} rx="3"
        fill={METAL} />

      {/* ── Coffee drip into cup ── */}
      {r > 0.03 && r < 0.98 && (
        <line x1={cx} y1={cylBot + 2} x2={cx} y2={cupY - 1}
          stroke={COFFEE} strokeWidth="2" strokeLinecap="round" opacity="0.8" />
      )}
      {/* Drop at junction when done */}
      {r >= 0.98 && (
        <circle cx={cx} cy={cupY - 2} r="2.5" fill={COFFEE} opacity="0.5" />
      )}

      {/* ── Cup ── */}
      {/* Ghost fill */}
      <rect x={cupX} y={cupY} width={cupW} height={cupH}
        fill={GHOST} clipPath="url(#ap-cup-clip)" />
      {/* Coffee fill rising */}
      {cupFillH > 0 && (
        <rect x={cupX} y={cupFillY} width={cupW} height={cupFillH}
          fill={COFFEE} clipPath="url(#ap-cup-clip)" />
      )}
      {/* Cup outline */}
      <rect x={cupX} y={cupY} width={cupW} height={cupH} rx="4"
        fill="none" stroke={OUTLINE} strokeWidth="2.5" />
      {/* Cup handle */}
      <path
        d={`M ${cupX + cupW} ${cupY + 9} Q ${cupX + cupW + 15} ${cupY + 9} ${cupX + cupW + 15} ${cupY + 20} Q ${cupX + cupW + 15} ${cupY + 30} ${cupX + cupW} ${cupY + 30}`}
        fill="none" stroke={OUTLINE} strokeWidth="2.5" strokeLinecap="round"
      />
    </svg>
  )
}

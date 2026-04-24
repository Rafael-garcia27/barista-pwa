import { useEffect, useRef, useState } from 'react'
import { ArrowUp, ArrowDown, ArrowLeftRight, Star } from 'lucide-react'
import { EspressoIcon, V60Icon, AeroPressIcon } from '../components/MethodIcon'
import { BrewAnimation } from '../components/BrewAnimation'
import type { Bag, Bean, BrewLog, BrewMethod, BrewParams, Diagnosis, PuckState, FlowState, TasteTag, StartingPoint } from '../types'
import { listBeans, listBags, addBrew, upsertBag, getBrewsByBagId } from '../db'
import { computeRemainingGrams, isEffectivelyEmpty } from '../engine/stock'
import { getStartingPoint } from '../engine/recommendation'
import { diagnose } from '../engine/diagnosis'
import { getFreshness, FRESHNESS_BADGE_CLASS } from '../engine/freshness'
import { getBeanSuitability, sortBeansByMethod } from '../engine/suitability'
import { BREW_METHODS, ROAST_LEVELS, PROCESSES, TASTE_TAGS, PUCK_STATES, FLOW_STATES } from '../constants'
import { clicksToScale } from '../engine/grinder'
import { Card } from '../components/Card'
import { Dial } from '../components/Dial'
import type { TabId } from '../components/TabBar'

type BrewStep = 'setup' | 'params' | 'brew' | 'evaluate' | 'result'

interface BrewScreenProps {
  onNavigateToTab: (tab: TabId) => void
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// Pick the best active bag for a bean: oldest roastDate first (use before stale)
function pickBestBag(bags: Bag[], beanId: string): Bag | null {
  const active = bags.filter(b => b.beanId === beanId && !b.depleted)
  if (active.length === 0) return null
  return active.sort((a, b) => {
    const da = a.roastDate ?? a.createdAt
    const db = b.roastDate ?? b.createdAt
    return da.localeCompare(db)
  })[0]
}

export function BrewScreen({ onNavigateToTab }: BrewScreenProps) {
  const [step, setStep] = useState<BrewStep>('setup')
  const [beans, setBeans] = useState<Bean[]>([])
  const [bags, setBags] = useState<Bag[]>([])
  const [selectedBean, setSelectedBean] = useState<Bean | null>(null)
  const [selectedBag, setSelectedBag] = useState<Bag | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<BrewMethod | null>(null)
  const [params, setParams] = useState<BrewParams | null>(null)
  const [startingPoint, setStartingPoint] = useState<StartingPoint | null>(null)
  const [grinderClicks, setGrinderClicks] = useState<number | null>(null)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(3)
  const [tasteTags, setTasteTags] = useState<TasteTag[]>([])
  const [notes, setNotes] = useState('')
  const [puckState, setPuckState] = useState<PuckState | null>(null)
  const [flowState, setFlowState] = useState<FlowState | null>(null)
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null)
  const [savedBrew, setSavedBrew] = useState<BrewLog | null>(null)
  const [stockPrompt, setStockPrompt] = useState(false)

  const isRunningRef = useRef(isRunning)
  isRunningRef.current = isRunning

  useEffect(() => {
    Promise.all([listBeans(), listBags()]).then(([b, bags]) => {
      setBeans(b)
      setBags(bags)
    })
  }, [])

  useEffect(() => {
    if (!isRunning) return
    const interval = setInterval(() => setTimerSeconds(s => s + 1), 1000)
    return () => clearInterval(interval)
  }, [isRunning])

  function resetAll() {
    setStep('setup')
    setSelectedBean(null)
    setSelectedBag(null)
    setSelectedMethod(null)
    setParams(null)
    setStartingPoint(null)
    setGrinderClicks(null)
    setIsLoadingHistory(false)
    setTimerSeconds(0)
    setIsRunning(false)
    setRating(3)
    setTasteTags([])
    setNotes('')
    setPuckState(null)
    setFlowState(null)
    setDiagnosis(null)
    setSavedBrew(null)
    setStockPrompt(false)
    Promise.all([listBeans(), listBags()]).then(([b, bags]) => {
      setBeans(b)
      setBags(bags)
    })
  }

  function handleBeanSelect(bean: Bean) {
    setSelectedBean(bean)
    setSelectedBag(selectedMethod ? pickBestBag(bags, bean.id) : null)
  }

  function handleMethodSelect(method: BrewMethod) {
    setSelectedMethod(method)
    if (selectedBean) setSelectedBag(pickBestBag(bags, selectedBean.id))
  }

  async function handleSetupConfirm() {
    if (!selectedBean || !selectedMethod || isLoadingHistory) return
    setIsLoadingHistory(true)
    const bag = selectedBag ?? pickBestBag(bags, selectedBean.id)
    setSelectedBag(bag)

    // Fetch all brews for this bean's bags to build a personalized recommendation
    const beanBagIds = bags.filter(b => b.beanId === selectedBean.id).map(b => b.id)
    const brewArrays = await Promise.all(beanBagIds.map(id => getBrewsByBagId(id)))
    const previousBrews = brewArrays.flat()

    const sp = getStartingPoint(selectedBean, selectedMethod, bag?.roastDate, previousBrews)
    setParams(sp.params)
    setStartingPoint(sp)
    // Prefer the personal brew's actual grinder setting; fall back to freshness-adjusted rec center
    setGrinderClicks(sp.params.grinderClicks ?? sp.grinderRec?.clicksCenter ?? null)
    setIsLoadingHistory(false)
    setStep('params')
  }

  function handleStartBrew() {
    setTimerSeconds(0)
    setIsRunning(true)
    setStep('brew')
  }

  function handleDone() {
    setIsRunning(false)
    setParams(prev => {
      if (!prev) return prev
      return { ...prev, timeSeconds: timerSeconds }
    })
    setStep('evaluate')
  }

  async function handleSaveAndAnalyze() {
    if (!selectedBean || !params || !selectedBag) return

    const gc = grinderClicks ?? undefined
    let finalParams: BrewParams
    if (params.method === 'espresso') {
      finalParams = { ...params, puckState, flowState, grinderClicks: gc }
    } else {
      finalParams = { ...params, grinderClicks: gc }
    }

    const brew: BrewLog = {
      id: crypto.randomUUID(),
      bagId: selectedBag.id,
      params: finalParams,
      rating,
      tasteTags,
      notes: notes.trim() || undefined,
      isBest: rating >= 4,
      createdAt: new Date().toISOString(),
    }

    await addBrew(brew)

    // If remaining was manually set, decrement it so future reads stay accurate
    let updatedBag = selectedBag
    if (selectedBag.remainingGrams !== undefined) {
      const newRemaining = Math.max(0, selectedBag.remainingGrams - finalParams.doseIn * 1.12)
      updatedBag = { ...selectedBag, remainingGrams: newRemaining }
      await upsertBag(updatedBag)
      setSelectedBag(updatedBag)
    }

    const result = diagnose(brew, selectedBean, selectedBag.roastDate)
    setSavedBrew(brew)
    setDiagnosis(result)

    if ((updatedBag.purchasedGrams || updatedBag.remainingGrams !== undefined) && !updatedBag.depleted) {
      const bagBrews = await getBrewsByBagId(updatedBag.id)
      const remaining = computeRemainingGrams(updatedBag, bagBrews)
      if (isEffectivelyEmpty(remaining)) setStockPrompt(true)
    }

    setStep('result')
  }

  function toggleTag(tag: TasteTag) {
    setTasteTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  // ─── STEP: SETUP ───────────────────────────────────────────────────────────
  if (step === 'setup') {
    // Active beans = have at least one non-depleted bag
    const activeBeans = beans.filter(bean => bags.some(b => b.beanId === bean.id && !b.depleted))
    const sortedBeans = selectedMethod ? sortBeansByMethod(activeBeans, selectedMethod) : activeBeans
    const topScore = selectedMethod && sortedBeans.length > 0
      ? getBeanSuitability(sortedBeans[0], selectedMethod)
      : null

    const methodIconMap = {
      espresso: <EspressoIcon size={22} />,
      v60: <V60Icon size={22} />,
      aeropress: <AeroPressIcon size={22} />,
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center h-10">
          <h1 className="text-xl font-bold text-gray-900">Brew</h1>
        </div>

        <Card>
          <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Method</div>
          <div className="flex gap-2">
            {BREW_METHODS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => handleMethodSelect(id)}
                className={`flex-1 flex flex-col items-center gap-1.5 rounded-xl border py-3 text-xs font-medium transition-colors ${
                  selectedMethod === id
                    ? 'border-amber-400 bg-amber-50 text-amber-700'
                    : 'border-gray-200 bg-white text-gray-500'
                }`}
              >
                {methodIconMap[id]}
                {label}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <div className="text-sm font-semibold mb-3">Select Bean</div>
          {activeBeans.length === 0 ? (
            <div className="text-sm text-gray-500">
              No active beans.{' '}
              <button type="button" onClick={() => onNavigateToTab('beans')} className="text-amber-600 underline">
                Add beans to the shelf
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedBeans.map((bean, index) => {
                const score = selectedMethod ? getBeanSuitability(bean, selectedMethod) : null
                const isBestMatch = index === 0 && topScore !== null && topScore >= 70
                const bestBag = pickBestBag(bags, bean.id)
                const freshness = bestBag?.roastDate
                  ? getFreshness(bestBag.roastDate, selectedMethod ?? bean.preferredMethod, bean.roastLevel, bean.process)
                  : null

                return (
                  <button
                    key={bean.id}
                    type="button"
                    onClick={() => handleBeanSelect(bean)}
                    className={`w-full text-left rounded-xl border px-3 py-2.5 transition-colors ${
                      selectedBean?.id === bean.id
                        ? 'border-amber-500 bg-amber-100'
                        : isBestMatch
                          ? 'border-amber-300 bg-amber-50'
                          : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium truncate">{bean.name}</div>
                          {!isBestMatch && score !== null && score < 50 && (
                            <span className="rounded-full bg-red-50 text-red-700 px-2 py-0.5 text-xs font-medium flex-shrink-0">
                              Not ideal
                            </span>
                          )}
                        </div>
                        {bean.roaster && (
                          <div className="text-xs text-gray-500 mt-0.5">{bean.roaster}</div>
                        )}
                        <div className="flex gap-1.5 flex-wrap mt-2">
                          <span className="rounded-full bg-amber-100 text-amber-900 px-2 py-0.5 text-xs font-medium">
                            {ROAST_LEVELS.find(r => r.id === bean.roastLevel)?.label ?? bean.roastLevel}
                          </span>
                          <span className="rounded-full bg-stone-100 text-stone-600 px-2 py-0.5 text-xs font-medium">
                            {PROCESSES.find(p => p.id === bean.process)?.label ?? bean.process}
                          </span>
                          <span className="rounded-full bg-orange-100 text-orange-800 px-2 py-0.5 text-xs font-medium">
                            {BREW_METHODS.find(m => m.id === bean.preferredMethod)?.label ?? bean.preferredMethod}
                          </span>
                        </div>
                      </div>
                      {freshness && (
                        <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${FRESHNESS_BADGE_CLASS[freshness.stage]}`}>
                          {freshness.label}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </Card>

        <button
          type="button"
          onClick={handleSetupConfirm}
          disabled={!selectedBean || !selectedMethod || isLoadingHistory}
          className="w-full rounded-xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-40"
        >
          {isLoadingHistory ? 'Loading…' : 'Start →'}
        </button>
      </div>
    )
  }

  // ─── STEP: PARAMS ──────────────────────────────────────────────────────────
  if (step === 'params' && params) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => setStep('setup')} className="text-gray-400 text-sm">← Back</button>
          {selectedMethod && (
            <div className="flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700">
              {selectedMethod === 'espresso' && <EspressoIcon size={14} />}
              {selectedMethod === 'v60' && <V60Icon size={14} />}
              {selectedMethod === 'aeropress' && <AeroPressIcon size={14} />}
              {BREW_METHODS.find(m => m.id === selectedMethod)?.label}
            </div>
          )}
        </div>

        {/* Barista Tip card */}
        <div className="rounded-2xl bg-stone-900 px-5 py-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              {startingPoint?.source === 'personal'
                ? <Star size={15} className="fill-amber-400 text-amber-400 flex-shrink-0" />
                : <span className="text-lg leading-none">☕</span>
              }
              <span className="text-[10px] font-bold tracking-widest text-amber-400 uppercase">
                {startingPoint?.source === 'personal' ? 'Your Best Brew' : 'Pro Tip from the Barista'}
              </span>
            </div>
            {startingPoint?.source === 'personal' && (
              <span className="flex-shrink-0 rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                Personalized
              </span>
            )}
          </div>
          <p className="text-sm text-stone-200 leading-relaxed">{startingPoint?.rationale}</p>
          {startingPoint?.warning && (
            <div className="rounded-xl bg-amber-500/15 border border-amber-500/25 px-3 py-2.5 text-sm text-amber-300 leading-relaxed">
              {startingPoint.warning}
            </div>
          )}
          {startingPoint?.source === 'default' && (startingPoint.brewCountForMethod ?? 0) > 0 && (
            <p className="text-[11px] text-stone-500 leading-snug">
              {startingPoint.brewCountForMethod} brew{startingPoint.brewCountForMethod === 1 ? '' : 's'} logged with this method — rate ≥4★ to personalize next time.
            </p>
          )}
        </div>

        {/* Parameter dials */}
        <Card>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 text-center mb-3">
            Swipe up / down to adjust
          </div>
          {params.method === 'espresso' && (
            <div className="grid grid-cols-3 divide-x divide-gray-100">
              <Dial value={params.doseIn} min={12} max={25} step={0.5} label="Dose In (g)"
                onChange={v => setParams(prev => prev?.method === 'espresso' ? { ...prev, doseIn: v } : prev)} />
              <Dial value={params.doseOut} min={10} max={60} step={0.5} label="Dose Out (g)"
                onChange={v => setParams(prev => prev?.method === 'espresso' ? { ...prev, doseOut: v } : prev)} />
              <Dial value={params.timeSeconds} min={10} max={60} step={1} label="Time (s)"
                onChange={v => setParams(prev => prev?.method === 'espresso' ? { ...prev, timeSeconds: v } : prev)} />
            </div>
          )}
          {(params.method === 'v60' || params.method === 'aeropress') && (
            <div className="grid grid-cols-3 divide-x divide-gray-100">
              <Dial value={params.doseIn} min={10} max={25} step={0.5} label="Coffee (g)"
                onChange={v => setParams(prev => (prev?.method === 'v60' || prev?.method === 'aeropress') ? { ...prev, doseIn: v } : prev)} />
              <Dial value={params.waterGrams} min={100} max={400} step={5} label="Water (g)"
                onChange={v => setParams(prev => (prev?.method === 'v60' || prev?.method === 'aeropress') ? { ...prev, waterGrams: v } : prev)} />
              <Dial value={params.timeSeconds} min={30} max={300} step={5} label="Time (s)"
                onChange={v => setParams(prev => (prev?.method === 'v60' || prev?.method === 'aeropress') ? { ...prev, timeSeconds: v } : prev)} />
            </div>
          )}
        </Card>

        {/* Grinder setting */}
        <Card>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Grinder</div>
            {startingPoint?.grinderRec && (
              <div className="text-[10px] text-gray-400">
                Rec: <span className="text-amber-600 font-semibold">{startingPoint.grinderRec.scaleRange}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="w-28 flex-shrink-0">
              <Dial
                value={grinderClicks ?? (startingPoint?.grinderRec?.clicksCenter ?? 25)}
                min={0}
                max={100}
                step={1}
                label="Scale (0–9)"
                format={v => (v / 10).toFixed(1)}
                onChange={setGrinderClicks}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xl font-bold text-gray-800 tabular-nums">
                {grinderClicks ?? (startingPoint?.grinderRec?.clicksCenter ?? 25)}
                <span className="text-sm font-normal text-gray-400 ml-1">clicks</span>
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                Scale {clicksToScale(grinderClicks ?? (startingPoint?.grinderRec?.clicksCenter ?? 25))}
              </div>
              {startingPoint?.grinderRec?.note && (
                <div className="text-xs text-amber-700 leading-snug mt-1.5">
                  {startingPoint.grinderRec.note}
                </div>
              )}
            </div>
          </div>
        </Card>

        <button type="button" onClick={handleStartBrew}
          className="w-full rounded-xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white">
          Start Brew →
        </button>
      </div>
    )
  }

  // ─── STEP: BREW ────────────────────────────────────────────────────────────
  if (step === 'brew' && params) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold text-gray-900">Brewing…</h1>

        {/* Timer + animation — dark warm card */}
        <div className="rounded-2xl bg-stone-900 pt-5 pb-6 flex flex-col items-center gap-4">
          <div className="w-40 h-40">
            <BrewAnimation method={params.method} timerSeconds={timerSeconds} targetSeconds={params.timeSeconds} />
          </div>
          <div className="text-5xl font-mono font-bold text-amber-400 tabular-nums tracking-tight leading-none">
            {formatTimer(timerSeconds)}
          </div>
          <button
            type="button"
            onClick={() => setIsRunning(prev => !prev)}
            className={`rounded-2xl px-8 py-2.5 text-sm font-semibold transition-colors ${
              isRunning ? 'bg-stone-700 text-stone-300' : 'bg-amber-500 text-white'
            }`}
          >
            {isRunning ? 'Pause' : 'Resume'}
          </button>
        </div>

        {/* Live adjust */}
        <Card>
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 text-center mb-2">
            Adjust live
          </div>
          {params.method === 'espresso' && (
            <div className="grid grid-cols-2 divide-x divide-gray-100">
              <Dial value={params.doseIn} min={12} max={25} step={0.5} label="Dose In (g)"
                onChange={v => setParams(prev => prev?.method === 'espresso' ? { ...prev, doseIn: v } : prev)} />
              <Dial value={params.doseOut} min={10} max={60} step={0.5} label="Dose Out (g)"
                onChange={v => setParams(prev => prev?.method === 'espresso' ? { ...prev, doseOut: v } : prev)} />
            </div>
          )}
          {(params.method === 'v60' || params.method === 'aeropress') && (
            <div className="grid grid-cols-2 divide-x divide-gray-100">
              <Dial value={params.doseIn} min={10} max={25} step={0.5} label="Coffee (g)"
                onChange={v => setParams(prev => (prev?.method === 'v60' || prev?.method === 'aeropress') ? { ...prev, doseIn: v } : prev)} />
              <Dial value={params.waterGrams} min={100} max={400} step={5} label="Water (g)"
                onChange={v => setParams(prev => (prev?.method === 'v60' || prev?.method === 'aeropress') ? { ...prev, waterGrams: v } : prev)} />
            </div>
          )}
        </Card>

        <button type="button" onClick={handleDone}
          className="w-full rounded-xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white">
          Done
        </button>
      </div>
    )
  }

  // ─── STEP: EVALUATE ────────────────────────────────────────────────────────
  if (step === 'evaluate' && params) {
    type FeedbackSeverity = 'good' | 'warn' | 'bad'
    const brewFeedback: Array<{ label: string; severity: FeedbackSeverity }> = []

    if (params.method === 'espresso') {
      const ratio = params.doseOut / params.doseIn
      if (ratio < 1.5) brewFeedback.push({ label: `Ratio ${ratio.toFixed(1)}x — too short`, severity: 'bad' })
      else if (ratio <= 2.5) brewFeedback.push({ label: `Ratio ${ratio.toFixed(1)}x — perfect`, severity: 'good' })
      else brewFeedback.push({ label: `Ratio ${ratio.toFixed(1)}x — too long`, severity: 'warn' })

      const t = params.timeSeconds
      if (t < 22) brewFeedback.push({ label: `${t}s — too fast`, severity: 'bad' })
      else if (t <= 35) brewFeedback.push({ label: `${t}s — good time`, severity: 'good' })
      else brewFeedback.push({ label: `${t}s — too slow`, severity: 'warn' })
    } else {
      const ratio = params.waterGrams / params.doseIn
      if (ratio < 13) brewFeedback.push({ label: `1:${ratio.toFixed(0)} — very strong`, severity: 'warn' })
      else if (ratio <= 17) brewFeedback.push({ label: `1:${ratio.toFixed(0)} — ideal strength`, severity: 'good' })
      else brewFeedback.push({ label: `1:${ratio.toFixed(0)} — weak`, severity: 'warn' })

      const t = params.timeSeconds
      const [tMin, tMax] = params.method === 'v60' ? [150, 240] : [60, 120]
      if (t < tMin) brewFeedback.push({ label: `${formatTimer(t)} — a bit fast`, severity: 'warn' })
      else if (t <= tMax) brewFeedback.push({ label: `${formatTimer(t)} — good time`, severity: 'good' })
      else brewFeedback.push({ label: `${formatTimer(t)} — a bit slow`, severity: 'warn' })
    }

    const feedbackClass: Record<FeedbackSeverity, string> = {
      good: 'bg-green-100 text-green-800',
      warn: 'bg-amber-100 text-amber-800',
      bad: 'bg-red-100 text-red-700',
    }

    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold text-gray-900">How was it?</h1>

        {/* Quick brew feedback */}
        <div className="flex flex-wrap gap-2">
          {brewFeedback.map((f, i) => (
            <span key={i} className={`rounded-full px-3 py-1 text-xs font-semibold ${feedbackClass[f.severity]}`}>
              {f.label}
            </span>
          ))}
        </div>

        <Card>
          <div className="text-sm font-medium text-gray-700 mb-2">Rating</div>
          <div className="flex gap-2">
            {([1, 2, 3, 4, 5] as const).map(n => (
              <button key={n} type="button" onClick={() => setRating(n)}
                className={`flex-1 flex items-center justify-center h-10 rounded-xl border text-sm ${
                  rating === n ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white border-gray-200 text-gray-600'
                }`}>
                {n}★
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <div className="text-sm font-medium text-gray-700 mb-2">Taste</div>
          <div className="flex flex-wrap gap-2">
            {TASTE_TAGS.map(({ id, label }) => (
              <button key={id} type="button" onClick={() => toggleTag(id)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  tasteTags.includes(id) ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-600'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </Card>

        {params.method === 'espresso' && (
          <Card>
            <div className="text-sm font-medium text-gray-700 mb-3">Espresso Observation</div>
            <div className="mb-3">
              <div className="text-xs text-gray-500 mb-1.5">Puck state</div>
              <div className="flex gap-2 flex-wrap">
                <button type="button" onClick={() => setPuckState(null)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${puckState === null ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-600'}`}>
                  Not observed
                </button>
                {PUCK_STATES.map(({ id, label }) => (
                  <button key={id} type="button" onClick={() => setPuckState(id)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${puckState === id ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-600'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1.5">Flow</div>
              <div className="flex gap-2 flex-wrap">
                <button type="button" onClick={() => setFlowState(null)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${flowState === null ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-600'}`}>
                  Not observed
                </button>
                {FLOW_STATES.map(({ id, label }) => (
                  <button key={id} type="button" onClick={() => setFlowState(id)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${flowState === id ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-600'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        )}

        <Card>
          <div className="text-sm font-medium text-gray-700 mb-2">Notes</div>
          <textarea
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white resize-none"
            rows={3}
            placeholder="Optional notes…"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </Card>

        <button type="button" onClick={handleSaveAndAnalyze}
          disabled={!selectedBag}
          className="w-full rounded-xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-40">
          Save & Analyze
        </button>
      </div>
    )
  }

  // ─── STEP: RESULT ──────────────────────────────────────────────────────────
  if (step === 'result' && diagnosis && savedBrew && selectedBean) {
    const scoreColor =
      diagnosis.score >= 80 ? 'text-green-600'
      : diagnosis.score >= 60 ? 'text-amber-600'
      : 'text-red-600'

    const scoreBg =
      diagnosis.score >= 80 ? 'bg-green-50 border-green-200'
      : diagnosis.score >= 60 ? 'bg-amber-50 border-amber-200'
      : 'bg-red-50 border-red-200'

    function directionIcon(direction: 'increase' | 'decrease' | 'adjust') {
      if (direction === 'increase') return <ArrowUp size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
      if (direction === 'decrease') return <ArrowDown size={14} className="text-orange-500 flex-shrink-0 mt-0.5" />
      return <ArrowLeftRight size={14} className="text-gray-500 flex-shrink-0 mt-0.5" />
    }

    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold text-gray-900">Analysis</h1>

        <Card className={`border ${scoreBg}`}>
          <div className={`text-4xl font-bold ${scoreColor} tabular-nums`}>
            {diagnosis.score}
            <span className="text-lg font-medium text-gray-400 ml-1">/100</span>
          </div>
          <div className="mt-1 text-sm text-gray-600">{diagnosis.summary}</div>
        </Card>

        {savedBrew.params.grinderClicks != null && (
          <div className="flex items-center gap-2 text-sm text-gray-500 px-1">
            <span className="text-gray-400 text-xs">Grinder</span>
            <span className="font-semibold text-gray-700">
              {clicksToScale(savedBrew.params.grinderClicks)}
            </span>
            <span className="text-gray-400 text-xs">({savedBrew.params.grinderClicks} clicks)</span>
          </div>
        )}

        {savedBrew.isBest && (
          <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
            <Star size={16} className="fill-amber-500 text-amber-500 flex-shrink-0" />
            <span className="text-sm text-amber-800 font-medium">
              Marked as best brew for {selectedBean.name}
            </span>
          </div>
        )}

        {diagnosis.warning && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            {diagnosis.warning}
          </div>
        )}

        {diagnosis.suggestions.length > 0 && (
          <Card>
            <div className="text-sm font-semibold mb-3">Suggestions</div>
            <div className="space-y-3">
              {diagnosis.suggestions.map((s, i) => (
                <div key={i} className="flex gap-2">
                  {directionIcon(s.direction)}
                  <div>
                    <div className="text-sm font-medium text-gray-800">{s.parameter}</div>
                    <div className="text-xs text-gray-600 mt-0.5">{s.reason}</div>
                    {s.tip && <div className="text-xs text-gray-500 mt-0.5 italic">{s.tip}</div>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {diagnosis.suggestions.length === 0 && (
          <Card>
            <div className="text-sm text-gray-600">No issues detected. Your extraction looks solid.</div>
          </Card>
        )}

        {stockPrompt && selectedBag && (
          <Card className="border border-stone-200 bg-stone-50">
            <div className="text-sm font-medium text-stone-800 mb-1">
              Running low on {selectedBean.name}?
            </div>
            <div className="text-xs text-stone-600 mb-3">
              Based on your logged brews, this bag looks nearly empty.
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setStockPrompt(false)}
                className="flex-1 rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700">
                Still some left
              </button>
              <button type="button"
                onClick={async () => {
                  await upsertBag({ ...selectedBag, depleted: true })
                  setStockPrompt(false)
                }}
                className="flex-1 rounded-xl bg-stone-700 px-3 py-2 text-sm font-medium text-white">
                Empty — move to Vault
              </button>
            </div>
          </Card>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={resetAll}
            className="flex-1 rounded-xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white">
            Brew Again
          </button>
          <button type="button" onClick={() => onNavigateToTab('beans')}
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700">
            Add Bean
          </button>
        </div>
      </div>
    )
  }

  return null
}

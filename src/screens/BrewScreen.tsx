import { forwardRef, useEffect, useImperativeHandle, useReducer } from 'react'
import { ArrowUp, ArrowDown, ArrowLeftRight, Star } from 'lucide-react'
import { EspressoIcon, V60Icon, AeroPressIcon } from '../components/MethodIcon'
import { BrewAnimation } from '../components/BrewAnimation'
import type { Bag, Bean, BrewLog, BrewMethod, BrewParams, Diagnosis, PuckState, FlowState, TasteTag, StartingPoint } from '../types'
import { listBeans, listBags, addBrew, updateBrew, upsertBag, getBrewsByBagId, getBrewsByBeanId } from '../db'
import { computeRemainingGrams, isEffectivelyEmpty } from '../engine/stock'
import { getStartingPoint } from '../engine/recommendation'
import { diagnose } from '../engine/diagnosis'
import { getFreshness, FRESHNESS_BADGE_CLASS } from '../engine/freshness'
import { getBeanSuitability, sortBeansByMethod } from '../engine/suitability'
import { BREW_METHODS, ROAST_LEVELS, PROCESSES, TASTE_TAGS_POSITIVE, TASTE_TAGS_NEGATIVE, PUCK_STATES, FLOW_STATES } from '../constants'
import { THRESHOLDS } from '../engine/rules'
import { clicksToScale } from '../engine/grinder'
import { Card } from '../components/Card'
import { Dial } from '../components/Dial'
import { GrinderWheel } from '../components/GrinderWheel'
import type { TabId } from '../components/TabBar'

// ─── STATE MACHINE ─────────────────────────────────────────────────────────────

type BrewState =
  | {
      step: 'setup'
      beans: Bean[]
      bags: Bag[]
      selectedBean?: Bean
      selectedMethod?: BrewMethod
      selectedBag?: Bag
      isLoadingHistory: boolean
    }
  | {
      step: 'params'
      beans: Bean[]
      bags: Bag[]
      bean: Bean
      bag?: Bag
      method: BrewMethod
      params: BrewParams
      startingPoint: StartingPoint
      grinderClicks?: number
    }
  | {
      step: 'brew'
      beans: Bean[]
      bags: Bag[]
      bean: Bean
      bag?: Bag
      method: BrewMethod
      params: BrewParams
      startingPoint: StartingPoint
      grinderClicks?: number
      timerSeconds: number
      isRunning: boolean
    }
  | {
      step: 'evaluate'
      beans: Bean[]
      bags: Bag[]
      bean: Bean
      bag?: Bag
      method: BrewMethod
      params: BrewParams
      startingPoint: StartingPoint
      grinderClicks?: number
      rating: 1 | 2 | 3 | 4 | 5
      tasteTags: TasteTag[]
      notes: string
      puckState: PuckState | null
      flowState: FlowState | null
    }
  | {
      step: 'result'
      beans: Bean[]
      bags: Bag[]
      bean: Bean
      bag: Bag
      savedBrew: BrewLog
      diagnosis: Diagnosis
      stockPrompt: boolean
    }

type BrewAction =
  | { type: 'CATALOG_LOADED'; beans: Bean[]; bags: Bag[] }
  | { type: 'SELECT_BEAN'; bean: Bean }
  | { type: 'SELECT_METHOD'; method: BrewMethod }
  | { type: 'LOADING_HISTORY' }
  | { type: 'CONFIRM_SETUP'; bag?: Bag; startingPoint: StartingPoint }
  | { type: 'SET_PARAMS'; params: BrewParams }
  | { type: 'SET_GRINDER'; clicks: number }
  | { type: 'START_BREW' }
  | { type: 'TICK' }
  | { type: 'TOGGLE_RUNNING' }
  | { type: 'FINISH_BREW' }
  | { type: 'SET_RATING'; rating: 1 | 2 | 3 | 4 | 5 }
  | { type: 'TOGGLE_TAG'; tag: TasteTag }
  | { type: 'SET_NOTES'; notes: string }
  | { type: 'SET_PUCK_STATE'; puckState: PuckState | null }
  | { type: 'SET_FLOW_STATE'; flowState: FlowState | null }
  | { type: 'SAVE_RESULT'; brew: BrewLog; diagnosis: Diagnosis; bag: Bag }
  | { type: 'SET_STOCK_PROMPT'; value: boolean }
  | { type: 'MARK_DEPLETED'; bag: Bag }
  | { type: 'RESET' }

const INITIAL_STATE: BrewState = {
  step: 'setup',
  beans: [],
  bags: [],
  isLoadingHistory: false,
}

function brewReducer(state: BrewState, action: BrewAction): BrewState {
  const catalog = { beans: state.beans, bags: state.bags }

  switch (action.type) {
    case 'CATALOG_LOADED':
      return { ...state, beans: action.beans, bags: action.bags }

    case 'SELECT_BEAN': {
      if (state.step !== 'setup') return state
      const bag = state.selectedMethod ? pickBestBag(state.bags, action.bean.id) ?? undefined : undefined
      return { ...state, selectedBean: action.bean, selectedBag: bag }
    }

    case 'SELECT_METHOD': {
      if (state.step !== 'setup') return state
      const bag = state.selectedBean ? pickBestBag(state.bags, state.selectedBean.id) ?? undefined : undefined
      return { ...state, selectedMethod: action.method, selectedBag: bag }
    }

    case 'LOADING_HISTORY':
      if (state.step !== 'setup') return state
      return { ...state, isLoadingHistory: true }

    case 'CONFIRM_SETUP': {
      if (state.step !== 'setup' || !state.selectedBean || !state.selectedMethod) return state
      const sp = action.startingPoint
      return {
        ...catalog,
        step: 'params',
        bean: state.selectedBean,
        bag: action.bag,
        method: state.selectedMethod,
        params: sp.params,
        startingPoint: sp,
        grinderClicks: sp.params.grinderClicks ?? sp.grinderRec?.clicksCenter,
      }
    }

    case 'SET_PARAMS': {
      if (state.step !== 'params' && state.step !== 'brew') return state
      return { ...state, params: action.params }
    }

    case 'SET_GRINDER': {
      if (state.step !== 'params' && state.step !== 'brew') return state
      return { ...state, grinderClicks: action.clicks }
    }

    case 'START_BREW': {
      if (state.step !== 'params') return state
      return { ...state, step: 'brew', timerSeconds: 0, isRunning: true }
    }

    case 'TICK':
      if (state.step !== 'brew') return state
      return { ...state, timerSeconds: state.timerSeconds + 1 }

    case 'TOGGLE_RUNNING':
      if (state.step !== 'brew') return state
      return { ...state, isRunning: !state.isRunning }

    case 'FINISH_BREW': {
      if (state.step !== 'brew') return state
      const { isRunning: _r, timerSeconds: _t, ...rest } = state
      return {
        ...rest,
        step: 'evaluate',
        params: { ...state.params, timeSeconds: state.timerSeconds },
        rating: 3,
        tasteTags: [],
        notes: '',
        puckState: null,
        flowState: null,
      }
    }

    case 'SET_RATING':
      if (state.step !== 'evaluate') return state
      return { ...state, rating: action.rating }

    case 'TOGGLE_TAG': {
      if (state.step !== 'evaluate') return state
      const tags = state.tasteTags.includes(action.tag)
        ? state.tasteTags.filter(t => t !== action.tag)
        : [...state.tasteTags, action.tag]
      return { ...state, tasteTags: tags }
    }

    case 'SET_NOTES':
      if (state.step !== 'evaluate') return state
      return { ...state, notes: action.notes }

    case 'SET_PUCK_STATE':
      if (state.step !== 'evaluate') return state
      return { ...state, puckState: action.puckState }

    case 'SET_FLOW_STATE':
      if (state.step !== 'evaluate') return state
      return { ...state, flowState: action.flowState }

    case 'SAVE_RESULT': {
      if (state.step !== 'evaluate') return state
      return {
        ...catalog,
        step: 'result',
        bean: state.bean,
        bag: action.bag,
        savedBrew: action.brew,
        diagnosis: action.diagnosis,
        stockPrompt: false,
      }
    }

    case 'SET_STOCK_PROMPT':
      if (state.step !== 'result') return state
      return { ...state, stockPrompt: action.value }

    case 'MARK_DEPLETED':
      if (state.step !== 'result') return state
      return { ...state, bag: action.bag, stockPrompt: false }

    case 'RESET':
      return { ...catalog, step: 'setup', isLoadingHistory: false }

    default:
      return state
  }
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

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

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export interface BrewScreenHandle {
  handleTabReselect: () => void
}

interface BrewScreenProps {
  onNavigateToTab: (tab: TabId) => void
  onBrewStatusChange?: (active: boolean) => void
}

export const BrewScreen = forwardRef<BrewScreenHandle, BrewScreenProps>(
function BrewScreen({ onNavigateToTab, onBrewStatusChange }, ref) {
  const [state, dispatch] = useReducer(brewReducer, INITIAL_STATE)

  // Expose tab-reselect handler to parent: go to setup unless actively brewing
  useImperativeHandle(ref, () => ({
    handleTabReselect() {
      if (state.step !== 'brew') dispatch({ type: 'RESET' })
    },
  }), [state.step])

  // Tell parent whether a brew is in progress so the nav badge shows
  useEffect(() => {
    onBrewStatusChange?.(state.step === 'brew')
  }, [state.step, onBrewStatusChange])

  // Load catalog on mount
  useEffect(() => {
    Promise.all([listBeans(), listBags()]).then(([beans, bags]) => {
      dispatch({ type: 'CATALOG_LOADED', beans, bags })
    })
  }, [])

  // Timer tick
  useEffect(() => {
    if (state.step !== 'brew' || !state.isRunning) return
    const interval = setInterval(() => dispatch({ type: 'TICK' }), 1000)
    return () => clearInterval(interval)
  }, [state.step, state.step === 'brew' && state.isRunning]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── ASYNC HANDLERS ─────────────────────────────────────────────────────────

  async function handleSetupConfirm() {
    if (state.step !== 'setup' || !state.selectedBean || !state.selectedMethod) return
    dispatch({ type: 'LOADING_HISTORY' })
    const { selectedBean, selectedMethod, selectedBag, bags } = state
    const bag = selectedBag ?? pickBestBag(bags, selectedBean.id) ?? undefined
    const previousBrews = await getBrewsByBeanId(selectedBean.id)
    const sp = getStartingPoint(selectedBean, selectedMethod, bag?.roastDate, previousBrews)
    dispatch({ type: 'CONFIRM_SETUP', bag, startingPoint: sp })
  }

  async function handleSaveAndAnalyze() {
    if (state.step !== 'evaluate' || !state.bag) return
    const { bean, bag, params, grinderClicks, rating, tasteTags, notes, puckState, flowState, bags } = state

    let finalParams: BrewParams
    if (params.method === 'espresso') {
      finalParams = { ...params, puckState, flowState, grinderClicks }
    } else {
      finalParams = { ...params, grinderClicks }
    }

    const brew: BrewLog = {
      id: crypto.randomUUID(),
      bagId: bag.id,
      beanId: bean.id,
      params: finalParams,
      rating,
      tasteTags,
      notes: notes.trim() || undefined,
      isBest: false,
      createdAt: new Date().toISOString(),
    }

    await addBrew(brew)

    // Recalculate isBest across all brews for this bean × method
    const beanBagIds = new Set(bags.filter(b => b.beanId === bean.id).map(b => b.id))
    const allBeanBrews = (await Promise.all([...beanBagIds].map(id => getBrewsByBagId(id)))).flat()
    const methodBrews = allBeanBrews.filter(b => b.params.method === finalParams.method)
    const best = methodBrews.sort((a, b) =>
      b.rating !== a.rating ? b.rating - a.rating : b.createdAt.localeCompare(a.createdAt)
    )[0]
    const updates = methodBrews
      .filter(b => b.isBest !== (b.id === best?.id))
      .map(b => updateBrew({ ...b, isBest: b.id === best?.id }))
    await Promise.all(updates)
    brew.isBest = best?.id === brew.id

    // Decrement remaining if manually tracked
    let updatedBag = bag
    if (bag.remainingGrams !== undefined) {
      const newRemaining = Math.max(0, bag.remainingGrams - finalParams.doseIn * 1.12)
      updatedBag = { ...bag, remainingGrams: newRemaining }
      await upsertBag(updatedBag)
    }

    const result = diagnose(brew, bean, bag.roastDate)
    dispatch({ type: 'SAVE_RESULT', brew, diagnosis: result, bag: updatedBag })

    // Check stock after transitioning to result step
    if ((updatedBag.purchasedGrams || updatedBag.remainingGrams !== undefined) && !updatedBag.depleted) {
      const bagBrews = await getBrewsByBagId(updatedBag.id)
      const remaining = computeRemainingGrams(updatedBag, bagBrews)
      if (isEffectivelyEmpty(remaining)) dispatch({ type: 'SET_STOCK_PROMPT', value: true })
    }
  }

  // ─── STEP: SETUP ─────────────────────────────────────────────────────────────
  if (state.step === 'setup') {
    const { beans, bags, selectedBean, selectedMethod, isLoadingHistory } = state
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
          <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Method</div>
          <div className="flex gap-2">
            {BREW_METHODS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => dispatch({ type: 'SELECT_METHOD', method: id })}
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
          <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Select Bean</div>
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
                    onClick={() => dispatch({ type: 'SELECT_BEAN', bean })}
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

  // ─── STEP: PARAMS ─────────────────────────────────────────────────────────────
  if (state.step === 'params') {
    const { method, params, startingPoint, grinderClicks } = state
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between h-10">
          <h1 className="text-xl font-bold text-gray-900">Parameters</h1>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700">
              {method === 'espresso' && <EspressoIcon size={14} />}
              {method === 'v60' && <V60Icon size={14} />}
              {method === 'aeropress' && <AeroPressIcon size={14} />}
              {BREW_METHODS.find(m => m.id === method)?.label}
            </div>
            <button type="button" onClick={() => dispatch({ type: 'RESET' })} className="text-gray-400 text-sm">← Back</button>
          </div>
        </div>

        {/* Barista Tip card */}
        <div className="rounded-2xl bg-stone-900 px-5 py-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              {startingPoint.source === 'personal'
                ? <Star size={15} className="fill-amber-400 text-amber-400 flex-shrink-0" />
                : <span className="text-lg leading-none">☕</span>
              }
              <span className="text-[10px] font-bold tracking-widest text-amber-400 uppercase">
                {startingPoint.source === 'personal' ? 'Your Best Brew' : 'Pro Tip from the Barista'}
              </span>
            </div>
            {startingPoint.source === 'personal' && (
              <span className="flex-shrink-0 rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                Personalized
              </span>
            )}
          </div>
          <p className="text-sm text-stone-200 leading-relaxed">{startingPoint.rationale}</p>
          {startingPoint.warning && (
            <div className="rounded-xl bg-amber-500/15 border border-amber-500/25 px-3 py-2.5 text-sm text-amber-300 leading-relaxed">
              {startingPoint.warning}
            </div>
          )}
          {startingPoint.source === 'personal' && (startingPoint.personalBrewRating ?? 0) <= 3 && (
            <p className="text-[11px] text-stone-500 leading-snug">
              Best attempt so far — keep dialing in and rate higher to lock in a better starting point.
            </p>
          )}
          {startingPoint.source === 'default' && (
            <p className="text-[11px] text-stone-500 leading-snug">
              {(startingPoint.brewCountForMethod ?? 0) > 0
                ? `${startingPoint.brewCountForMethod} brew${startingPoint.brewCountForMethod === 1 ? '' : 's'} logged — starting point will personalize after your next brew.`
                : 'First brew with this method — starting point based on bean profile.'}
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
                onChange={v => dispatch({ type: 'SET_PARAMS', params: { ...params, doseIn: v } })} />
              <Dial value={params.doseOut} min={10} max={60} step={0.5} label="Dose Out (g)"
                onChange={v => dispatch({ type: 'SET_PARAMS', params: { ...params, doseOut: v } })} />
              <Dial value={params.timeSeconds} min={10} max={60} step={1} label="Time (s)"
                onChange={v => dispatch({ type: 'SET_PARAMS', params: { ...params, timeSeconds: v } })} />
            </div>
          )}
          {(params.method === 'v60' || params.method === 'aeropress') && (
            <div className="grid grid-cols-3 divide-x divide-gray-100">
              <Dial value={params.doseIn} min={10} max={25} step={0.5} label="Coffee (g)"
                onChange={v => dispatch({ type: 'SET_PARAMS', params: { ...params, doseIn: v } })} />
              <Dial value={params.waterGrams} min={100} max={400} step={5} label="Water (g)"
                onChange={v => dispatch({ type: 'SET_PARAMS', params: { ...params, waterGrams: v } })} />
              <Dial value={params.timeSeconds} min={30} max={300} step={5} label="Time (s)"
                onChange={v => dispatch({ type: 'SET_PARAMS', params: { ...params, timeSeconds: v } })} />
            </div>
          )}
        </Card>

        {/* Grinder setting */}
        <Card>
          <GrinderWheel
            value={grinderClicks ?? (startingPoint.grinderRec?.clicksCenter ?? 25)}
            min={0}
            max={100}
            recMin={startingPoint.grinderRec?.clicksMin}
            recMax={startingPoint.grinderRec?.clicksMax}
            onChange={clicks => dispatch({ type: 'SET_GRINDER', clicks })}
          />
          {startingPoint.grinderRec?.note && (
            <div className="text-xs text-amber-700 leading-snug mt-2 px-1">
              {startingPoint.grinderRec.note}
            </div>
          )}
        </Card>

        <button type="button" onClick={() => dispatch({ type: 'START_BREW' })}
          className="w-full rounded-xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white">
          Start Brew →
        </button>
      </div>
    )
  }

  // ─── STEP: BREW ───────────────────────────────────────────────────────────────
  if (state.step === 'brew') {
    const { params, timerSeconds, isRunning } = state
    return (
      <div className="space-y-4">
        <div className="flex items-center h-10">
          <h1 className="text-xl font-bold text-gray-900">Brewing…</h1>
        </div>

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
            onClick={() => dispatch({ type: 'TOGGLE_RUNNING' })}
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
                onChange={v => dispatch({ type: 'SET_PARAMS', params: { ...params, doseIn: v } })} />
              <Dial value={params.doseOut} min={10} max={60} step={0.5} label="Dose Out (g)"
                onChange={v => dispatch({ type: 'SET_PARAMS', params: { ...params, doseOut: v } })} />
            </div>
          )}
          {(params.method === 'v60' || params.method === 'aeropress') && (
            <div className="grid grid-cols-2 divide-x divide-gray-100">
              <Dial value={params.doseIn} min={10} max={25} step={0.5} label="Coffee (g)"
                onChange={v => dispatch({ type: 'SET_PARAMS', params: { ...params, doseIn: v } })} />
              <Dial value={params.waterGrams} min={100} max={400} step={5} label="Water (g)"
                onChange={v => dispatch({ type: 'SET_PARAMS', params: { ...params, waterGrams: v } })} />
            </div>
          )}
        </Card>

        <button type="button" onClick={() => dispatch({ type: 'FINISH_BREW' })}
          className="w-full rounded-xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white">
          Done
        </button>
      </div>
    )
  }

  // ─── STEP: EVALUATE ───────────────────────────────────────────────────────────
  if (state.step === 'evaluate') {
    const { params, rating, tasteTags, notes, puckState, flowState } = state

    type FeedbackSeverity = 'good' | 'warn' | 'bad'
    const brewFeedback: Array<{ label: string; severity: FeedbackSeverity }> = []

    if (params.method === 'espresso') {
      const ratio = params.doseOut / params.doseIn
      const { ratioMin, ratioMax, timeMin: espTMin, timeMax: espTMax } = THRESHOLDS.espresso
      if (ratio < ratioMin) brewFeedback.push({ label: `Ratio ${ratio.toFixed(1)}x — too short`, severity: 'bad' })
      else if (ratio <= 2.5) brewFeedback.push({ label: `Ratio ${ratio.toFixed(1)}x — perfect`, severity: 'good' })
      else if (ratio <= ratioMax) brewFeedback.push({ label: `Ratio ${ratio.toFixed(1)}x — long`, severity: 'warn' })
      else brewFeedback.push({ label: `Ratio ${ratio.toFixed(1)}x — too long`, severity: 'warn' })

      const t = params.timeSeconds
      if (t < espTMin) brewFeedback.push({ label: `${t}s — too fast`, severity: 'bad' })
      else if (t <= 35) brewFeedback.push({ label: `${t}s — good time`, severity: 'good' })
      else if (t <= espTMax) brewFeedback.push({ label: `${t}s — a bit slow`, severity: 'warn' })
      else brewFeedback.push({ label: `${t}s — too slow`, severity: 'warn' })
    } else {
      const { ratioMin, ratioMax } = THRESHOLDS[params.method]
      const ratio = params.waterGrams / params.doseIn
      if (ratio < ratioMin) brewFeedback.push({ label: `1:${ratio.toFixed(0)} — very strong`, severity: 'warn' })
      else if (ratio <= ratioMax) brewFeedback.push({ label: `1:${ratio.toFixed(0)} — ideal strength`, severity: 'good' })
      else brewFeedback.push({ label: `1:${ratio.toFixed(0)} — weak`, severity: 'warn' })

      const t = params.timeSeconds
      const { timeMin: tMin, timeMax: tMax } = THRESHOLDS[params.method]
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
        <div className="flex items-center h-10">
          <h1 className="text-xl font-bold text-gray-900">How was it?</h1>
        </div>

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
              <button key={n} type="button" onClick={() => dispatch({ type: 'SET_RATING', rating: n })}
                className={`flex-1 flex items-center justify-center h-10 rounded-xl border text-sm ${
                  rating === n ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white border-gray-200 text-gray-600'
                }`}>
                {n}★
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Taste</div>
          <div className="space-y-2.5">
            <div>
              <div className="text-[10px] text-green-600 font-semibold uppercase tracking-wider mb-1.5">What's good</div>
              <div className="flex flex-wrap gap-2">
                {TASTE_TAGS_POSITIVE.map(({ id, label }) => (
                  <button key={id} type="button" onClick={() => dispatch({ type: 'TOGGLE_TAG', tag: id })}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      tasteTags.includes(id)
                        ? 'bg-green-700 border-green-700 text-white'
                        : 'bg-white border-gray-200 text-gray-600'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-red-500 font-semibold uppercase tracking-wider mb-1.5">What's off</div>
              <div className="flex flex-wrap gap-2">
                {TASTE_TAGS_NEGATIVE.map(({ id, label }) => (
                  <button key={id} type="button" onClick={() => dispatch({ type: 'TOGGLE_TAG', tag: id })}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      tasteTags.includes(id)
                        ? 'bg-gray-900 border-gray-900 text-white'
                        : 'bg-white border-gray-200 text-gray-600'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {params.method === 'espresso' && (
          <Card>
            <div className="text-sm font-medium text-gray-700 mb-3">Espresso Observation</div>
            <div className="mb-3">
              <div className="text-xs text-gray-500 mb-1.5">Puck state</div>
              <div className="flex gap-2 flex-wrap">
                <button type="button" onClick={() => dispatch({ type: 'SET_PUCK_STATE', puckState: null })}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${puckState === null ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-600'}`}>
                  Not observed
                </button>
                {PUCK_STATES.map(({ id, label }) => (
                  <button key={id} type="button" onClick={() => dispatch({ type: 'SET_PUCK_STATE', puckState: id })}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${puckState === id ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-600'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1.5">Flow</div>
              <div className="flex gap-2 flex-wrap">
                <button type="button" onClick={() => dispatch({ type: 'SET_FLOW_STATE', flowState: null })}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${flowState === null ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-600'}`}>
                  Not observed
                </button>
                {FLOW_STATES.map(({ id, label }) => (
                  <button key={id} type="button" onClick={() => dispatch({ type: 'SET_FLOW_STATE', flowState: id })}
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
            onChange={e => dispatch({ type: 'SET_NOTES', notes: e.target.value })}
          />
        </Card>

        <button type="button" onClick={handleSaveAndAnalyze}
          disabled={!state.bag}
          className="w-full rounded-xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-40">
          Save & Analyze
        </button>
      </div>
    )
  }

  // ─── STEP: RESULT ─────────────────────────────────────────────────────────────
  if (state.step === 'result') {
    const { bean, bag, savedBrew, diagnosis, stockPrompt } = state

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
        <div className="flex items-center h-10">
          <h1 className="text-xl font-bold text-gray-900">Analysis</h1>
        </div>

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
              Marked as best brew for {bean.name}
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

        {stockPrompt && (
          <Card className="border border-stone-200 bg-stone-50">
            <div className="text-sm font-medium text-stone-800 mb-1">
              Running low on {bean.name}?
            </div>
            <div className="text-xs text-stone-600 mb-3">
              Based on your logged brews, this bag looks nearly empty.
            </div>
            <div className="flex gap-2">
              <button type="button"
                onClick={() => dispatch({ type: 'SET_STOCK_PROMPT', value: false })}
                className="flex-1 rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700">
                Still some left
              </button>
              <button type="button"
                onClick={async () => {
                  const depleted = { ...bag, depleted: true }
                  await upsertBag(depleted)
                  dispatch({ type: 'MARK_DEPLETED', bag: depleted })
                }}
                className="flex-1 rounded-xl bg-stone-700 px-3 py-2 text-sm font-medium text-white">
                Empty — move to Vault
              </button>
            </div>
          </Card>
        )}

        <button type="button" onClick={() => dispatch({ type: 'RESET' })}
          className="w-full rounded-xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white">
          Brew Again
        </button>
      </div>
    )
  }

  return null
})
BrewScreen.displayName = 'BrewScreen'

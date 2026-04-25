import { useEffect, useState } from 'react'
import { Archive, Bean as BeanIcon, ChevronDown, ChevronUp, Plus } from 'lucide-react'
import type { Bag, Bean, BrewLog, BrewMethod, RoastLevel, Process } from '../types'
import {
  listBeans, upsertBean, deleteBean,
  listBags, getBagsByBeanId, upsertBag, deleteBag,
  getBrewsByBagId, deleteBrew, clearDatabase,
} from '../db'
import { BREW_METHODS, ROAST_LEVELS, PROCESSES, KNOWN_ORIGINS } from '../constants'
import { Card } from '../components/Card'
import { DecafBadge } from '../components/DecafBadge'
import { OriginSelect } from '../components/OriginSelect'
import { getFreshness, FRESHNESS_BADGE_CLASS, type FreshnessStage } from '../engine/freshness'
import { computeRemainingGrams, isEffectivelyEmpty, remainingLabel, remainingColor } from '../engine/stock'

// ─── BAG FORM ────────────────────────────────────────────────────────────────

interface BagFormProps {
  initial?: Bag
  beanId: string
  onSave: (bag: Bag) => void
  onCancel: () => void
}

function BagForm({ initial, beanId, onSave, onCancel }: BagFormProps) {
  const [roastDate, setRoastDate] = useState(initial?.roastDate ?? '')
  const [purchasedGrams, setPurchasedGrams] = useState(initial?.purchasedGrams?.toString() ?? '')
  const [remainingGrams, setRemainingGrams] = useState(initial?.remainingGrams?.toString() ?? '')
  const [depleted, setDepleted] = useState(initial?.depleted ?? false)
  const isEditing = Boolean(initial)

  function handleSave() {
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      beanId,
      roastDate: roastDate || undefined,
      purchasedGrams: purchasedGrams ? Number(purchasedGrams) : undefined,
      remainingGrams: remainingGrams ? Number(remainingGrams) : undefined,
      depleted,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    })
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-gray-600">Roast Date</label>
        <input
          type="date"
          className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
          value={roastDate}
          onChange={e => setRoastDate(e.target.value)}
        />
      </div>
      <div className={isEditing ? 'grid grid-cols-2 gap-2' : ''}>
        <div>
          <label className="text-xs font-medium text-gray-600">Purchased (g)</label>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
            value={purchasedGrams}
            onChange={e => setPurchasedGrams(e.target.value)}
            placeholder="e.g. 250"
          />
        </div>
        {isEditing && (
          <div>
            <label className="text-xs font-medium text-gray-600">Remaining (g)</label>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
              value={remainingGrams}
              onChange={e => setRemainingGrams(e.target.value)}
              placeholder="e.g. 180"
            />
          </div>
        )}
      </div>
      <label className="flex items-center gap-2 cursor-pointer py-0.5">
        <input
          type="checkbox"
          checked={depleted}
          onChange={e => setDepleted(e.target.checked)}
          className="rounded border-gray-300 text-amber-600"
        />
        <span className="text-xs text-gray-600">Already empty</span>
      </label>
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel}
          className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600">
          Cancel
        </button>
        <button type="button" onClick={handleSave}
          className="flex-1 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white">
          Save
        </button>
      </div>
    </div>
  )
}

// ─── BEAN FORM ───────────────────────────────────────────────────────────────

interface BeanFormProps {
  initial?: Bean
  knownBeans: Bean[]
  withBag?: boolean
  onSave: (bean: Bean, bag?: Omit<Bag, 'id' | 'beanId' | 'createdAt'>) => void | Promise<void>
  onCancel: () => void
}

function BeanForm({ initial, knownBeans, withBag = false, onSave, onCancel }: BeanFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [roaster, setRoaster] = useState(initial?.roaster ?? '')
  const [origins, setOrigins] = useState<string[]>(initial?.origins ?? [])
  const [roastLevel, setRoastLevel] = useState<RoastLevel>(initial?.roastLevel ?? 'medium')
  const [process, setProcess] = useState<Process>(initial?.process ?? 'washed')
  const [preferredMethod, setPreferredMethod] = useState<BrewMethod>(initial?.preferredMethod ?? 'espresso')
  const [isDecaf, setIsDecaf] = useState(initial?.isDecaf ?? false)
  const [roastDate, setRoastDate] = useState('')
  const [purchasedGrams, setPurchasedGrams] = useState('')
  const [depleted, setDepleted] = useState(false)
  const [nameError, setNameError] = useState(false)
  const [saving, setSaving] = useState(false)

  // Deduplicated autocomplete lists
  const knownNames = [...new Map(knownBeans.map(b => [b.name.toLowerCase().trim(), b.name.trim()])).values()]
  const knownRoasters = (() => {
    const seen = new Set<string>()
    return knownBeans
      .map(b => b.roaster?.trim())
      .filter((r): r is string => Boolean(r))
      .filter(r => { const k = r.toLowerCase(); return seen.has(k) ? false : (seen.add(k), true) })
  })()

  function handleNameChange(value: string) {
    setName(value)
    setNameError(false)
    const match = knownBeans.find(b => b.name.toLowerCase() === value.toLowerCase())
    if (match && match.id !== initial?.id) {
      setRoaster(match.roaster ?? '')
      setOrigins(match.origins ?? [])
      setRoastLevel(match.roastLevel)
      setProcess(match.process)
      setPreferredMethod(match.preferredMethod)
    }
  }

  async function handleSave() {
    if (!name.trim()) { setNameError(true); return }
    setSaving(true)
    const bean: Bean = {
      id: initial?.id ?? crypto.randomUUID(),
      name: name.trim(),
      roaster: roaster.trim() || undefined,
      origins,
      roastLevel,
      process,
      preferredMethod,
      isDecaf: isDecaf || undefined,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    }
    const bag = withBag ? {
      roastDate: roastDate || undefined,
      purchasedGrams: purchasedGrams ? Number(purchasedGrams) : undefined,
      depleted,
    } : undefined
    await onSave(bean, bag)
    setSaving(false)
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-gray-600">Name *</label>
        <input
          list="bean-names-list"
          className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm bg-white ${nameError ? 'border-red-400' : 'border-gray-200'}`}
          value={name}
          onChange={e => handleNameChange(e.target.value)}
          placeholder="e.g. Ethiopia Yirgacheffe"
        />
        <datalist id="bean-names-list">
          {knownNames.map(n => <option key={n} value={n} />)}
        </datalist>
        {nameError && <div className="text-xs text-red-500 mt-0.5">Name is required</div>}
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600">Roaster</label>
        <input
          list="roasters-list"
          className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white"
          value={roaster}
          onChange={e => setRoaster(e.target.value)}
          placeholder="optional"
        />
        <datalist id="roasters-list">
          {knownRoasters.map(r => <option key={r} value={r} />)}
        </datalist>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600">Origin</label>
        <div className="mt-1">
          <OriginSelect
            value={origins}
            onChange={setOrigins}
            pool={[
              ...KNOWN_ORIGINS,
              ...knownBeans.flatMap(b => b.origins),
            ].filter((o, i, arr) => arr.findIndex(x => x.toLowerCase() === o.toLowerCase()) === i)}
          />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600">Roast Level *</label>
        <select className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
          value={roastLevel} onChange={e => setRoastLevel(e.target.value as RoastLevel)}>
          {ROAST_LEVELS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600">Process *</label>
        <select className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
          value={process} onChange={e => setProcess(e.target.value as Process)}>
          {PROCESSES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600">Preferred Method *</label>
        <select className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
          value={preferredMethod} onChange={e => setPreferredMethod(e.target.value as BrewMethod)}>
          {BREW_METHODS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
      </div>

      <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-dashed border-gray-300 bg-gray-50 px-3 py-2.5">
        <input
          type="checkbox"
          checked={isDecaf}
          onChange={e => setIsDecaf(e.target.checked)}
          className="rounded border-gray-300 text-gray-600"
        />
        <div>
          <div className="text-xs font-semibold text-gray-700">Decaf</div>
          <div className="text-[10px] text-gray-400 leading-snug">Adjusts rest windows, grind and extraction recommendations</div>
        </div>
      </label>

      {withBag && (
        <>
          <div className="border-t border-gray-100 pt-3">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">This Bag</div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Roast Date</label>
                <input type="date"
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
                  value={roastDate} onChange={e => setRoastDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Amount (g)</label>
                <input type="number" inputMode="numeric" min={1}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
                  value={purchasedGrams} onChange={e => setPurchasedGrams(e.target.value)}
                  placeholder="e.g. 250" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer py-0.5">
                <input type="checkbox" checked={depleted} onChange={e => setDepleted(e.target.checked)}
                  className="rounded border-gray-300 text-amber-600" />
                <span className="text-xs text-gray-600">Already empty — add directly to The Vault</span>
              </label>
            </div>
          </div>
        </>
      )}

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel}
          className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600">
          Cancel
        </button>
        <button type="button" onClick={handleSave} disabled={saving}
          className="flex-1 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

// ─── BAG ROW ─────────────────────────────────────────────────────────────────

interface BagRowProps {
  bag: Bag
  preferredMethod: BrewMethod
  roastLevel: import('../types').RoastLevel
  process: import('../types').Process
  onUpdated: () => void
  onDeleted: () => void
}

function BagRow({ bag, preferredMethod, roastLevel, process, onUpdated, onDeleted }: BagRowProps) {
  const [brews, setBrews] = useState<BrewLog[]>([])
  const [editing, setEditing] = useState(false)
  const [deleteStage, setDeleteStage] = useState<'idle' | 'confirm'>('idle')

  useEffect(() => {
    getBrewsByBagId(bag.id).then(setBrews)
  }, [bag.id])

  const freshness = bag.roastDate ? getFreshness(bag.roastDate, preferredMethod, roastLevel, process) : null
  const remaining = bag.purchasedGrams ? computeRemainingGrams(bag, brews) : null
  const almostEmpty = remaining !== null && isEffectivelyEmpty(remaining)

  async function handleToggleDepleted() {
    await upsertBag({ ...bag, depleted: !bag.depleted })
    onUpdated()
  }

  async function handleDelete() {
    if (deleteStage === 'idle') {
      setDeleteStage('confirm')
      return
    }
    const bagBrews = await getBrewsByBagId(bag.id)
    await Promise.all(bagBrews.map(b => deleteBrew(b.id)))
    await deleteBag(bag.id)
    onDeleted()
  }

  if (editing) {
    return (
      <div className="rounded-xl bg-gray-50 border border-gray-200 px-3 py-3">
        <BagForm
          initial={bag}
          beanId={bag.beanId}
          onSave={async updated => { await upsertBag(updated); setEditing(false); onUpdated() }}
          onCancel={() => setEditing(false)}
        />
      </div>
    )
  }

  return (
    <div className={`rounded-xl border px-3 py-2.5 ${bag.depleted ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-200'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {bag.roastDate && (
            <div className="text-xs text-gray-400">
              Roasted {new Date(bag.roastDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              {freshness && <span className="ml-1">· {freshness.age}d ago</span>}
            </div>
          )}

          {freshness && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex items-center gap-0.5">
                {((['tooFresh','earlyPeak','peak','latePeak','aging','old'] as FreshnessStage[])).map(s => {
                  const active = s === freshness.stage
                  const stageColor: Record<FreshnessStage, string> = {
                    tooFresh: 'text-slate-400', earlyPeak: 'text-sky-400',
                    peak: 'text-green-500', latePeak: 'text-teal-500',
                    aging: 'text-orange-500', old: 'text-red-500',
                  }
                  return (
                    <BeanIcon
                      key={s}
                      size={active ? 16 : 11}
                      className={active ? stageColor[s] : 'text-gray-200'}
                    />
                  )
                })}
              </div>
              <span className="text-[10px] text-gray-500 font-medium">{freshness.recommendation}</span>
            </div>
          )}

          {bag.purchasedGrams && remaining !== null && (() => {
            const color = remainingColor(remaining, bag.purchasedGrams)
            return (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      color === 'green' ? 'bg-green-500' : color === 'amber' ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.round((remaining / bag.purchasedGrams) * 100)}%` }}
                  />
                </div>
                <span className={`text-xs font-medium flex-shrink-0 ${
                  color === 'green' ? 'text-green-700' : color === 'amber' ? 'text-amber-700' : 'text-red-600'
                }`}>
                  {remainingLabel(remaining)} / {bag.purchasedGrams}g
                </span>
              </div>
            )
          })()}

          {brews.length > 0 && (
            <div className="text-xs text-gray-400 mt-1">{brews.length} brew{brews.length === 1 ? '' : 's'} logged</div>
          )}
          {almostEmpty && !bag.depleted && (
            <div className="text-xs text-amber-700 mt-1">Almost empty</div>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {deleteStage === 'confirm' ? (
            <>
              <button type="button" onClick={() => setDeleteStage('idle')}
                className="rounded-xl border border-gray-200 px-2 py-1 text-xs text-gray-600">Cancel</button>
              <button type="button" onClick={handleDelete}
                className="rounded-xl bg-red-600 px-2 py-1 text-xs text-white font-medium">Delete</button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setEditing(true)}
                className="rounded-xl border border-gray-200 px-2 py-1 text-xs text-gray-600">Edit</button>
              <button type="button" onClick={handleToggleDepleted}
                className={`rounded-xl border px-2 py-1 text-xs font-medium ${
                  bag.depleted
                    ? 'border-amber-300 bg-amber-50 text-amber-800'
                    : 'border-gray-200 text-gray-600'
                }`}>
                {bag.depleted ? 'Reopen' : 'Empty'}
              </button>
              <button type="button" onClick={handleDelete}
                className="rounded-xl border border-gray-200 px-2 py-1 text-xs text-gray-600">×</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── BEAN CARD ───────────────────────────────────────────────────────────────

interface BeanCardProps {
  bean: Bean
  allBeans: Bean[]
  onUpdated: () => void
  onDeleted: () => void
}

function BeanCard({ bean, allBeans, onUpdated, onDeleted }: BeanCardProps) {
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [expanded, setExpanded] = useState(false)
  const [bags, setBags] = useState<Bag[]>([])
  const [addingBag, setAddingBag] = useState(false)
  const [deleteStage, setDeleteStage] = useState<'idle' | 'confirm'>('idle')
  const [deleteCount, setDeleteCount] = useState(0)

  async function loadBags() {
    setBags(await getBagsByBeanId(bean.id))
  }

  async function handleExpand() {
    if (!expanded) await loadBags()
    setExpanded(prev => !prev)
  }

  async function handleAddBag(bag: Bag) {
    await upsertBag(bag)
    setAddingBag(false)
    await loadBags()
    onUpdated()
  }

  async function handleDeleteBean() {
    if (deleteStage === 'idle') {
      // Count all brews across all bags
      const beanBags = await getBagsByBeanId(bean.id)
      const counts = await Promise.all(beanBags.map(b => getBrewsByBagId(b.id)))
      setDeleteCount(counts.reduce((s, brews) => s + brews.length, 0))
      setDeleteStage('confirm')
      return
    }
    // Delete all brews, bags, then bean
    const beanBags = await getBagsByBeanId(bean.id)
    await Promise.all(
      beanBags.map(async b => {
        const brews = await getBrewsByBagId(b.id)
        await Promise.all(brews.map(brew => deleteBrew(brew.id)))
        await deleteBag(b.id)
      })
    )
    await deleteBean(bean.id)
    onDeleted()
  }

  const roastLabel = ROAST_LEVELS.find(r => r.id === bean.roastLevel)?.label ?? bean.roastLevel
  const processLabel = PROCESSES.find(p => p.id === bean.process)?.label ?? bean.process
  const methodLabel = BREW_METHODS.find(m => m.id === bean.preferredMethod)?.label ?? bean.preferredMethod

  // Summary badges: show freshness of the most recently added active bag
  const activeBags = bags.filter(b => !b.depleted)
  const summaryBag = activeBags.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  const summaryFreshness = summaryBag?.roastDate ? getFreshness(summaryBag.roastDate, bean.preferredMethod, bean.roastLevel, bean.process, bean.isDecaf) : null

  if (mode === 'edit') {
    return (
      <Card>
        <div className="text-sm font-semibold mb-4">Edit Bean</div>
        <BeanForm
          initial={bean}
          knownBeans={allBeans}
          onSave={async updated => { await upsertBean(updated); setMode('view'); onUpdated() }}
          onCancel={() => setMode('view')}
        />
      </Card>
    )
  }

  return (
    <div className={bean.isDecaf ? 'opacity-70' : undefined}>
    <Card>
      <button type="button" onClick={handleExpand} className="w-full text-left">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold truncate">{bean.name}</span>
              {bean.isDecaf && <DecafBadge />}
            </div>
            {bean.roaster && <div className="text-xs text-gray-500 mt-0.5">{bean.roaster}</div>}
            <div className="flex gap-1.5 flex-wrap mt-2">
              <span className="rounded-full bg-amber-100 text-amber-900 px-2 py-0.5 text-xs font-medium">{roastLabel}</span>
              <span className="rounded-full bg-stone-100 text-stone-600 px-2 py-0.5 text-xs font-medium">{processLabel}</span>
              <span className="rounded-full bg-orange-100 text-orange-800 px-2 py-0.5 text-xs font-medium">{methodLabel}</span>
              {bean.origins.length > 0 && <span className="rounded-full bg-gray-100 text-gray-600 px-2 py-0.5 text-xs font-medium">{bean.origins.join(', ')}</span>}
            </div>
          </div>
          {summaryFreshness && (
            <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${FRESHNESS_BADGE_CLASS[summaryFreshness.stage]}`}>
              {summaryFreshness.label}
            </span>
          )}
        </div>
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
          {/* Bags */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Bags</span>
              <button type="button" onClick={() => setAddingBag(prev => !prev)}
                className="flex items-center gap-1 rounded-xl border border-gray-200 px-2.5 py-1 text-xs text-gray-600">
                <Plus size={11} />
                Add bag
              </button>
            </div>

            {addingBag && (
              <div className="rounded-xl bg-gray-50 border border-gray-200 px-3 py-3 mb-2">
                <BagForm
                  beanId={bean.id}
                  onSave={handleAddBag}
                  onCancel={() => setAddingBag(false)}
                />
              </div>
            )}

            {bags.length === 0 ? (
              <div className="text-xs text-gray-400">No bags recorded.</div>
            ) : (
              <div className="space-y-2">
                {bags.map(bag => (
                  <BagRow
                    key={bag.id}
                    bag={bag}
                    preferredMethod={bean.preferredMethod}
                    roastLevel={bean.roastLevel}
                    process={bean.process}
                    onUpdated={async () => { await loadBags(); onUpdated() }}
                    onDeleted={async () => { await loadBags(); onUpdated() }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center justify-end gap-2">
        {deleteStage === 'confirm' ? (
          <div className="flex items-center gap-2 w-full">
            <span className="text-xs text-red-600 flex-1">
              {deleteCount > 0
                ? `Deletes ${deleteCount} brew log${deleteCount === 1 ? '' : 's'} too. Confirm?`
                : 'Delete this bean?'}
            </span>
            <button type="button" onClick={() => setDeleteStage('idle')}
              className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs text-gray-600">Cancel</button>
            <button type="button" onClick={handleDeleteBean}
              className="rounded-xl bg-red-600 px-3 py-1.5 text-xs text-white font-medium">Confirm</button>
          </div>
        ) : (
          <>
            <button type="button" onClick={() => { setMode('edit'); setExpanded(false) }}
              className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs text-gray-600">Edit</button>
            <button type="button" onClick={handleDeleteBean}
              className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs text-gray-600">Delete</button>
          </>
        )}
      </div>
    </Card>
    </div>
  )
}

// ─── ROASTERS VIEW ───────────────────────────────────────────────────────────

function RoastersView({ beans }: { beans: Bean[] }) {
  const grouped = new Map<string, Bean[]>()
  for (const bean of beans) {
    const key = bean.roaster?.trim() || '—'
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(bean)
  }
  const sorted = [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b))

  return (
    <div className="space-y-5">
      {sorted.map(([roaster, roasterBeans]) => (
        <div key={roaster}>
          <div className="flex items-center gap-2 mb-2 px-1">
            <span className="text-xs font-semibold text-stone-500 tracking-wide uppercase">{roaster}</span>
            <span className="text-xs text-stone-400">({roasterBeans.length})</span>
          </div>
          <div className="space-y-2">
            {roasterBeans.map(bean => (
              <div key={bean.id} className="rounded-2xl bg-white border border-gray-100 px-4 py-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-900">{bean.name}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <span className="text-xs bg-amber-100 text-amber-900 rounded-full px-2 py-0.5">
                    {ROAST_LEVELS.find(r => r.id === bean.roastLevel)?.label ?? bean.roastLevel}
                  </span>
                  <span className="text-xs bg-stone-100 text-stone-600 rounded-full px-2 py-0.5">
                    {PROCESSES.find(p => p.id === bean.process)?.label ?? bean.process}
                  </span>
                  {bean.origins.length > 0 && (
                    <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">{bean.origins.join(', ')}</span>
                  )}
                  <span className="text-xs bg-orange-100 text-orange-800 rounded-full px-2 py-0.5">
                    {BREW_METHODS.find(m => m.id === bean.preferredMethod)?.label ?? bean.preferredMethod}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {sorted.length === 0 && (
        <div className="text-sm text-gray-500 text-center py-8">No beans added yet.</div>
      )}
    </div>
  )
}

// ─── BEANS SCREEN ────────────────────────────────────────────────────────────

export function BeansScreen({ isActive }: { isActive?: boolean }) {
  const [beans, setBeans] = useState<Bean[]>([])
  const [allBags, setAllBags] = useState<Bag[]>([])
  const [showForm, setShowForm] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [dbError, setDbError] = useState<string | null>(null)
  const [vaultOpen, setVaultOpen] = useState(false)
  const [view, setView] = useState<'shelf' | 'roasters'>('shelf')

  async function refresh() {
    try {
      const [b, bags] = await Promise.all([listBeans(), listBags()])
      setBeans(b)
      setAllBags(bags)
      setDbError(null)
    } catch (err) {
      setDbError(err instanceof Error ? err.message : 'Database error')
    }
  }

  useEffect(() => { refresh() }, [])
  useEffect(() => { if (isActive) refresh() }, [isActive])

  function handleResetDb() {
    clearDatabase() // sets localStorage flag + reloads; DB is deleted on next load
  }

  async function handleAddBean(bean: Bean, bagData?: Omit<Bag, 'id' | 'beanId' | 'createdAt'>) {
    setSaveError(null)
    try {
      const existing = beans.find(b =>
        b.name.toLowerCase() === bean.name.toLowerCase() &&
        (b.roaster ?? '').toLowerCase() === (bean.roaster ?? '').toLowerCase()
      )
      const targetBean = existing ?? bean
      if (!existing) await upsertBean(bean)

      if (bagData) {
        const bag: Bag = {
          id: crypto.randomUUID(),
          beanId: targetBean.id,
          ...bagData,
          createdAt: new Date().toISOString(),
        }
        await upsertBag(bag)
      }

      setShowForm(false)
      refresh()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save — please try again.')
    }
  }

  // On Deck: beans with at least one active bag
  // Vault: beans with all bags depleted (or no bags)
  const active = beans.filter(bean => allBags.some(b => b.beanId === bean.id && !b.depleted))
  const vault = beans.filter(bean => !allBags.some(b => b.beanId === bean.id && !b.depleted))

  return (
    <div className="space-y-4">
      {/* Screen header */}
      <div className="flex items-center justify-between h-10">
        <h1 className="text-xl font-bold text-gray-900">Shelf</h1>
        {view === 'shelf' && !dbError && (
          <button type="button" onClick={() => setShowForm(prev => !prev)}
            className="rounded-xl bg-amber-600 px-3 py-2 text-sm font-medium text-white">
            {showForm ? 'Cancel' : '+ Add Bean'}
          </button>
        )}
      </div>

      {/* View tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <button type="button"
          onClick={() => { setView('shelf'); setShowForm(false) }}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
            view === 'shelf' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
          }`}>
          Shelf
        </button>
        <button type="button"
          onClick={() => { setView('roasters'); setShowForm(false) }}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
            view === 'roasters' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
          }`}>
          Roasters
        </button>
      </div>

      {dbError && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 space-y-2">
          <div className="font-medium">Database error — data cannot be loaded.</div>
          <div className="text-xs text-red-600">{dbError}</div>
          <button type="button" onClick={handleResetDb}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white">
            Reset database &amp; reload
          </button>
        </div>
      )}

      {view === 'roasters' ? (
        <RoastersView beans={beans} />
      ) : (
        <>
          {showForm && (
            <Card>
              <div className="text-sm font-semibold mb-4">New Bean</div>
              {saveError && (
                <div className="mb-3 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                  {saveError}
                </div>
              )}
              <BeanForm
                knownBeans={beans}
                withBag
                onSave={handleAddBean}
                onCancel={() => { setShowForm(false); setSaveError(null) }}
              />
            </Card>
          )}

          {/* ── On Deck ── */}
          {!showForm && (
            <div className="space-y-3">
              {active.length === 0 && (
                <Card>
                  <div className="text-sm text-gray-500 text-center py-4">
                    No beans on deck. Add your first bag to get started.
                  </div>
                </Card>
              )}
              {active.map(bean => (
                <BeanCard key={bean.id} bean={bean} allBeans={beans} onUpdated={refresh} onDeleted={refresh} />
              ))}
            </div>
          )}

          {/* ── The Vault ── */}
          {!showForm && vault.length > 0 && (
            <div className="pt-2">
              <button type="button" onClick={() => setVaultOpen(prev => !prev)}
                className="flex items-center gap-2 w-full text-left px-1 py-2">
                <Archive size={14} className="text-stone-400 flex-shrink-0" />
                <span className="text-xs font-semibold text-stone-500 tracking-wide uppercase">The Vault</span>
                <span className="text-xs text-stone-400 ml-0.5">({vault.length})</span>
                <span className="ml-auto text-stone-400">
                  {vaultOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </span>
              </button>
              {vaultOpen && (
                <div className="space-y-3 mt-1">
                  {vault.map(bean => (
                    <BeanCard key={bean.id} bean={bean} allBeans={beans} onUpdated={refresh} onDeleted={refresh} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

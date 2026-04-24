import { useEffect, useMemo, useState } from 'react'
import { Star } from 'lucide-react'
import type { Bag, Bean, BrewLog } from '../types'
import { listBeans, listBags, listBrews, deleteBrew } from '../db'
import { BREW_METHODS } from '../constants'
import { Card } from '../components/Card'

function formatParams(brew: BrewLog): string {
  if (brew.params.method === 'espresso') {
    const { doseIn, doseOut, timeSeconds } = brew.params
    return `${doseIn}g → ${doseOut}g in ${timeSeconds}s (ratio ${(doseOut / doseIn).toFixed(1)}x)`
  }
  const { doseIn, waterGrams, timeSeconds } = brew.params
  return `${doseIn}g coffee · ${waterGrams}g water · ${timeSeconds}s`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function LogbookScreen() {
  const [beans, setBeans] = useState<Bean[]>([])
  const [bags, setBags] = useState<Bag[]>([])
  const [brews, setBrews] = useState<BrewLog[]>([])
  const [beanFilter, setBeanFilter] = useState<string>('')

  // bagId → Bean (via bag.beanId → bean)
  const bagToBeanMap = useMemo<Map<string, Bean>>(() => {
    const beanMap = new Map(beans.map(b => [b.id, b]))
    const result = new Map<string, Bean>()
    for (const bag of bags) {
      const bean = beanMap.get(bag.beanId)
      if (bean) result.set(bag.id, bean)
    }
    return result
  }, [beans, bags])

  async function refresh() {
    const [b, bags, l] = await Promise.all([listBeans(), listBags(), listBrews()])
    setBeans(b)
    setBags(bags)
    setBrews(l)
  }

  useEffect(() => { refresh() }, [])

  const filtered = useMemo(() => {
    if (!beanFilter) return brews
    // Filter brews whose bag belongs to the selected bean
    const beanBagIds = new Set(bags.filter(b => b.beanId === beanFilter).map(b => b.id))
    return brews.filter(b => beanBagIds.has(b.bagId))
  }, [brews, bags, beanFilter])

  async function onDelete(id: string) {
    await deleteBrew(id)
    refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Logbook</h1>
      </div>

      <Card>
        <label className="text-xs font-medium text-gray-600">Filter by bean</label>
        <select
          className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
          value={beanFilter}
          onChange={e => setBeanFilter(e.target.value)}
        >
          <option value="">All beans</option>
          {beans.map(b => (
            <option key={b.id} value={b.id}>{b.name}{b.roaster ? ` — ${b.roaster}` : ''}</option>
          ))}
        </select>
      </Card>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <Card>
            <div className="text-sm text-gray-500 text-center py-4">
              No brews logged yet. Brew something!
            </div>
          </Card>
        )}

        {filtered.map(brew => {
          const bean = bagToBeanMap.get(brew.bagId)
          const beanName = bean?.name ?? 'Unknown bean'
          const methodLabel = BREW_METHODS.find(m => m.id === brew.params.method)?.label ?? brew.params.method

          return (
            <Card key={brew.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold truncate">{beanName}</span>
                    <span className="text-xs text-gray-500">{methodLabel}</span>
                    {brew.isBest && (
                      <span className="flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        <Star size={10} className="fill-amber-500 text-amber-500" />
                        Best
                      </span>
                    )}
                  </div>
                  {bean?.roaster && (
                    <div className="text-xs text-gray-400 mt-0.5">{bean.roaster}</div>
                  )}
                  <div className="mt-1 text-xs text-gray-500">{formatDate(brew.createdAt)}</div>
                  <div className="mt-1 text-xs text-gray-600">{formatParams(brew)}</div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-xs text-gray-600">
                      {'★'.repeat(brew.rating)}{'☆'.repeat(5 - brew.rating)}
                    </span>
                    {brew.tasteTags.length > 0 && (
                      <span className="text-xs text-gray-500">{brew.tasteTags.join(', ')}</span>
                    )}
                  </div>
                  {brew.notes && (
                    <div className="mt-1 text-xs text-gray-500 italic">{brew.notes}</div>
                  )}
                </div>
                <button type="button" onClick={() => onDelete(brew.id)}
                  className="flex-shrink-0 rounded-xl border border-gray-200 px-3 py-1.5 text-xs text-gray-600">
                  Delete
                </button>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Bean, Bag, BrewLog } from './types'

interface BaristaDB extends DBSchema {
  beans: { key: string; value: Bean; indexes: { 'by-createdAt': string } }
  bags: { key: string; value: Bag; indexes: { 'by-beanId': string; 'by-createdAt': string } }
  brews: { key: string; value: BrewLog; indexes: { 'by-createdAt': string; 'by-bagId': string } }
}

const DB_NAME = 'barista-app'
const RESET_FLAG = '_barista_reset_db'

if (localStorage.getItem(RESET_FLAG)) {
  localStorage.removeItem(RESET_FLAG)
  indexedDB.deleteDatabase(DB_NAME)
}

let dbPromise: Promise<IDBPDatabase<BaristaDB>> | null = null

function getDb(): Promise<IDBPDatabase<BaristaDB>> {
  if (!dbPromise) {
    dbPromise = openDB<BaristaDB>(DB_NAME, 1, {
      upgrade(db) {
        const beans = db.createObjectStore('beans', { keyPath: 'id' })
        beans.createIndex('by-createdAt', 'createdAt')

        const bags = db.createObjectStore('bags', { keyPath: 'id' })
        bags.createIndex('by-beanId', 'beanId')
        bags.createIndex('by-createdAt', 'createdAt')

        const brews = db.createObjectStore('brews', { keyPath: 'id' })
        brews.createIndex('by-createdAt', 'createdAt')
        brews.createIndex('by-bagId', 'bagId')
      },
      blocked() { window.location.reload() },
      blocking(_cv, _nv, event) {
        ;(event.target as IDBDatabase).close()
        dbPromise = null
      },
    }).catch(err => { dbPromise = null; throw err })
  }
  return dbPromise
}

// ─── BEANS ───────────────────────────────────────────────────────────────────

export async function listBeans(): Promise<Bean[]> {
  const db = await getDb()
  const all = await db.getAll('beans')
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function getBeanById(id: string): Promise<Bean | undefined> {
  const db = await getDb()
  return db.get('beans', id)
}

export async function upsertBean(bean: Bean): Promise<void> {
  const db = await getDb()
  await db.put('beans', bean)
}

export async function deleteBean(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('beans', id)
}

// ─── BAGS ────────────────────────────────────────────────────────────────────

export async function listBags(): Promise<Bag[]> {
  const db = await getDb()
  const all = await db.getAll('bags')
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function getBagsByBeanId(beanId: string): Promise<Bag[]> {
  const db = await getDb()
  const all = await db.getAllFromIndex('bags', 'by-beanId', beanId)
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function upsertBag(bag: Bag): Promise<void> {
  const db = await getDb()
  await db.put('bags', bag)
}

export async function deleteBag(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('bags', id)
}

// ─── BREWS ───────────────────────────────────────────────────────────────────

export async function listBrews(): Promise<BrewLog[]> {
  const db = await getDb()
  const all = await db.getAll('brews')
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function getBrewsByBagId(bagId: string): Promise<BrewLog[]> {
  const db = await getDb()
  const all = await db.getAllFromIndex('brews', 'by-bagId', bagId)
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function addBrew(brew: BrewLog): Promise<void> {
  const db = await getDb()
  await db.add('brews', brew)
}

export async function updateBrew(brew: BrewLog): Promise<void> {
  const db = await getDb()
  await db.put('brews', brew)
}

export async function deleteBrew(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('brews', id)
}

// ─── UTILS ───────────────────────────────────────────────────────────────────

export function clearDatabase(): void {
  localStorage.setItem(RESET_FLAG, '1')
  window.location.reload()
}

// ─── SEED ────────────────────────────────────────────────────────────────────

export async function seedIfEmpty(): Promise<void> {
  const db = await getDb()
  const count = await db.count('beans')
  if (count > 0) return
  const beanId = crypto.randomUUID()
  const bean: Bean = {
    id: beanId,
    name: 'Demo Espresso Blend',
    roaster: 'Sample Roaster',
    origins: ['Brazil', 'Colombia'],
    roastLevel: 'medium',
    process: 'washed',
    preferredMethod: 'espresso',
    createdAt: new Date().toISOString(),
  }
  const bag: Bag = {
    id: crypto.randomUUID(),
    beanId,
    depleted: false,
    createdAt: new Date().toISOString(),
  }
  await db.add('beans', bean)
  await db.add('bags', bag)
}

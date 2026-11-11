import 'server-only'

import { cache } from 'react'
import { inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { userSettings } from '@/lib/db/schema'
import { DEFAULT_SETTINGS, mergeSettings, type Settings } from '@/lib/settings'

/** Settings for many users in one query; users without a row get the defaults. */
export async function getSettingsMap(userIds: string[]): Promise<Map<string, Settings>> {
  const ids = [...new Set(userIds)].filter(Boolean)
  const map = new Map<string, Settings>()
  if (!ids.length) return map
  try {
    const rows = await db.select().from(userSettings).where(inArray(userSettings.userId, ids))
    for (const row of rows) map.set(row.userId, mergeSettings(DEFAULT_SETTINGS, row.data))
  } catch (error) {
    // Without the table (a database where scripts/create-settings-table.mjs didn't run yet)
    // everyone gets the defaults instead of the whole screen failing.
    if (!isMissingTable(error)) throw error
    console.error('user_settings table missing: run scripts/create-settings-table.mjs')
  }
  for (const id of ids) if (!map.has(id)) map.set(id, DEFAULT_SETTINGS)
  return map
}

/** One lookup per user per request. */
export const getSettings = cache(async (userId: string): Promise<Settings> => (await getSettingsMap([userId])).get(userId) ?? DEFAULT_SETTINGS)

export class SettingsUnavailableError extends Error {
  constructor() {
    super('La configuración todavía no está disponible. Intentá más tarde.')
  }
}

export async function saveSettings(userId: string, next: Settings) {
  try {
    await saveSettingsRow(userId, next)
  } catch (error) {
    if (isMissingTable(error)) throw new SettingsUnavailableError()
    throw error
  }
}

async function saveSettingsRow(userId: string, next: Settings) {
  await db
    .insert(userSettings)
    .values({ userId, data: next, updatedAt: new Date() })
    .onConflictDoUpdate({ target: userSettings.userId, set: { data: next, updatedAt: new Date() } })
}

/** True when either side blocked the other. Keys are profile keys (`user:<id>`). */
export function isBlockedBetween(a: { key: string; settings: Settings }, b: { key: string; settings: Settings }) {
  return a.settings.blocked.includes(b.key) || b.settings.blocked.includes(a.key)
}

export const idFromKey = (key: string) => (key.startsWith('user:') ? key.slice(5) : null)

/** Postgres "undefined_table", also when drizzle wraps the driver error. */
export function isMissingTable(error: unknown): boolean {
  const e = error as { code?: string; cause?: { code?: string } } | null
  return e?.code === '42P01' || e?.cause?.code === '42P01'
}

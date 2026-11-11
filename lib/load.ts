'use client'

import type { DataFns } from '@/lib/data-fns'

type Fn = keyof DataFns

/** Reads data through /api/data so several screens can load at the same time. */
export async function load<K extends Fn>(fn: K, ...args: Parameters<DataFns[K]>): Promise<Awaited<ReturnType<DataFns[K]>>> {
  const res = await fetch('/api/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fn, args }),
    credentials: 'same-origin',
  })
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? `Error ${res.status}`)
  return res.json()
}

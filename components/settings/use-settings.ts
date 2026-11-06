'use client'

import { useCallback } from 'react'
import useSWR from 'swr'
import { getMySettings, setListMember, updateMySettings } from '@/app/actions/settings'
import { DEFAULT_SETTINGS, mergeSettings, type Settings } from '@/lib/settings'
import { load } from '@/lib/load'

type Patch = Parameters<typeof updateMySettings>[0]

/** Settings shared by every screen. Pass `enabled: false` for guests. */
export function useSettings(enabled = true) {
  const { data, mutate, isLoading } = useSWR(enabled ? 'settings' : null, () => load('getMySettings'), { revalidateOnFocus: false })

  const update = useCallback(
    async (patch: Patch) => {
      if (!data) return
      const optimistic = mergeSettings(data.settings, patch)
      mutate({ ...data, settings: optimistic }, { revalidate: false })
      const res = await updateMySettings(patch)
      mutate(res.ok ? { ...data, settings: res.settings } : data, { revalidate: false })
    },
    [data, mutate],
  )

  const setMember = useCallback(
    async (list: 'blocked' | 'muted' | 'restricted' | 'archived', key: string, on: boolean) => {
      if (!data) return
      const current = new Set(data.settings[list])
      if (on) current.add(key)
      else current.delete(key)
      mutate({ ...data, settings: { ...data.settings, [list]: [...current] } }, { revalidate: false })
      await setListMember(list, key, on)
      mutate()
    },
    [data, mutate],
  )

  return {
    settings: (data?.settings ?? DEFAULT_SETTINGS) as Settings,
    account: data?.account,
    ready: !!data,
    isLoading,
    update,
    setMember,
    refresh: () => mutate(),
  }
}

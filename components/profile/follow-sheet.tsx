'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Loader2, Lock } from 'lucide-react'
import { toggleFollow } from '@/app/actions/social'
import { PartyAvatar, Sheet } from '@/components/app/kit'
import { useNav } from '@/components/app/nav'
import { load } from '@/lib/load'
import { cn } from '@/lib/utils'

export type FollowTab = 'seguidores' | 'seguidos'

/** Lists who follows a profile and who it follows, with a follow button on each person. */
export function FollowSheet({ profileKey, name, initialTab, onClose, onChange }: { profileKey: string; name: string; initialTab: FollowTab; onClose: () => void; onChange?: () => void }) {
  const nav = useNav()
  const [tab, setTab] = useState<FollowTab>(initialTab)
  const { data, isLoading, mutate } = useSWR(['follow-list', profileKey, tab], () => load('getFollowList', profileKey, tab))

  async function follow(key: string) {
    if (!nav.requireAccount() || !data) return
    mutate({ ...data, people: data.people.map((p) => (p.key === key ? { ...p, iFollow: !p.iFollow } : p)) }, { revalidate: false })
    await toggleFollow(key)
    mutate()
    onChange?.()
  }

  function open(key: string) {
    onClose()
    nav.openProfile(key)
  }

  const empty = tab === 'seguidores' ? `Todavía nadie sigue a ${name}.` : `${name} todavía no sigue a nadie.`

  return (
    <Sheet title={name} onClose={onClose} modal>
      <div role="tablist" className="mb-3 grid grid-cols-2 rounded-full bg-secondary p-1 text-sm font-bold">
        {(['seguidores', 'seguidos'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn('rounded-full py-2 capitalize transition-colors', tab === t ? 'bg-background shadow-sm' : 'text-muted-foreground')}
          >
            {t}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="size-5 animate-spin text-muted-foreground" aria-label="Cargando" />
        </div>
      ) : data?.hidden ? (
        <p className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
          <Lock className="size-5" />
          Esta lista es privada.
        </p>
      ) : !data?.people.length ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="flex min-h-[40vh] flex-col gap-1">
          {data.people.map((p) => (
            <li key={p.key} className="flex items-center gap-3 rounded-xl py-1.5">
              <button type="button" onClick={() => open(p.key)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <PartyAvatar party={p} className="size-11" />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-bold">{p.name}</span>
                  {p.subtitle ? <span className="truncate text-xs text-muted-foreground">{p.subtitle}</span> : null}
                </span>
              </button>
              {p.isMe ? (
                <span className="text-xs font-semibold text-muted-foreground">Vos</span>
              ) : (
                <button
                  type="button"
                  onClick={() => follow(p.key)}
                  className={cn('shrink-0 rounded-full px-4 py-1.5 text-xs font-bold', p.iFollow ? 'bg-secondary' : 'bg-olympic-blue text-white')}
                >
                  {p.iFollow ? 'Siguiendo' : 'Seguir'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  )
}

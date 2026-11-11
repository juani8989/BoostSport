'use client'

import { useEffect, useState } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import { Bookmark, Check, FolderPlus, Loader2 } from 'lucide-react'
import { createSaveFolder, setSavedFolders } from '@/app/actions/settings'
import { Sheet } from '@/components/app/kit'
import { load } from '@/lib/load'
import { cn } from '@/lib/utils'

/** "Guardar en…": pick the folders a saved post goes in, or create a new one. */
export function SaveFolderSheet({ targetId, onClose }: { targetId: string; onClose: () => void }) {
  const { data, mutate, isLoading } = useSWR(['save-folders', targetId], () => load('getSaveFolders', targetId))
  const [chosen, setChosen] = useState<Set<string> | null>(null)
  const [name, setName] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const selected = chosen ?? new Set((data ?? []).filter((f) => f.has).map((f) => f.id))

  function toggle(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setChosen(next)
  }

  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setPending(true)
    const res = await createSaveFolder(name)
    setPending(false)
    if (!res.ok) return setError(res.error)
    setName('')
    setError(null)
    setChosen(new Set(selected).add(res.id))
    mutate()
  }

  async function done() {
    setPending(true)
    const res = await setSavedFolders(targetId, [...selected])
    setPending(false)
    if (!res.ok) return setError(res.error)
    globalMutate((key) => Array.isArray(key) && key[0] === 'save-folders')
    globalMutate('saved')
    globalMutate('companeros')
    onClose()
  }

  return (
    <Sheet
      title="Guardar en…"
      onClose={onClose}
      action={
        <button type="button" onClick={done} disabled={pending} className="rounded-full bg-olympic-blue px-4 py-2 text-sm font-bold text-olympic-white disabled:opacity-60">
          Listo
        </button>
      }
    >
      <p className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Bookmark className="size-4 fill-current" /> Ya está en Guardados. Sumalo también a una o más carpetas.
      </p>
      {isLoading ? <Loader2 className="mx-auto my-6 size-5 animate-spin text-muted-foreground" /> : null}
      <ul className="flex flex-col gap-2">
        {data?.map((f) => {
          const on = selected.has(f.id)
          return (
            <li key={f.id}>
              <button type="button" role="checkbox" aria-checked={on} onClick={() => toggle(f.id)} className="flex w-full items-center gap-3 rounded-xl bg-secondary px-3 py-2.5 text-left">
                {f.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.cover} alt="" className="size-11 rounded-lg object-cover" />
                ) : (
                  <span className="flex size-11 items-center justify-center rounded-lg bg-background">
                    <Bookmark className="size-5 text-muted-foreground" />
                  </span>
                )}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-semibold">{f.name}</span>
                  <span className="text-xs text-muted-foreground">{f.count} guardados</span>
                </span>
                <span className={cn('flex size-6 items-center justify-center rounded-full border-2', on ? 'border-olympic-blue bg-olympic-blue text-olympic-white' : 'border-muted-foreground/50')}>
                  {on ? <Check className="size-3.5" strokeWidth={3} /> : null}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {data && !data.length ? <p className="mb-2 text-sm text-muted-foreground">Todavía no tenés carpetas. Creá la primera:</p> : null}
      <form onSubmit={create} className="mt-4 flex gap-2">
        <label htmlFor="new-folder" className="sr-only">
          Nombre de la carpeta nueva
        </label>
        <input id="new-folder" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Nueva carpeta (ej: Entrenamientos)" className="min-w-0 flex-1 rounded-xl border border-input bg-background px-4 py-3 text-sm" />
        <button type="submit" disabled={pending || !name.trim()} className="flex shrink-0 items-center gap-1.5 rounded-xl bg-secondary px-4 text-sm font-bold disabled:opacity-50">
          <FolderPlus className="size-4" /> Crear
        </button>
      </form>
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
    </Sheet>
  )
}

/** Small notice after saving, with a shortcut to pick a folder. Hides itself after a few seconds. */
export function SavedToast({ onChoose, onDone }: { onChoose: () => void; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4500)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div role="status" className="absolute inset-x-3 bottom-24 z-50 flex items-center gap-3 rounded-2xl bg-foreground px-4 py-3 text-background shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-200 motion-reduce:animate-none md:bottom-6">
      <Bookmark className="size-5 shrink-0 fill-current" />
      <span className="flex-1 text-sm font-semibold">Guardado</span>
      <button type="button" onClick={onChoose} className="shrink-0 text-sm font-bold text-olympic-blue">
        Elegir carpeta
      </button>
    </div>
  )
}

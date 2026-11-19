'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { load } from '@/lib/load'
import { cn } from '@/lib/utils'
import { MessageCircle } from 'lucide-react'
import { Inbox } from '@/components/messages/inbox'
import { ChatThread } from '@/components/messages/chat-thread'

/**
 * The Mensajes tab. On phones the list fills the screen and a chat opens over it; on computers
 * the list stays on the left and the open chat sits next to it.
 */
export function Messages({ chatId, onOpen, onClose }: { chatId: number | null; onOpen: (matchId: number) => void; onClose: () => void }) {
  const [focus, setFocus] = useState<number | null>(null)
  const { data: chats } = useSWR('matches', () => load('getMatches'), { refreshInterval: 8000 })
  // With no chats yet the list already explains what to do: on computers it takes the middle of
  // the screen alone instead of repeating an empty message on the right.
  const empty = chats?.length === 0 && chatId === null

  return (
    <div className="flex h-full">
      <div className={cn('h-full w-full', empty ? 'md:mx-auto md:max-w-xl' : 'md:w-[380px] md:shrink-0 md:border-r md:border-border')}>
        <Inbox
          activeId={chatId}
          onOpen={(id, messageId) => {
            setFocus(messageId ?? null)
            onOpen(id)
          }}
        />
      </div>

      {chatId !== null ? (
        <ChatThread key={`${chatId}:${focus ?? ''}`} matchId={chatId} focusMessageId={focus} onBack={onClose} />
      ) : empty ? null : (
        <div className="hidden min-w-0 flex-1 flex-col items-center justify-center gap-3 px-6 text-center md:flex">
          <span className="flex size-16 items-center justify-center rounded-full bg-secondary">
            <MessageCircle className="size-7 text-olympic-blue" />
          </span>
          <p className="font-display text-2xl font-semibold">Tus mensajes</p>
          <p className="max-w-72 text-sm text-muted-foreground">Elegí un chat de la lista o empezá uno nuevo con alguien que seguís.</p>
        </div>
      )}
    </div>
  )
}

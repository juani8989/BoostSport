'use client'

import { useState } from 'react'
import { Gift, Heart, Search, Target, Trophy } from 'lucide-react'
import { companies, type Challenge, type Company } from '@/lib/catalog'
import { useNav } from '@/components/app/nav'
import { FeedSkeleton, Sheet } from '@/components/app/kit'
import { RealOrgSlide, useRealOrgs } from '@/components/home/real-org'
import { ApplySheet } from '@/components/home/apply-sheet'

export function EmpresasFeed() {
  const [applying, setApplying] = useState<{ company: Company; challenge?: Challenge } | null>(null)
  // Real sponsor accounts first (best fit for you on top), then the sample brands.
  const real = useRealOrgs('empresa')
  // Wait for them so the first card doesn't change under your finger.
  if (!real) return <FeedSkeleton label="Cargando sponsors" />

  return (
    <>
      {real.map((org, i) => (
        <RealOrgSlide key={org.key} org={org} eager={i === 0} />
      ))}
      {companies.map((company, index) => (
        <article key={company.key} className="relative h-full w-full shrink-0 snap-start snap-always overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={company.image} alt="" loading={index > 1 ? 'lazy' : 'eager'} className="absolute inset-0 size-full object-cover" />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/30" />

          <div className="relative flex h-full flex-col justify-end gap-4 overflow-y-auto px-4 pb-24 pt-36 md:mx-auto md:max-w-xl">
            <header className="flex items-center gap-3">
              <span className="flex size-12 items-center justify-center rounded-xl bg-olympic-yellow font-display text-lg font-semibold text-olympic-black">{company.initials}</span>
              <div className="flex min-w-0 flex-col leading-tight">
                <h2 className="font-display text-3xl font-semibold">{company.name}</h2>
                <span className="text-sm text-muted-foreground">{company.industry}</span>
              </div>
            </header>
            <p className="text-pretty text-sm leading-relaxed">{company.about}</p>

            <div className="grid grid-cols-2 gap-3">
              <InfoList icon={<Search className="size-4 text-olympic-blue" />} title="Qué buscan" items={company.lookingFor} />
              <InfoList icon={<Gift className="size-4 text-olympic-green" />} title="Beneficios" items={company.benefits} />
            </div>
            <InfoList icon={<Target className="size-4 text-olympic-red" />} title="Cómo acceder" items={company.howToAccess} />

            <div className="flex flex-col gap-2">
              <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-olympic-yellow">
                <Trophy className="size-4" />
                Desafíos abiertos
              </h3>
              {company.challenges.map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setApplying({ company, challenge: ch })}
                  className="flex flex-col gap-1 rounded-xl border border-olympic-yellow/40 bg-background/70 p-3 text-left backdrop-blur"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{ch.title}</span>
                    <span className="shrink-0 rounded-full bg-olympic-yellow px-2 py-0.5 text-[11px] font-bold text-olympic-black">Postularme</span>
                  </span>
                  <span className="text-xs leading-relaxed text-muted-foreground">{ch.detail}</span>
                  <span className="text-xs font-semibold text-olympic-green">Premio: {ch.reward}</span>
                  <span className="text-[11px] text-muted-foreground">{ch.deadline}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setApplying({ company })}
              className="flex items-center justify-center gap-2 rounded-full bg-olympic-blue px-5 py-3 font-bold text-olympic-white"
            >
              <Heart className="size-4" />
              Quiero ser su cara
            </button>
          </div>
        </article>
      ))}
      {applying ? <ApplySheet company={applying.company} challenge={applying.challenge} onClose={() => setApplying(null)} /> : null}
    </>
  )
}

function InfoList({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl bg-background/70 p-3 backdrop-blur">
      <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide">
        {icon}
        {title}
      </h3>
      <ul className="flex flex-col gap-1 text-xs leading-relaxed text-muted-foreground">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  )
}

/** Catalog sports are lowercase keys for matching ("mma", "boxeo"); show them as names ("MMA", "Boxeo"). */
const sportLabel = (s: string) => (s.length <= 3 ? s.toUpperCase() : s.charAt(0).toUpperCase() + s.slice(1))

/** A sponsor's own page (sample brands from the catalog): who they are, what they look for and their challenges. */
export function CompanyProfileSheet({ company, onClose }: { company: Company; onClose: () => void }) {
  const { role, requireAccount } = useNav()
  const [applying, setApplying] = useState<{ challenge?: Challenge } | null>(null)
  const canApply = role === 'deportista' || role === 'invitado'
  const apply = (challenge?: Challenge) => requireAccount() && setApplying({ challenge })

  return (
    <Sheet title={company.name} onClose={onClose}>
      <div className="-mx-5 -mt-4 flex flex-col gap-5">
        <div className="relative h-44 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={company.image} alt="" className="absolute inset-0 size-full object-cover" />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
          <header className="absolute inset-x-5 bottom-3 flex items-center gap-3">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-olympic-yellow font-display text-xl font-semibold text-olympic-black shadow-lg">{company.initials}</span>
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="font-display text-2xl font-semibold">{company.name}</span>
              <span className="text-sm text-muted-foreground">{company.industry}</span>
            </div>
          </header>
        </div>
        <div className="flex flex-col gap-4 px-5">
          <p className="text-pretty text-sm leading-relaxed">{company.about}</p>
          <div className="flex flex-wrap gap-1.5">
            {company.sports.filter((s) => s !== '*').map((s) => (
              <span key={s} className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold">
                {sportLabel(s)}
              </span>
            ))}
            {company.sports.includes('*') ? <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold">Todos los deportes</span> : null}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InfoList icon={<Search className="size-4 text-olympic-blue" />} title="Qué buscan" items={company.lookingFor} />
            <InfoList icon={<Gift className="size-4 text-olympic-green" />} title="Beneficios" items={company.benefits} />
          </div>
          <InfoList icon={<Target className="size-4 text-olympic-red" />} title="Cómo acceder" items={company.howToAccess} />
          {company.challenges.length ? (
            <section className="flex flex-col gap-2">
              <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-olympic-yellow">
                <Trophy className="size-4" />
                Desafíos abiertos
              </h3>
              {company.challenges.map((ch) => (
                <div key={ch.id} className="flex flex-col gap-1 rounded-xl border border-olympic-yellow/40 p-3">
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{ch.title}</span>
                    {canApply ? (
                      <button type="button" onClick={() => apply(ch)} className="shrink-0 rounded-full bg-olympic-yellow px-2.5 py-1 text-[11px] font-bold text-olympic-black">
                        Postularme
                      </button>
                    ) : null}
                  </span>
                  <span className="text-xs leading-relaxed text-muted-foreground">{ch.detail}</span>
                  <span className="text-xs font-semibold text-olympic-green">Premio: {ch.reward}</span>
                  <span className="text-[11px] text-muted-foreground">{ch.deadline}</span>
                </div>
              ))}
            </section>
          ) : null}
          {canApply ? (
            <button type="button" onClick={() => apply()} className="flex items-center justify-center gap-2 rounded-full bg-olympic-blue px-5 py-3 font-bold text-olympic-white">
              <Heart className="size-4" />
              Quiero ser su cara
            </button>
          ) : null}
        </div>
      </div>
      {applying ? <ApplySheet company={company} challenge={applying.challenge} onClose={() => setApplying(null)} /> : null}
    </Sheet>
  )
}

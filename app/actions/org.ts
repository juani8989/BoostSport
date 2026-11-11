'use server'

import { and, eq, inArray } from 'drizzle-orm'
import { generateText, Output } from 'ai'
import { z } from 'zod'
import { db } from '@/lib/db'
import { matches, messages, profiles, user } from '@/lib/db/schema'
import { partyFromProfile, requireViewer, userKey, type Party } from '@/lib/viewer'
import { companies, companyFromKey, seedAthleteFromKey, seedAthleteKey } from '@/lib/catalog'
import { athletes } from '@/lib/data'
import type { AthleteProfile, MerchItem, OrgProfile } from '@/lib/profile-types'
import type { OfferMeta } from '@/app/actions/match'
import { getSettingsMap, idFromKey } from '@/lib/user-settings'

export type SearchRole = 'deportista' | 'empresa' | 'evento'

export type Candidate = {
  party: Party
  needs: string[]
  summary: string
  invited: boolean
  matchId: number | null
}

export type ScoutResult = Candidate & { score: number; reason: string }

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string }

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

async function loadCandidates(viewerId: string, viewerKey: string, roles: SearchRole[]) {
  const rows = await db
    .select({ userId: profiles.userId, role: profiles.role, data: profiles.data, name: user.name })
    .from(profiles)
    .innerJoin(user, eq(user.id, profiles.userId))
    .where(inArray(profiles.role, roles))
    .limit(200)

  const list: Omit<Candidate, 'invited' | 'matchId'>[] = []
  if (roles.includes('deportista')) {
    for (const a of Object.values(athletes)) {
      const key = seedAthleteKey(a.id)
      list.push({
        party: { key, name: a.name, role: 'deportista', subtitle: `${a.sport} · ${a.city}`, image: a.image, initials: a.name.slice(0, 2).toUpperCase() },
        needs: a.sponsoredBy ? ['Indumentaria'] : ['Indumentaria', 'Viajes', 'Dinero'],
        summary: `${a.category} · ${a.level}. ${a.sponsoredBy ? `Patrocinado por ${a.sponsoredBy}.` : 'Busca su primer sponsor.'}`,
      })
    }
  }
  if (roles.includes('empresa')) {
    for (const c of companies) {
      list.push({
        party: { key: c.key, name: c.name, role: 'empresa', subtitle: c.industry, image: c.image, initials: c.initials },
        needs: [],
        summary: [c.lookingFor].flat().join(' · '),
      })
    }
  }
  for (const row of rows) {
    if (row.userId === viewerId) continue
    const key = userKey(row.userId)
    const data = row.data as AthleteProfile | OrgProfile
    list.push({
      party: partyFromProfile(key, data, row.name),
      needs: data.kind === 'deportista' ? data.needs ?? [] : [],
      summary:
        data.kind === 'deportista'
          ? [data.needsDetail, data.goals, data.achievements].filter(Boolean).join(' · ').slice(0, 400)
          : [data.lookingFor, data.description].filter(Boolean).join(' · ').slice(0, 400),
    })
  }

  const filtered = list.filter((c) => c.party.key !== viewerKey)
  const keys = filtered.map((c) => c.party.key)
  const existing = keys.length
    ? await db
        .select({ id: matches.id, athleteKey: matches.athleteKey, orgKey: matches.orgKey })
        .from(matches)
        .where(and(eq(matches.orgKey, viewerKey), inArray(matches.athleteKey, keys)))
    : []
  const byKey = new Map(existing.map((m) => [m.athleteKey, m.id]))
  return filtered.map((c) => ({ ...c, invited: byKey.has(c.party.key), matchId: byKey.get(c.party.key) ?? null }))
}

async function ensureMatch(targetKey: string, ownerKey: string) {
  const [created] = await db.insert(matches).values({ athleteKey: targetKey, orgKey: ownerKey }).onConflictDoNothing().returning({ id: matches.id })
  if (created) return { matchId: created.id, created: true }
  const [row] = await db.select({ id: matches.id }).from(matches).where(and(eq(matches.athleteKey, targetKey), eq(matches.orgKey, ownerKey))).limit(1)
  return { matchId: row?.id ?? null, created: false }
}

export type BrandCard = Candidate & {
  about: string
  lookingFor: string[]
  offers: string[]
  merch: MerchItem[]
  website: string
}

export async function listBrands(query: string): Promise<BrandCard[]> {
  const viewer = await requireViewer()
  if (viewer.role !== 'evento') return []
  const q = normalize(String(query ?? '').slice(0, 80).trim())
  const base = await loadCandidates(viewer.id, viewer.key, ['empresa'])
  const userIds = base.filter((c) => c.party.key.startsWith('user:')).map((c) => c.party.key.slice(5))
  const rows = userIds.length ? await db.select({ userId: profiles.userId, data: profiles.data }).from(profiles).where(inArray(profiles.userId, userIds)) : []
  const orgByKey = new Map(rows.map((r) => [userKey(r.userId), r.data as OrgProfile]))

  const cards = base.map((c): BrandCard => {
    const seed = companyFromKey(c.party.key)
    if (seed) {
      return { ...c, about: seed.about, lookingFor: seed.lookingFor, offers: [...seed.offers, ...seed.benefits], merch: [], website: '' }
    }
    const org = orgByKey.get(c.party.key)
    return {
      ...c,
      about: org?.description ?? '',
      lookingFor: org?.lookingFor ? [org.lookingFor] : [],
      offers: org?.merch?.length ? ['Producto', 'Indumentaria'] : [],
      merch: org?.merch ?? [],
      website: org?.website ?? '',
    }
  })
  const list = q ? cards.filter((c) => normalize(`${c.party.name} ${c.party.subtitle} ${c.about} ${c.lookingFor.join(' ')}`).includes(q)) : cards
  return list.slice(0, 30)
}

export type ContractDraft = { brandGives: string[]; eventGives: string[]; amount: string; duration: string; rationale: string }

const contractSchema = z.object({
  brandGives: z.array(z.string().max(60)).min(2).max(5).describe('Lo que aporta la marca, frases cortas'),
  eventGives: z.array(z.string().max(60)).min(2).max(5).describe('Lo que recibe la marca del evento, frases cortas'),
  amount: z.string().max(40).describe('Monto en pesos argentinos o "Canje"'),
  duration: z.string().max(40),
  rationale: z.string().max(240).describe('Una o dos oraciones: por qué ganan ambos'),
})

function templateContract(event: OrgProfile, brand: BrandCard): ContractDraft {
  const text = normalize(`${brand.party.subtitle} ${brand.about} ${brand.offers.join(' ')}`)
  const brandGives: string[] = []
  if (/indument|ropa|malla|kit/.test(text)) brandGives.push('Remera oficial para los corredores')
  if (/bebida|isoton|hidrat|nutri/.test(text)) brandGives.push('Hidratación en todos los puestos')
  if (/equip|antiparr|producto|skate|combate/.test(text) || brand.merch.length) brandGives.push('Productos para premiar al podio')
  brandGives.push('Aporte económico para la organización')
  if (brandGives.length < 3) brandGives.push('Activación en la expo del corredor')

  const reach = event.eventInfo?.reach ? ` (${event.eventInfo.reach.replace(/\.$/, '')})` : ''
  return {
    brandGives: brandGives.slice(0, 4),
    eventGives: [
      'Logo en remera, dorsal y podio',
      'Stand en la expo del corredor',
      'Menciones en redes y transmisión',
      'Cupos de inscripción para su equipo',
    ],
    amount: '$ 2.500.000 + canje',
    duration: event.eventDate ? `Edición ${event.eventDate.slice(0, 4)}` : 'Una edición',
    rationale: `${brand.party.name} llega a su público en ${event.orgName}${reach}, y el evento suma recursos y mejor experiencia para los corredores.`,
  }
}

async function findBrand(brandKey: string) {
  const all = await listBrands('')
  return all.find((b) => b.party.key === brandKey) ?? null
}

export async function draftContract(brandKey: string): Promise<Result<{ draft: ContractDraft; usedAi: boolean }>> {
  const viewer = await requireViewer()
  if (viewer.role !== 'evento' || viewer.profile.kind === 'deportista') return { ok: false, error: 'Solo eventos.' }
  const brand = await findBrand(String(brandKey))
  if (!brand) return { ok: false, error: 'Marca no encontrada.' }
  const event = viewer.profile

  try {
    const { output } = await generateText({
      model: 'anthropic/claude-sonnet-5.5',
      output: Output.object({ schema: contractSchema }),
      system:
        'Sos asesor comercial de eventos deportivos en Argentina. Proponés contratos de sponsoreo equilibrados donde ganan la marca y el evento. Sé concreto, realista y coherente con el rubro de la marca. Escribí en español rioplatense.',
      prompt: `Evento: ${event.orgName} (${event.category}), ${event.city}. Fecha: ${event.eventDate ?? 'a definir'}. ${event.description ?? ''} Alcance: ${event.eventInfo?.reach ?? 'sin datos'}.\n\nMarca: ${brand.party.name} (${brand.party.subtitle}). ${brand.about} Busca: ${brand.lookingFor.join(', ')}. Ofrece: ${brand.offers.join(', ')}. Productos: ${brand.merch.map((m) => m.name).join(', ') || 'sin datos'}.`,
    })
    return { ok: true, draft: output, usedAi: true }
  } catch (error) {
    console.error('draftContract failed, using template', error)
    return { ok: true, draft: templateContract(event, brand), usedAi: false }
  }
}

const cleanList = (list: unknown) =>
  (Array.isArray(list) ? list : []).map((i) => String(i).trim().slice(0, 60)).filter(Boolean).slice(0, 6)

export async function proposeContract(brandKey: string, draft: ContractDraft): Promise<Result<{ matchId: number }>> {
  const viewer = await requireViewer()
  if (viewer.role !== 'evento') return { ok: false, error: 'Solo eventos.' }
  const brand = await findBrand(String(brandKey))
  if (!brand) return { ok: false, error: 'Marca no encontrada.' }

  const items = cleanList(draft?.brandGives)
  const counterpart = cleanList(draft?.eventGives)
  if (!items.length || !counterpart.length) return { ok: false, error: 'Completá qué aporta cada parte.' }

  const { matchId, created } = await ensureMatch(brand.party.key, viewer.key)
  if (!matchId) return { ok: false, error: 'No se pudo enviar la propuesta.' }
  if (created) await db.insert(messages).values({ matchId, senderKey: 'system', kind: 'system', body: `${viewer.name} quiere sumarte como sponsor.` })

  const meta: OfferMeta = {
    type: 'Sponsoreo',
    items,
    counterpart,
    amount: String(draft.amount ?? '').trim().slice(0, 40),
    duration: String(draft.duration ?? '').trim().slice(0, 40) || 'A definir',
    rationale: String(draft.rationale ?? '').trim().slice(0, 240),
    status: 'pendiente',
  }
  const [inserted] = await db
    .insert(messages)
    .values({ matchId, senderKey: viewer.key, kind: 'offer', body: `Propuesta de sponsoreo de ${viewer.name}`, meta })
    .returning({ id: messages.id })

  if (brand.party.key.startsWith('seed:')) {
    await db.update(messages).set({ meta: { ...meta, status: 'aceptada' } }).where(eq(messages.id, inserted.id))
    await db.insert(messages).values({ matchId, senderKey: brand.party.key, kind: 'text', body: '¡Nos encanta! Aceptamos la propuesta. Coordinemos la entrega del material y la ubicación del stand.' })
  }
  return { ok: true, matchId }
}

export async function searchPeople(query: string, role: SearchRole): Promise<Candidate[]> {
  const viewer = await requireViewer()
  if (viewer.role === 'deportista') return []
  const allowed: SearchRole[] = viewer.role === 'evento' ? ['deportista', 'empresa'] : ['deportista', 'evento']
  if (!allowed.includes(role)) return []
  const q = normalize(String(query ?? '').slice(0, 80).trim())
  const loaded = await loadCandidates(viewer.id, viewer.key, [role])
  // Respect "Aparecer en búsquedas" and blocks.
  const settingsBy = await getSettingsMap([viewer.id, ...loaded.map((c) => idFromKey(c.party.key) ?? '')])
  const mine = settingsBy.get(viewer.id)
  const all = loaded.filter((c) => {
    const id = idFromKey(c.party.key)
    if (!id) return true
    const st = settingsBy.get(id)
    return st?.privacy.showInSearch !== false && !st?.blocked.includes(viewer.key) && !mine?.blocked.includes(c.party.key)
  })
  if (!q) return all.slice(0, 30)
  return all.filter((c) => normalize(`${c.party.name} ${c.party.subtitle} ${c.summary}`).includes(q)).slice(0, 30)
}

export async function invite(targetKey: string, note: string): Promise<Result<{ matchId: number }>> {
  const viewer = await requireViewer()
  if (viewer.role === 'deportista') return { ok: false, error: 'Solo empresas y eventos pueden invitar.' }
  if (typeof targetKey !== 'string' || !/^(user:[\w-]+|seed:(co|at)-[a-z]+)$/.test(targetKey) || targetKey === viewer.key) {
    return { ok: false, error: 'Perfil inválido.' }
  }
  if (viewer.role === 'empresa' && companyFromKey(targetKey)) return { ok: false, error: 'Perfil inválido.' }

  const text = String(note ?? '').trim().slice(0, 500)
  const what = viewer.role === 'evento' ? `participar en ${viewer.name}` : `sumarte al equipo de ${viewer.name}`
  const body = text || `¡Hola! Te invitamos a ${what}. ¿Te interesa?`

  const { matchId, created } = await ensureMatch(targetKey, viewer.key)
  if (!matchId) return { ok: false, error: 'No se pudo enviar la invitación.' }

  if (created) await db.insert(messages).values({ matchId, senderKey: 'system', kind: 'system', body: `${viewer.name} te envió una invitación.` })
  await db.insert(messages).values({ matchId, senderKey: viewer.key, kind: 'text', body })

  const seed = seedAthleteFromKey(targetKey) ?? companyFromKey(targetKey)
  if (seed) {
    await db.insert(messages).values({ matchId, senderKey: targetKey, kind: 'text', body: '¡Gracias por la invitación! Me encanta la propuesta, hablemos de los detalles.' })
  }
  return { ok: true, matchId }
}

const scoutSchema = z.object({
  results: z.array(
    z.object({
      key: z.string(),
      score: z.number().min(0).max(100),
      reason: z.string().describe('Una oración en español explicando por qué encaja o no'),
    }),
  ),
})

export async function aiScout(brief: string): Promise<Result<{ results: ScoutResult[]; usedAi: boolean }>> {
  const viewer = await requireViewer()
  if (viewer.role !== 'empresa' || viewer.profile.kind === 'deportista') return { ok: false, error: 'Solo empresas.' }
  const request = String(brief ?? '').trim().slice(0, 400)
  if (request.length < 5) return { ok: false, error: 'Contale a la IA qué perfil buscás.' }

  const candidates = await loadCandidates(viewer.id, viewer.key, ['deportista'])
  const byKey = new Map(candidates.map((c) => [c.party.key, c]))
  const roster = candidates.map((c) => ({ key: c.party.key, nombre: c.party.name, disciplina: c.party.subtitle, necesita: c.needs, resumen: c.summary }))

  try {
    const { output } = await generateText({
      model: 'anthropic/claude-sonnet-5.5',
      output: Output.object({ schema: scoutSchema }),
      system:
        'Sos un scout de patrocinios deportivos. Evaluás candidatos para una marca y devolvés SOLO los que encajan con el pedido (score >= 50), ordenados de mayor a menor. Considerá la disciplina (deportes acuáticos incluyen natación, aguas abiertas, waterpolo, remo, surf, kayak, buceo, nado sincronizado, triatlón parcialmente) y si necesitan sponsor. Usá solo keys de la lista.',
      prompt: `Marca: ${viewer.profile.orgName} (${viewer.profile.category}). Busca: ${viewer.profile.lookingFor}\n\nPedido del usuario: ${request}\n\nCandidatos:\n${JSON.stringify(roster)}`,
    })
    const results = output.results
      .filter((r) => byKey.has(r.key))
      .sort((a, b) => b.score - a.score)
      .map((r) => ({ ...byKey.get(r.key)!, score: Math.round(r.score), reason: r.reason }))
    return { ok: true, results, usedAi: true }
  } catch (error) {
    console.error('aiScout failed, using keyword fallback', error)
    const water = /nata|agua|water|remo|surf|kayak|buceo|triat|canot/
    const results = candidates
      .filter((c) => water.test(normalize(`${c.party.subtitle} ${c.summary}`)))
      .map((c) => ({ ...c, score: 70 + Math.min(c.needs.length, 3) * 8, reason: 'Disciplina acuática y busca apoyo (filtro por palabras clave).' }))
      .sort((a, b) => b.score - a.score)
    return { ok: true, results, usedAi: false }
  }
}

'use server'

import { and, count, desc, eq, gte, inArray, like, max, ne, or, sql } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { account, comments, follows, matches, messages, posts, profiles, reactions, reports, session, swipes, user } from '@/lib/db/schema'
import { ADMIN_ROLE, requireAdmin } from '@/lib/admin'
import { convertProfile, emptyProfile, profileDisplayName, profileImage } from '@/lib/admin-profiles'
import { ROLES, type AthleteProfile, type OrgProfile, type Role } from '@/lib/profile-types'
import { userKey } from '@/lib/viewer'
import { completenessOf, profileChecklist } from '@/lib/profile-checklist'
import { emailProvider, sendEmail, takeEmailFailure } from '@/lib/email'
import { emailLayout } from '@/lib/emails/layout'
import { profileReminderMessage } from '@/lib/emails/profile-reminder'
import { siteUrl } from '@/lib/site-url'

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string }

const MAX_PROFILE_BYTES = 3_000_000
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Profile keys are stored as `user:<id>` in matches, follows and swipes.
const keyOf = userKey

export type AdminUserRow = {
  id: string
  role: Role | null
  name: string
  displayName: string
  email: string
  emailVerified: boolean
  image?: string
  country: string
  detail: string
  city: string
  identityVerified: boolean
  createdAt: string
  lastSeen: string | null
  posts: number
  matches: number
  completeness: number
  /** Profile items still empty, in the order the checklist lists them. */
  missing: { key: string; label: string }[]
}

export type AdminOverview = {
  counts: Record<Role, number>
  totalUsers: number
  withoutProfile: number
  admins: number
  posts: number
  comments: number
  matches: number
  messages: number
  reports: number
  newThisWeek: number
  activeThisWeek: number
  signups: { day: string; count: number }[]
  recent: AdminUserRow[]
}

export type AdminUserDetail = {
  user: { id: string; name: string; email: string; emailVerified: boolean; image: string | null; createdAt: string; updatedAt: string }
  role: Role | typeof ADMIN_ROLE | null
  profile: AthleteProfile | OrgProfile | null
  profileUpdatedAt: string | null
  hasPassword: boolean
  sessions: { id: string; createdAt: string; expiresAt: string; ipAddress: string | null; userAgent: string | null }[]
  posts: { id: number; kind: string; body: string; mediaUrl: string | null; createdAt: string }[]
  comments: { id: number; targetId: string; body: string; createdAt: string }[]
  matches: { id: number; otherKey: string; otherName: string; createdAt: string; messages: number }[]
  followers: number
  following: number
  reportsMade: number
  reactions: number
}

function progressOf(profile: AthleteProfile | OrgProfile | null) {
  const items = profileChecklist(profile)
  return { completeness: completenessOf(items), missing: items.filter((i) => !i.done).map(({ key, label }) => ({ key, label })) }
}

async function buildRows(userIds?: string[], role?: Role): Promise<AdminUserRow[]> {
  const where = role ? eq(profiles.role, role) : userIds ? inArray(user.id, userIds.length ? userIds : ['']) : undefined
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      role: profiles.role,
      data: profiles.data,
    })
    .from(user)
    .leftJoin(profiles, eq(profiles.userId, user.id))
    .where(where)
    .orderBy(desc(user.createdAt))

  const ids = rows.map((r) => r.id)
  if (!ids.length) return []

  const [seen, postCounts, matchCounts] = await Promise.all([
    db.select({ userId: session.userId, last: max(session.updatedAt) }).from(session).where(inArray(session.userId, ids)).groupBy(session.userId),
    db.select({ userId: posts.userId, n: count() }).from(posts).where(inArray(posts.userId, ids)).groupBy(posts.userId),
    db
      .select({ athleteKey: matches.athleteKey, orgKey: matches.orgKey })
      .from(matches)
      .where(or(inArray(matches.athleteKey, ids.map(keyOf)), inArray(matches.orgKey, ids.map(keyOf)))),
  ])
  const seenBy = new Map(seen.map((s) => [s.userId, s.last]))
  const postsBy = new Map(postCounts.map((p) => [p.userId, p.n]))
  const matchesBy = new Map<string, number>()
  for (const m of matchCounts) for (const k of [m.athleteKey, m.orgKey]) matchesBy.set(k, (matchesBy.get(k) ?? 0) + 1)

  return rows
    .filter((r) => r.role !== ADMIN_ROLE)
    .map((r) => {
      const profile = (r.data as AthleteProfile | OrgProfile | null) ?? null
      const isAthlete = profile?.kind === 'deportista'
      return {
        id: r.id,
        role: (r.role as Role | null) ?? null,
        name: r.name,
        displayName: profileDisplayName(profile, r.name),
        email: r.email,
        emailVerified: r.emailVerified,
        image: profileImage(profile),
        country: profile?.country ?? '',
        detail: profile ? (isAthlete ? (profile as AthleteProfile).discipline : (profile as OrgProfile).category) : '',
        city: profile && !isAthlete ? (profile as OrgProfile).city : '',
        identityVerified: isAthlete ? (profile as AthleteProfile).identityVerified : false,
        createdAt: r.createdAt.toISOString(),
        lastSeen: seenBy.get(r.id)?.toISOString() ?? null,
        posts: postsBy.get(r.id) ?? 0,
        matches: matchesBy.get(keyOf(r.id)) ?? 0,
        ...progressOf(profile),
      }
    })
}

export async function getAdminOverview(): Promise<AdminOverview> {
  await requireAdmin()
  const weekAgo = new Date(Date.now() - 7 * 86_400_000)
  const twoWeeksAgo = new Date(Date.now() - 13 * 86_400_000)
  twoWeeksAgo.setHours(0, 0, 0, 0)

  const n = (q: ReturnType<typeof sql>) => sql<number>`(${q})`.mapWith(Number)
  // All totals in a single round trip; the database is far from the app in development.
  const [[totals], byRole, signupRows, recentIds] = await Promise.all([
    db
      .select({
        total: n(sql`select count(*) from ${user}`),
        posts: n(sql`select count(*) from ${posts}`),
        comments: n(sql`select count(*) from ${comments}`),
        matches: n(sql`select count(*) from ${matches}`),
        messages: n(sql`select count(*) from ${messages}`),
        reports: n(sql`select count(*) from ${reports}`),
        newThisWeek: n(sql`select count(*) from ${user} where ${user.createdAt} >= ${weekAgo}`),
        activeThisWeek: n(sql`select count(distinct ${session.userId}) from ${session} where ${session.updatedAt} >= ${weekAgo}`),
      })
      .from(sql`(select 1) as one`),
    db.select({ role: profiles.role, n: count() }).from(profiles).groupBy(profiles.role),
    db
      .select({ day: sql<string>`to_char(${user.createdAt}, 'YYYY-MM-DD')`, n: count() })
      .from(user)
      .where(gte(user.createdAt, twoWeeksAgo))
      .groupBy(sql`1`),
    db.select({ id: user.id }).from(user).orderBy(desc(user.createdAt)).limit(8),
  ])
  const { total, posts: postsN, comments: commentsN, matches: matchesN, messages: messagesN, reports: reportsN, newThisWeek: newN, activeThisWeek: activeN } = totals

  const roleCount = new Map(byRole.map((r) => [r.role, r.n]))
  const withProfile = byRole.reduce((acc, r) => acc + r.n, 0)
  const perDay = new Map(signupRows.map((r) => [r.day, r.n]))
  const signups = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(twoWeeksAgo.getTime() + i * 86_400_000)
    const day = d.toISOString().slice(0, 10)
    return { day, count: perDay.get(day) ?? 0 }
  })

  return {
    counts: { deportista: roleCount.get('deportista') ?? 0, empresa: roleCount.get('empresa') ?? 0, evento: roleCount.get('evento') ?? 0 },
    totalUsers: total,
    withoutProfile: total - withProfile,
    admins: roleCount.get(ADMIN_ROLE) ?? 0,
    posts: postsN,
    comments: commentsN,
    matches: matchesN,
    messages: messagesN,
    reports: reportsN,
    newThisWeek: newN,
    activeThisWeek: activeN,
    signups,
    recent: await buildRows(recentIds.map((r) => r.id)),
  }
}

export async function listAdminUsers(role: Role | 'sin-perfil'): Promise<AdminUserRow[]> {
  await requireAdmin()
  if (role !== 'sin-perfil') return buildRows(undefined, role)
  const orphans = await db
    .select({ id: user.id })
    .from(user)
    .leftJoin(profiles, eq(profiles.userId, user.id))
    .where(sql`${profiles.userId} is null`)
  return buildRows(orphans.map((o) => o.id))
}

export async function getAdminUser(id: string): Promise<AdminUserDetail | null> {
  await requireAdmin()
  const [u] = await db.select().from(user).where(eq(user.id, id)).limit(1)
  if (!u) return null
  const key = keyOf(id)

  const [[p], creds, sess, userPosts, userComments, userMatches, [{ n: followers }], [{ n: following }], [{ n: reportsMade }], [{ n: reactionsN }]] = await Promise.all([
    db.select().from(profiles).where(eq(profiles.userId, id)).limit(1),
    db.select({ id: account.id }).from(account).where(and(eq(account.userId, id), eq(account.providerId, 'credential'))).limit(1),
    db.select().from(session).where(eq(session.userId, id)).orderBy(desc(session.updatedAt)),
    db.select().from(posts).where(eq(posts.userId, id)).orderBy(desc(posts.createdAt)).limit(200),
    db.select().from(comments).where(eq(comments.userId, id)).orderBy(desc(comments.createdAt)).limit(200),
    db.select().from(matches).where(or(eq(matches.athleteKey, key), eq(matches.orgKey, key))).orderBy(desc(matches.createdAt)),
    db.select({ n: count() }).from(follows).where(eq(follows.targetId, key)),
    db.select({ n: count() }).from(follows).where(eq(follows.followerId, id)),
    db.select({ n: count() }).from(reports).where(eq(reports.userId, id)),
    db.select({ n: count() }).from(reactions).where(eq(reactions.userId, id)),
  ])

  const otherKeys = userMatches.map((m) => (m.athleteKey === key ? m.orgKey : m.athleteKey))
  const otherIds = otherKeys.filter((k) => k.startsWith('user:')).map((k) => k.slice(5))
  const [others, msgCounts] = await Promise.all([
    otherIds.length
      ? db.select({ id: user.id, name: user.name, data: profiles.data }).from(user).leftJoin(profiles, eq(profiles.userId, user.id)).where(inArray(user.id, otherIds))
      : Promise.resolve([]),
    userMatches.length
      ? db.select({ matchId: messages.matchId, n: count() }).from(messages).where(inArray(messages.matchId, userMatches.map((m) => m.id))).groupBy(messages.matchId)
      : Promise.resolve([]),
  ])
  const otherName = new Map(others.map((o) => [keyOf(o.id), profileDisplayName(o.data as AthleteProfile | OrgProfile | null, o.name)]))
  const msgBy = new Map(msgCounts.map((m) => [m.matchId, m.n]))

  return {
    user: { id: u.id, name: u.name, email: u.email, emailVerified: u.emailVerified, image: u.image, createdAt: u.createdAt.toISOString(), updatedAt: u.updatedAt.toISOString() },
    role: (p?.role as Role | typeof ADMIN_ROLE | undefined) ?? null,
    profile: (p?.data as AthleteProfile | OrgProfile | undefined) ?? null,
    profileUpdatedAt: p?.updatedAt.toISOString() ?? null,
    hasPassword: creds.length > 0,
    sessions: sess.map((s) => ({ id: s.id, createdAt: s.createdAt.toISOString(), expiresAt: s.expiresAt.toISOString(), ipAddress: s.ipAddress, userAgent: s.userAgent })),
    posts: userPosts.map((x) => ({ id: x.id, kind: x.kind, body: x.body, mediaUrl: x.mediaUrl, createdAt: x.createdAt.toISOString() })),
    comments: userComments.map((c) => ({ id: c.id, targetId: c.targetId, body: c.body, createdAt: c.createdAt.toISOString() })),
    matches: userMatches.map((m, i) => ({
      id: m.id,
      otherKey: otherKeys[i],
      otherName: otherName.get(otherKeys[i]) ?? otherKeys[i].replace(/^seed:/, 'Catálogo · '),
      createdAt: m.createdAt.toISOString(),
      messages: msgBy.get(m.id) ?? 0,
    })),
    followers,
    following,
    reportsMade,
    reactions: reactionsN,
  }
}

function validProfile(role: Role, profile: AthleteProfile | OrgProfile): string | null {
  if (!ROLES.includes(role)) return 'Rol inválido.'
  if (!profile || typeof profile !== 'object' || profile.kind !== role) return 'El perfil no coincide con la categoría.'
  if (JSON.stringify(profile).length > MAX_PROFILE_BYTES) return 'El perfil es demasiado grande. Probá con fotos más livianas.'
  if (profile.kind === 'deportista' && !`${profile.firstName}${profile.lastName}`.trim()) return 'Completá el nombre del deportista.'
  if (profile.kind !== 'deportista' && !profile.orgName.trim()) return 'Completá el nombre de la organización.'
  return null
}

export async function adminCreateUser(input: { role: Role; name: string; email: string; password: string; emailVerified: boolean }): Promise<Result<{ id: string }>> {
  await requireAdmin()
  const email = input.email.trim().toLowerCase()
  const name = input.name.trim()
  if (!ROLES.includes(input.role)) return { ok: false, error: 'Elegí una categoría.' }
  if (!name) return { ok: false, error: 'Completá el nombre.' }
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'El email no es válido.' }
  if (input.password.length < 8) return { ok: false, error: 'La contraseña debe tener al menos 8 caracteres.' }

  const [taken] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1)
  if (taken) return { ok: false, error: 'Ya existe un usuario con ese email.' }

  // Created directly instead of through sign-up, so no confirmation email goes out:
  // the admin decides whether the address counts as verified.
  const ctx = await auth.$context
  const created = await ctx.internalAdapter.createUser({ email, name, emailVerified: input.emailVerified }, { method: 'admin' })
  const id = created.id
  await ctx.internalAdapter.linkAccount({ userId: id, providerId: 'credential', accountId: id, password: await ctx.password.hash(input.password) })
  await db.insert(profiles).values({ userId: id, role: input.role, data: emptyProfile(input.role, name) })
  return { ok: true, id }
}

export async function adminUpdateAccount(id: string, input: { name: string; email: string; emailVerified: boolean }): Promise<Result> {
  await requireAdmin()
  const email = input.email.trim().toLowerCase()
  if (!input.name.trim()) return { ok: false, error: 'Completá el nombre.' }
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'El email no es válido.' }
  const [taken] = await db.select({ id: user.id }).from(user).where(and(eq(user.email, email), ne(user.id, id))).limit(1)
  if (taken) return { ok: false, error: 'Ese email ya lo usa otro usuario.' }
  await db.update(user).set({ name: input.name.trim(), email, emailVerified: input.emailVerified, updatedAt: new Date() }).where(eq(user.id, id))
  return { ok: true }
}

export async function adminUpdateProfile(id: string, profile: AthleteProfile | OrgProfile): Promise<Result> {
  await requireAdmin()
  const [row] = await db.select({ role: profiles.role }).from(profiles).where(eq(profiles.userId, id)).limit(1)
  const role = (row?.role ?? profile?.kind) as Role
  const error = validProfile(role, profile)
  if (error) return { ok: false, error }
  if (row) await db.update(profiles).set({ data: profile, updatedAt: new Date() }).where(eq(profiles.userId, id))
  else await db.insert(profiles).values({ userId: id, role, data: profile })
  return { ok: true }
}

export async function adminChangeRole(id: string, role: Role): Promise<Result> {
  const admin = await requireAdmin()
  if (id === admin.id) return { ok: false, error: 'No podés cambiar tu propia categoría.' }
  if (!ROLES.includes(role)) return { ok: false, error: 'Categoría inválida.' }
  const [[row], [u]] = await Promise.all([
    db.select().from(profiles).where(eq(profiles.userId, id)).limit(1),
    db.select({ name: user.name }).from(user).where(eq(user.id, id)).limit(1),
  ])
  if (!u) return { ok: false, error: 'El usuario no existe.' }
  const next = row ? convertProfile(row.data as AthleteProfile | OrgProfile, role) : emptyProfile(role, u.name)
  if (row) await db.update(profiles).set({ role, data: next, updatedAt: new Date() }).where(eq(profiles.userId, id))
  else await db.insert(profiles).values({ userId: id, role, data: next })
  return { ok: true }
}

export async function adminSetPassword(id: string, password: string): Promise<Result> {
  await requireAdmin()
  if (password.length < 8) return { ok: false, error: 'La contraseña debe tener al menos 8 caracteres.' }
  const ctx = await auth.$context
  const hash = await ctx.password.hash(password)
  const updated = await db
    .update(account)
    .set({ password: hash, updatedAt: new Date() })
    .where(and(eq(account.userId, id), eq(account.providerId, 'credential')))
    .returning({ id: account.id })
  if (!updated.length) {
    await db.insert(account).values({ id: crypto.randomUUID(), accountId: id, providerId: 'credential', userId: id, password: hash })
  }
  await db.delete(session).where(eq(session.userId, id))
  return { ok: true }
}

export async function adminRevokeSessions(id: string, sessionId?: string): Promise<Result> {
  const admin = await requireAdmin()
  if (id === admin.id && !sessionId) return { ok: false, error: 'No podés cerrar todas tus propias sesiones desde acá.' }
  await db.delete(session).where(sessionId ? and(eq(session.userId, id), eq(session.id, sessionId)) : eq(session.userId, id))
  return { ok: true }
}

async function purgeUser(id: string) {
  const key = keyOf(id)
  const userPosts = await db.select({ id: posts.id }).from(posts).where(eq(posts.userId, id))
  const postTargets = userPosts.map((p) => `post:${p.id}`)
  const userMatches = await db.select({ id: matches.id }).from(matches).where(or(eq(matches.athleteKey, key), eq(matches.orgKey, key)))
  const matchIds = userMatches.map((m) => m.id)

  await Promise.all([
    matchIds.length ? db.delete(messages).where(inArray(messages.matchId, matchIds)) : null,
    db.delete(messages).where(eq(messages.senderKey, key)),
    postTargets.length ? db.delete(comments).where(inArray(comments.targetId, postTargets)) : null,
    postTargets.length ? db.delete(reactions).where(inArray(reactions.targetId, postTargets)) : null,
    postTargets.length ? db.delete(reports).where(inArray(reports.targetId, postTargets)) : null,
    db.delete(comments).where(eq(comments.userId, id)),
    db.delete(reactions).where(or(eq(reactions.userId, id), like(reactions.targetId, `%${key}`))),
    db.delete(reports).where(eq(reports.userId, id)),
    db.delete(follows).where(or(eq(follows.followerId, id), eq(follows.targetId, key))),
    db.delete(swipes).where(or(eq(swipes.userId, id), eq(swipes.targetId, key))),
  ])
  await Promise.all([
    matchIds.length ? db.delete(matches).where(inArray(matches.id, matchIds)) : null,
    db.delete(posts).where(eq(posts.userId, id)),
    db.delete(profiles).where(eq(profiles.userId, id)),
  ])
  // session and account rows cascade from user.
  await db.delete(user).where(eq(user.id, id))
}

export async function adminDeleteUsers(ids: string[]): Promise<Result<{ deleted: number }>> {
  const admin = await requireAdmin()
  const targets = [...new Set(ids)].filter((id) => typeof id === 'string' && id !== admin.id)
  if (!targets.length) return { ok: false, error: 'No hay usuarios para eliminar.' }
  for (const id of targets) await purgeUser(id)
  return { ok: true, deleted: targets.length }
}

export async function adminDeletePost(postId: number): Promise<Result> {
  await requireAdmin()
  const target = `post:${postId}`
  await Promise.all([
    db.delete(comments).where(eq(comments.targetId, target)),
    db.delete(reactions).where(eq(reactions.targetId, target)),
    db.delete(reports).where(eq(reports.targetId, target)),
  ])
  await db.delete(posts).where(eq(posts.id, postId))
  return { ok: true }
}

export async function adminDeleteComment(commentId: number): Promise<Result> {
  await requireAdmin()
  await db.delete(comments).where(eq(comments.id, commentId))
  return { ok: true }
}

export async function adminDeleteMatch(matchId: number): Promise<Result> {
  await requireAdmin()
  await db.delete(messages).where(eq(messages.matchId, matchId))
  await db.delete(matches).where(eq(matches.id, matchId))
  return { ok: true }
}

/**
 * Emails the person the profile items they still have to fill in, with a button back to the app.
 * `keys` limits the list to the items the admin picked; omitted, it sends everything missing.
 */
export async function adminRemindProfile(id: string, input: { keys?: string[]; note?: string } = {}): Promise<Result<{ sent: number }>> {
  await requireAdmin()
  const [row] = await db
    .select({ email: user.email, name: user.name, data: profiles.data })
    .from(user)
    .leftJoin(profiles, eq(profiles.userId, user.id))
    .where(eq(user.id, id))
    .limit(1)
  if (!row) return { ok: false, error: 'El usuario no existe.' }
  const profile = (row.data as AthleteProfile | OrgProfile | null) ?? null
  if (!profile) return { ok: false, error: 'El usuario no tiene perfil.' }

  const missing = profileChecklist(profile).filter((i) => !i.done && (!input.keys?.length || input.keys.includes(i.key)))
  if (!missing.length) return { ok: false, error: 'No le falta nada para completar.' }
  const note = typeof input.note === 'string' ? input.note.trim().slice(0, 500) : ''

  try {
    const message = profileReminderMessage({
      name: profileDisplayName(profile, row.name),
      actions: missing.map((i) => i.action),
      note,
      appUrl: siteUrl(),
      percent: completenessOf(profileChecklist(profile)),
    })
    await sendEmail({ to: row.email, ...message })
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'No pudimos enviar el mail.' }
  }
  return { ok: true, sent: missing.length }
}

/** Sends a test email to the sending inbox itself and reports the exact error, to diagnose delivery in production. */
export async function adminTestEmail(): Promise<Result<{ provider: string; to: string }>> {
  const admin = await requireAdmin()
  const provider = emailProvider()
  if (!provider) return { ok: false, error: 'No hay datos de envío configurados en este entorno: faltan GMAIL_USER y GMAIL_APP_PASSWORD (o RESEND_API_KEY).' }
  const to = process.env.GMAIL_USER?.trim() || admin.email
  try {
    await sendEmail({
      to,
      subject: 'Prueba de envío de BoostSport',
      text: `Mail de prueba enviado desde ${siteUrl()} con ${provider}.`,
      html: emailLayout({ title: 'Prueba de envío', rows: `<tr><td style="padding:16px 32px 32px;font-size:15px;line-height:1.6;color:#a3a3a3;">Mail de prueba enviado desde ${siteUrl()} con ${provider}. Si lo estás leyendo, el envío funciona.</td></tr>` }),
    })
  } catch {
    return { ok: false, error: `Falló el envío con ${provider}: ${takeEmailFailure(to) ?? 'error desconocido'}` }
  }
  return { ok: true, provider, to }
}

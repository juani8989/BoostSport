import 'server-only'

import { eq, inArray, like, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { comments, follows, matches, messages, posts, profiles, reactions, reports, swipes, user } from '@/lib/db/schema'
import { userKey } from '@/lib/viewer'

/** Deletes a user and everything they created or that points at them. */
export async function purgeUser(id: string) {
  const key = userKey(id)
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

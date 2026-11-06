import 'server-only'

import { getComments, getCompanerosFeed, getEventsState } from '@/app/actions/social'
import { getDeck, getMatches, getThread } from '@/app/actions/match'
import { listBrands, searchPeople } from '@/app/actions/org'
import { getAthleteMentions, getAthleteProfile } from '@/app/actions/athlete'
import { getProfilePosts, getReactors } from '@/app/actions/posts'
import { getKnownPeople, getMyActivity, getMyDeals, getMyPosts, getMySessions, getMySettings, getMyStats, getPeople, getSaved } from '@/app/actions/settings'
import { getAdminOverview, getAdminUser, listAdminUsers } from '@/app/actions/admin'

/**
 * Read-only data the screens load through /api/data. Next.js runs server actions one at a
 * time per tab, so reads that go through it queue behind each other (and behind polling);
 * plain requests run in parallel. Writes stay as server actions.
 */
export const dataFns = {
  getAdminOverview,
  getAdminUser,
  getAthleteMentions,
  getAthleteProfile,
  getComments,
  getCompanerosFeed,
  getDeck,
  getEventsState,
  getKnownPeople,
  getMatches,
  getMyActivity,
  getMyDeals,
  getMyPosts,
  getMySessions,
  getMySettings,
  getMyStats,
  getPeople,
  getProfilePosts,
  getReactors,
  getSaved,
  getThread,
  listAdminUsers,
  listBrands,
  searchPeople,
}

export type DataFns = typeof dataFns

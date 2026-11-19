import 'server-only'

import { getComments, getCompanerosFeed, getEventsState } from '@/app/actions/social'
import { getDeck, getMatches, getThread } from '@/app/actions/match'
import { getContacts, searchMessages } from '@/app/actions/chat'
import { listBrands, searchPeople } from '@/app/actions/org'
import { getAthleteMentions, getAthleteProfile, getFollowList } from '@/app/actions/athlete'
import { getProfilePosts, getReactors } from '@/app/actions/posts'
import { getKnownPeople, getMyActivity, getMyDeals, getMyPosts, getMySessions, getMySettings, getMyStats, getPeople, getSaveFolders, getSaved } from '@/app/actions/settings'
import { getAdminOverview, getAdminUser, listAdminUsers } from '@/app/actions/admin'
import { getMyNotifications } from '@/app/actions/notifications'
import { getSearchExplore, searchEverything } from '@/app/actions/search'
import { getVitrinaFeed } from '@/app/actions/vitrina'
import { getRealOrg, getRealOrgs } from '@/app/actions/orgs'

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
  getContacts,
  getDeck,
  getEventsState,
  getFollowList,
  getKnownPeople,
  getMatches,
  getMyActivity,
  getMyDeals,
  getMyNotifications,
  getMyPosts,
  getMySessions,
  getMySettings,
  getMyStats,
  getPeople,
  getProfilePosts,
  getRealOrg,
  getRealOrgs,
  getReactors,
  getSaveFolders,
  getSaved,
  getSearchExplore,
  getThread,
  getVitrinaFeed,
  listAdminUsers,
  listBrands,
  searchEverything,
  searchMessages,
  searchPeople,
}

export type DataFns = typeof dataFns

import type { AthleteProfile, OrgProfile, Role } from '@/lib/profile-types'

export function emptyAthleteProfile(firstName = '', lastName = ''): AthleteProfile {
  return {
    kind: 'deportista',
    firstName,
    lastName,
    country: 'Argentina',
    discipline: '',
    famous: false,
    identityVerified: false,
    age: '',
    goals: '',
    achievements: '',
    studies: '',
    recognitions: '',
    timeline: [],
    gallery: [],
    socials: { instagram: '', tiktok: '', x: '', youtube: '' },
    needs: [],
    needsDetail: '',
  }
}

export function emptyOrgProfile(kind: 'empresa' | 'evento', orgName = ''): OrgProfile {
  return {
    kind,
    orgName,
    category: '',
    country: 'Argentina',
    city: '',
    website: '',
    lookingFor: '',
    description: '',
    sponsored: [],
    merch: [],
    ...(kind === 'evento' ? { eventDate: '', eventInfo: { distance: '', place: '', requirements: '', signup: '', reach: '' } } : {}),
  }
}

export function emptyProfile(role: Role, name: string): AthleteProfile | OrgProfile {
  if (role === 'deportista') {
    const [first = '', ...rest] = name.trim().split(/\s+/)
    return emptyAthleteProfile(first, rest.join(' '))
  }
  return emptyOrgProfile(role, name.trim())
}

/** Moves a profile to another category, keeping every field that has an equivalent. */
export function convertProfile(profile: AthleteProfile | OrgProfile, to: Role): AthleteProfile | OrgProfile {
  if (profile.kind === to) return profile
  if (profile.kind === 'deportista') {
    const org = emptyOrgProfile(to as 'empresa' | 'evento', `${profile.firstName} ${profile.lastName}`.trim())
    return { ...org, category: profile.discipline, country: profile.country, lookingFor: profile.needsDetail, description: profile.summary ?? profile.goals, logo: profile.photo }
  }
  if (to === 'deportista') {
    const [first = '', ...rest] = profile.orgName.split(/\s+/)
    return {
      ...emptyAthleteProfile(first, rest.join(' ')),
      discipline: profile.category,
      country: profile.country,
      summary: profile.description,
      needsDetail: profile.lookingFor,
      photo: profile.logo,
    }
  }
  const moved = { ...profile, kind: to }
  if (to === 'evento' && !moved.eventInfo) moved.eventInfo = { distance: '', place: '', requirements: '', signup: '', reach: '' }
  return moved
}

export function profileDisplayName(profile: AthleteProfile | OrgProfile | null, fallback: string) {
  if (!profile) return fallback
  if (profile.kind === 'deportista') return `${profile.firstName} ${profile.lastName}`.trim() || fallback
  return profile.orgName || fallback
}

export function profileImage(profile: AthleteProfile | OrgProfile | null) {
  if (!profile) return undefined
  const src = profile.kind === 'deportista' ? profile.photo : profile.logo
  return src && (src.startsWith('https://') || src.startsWith('/') || src.startsWith('data:image/')) ? src : undefined
}

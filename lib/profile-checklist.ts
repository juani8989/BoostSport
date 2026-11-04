import type { AthleteProfile, OrgProfile } from '@/lib/profile-types'

export type ChecklistItem = {
  key: string
  /** Short name for the admin panel. */
  label: string
  /** What the person has to do, written to them; used in the reminder email. */
  action: string
  done: boolean
}

const filled = (v?: string | null) => typeof v === 'string' && v.trim().length > 0

/**
 * Everything that makes a profile complete. Drives the admin progress bar, the list of
 * missing items and the reminder email, so all three always agree.
 */
export function profileChecklist(profile: AthleteProfile | OrgProfile | null): ChecklistItem[] {
  if (!profile) return []
  if (profile.kind === 'deportista') {
    const p = profile
    return [
      { key: 'photo', label: 'Foto de perfil', action: 'Subí una foto de perfil', done: filled(p.photo) },
      { key: 'name', label: 'Nombre y apellido', action: 'Completá tu nombre y apellido', done: filled(p.firstName) && filled(p.lastName) },
      { key: 'discipline', label: 'Disciplina', action: 'Indicá tu disciplina', done: filled(p.discipline) },
      { key: 'age', label: 'Edad', action: 'Agregá tu edad', done: filled(p.age) },
      { key: 'summary', label: 'Resumen', action: 'Escribí un resumen corto sobre vos', done: filled(p.summary) },
      { key: 'goals', label: 'Objetivos', action: 'Contá tus objetivos', done: filled(p.goals) },
      { key: 'achievements', label: 'Logros', action: 'Sumá tus logros', done: filled(p.achievements) },
      { key: 'studies', label: 'Estudios', action: 'Completá tus estudios', done: filled(p.studies) },
      { key: 'recognitions', label: 'Reconocimientos', action: 'Agregá tus reconocimientos', done: filled(p.recognitions) },
      { key: 'timeline', label: 'Trayectoria', action: 'Cargá al menos un hito en tu trayectoria', done: p.timeline.length > 0 },
      { key: 'socials', label: 'Redes sociales', action: 'Agregá al menos una red social', done: Object.values(p.socials).some(filled) },
      { key: 'needs', label: 'Qué necesita', action: 'Elegí qué tipo de apoyo necesitás', done: p.needs.length > 0 },
    ]
  }
  const p = profile
  const items: ChecklistItem[] = [
    { key: 'logo', label: 'Logo', action: 'Subí el logo', done: filled(p.logo) },
    { key: 'orgName', label: 'Nombre', action: 'Completá el nombre', done: filled(p.orgName) },
    { key: 'category', label: 'Rubro', action: 'Indicá el rubro', done: filled(p.category) },
    { key: 'city', label: 'Ciudad', action: 'Agregá la ciudad', done: filled(p.city) },
    { key: 'website', label: 'Sitio web', action: 'Agregá el sitio web', done: filled(p.website) },
    { key: 'description', label: 'Descripción', action: 'Escribí una descripción', done: filled(p.description) },
    { key: 'lookingFor', label: 'Qué busca', action: 'Contá qué tipo de deportistas buscan', done: filled(p.lookingFor) },
  ]
  if (p.kind === 'evento') {
    items.push(
      { key: 'eventDate', label: 'Fecha del evento', action: 'Indicá la fecha del evento', done: filled(p.eventDate) },
      { key: 'place', label: 'Lugar del evento', action: 'Indicá dónde se hace el evento', done: filled(p.eventInfo?.place) },
    )
  } else {
    items.push({ key: 'merch', label: 'Productos', action: 'Cargá al menos un producto', done: (p.merch?.length ?? 0) > 0 })
  }
  return items
}

export function completenessOf(items: ChecklistItem[]) {
  if (!items.length) return 0
  return Math.round((items.filter((i) => i.done).length / items.length) * 100)
}

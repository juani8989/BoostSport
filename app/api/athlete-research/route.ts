import { researchAthlete } from '@/lib/athlete-research'

export type { ResearchResult } from '@/lib/athlete-research'

/** Looks the athlete up on the web while they sign up (no account needed yet). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const name = (searchParams.get('name') ?? '').trim().replace(/\s+/g, ' ').slice(0, 80)
  const discipline = (searchParams.get('discipline') ?? '').trim().slice(0, 40)
  const country = (searchParams.get('country') ?? '').trim().slice(0, 40)
  if (name.split(' ').length < 2 || !discipline) return Response.json({ error: 'Faltan nombre, apellido y disciplina.' }, { status: 400 })

  try {
    return Response.json(await researchAthlete({ name, discipline, country }))
  } catch (error) {
    console.error('[athlete-research] failed', error)
    return Response.json({ error: 'No pudimos buscarte en la web ahora.' }, { status: 502 })
  }
}

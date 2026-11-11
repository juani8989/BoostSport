import { dataFns } from '@/lib/data-fns'

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { fn?: string; args?: unknown[] } | null
  const fn = body?.fn && Object.hasOwn(dataFns, body.fn) ? (dataFns[body.fn as keyof typeof dataFns] as (...args: unknown[]) => Promise<unknown>) : null
  if (!fn || !Array.isArray(body?.args) || body.args.length > 4) return Response.json({ error: 'Not found' }, { status: 404 })
  try {
    return Response.json(await fn(...body.args), { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message === 'Unauthorized' || message === 'Forbidden') return Response.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 403 })
    console.error('data route failed', body.fn, error)
    // Postgres error codes say what broke (missing table, column…) without exposing data.
    const pg = (error as { code?: string; cause?: { code?: string; message?: string } } | null) ?? {}
    const code = pg.code ?? pg.cause?.code
    const schemaProblem = code === '42P01' || code === '42703' ? pg.cause?.message ?? message : undefined
    return Response.json({ error: 'Error', code, detail: schemaProblem }, { status: 500 })
  }
}

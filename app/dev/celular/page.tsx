import { notFound } from 'next/navigation'

/**
 * Development only: the app inside a phone-sized frame, to look at the mobile version next to
 * the computer one in another tab. Same origin, so it uses the same signed-in account.
 * In production this page doesn't exist.
 */
export default function PhonePreview() {
  if (process.env.NODE_ENV === 'production') notFound()
  return (
    <main className="flex min-h-dvh items-center justify-center gap-6 bg-neutral-900 p-6">
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm font-semibold text-neutral-400">Vista celular · 390 × 844</p>
        <div className="rounded-[2.75rem] border-[10px] border-neutral-950 bg-black shadow-2xl ring-1 ring-neutral-700">
          <iframe src="/" title="BoostSport en celular" className="block h-[844px] max-h-[calc(100dvh-7rem)] w-[390px] rounded-[2rem] bg-black" />
        </div>
      </div>
    </main>
  )
}

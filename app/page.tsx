import { RootGate, type AuthNotice } from '@/components/root-gate'
import { AdminPanel } from '@/components/admin/admin-panel'
import { getCurrentAccount } from '@/lib/current-account'
import { getAdmin } from '@/lib/admin'

// Set by the email confirmation link: ?verificado=1 on success, ?error=<CODE> when it fails.
function noticeFrom(params: Record<string, string | string[] | undefined>): AuthNotice | null {
  if (params.error === 'TOKEN_EXPIRED') return 'expired'
  if (params.error) return 'invalid'
  if (params.verificado) return 'verified'
  return null
}

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // Both share one cached session and profile lookup.
  const [admin, account, params] = await Promise.all([getAdmin(), getCurrentAccount(), searchParams])
  if (admin) return <AdminPanel admin={admin} />
  return <RootGate account={account} notice={noticeFrom(params)} />
}

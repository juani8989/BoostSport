import { RootGate } from '@/components/root-gate'
import { AdminPanel } from '@/components/admin/admin-panel'
import { getCurrentAccount } from '@/lib/current-account'
import { getAdmin } from '@/lib/admin'

export default async function Page() {
  // Both share one cached session and profile lookup.
  const [admin, account] = await Promise.all([getAdmin(), getCurrentAccount()])
  if (admin) return <AdminPanel admin={admin} />
  return <RootGate account={account} />
}

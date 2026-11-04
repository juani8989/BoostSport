import 'server-only'

/** Public address of the app, for links in emails. Same precedence as the auth base URL. */
export function siteUrl() {
  const url =
    process.env.BETTER_AUTH_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000')
  return url.replace(/\/$/, '')
}

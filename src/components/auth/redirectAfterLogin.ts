import type { Location } from 'react-router-dom'

/**
 * Where to go after a successful login: back to the protected page the user originally
 * requested (deep link) when it belongs to this portal, otherwise the portal's default page.
 */
export function redirectAfterLogin(state: unknown, portalPrefix: string, fallback: string): string {
  const from = (state as { from?: Location } | null)?.from
  if (from?.pathname && from.pathname.startsWith(portalPrefix)) {
    return from.pathname + (from.search ?? '') + (from.hash ?? '')
  }
  return fallback
}

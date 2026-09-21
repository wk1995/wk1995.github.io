export function parseRoute(hash: string): string {
  const value = hash.replace(/^#\/?/, '')
  if (value === 'settings/scoring') return 'settings'
  if (value === 'settings/sync') return 'diagnostics'
  if (value === 'settings/connection') return 'settings'
  return /^(dashboard|projects|plans|tasks|assessments|progress|changes|settings|diagnostics|ideas|crashes|bugs)(\/[^/]+)?$/.test(value) ? value : 'dashboard'
}
export function routeId(route: string): string {
  try { return decodeURIComponent(route.split('/')[1] ?? '') } catch { return '' }
}

import { describe, expect, it } from 'vitest'
import { parseRoute, routeId } from './routes'

describe('static hash deep links', () => {
  it('preserves stable IDs and settings aliases on direct load/refresh', () => {
    for (const hash of ['#/plans/PLAN-1', '#/tasks/PLAN-1%3AT-001', '#/changes', '#/ideas', '#/bugs', '#/crashes']) expect(parseRoute(hash)).toBe(hash.slice(2))
    expect(routeId('tasks/PLAN-1%3AT-001')).toBe('PLAN-1:T-001')
    expect(parseRoute('#/settings/scoring')).toBe('settings')
    expect(parseRoute('#/settings/sync')).toBe('diagnostics')
    expect(parseRoute('#/unknown')).toBe('dashboard')
  })
})

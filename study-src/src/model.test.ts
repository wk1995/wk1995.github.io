import { describe, expect, it } from 'vitest'
import fixture from '../public/data/read-model.demo.json'
import { assertCompatibleReadModel } from './model'

describe('learning dashboard contract', () => {
  it('accepts the shared demo fixture', () => {
    assertCompatibleReadModel(fixture)
    expect(fixture.projects).toHaveLength(1)
    expect(fixture.tasks).toHaveLength(3)
    expect(fixture.assessments[0].attempts.map((item) => item.source_type)).toEqual(['codex', 'web'])
    expect(fixture.assessments[0].cycle_decision.decision).toBe('continue')
    expect(fixture.llm_profiles[0].profile_id).toBe('LLM-PROFILE-DEMO-001')
  })

  it('rejects an incompatible schema', () => {
    expect(() => assertCompatibleReadModel({ ...fixture, schema_version: '2.0.0' })).toThrow('不兼容')
  })

  it('keeps read model 1.0 compatible while defaulting new collections', () => {
    const previous: unknown = { ...fixture, schema_version: '1.0.0', evidence_coverage: undefined, audit_events: undefined }
    assertCompatibleReadModel(previous)
    expect(previous.evidence_coverage).toEqual([])
    expect(previous.audit_events).toEqual([])
  })
})

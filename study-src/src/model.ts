export type Source = { path: string; line?: number }

export type Project = {
  project_id: string
  title: string
  status: string
  updated?: string
  source: Source
}

export type Plan = {
  plan_id: string
  project_id: string
  title: string
  status: string
  priority: string
  start_date?: string
  target_date?: string
  cycle_index?: number
  source: Source
}

export type Task = {
  task_id: string
  plan_id: string
  project_id: string
  title: string
  kind: string
  status: string
  issue_url?: string
  source: Source
}

export type Progress = {
  progress_id: string
  plan_id: string
  project_id: string
  execution_percent: number
  health: string
  updated?: string
  source: Source
}

export type AnswerAttempt = {
  attempt_id: string
  source_type: string
  source_locator: string
  actor_id: string
  submitted_at: string
  period?: string
  answer_hash: string
}

export type ScoreRun = {
  score_run_id: string
  attempt_id: string
  status: string
  provider?: string
  exact_model?: string
  total?: number
  possible?: number
  confidence?: number
  breakdown: Array<{ dimension: string; possible: number; awarded: number; reason: string }>
  questions: Array<{ question_id: string; possible: number; awarded: number; deductions: Array<{ code: string; points: number; reason: string }>; evidence_refs: string[] }>
  review_policy: string
  audit_event_id: string
  source_type: string
  source_locator: string
  error_code?: string
  error_message?: string
  created_at: string
}

export type Assessment = {
  assessment_id: string
  record_id: string
  project_id: string
  plan_id: string
  title?: string
  question_set_id?: string | null
  questions: Array<{ question_id: string; type: string; possible: number; prompt: string; focus: string; acceptance_criteria: string }>
  kind: string
  cycle_index: number
  score_status: 'pending' | 'scored' | 'review'
  score_total: number | null
  level: string | null
  selected_score_run_id: string | null
  attempts: AnswerAttempt[]
  score_runs: ScoreRun[]
  review_decisions: Array<{ review_id: string; score_run_id: string; decision: string; actor_id: string; source_type: string; reason?: string; decided_at: string; audit_event_id: string }>
  cycle_decision: null | { decision: string; reason: string; source_type: string; score_run_id?: string; actor_id: string; decided_at: string; audit_event_id: string }
  source: Source
}

export type LlmProfile = {
  profile_id: string
  profile_version: string
  provider: string
  exact_model: string
  secret_ref: string
  prompt_version: string
  prompt_path: string
  rubric_version: string
  rubric_path: string
  score_schema_version: string
  review_policy: string
  enabled?: boolean
  description?: string
}

export type EvidenceCoverage = { project_id: string; covered_items: number; total_items: number; percent: number; gaps: string[] }
export type AuditEvent = { audit_event_id: string; operation_id: string; operation: string; source_type: string; source_locator: string; actor_id: string; input_artifact_ids: string[]; output_artifact_ids: string[]; source_commit: string; status: string; reason?: string; created_at: string }

export type ReadModel = {
  schema_version: string
  source_commit: string
  generator_version: string
  generated_at: string
  llm_profiles?: LlmProfile[]
  evidence_coverage: EvidenceCoverage[]
  audit_events: AuditEvent[]
  projects: Project[]
  plans: Plan[]
  tasks: Task[]
  progress: Progress[]
  assessments: Assessment[]
}

export function assertCompatibleReadModel(value: unknown): asserts value is ReadModel {
  if (!value || typeof value !== 'object') throw new Error('read model 不是对象')
  const model = value as Partial<ReadModel>
  if (!['1.0.0', '1.1.0'].includes(model.schema_version ?? '')) throw new Error(`不兼容的 schema：${model.schema_version ?? '缺失'}`)
  if (!model.source_commit || !/^[0-9a-f]{40}$/.test(model.source_commit)) throw new Error('source_commit 缺失或无效')
  if (!model.generator_version || !/^0\.[1-3]\.\d+$/.test(model.generator_version)) throw new Error(`不兼容的 generator_version：${model.generator_version ?? '缺失'}`)
  if (model.schema_version === '1.0.0') {
    model.evidence_coverage ??= []
    model.audit_events ??= []
  }
  for (const key of ['projects', 'plans', 'tasks', 'progress', 'assessments', 'evidence_coverage', 'audit_events'] as const) {
    if (!Array.isArray(model[key])) throw new Error(`${key} 缺失`)
  }
  const unique = (label: string, values: string[]) => {
    if (values.some((value) => !value) || new Set(values).size !== values.length) throw new Error(`${label} 缺失或冲突`)
  }
  unique('project_id', model.projects!.map((item) => item.project_id))
  unique('plan_id', model.plans!.map((item) => item.plan_id))
  unique('progress_id', model.progress!.map((item) => item.progress_id))
  unique('assessment_id', model.assessments!.map((item) => item.assessment_id))
  unique('audit_event_id', model.audit_events!.map((item) => item.audit_event_id))
  const projectIds = new Set(model.projects!.map((item) => item.project_id))
  const planIds = new Set(model.plans!.map((item) => item.plan_id))
  if (model.plans!.some((item) => !projectIds.has(item.project_id)) || model.tasks!.some((item) => !projectIds.has(item.project_id) || !planIds.has(item.plan_id)) || model.assessments!.some((item) => !projectIds.has(item.project_id) || !planIds.has(item.plan_id))) throw new Error('稳定 ID 引用关系无效')
  model.assessments!.forEach((assessment) => {
    unique(`${assessment.assessment_id}:attempt_id`, assessment.attempts.map((item) => item.attempt_id))
    unique(`${assessment.assessment_id}:score_run_id`, assessment.score_runs.map((item) => item.score_run_id))
    const attemptIds = new Set(assessment.attempts.map((item) => item.attempt_id))
    if (assessment.score_runs.some((item) => !attemptIds.has(item.attempt_id))) throw new Error(`${assessment.assessment_id}: ScoreRun attempt_id 无效`)
  })
}

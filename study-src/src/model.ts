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
  provider: string
  exact_model: string
  total: number
  possible: number
  confidence: number
  breakdown: Array<{ dimension: string; possible: number; awarded: number; reason: string }>
  questions: Array<{ question_id: string; possible: number; awarded: number; deductions: Array<{ code: string; points: number; reason: string }>; evidence_refs: string[] }>
  review_policy: string
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
  review_decisions: Array<{ review_id: string; decision: string; source_type: string; reason?: string }>
  cycle_decision: null | { decision: string; reason: string; source_type: string; score_run_id?: string }
  source: Source
}

export type LlmProfile = {
  profile_id: string
  profile_version: string
  provider: string
  exact_model: string
  secret_ref: string
  prompt_version: string
  rubric_version: string
  review_policy: string
  enabled?: boolean
  description?: string
}

export type ReadModel = {
  schema_version: string
  source_commit: string
  generator_version: string
  generated_at: string
  llm_profiles?: LlmProfile[]
  projects: Project[]
  plans: Plan[]
  tasks: Task[]
  progress: Progress[]
  assessments: Assessment[]
}

export function assertCompatibleReadModel(value: unknown): asserts value is ReadModel {
  if (!value || typeof value !== 'object') throw new Error('read model 不是对象')
  const model = value as Partial<ReadModel>
  if (model.schema_version !== '1.0.0') throw new Error(`不兼容的 schema：${model.schema_version ?? '缺失'}`)
  if (!model.source_commit || !/^[0-9a-f]{40}$/.test(model.source_commit)) throw new Error('source_commit 缺失或无效')
  for (const key of ['projects', 'plans', 'tasks', 'progress', 'assessments'] as const) {
    if (!Array.isArray(model[key])) throw new Error(`${key} 缺失`)
  }
}

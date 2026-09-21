import type { Assessment } from './model'

export type MutationReceipt = {
  operation_id: string
  attempt_id?: string
  pr_url?: string
  status: 'submitted' | 'merged' | 'closed' | 'failed'
}

const configuredBase = (import.meta.env.VITE_STUDY_BFF_URL as string | undefined)?.replace(/\/$/, '')

export function hasAuthenticatedBackend(): boolean {
  return Boolean(configuredBase)
}

export function backendLoginUrl(): string | undefined {
  return configuredBase ? `${configuredBase}/oauth/start` : undefined
}

export async function loadSession(): Promise<{ authenticated: boolean; login?: string; expires_in_seconds?: number }> {
  if (!configuredBase) return { authenticated: false }
  try { return await request('/v1/session') } catch { return { authenticated: false } }
}

export async function logout(): Promise<void> {
  await request('/v1/logout', { method: 'POST', body: '{}' })
}

export function attemptDiffPreview(assessment: Assessment, answers: Record<string, string>, sourceCommit: string): string {
  const rows = assessment.questions.map(({ question_id }) => `+ ${question_id}: [REDACTED ${answers[question_id]?.trim().length ?? 0} chars]`).join('\n')
  return `--- a/生成/学习仪表盘/assessments/${assessment.assessment_id}.assessment.json\n+++ b/生成/学习仪表盘/assessments/${assessment.assessment_id}.assessment.json\n@@ attempts @@\n+ source_type: web\n+ base_commit: ${sourceCommit}\n${rows}`
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!configuredBase) throw new Error('当前是公开演示构建，未配置受认证 BFF')
  const response = await fetch(`${configuredBase}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!response.ok) throw new Error(`写入服务失败：HTTP ${response.status}`)
  return response.json() as Promise<T>
}

export async function loadPrivateReadModel(): Promise<unknown> {
  return request('/v1/read-model')
}

export type Change = { pr_url: string; title: string; state: string; checks: string; mergeable: boolean | null; files: Array<{ path: string; status: string; additions: number; deletions: number; patch: string }> }
export async function loadChanges(): Promise<Change[]> { return request('/v1/changes') }

export async function submitAttempt(
  assessment: Assessment,
  answers: Record<string, string>,
  sourceCommit: string,
  operationToken: string,
  submittedAt: string,
): Promise<MutationReceipt> {
  return request(`/v1/assessments/${encodeURIComponent(assessment.record_id)}/attempts`, {
    method: 'POST',
    headers: { 'X-Idempotency-Key': operationToken },
    body: JSON.stringify({
      submitted_at: submittedAt,
      assessment_id: assessment.assessment_id,
      question_schema_version: '1.0.0',
      answer_template_version: '1.0.0',
      base_commit: sourceCommit,
      answers: assessment.questions.map(({ question_id }) => ({ question_id, answer: answers[question_id] })),
    }),
  })
}

export async function triggerScore(
  assessment: Assessment,
  attemptId: string,
  profileId: string,
  sourceCommit: string,
  reviewPolicy: string,
  forceRescore = false,
): Promise<MutationReceipt> {
  return request(`/v1/assessments/${encodeURIComponent(assessment.record_id)}/attempts/${encodeURIComponent(attemptId)}/scores`, {
    method: 'POST',
    body: JSON.stringify({ assessment_id: assessment.assessment_id, llm_profile_id: profileId, review_policy: reviewPolicy, base_commit: sourceCommit, force_rescore: forceRescore }),
  })
}

export async function selectScore(
  assessment: Assessment,
  scoreRunId: string,
  sourceCommit: string,
): Promise<MutationReceipt> {
  const attemptId = assessment.score_runs.find((item) => item.score_run_id === scoreRunId)?.attempt_id
  if (!attemptId) throw new Error('评分结果没有对应答卷')
  return request(`/v1/assessments/${encodeURIComponent(assessment.record_id)}/attempts/${encodeURIComponent(attemptId)}/score-selection`, {
    method: 'POST',
    body: JSON.stringify({ assessment_id: assessment.assessment_id, selected_score_run_id: scoreRunId, expected_selected_score_run_id: assessment.selected_score_run_id, base_commit: sourceCommit }),
  })
}

export async function reviewScore(assessment: Assessment, scoreRunId: string, decision: string, reason: string, sourceCommit: string): Promise<MutationReceipt> {
  return request(`/v1/assessments/${encodeURIComponent(assessment.record_id)}/scores/${encodeURIComponent(scoreRunId)}/review`, { method: 'POST', body: JSON.stringify({ assessment_id: assessment.assessment_id, decision, reason, base_commit: sourceCommit }) })
}

export async function decideCycle(assessment: Assessment, decision: string, reason: string, sourceCommit: string): Promise<MutationReceipt> {
  return request(`/v1/assessments/${encodeURIComponent(assessment.record_id)}/cycle-decision`, { method: 'POST', body: JSON.stringify({ assessment_id: assessment.assessment_id, decision, reason, base_commit: sourceCommit }) })
}

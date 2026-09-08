import type { Assessment } from './model'

export type MutationReceipt = {
  operation_id: string
  attempt_id?: string
  pr_url: string
  status: 'submitted' | 'merged' | 'failed'
}

const configuredBase = (import.meta.env.VITE_STUDY_BFF_URL as string | undefined)?.replace(/\/$/, '')

export function hasAuthenticatedBackend(): boolean {
  return Boolean(configuredBase)
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

export async function submitAttempt(
  assessment: Assessment,
  answers: Record<string, string>,
  sourceCommit: string,
): Promise<MutationReceipt> {
  return request(`/v1/assessments/${encodeURIComponent(assessment.record_id)}/attempts`, {
    method: 'POST',
    body: JSON.stringify({
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
): Promise<MutationReceipt> {
  return request(`/v1/assessments/${encodeURIComponent(assessment.record_id)}/attempts/${encodeURIComponent(attemptId)}/scores`, {
    method: 'POST',
    body: JSON.stringify({ llm_profile_id: profileId, base_commit: sourceCommit }),
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
    body: JSON.stringify({ selected_score_run_id: scoreRunId, base_commit: sourceCommit }),
  })
}
